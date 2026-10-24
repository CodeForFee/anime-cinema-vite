// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createHash } from "node:crypto";
import player from "../api/player.js";
import proxy from "../api/proxy.js";
import { MAX_TEXT_BYTES } from "./upstream.js";

const origin = "https://app.test";
const target = "https://animevietsub.sale/";
const playerUrl =
  "https://storage.googleapiscdn.com/player/session?token=example";
const channel = "a".repeat(32);
const network = vi.fn();
const html = (
  text = "<html><head></head><body>source</body></html>",
  headers = {},
) =>
  new Response(text, {
    headers: { "content-type": "text/html; charset=utf-8", ...headers },
  });
const request = (path: string, url: string, init?: RequestInit) =>
  new Request(
    `${origin}/api/${path}?${new URLSearchParams({ url, channel })}`,
    init,
  );

beforeEach(() => {
  vi.stubGlobal("fetch", network);
  vi.stubEnv("AVS_SESSION_KEY", "a".repeat(64));
});
afterEach(() => {
  network.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("GET returns the parser envelope, strips tags and keeps upstream cookies private", async () => {
  network.mockResolvedValue(
    html("<p>catalog</p>", { "set-cookie": "session=private" }),
  );
  const response = await proxy.fetch(
    request("proxy", `${target}#animevsub-vsub`),
  );
  expect(await response.json()).toEqual({
    status: 200,
    url: target,
    data: "<p>catalog</p>",
    headers: { "content-type": "text/html; charset=utf-8" },
  });
  expect(response.headers.get("access-control-allow-origin")).toBeNull();
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(network.mock.calls[0][0].href).toBe(target);
  expect(network.mock.calls[0][1].headers.Referer).toBe(target);
});

test("POST forwards the episode form, not caller headers or cookies", async () => {
  network.mockResolvedValue(
    new Response('{"link":"player"}', {
      headers: { "content-type": "application/json" },
    }),
  );
  const response = await proxy.fetch(
    request("proxy", `${target}ajax/player`, {
      method: "POST",
      headers: { Cookie: "app=private", Referer: "https://evil.test" },
      body: JSON.stringify({
        id: 1,
        play: "api",
        link: "a+b&c",
        backuplinks: true,
      }),
    }),
  );
  expect(response.status).toBe(200);
  const options = network.mock.calls[0][1];
  expect(options.method).toBe("POST");
  expect(new URLSearchParams(options.body).get("link")).toBe("a+b&c");
  expect(options.headers.Cookie).toBeUndefined();
  expect(options.headers.Referer).toBe(target);
  expect(options.headers.Origin).toBe("https://animevietsub.sale");
  expect(options.headers["X-Requested-With"]).toBe("XMLHttpRequest");
});

test.each([
  "http://animevietsub.sale/",
  "https://evil.test/",
  "https://127.0.0.1/",
  "https://animevietsub.sale.evil.test/",
  "https://user:pass@animevietsub.sale/",
  "https://animevietsub.sale:8443/",
  "https://animevietsub.global/",
  "https://bit.ly/other",
])("rejects an unsafe target before fetching: %s", async (url) => {
  const response = await proxy.fetch(request("proxy", url));
  expect(response.status).toBe(400);
  expect(network).not.toHaveBeenCalled();
});

test("validates each redirect and returns the final trusted URL", async () => {
  network
    .mockResolvedValueOnce(
      new Response(null, { status: 302, headers: { location: target } }),
    )
    .mockResolvedValueOnce(html());
  const response = await proxy.fetch(
    request("proxy", "https://bit.ly/animevietsubtv"),
  );
  expect((await response.json()).url).toBe(target);
  expect(network).toHaveBeenCalledTimes(2);
  network.mockClear();
  network.mockResolvedValueOnce(
    new Response(null, {
      status: 302,
      headers: { location: "https://127.0.0.1/" },
    }),
  );
  expect((await proxy.fetch(request("proxy", target))).status).toBe(400);
  expect(network).toHaveBeenCalledTimes(1);
});

test("caps redirect loops", async () => {
  network.mockImplementation(
    () => new Response(null, { status: 302, headers: { location: target } }),
  );
  expect((await proxy.fetch(request("proxy", target))).status).toBe(502);
  expect(network).toHaveBeenCalledTimes(6);
});

test("preserves a Cloudflare 403 instead of reporting catalog success", async () => {
  network.mockResolvedValue(
    new Response("blocked", {
      status: 403,
      headers: { "content-type": "text/html" },
    }),
  );
  const response = await proxy.fetch(request("proxy", target));
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({ status: 403, data: "blocked" });
});

test("rejects nested POST data, writes outside /ajax/player, and unsupported methods", async () => {
  expect(
    (
      await proxy.fetch(
        request("proxy", `${target}ajax/player`, {
          method: "POST",
          body: '{"nested":{}}',
        }),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await proxy.fetch(
        request("proxy", target, { method: "POST", body: "{}" }),
      )
    ).status,
  ).toBe(405);
  expect(
    (await proxy.fetch(request("proxy", target, { method: "DELETE" }))).status,
  ).toBe(405);
  expect(network).not.toHaveBeenCalled();
});

test("bounds unknown-length responses and refuses media proxying", async () => {
  network.mockResolvedValue(html("a".repeat(MAX_TEXT_BYTES + 1)));
  const large = await proxy.fetch(request("proxy", target));
  expect(large.status).toBe(502);
  expect((await large.json()).error).toBe("UPSTREAM_TOO_LARGE");
  network.mockResolvedValue(
    new Response("segment", { headers: { "content-type": "video/mp2t" } }),
  );
  expect((await proxy.fetch(request("proxy", target))).status).toBe(502);
});

test("exposes a bounded timeout as 504", async () => {
  network.mockRejectedValue(new DOMException("timed out", "TimeoutError"));
  expect((await proxy.fetch(request("proxy", target))).status).toBe(504);
});

test("forwards viewer browser metadata while keeping app credentials private", async () => {
  network.mockResolvedValue(html());
  await proxy.fetch(
    request("proxy", target, {
      headers: {
        "User-Agent": "ViewerBrowser/1.0",
        "Accept-Language": "vi-VN,vi;q=0.9",
        Cookie: "app=private",
        Authorization: "Bearer private",
        "X-Arbitrary": "private",
      },
    }),
  );
  const headers = new Headers(network.mock.calls[0][1].headers);
  expect(headers.get("user-agent")).toBe("ViewerBrowser/1.0");
  expect(headers.get("accept-language")).toBe("vi-VN,vi;q=0.9");
  expect(headers.get("cookie")).toBeNull();
  expect(headers.get("authorization")).toBeNull();
  expect(headers.get("x-arbitrary")).toBeNull();
});

test("does not pass a successful HTTP challenge page to the catalog parser", async () => {
  network.mockResolvedValue(
    html(
      '<title>Just a moment...</title><script src="/cdn-cgi/challenge-platform/cf-chl.js"></script>',
    ),
  );
  const response = await proxy.fetch(request("proxy", target));
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({
    error: "UPSTREAM_CHALLENGE",
    upstreamStatus: 200,
  });
});

test("accepts a normal large catalog but caps the serialized Function payload", async () => {
  network.mockResolvedValue(html("a".repeat(1024 * 1024)));
  const catalog = await proxy.fetch(request("proxy", target));
  expect(catalog.status).toBe(200);
  expect((await catalog.json()).data.length).toBe(1024 * 1024);
  network.mockResolvedValue(html(String.fromCharCode(1).repeat(750_000)));
  const oversized = await proxy.fetch(request("proxy", target));
  expect(oversized.status).toBe(502);
  expect(await oversized.json()).toMatchObject({
    error: "UPSTREAM_TOO_LARGE",
    upstreamStatus: 200,
  });
});

test("player injects a single absolute bridge before source scripts and enforces isolation", async () => {
  network.mockResolvedValue(
    html(
      '<html><head><base href="https://wrong.test/"><script src="js/player.js"></script></head><body><video></video></body></html>',
    ),
  );
  const response = await player.fetch(request("player", playerUrl));
  const text = await response.text();
  expect(response.status).toBe(200);
  expect(response.headers.get("content-security-policy")).toBe(
    "sandbox allow-scripts; frame-ancestors 'self'",
  );
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(text).toContain(`src="${origin}/player-bridge.js"`);
  expect(text).toContain(`data-avs-channel="${channel}"`);
  expect(text).toContain(`data-avs-parent-origin="${origin}"`);
  expect(text).toContain(
    'href="https://storage.googleapiscdn.com/player/session?token=example"',
  );
  expect(text).not.toContain("wrong.test");
  expect(text.indexOf("player-bridge.js")).toBeLessThan(
    text.indexOf("js/player.js"),
  );
  expect(text.match(/data-avs-channel=/g)).toHaveLength(1);
});

test("player refuses an unknown host, missing channel, or non-HTML response", async () => {
  expect(
    (await player.fetch(request("player", "https://evil.test/player/"))).status,
  ).toBe(400);
  expect(
    (
      await player.fetch(
        new Request(
          `${origin}/api/player?url=${encodeURIComponent(playerUrl)}`,
        ),
      )
    ).status,
  ).toBe(400);
  expect(network).not.toHaveBeenCalled();
  network.mockResolvedValue(
    new Response("{}", { headers: { "content-type": "application/json" } }),
  );
  expect((await player.fetch(request("player", playerUrl))).status).toBe(502);
});

test("player preserves rejection evidence and never injects a challenge page returned with 403", async () => {
  network.mockResolvedValue(
    new Response("Invalid session", {
      status: 403,
      headers: { "content-type": "text/html" },
    }),
  );
  const response = await player.fetch(request("player", playerUrl));
  expect(response.status).toBe(502);
  expect(await response.json()).toMatchObject({
    error: "UPSTREAM_HTTP_ERROR",
    upstreamStatus: 403,
  });
});

test("source cookies persist for one viewer, including a 403 response, without sharing with another viewer", async () => {
  network
    .mockResolvedValueOnce(
      new Response("verify", {
        status: 403,
        headers: {
          "content-type": "text/html",
          "set-cookie": "source_session=viewer-a; Path=/; HttpOnly; Secure",
        },
      }),
    )
    .mockImplementation(() => html());
  const first = await proxy.fetch(request("proxy", target));
  const cookie = first.headers.getSetCookie()[0];
  expect(first.status).toBe(403);
  expect(cookie).toContain("HttpOnly; SameSite=Lax");
  expect(cookie).toContain("Secure");
  expect(cookie).not.toContain("viewer-a");
  const pair = cookie.split(";")[0];
  await proxy.fetch(
    request("proxy", target, { headers: { Cookie: `${pair}; app=private` } }),
  );
  expect(new Headers(network.mock.calls[1][1].headers).get("cookie")).toBe(
    "source_session=viewer-a",
  );
  await proxy.fetch(request("proxy", target));
  expect(
    new Headers(network.mock.calls[2][1].headers).get("cookie"),
  ).toBeNull();
});

test("a redirect receives its session cookie and cookie host/path boundaries remain enforced", async () => {
  network
    .mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location: "/phim/title/",
          "set-cookie": "scoped=only; Path=/phim; Secure",
        },
      }),
    )
    .mockImplementation(() => html());
  const first = await proxy.fetch(request("proxy", target));
  expect(new Headers(network.mock.calls[1][1].headers).get("cookie")).toBe(
    "scoped=only",
  );
  const cookie = first.headers.getSetCookie()[0].split(";")[0];
  await proxy.fetch(
    request("proxy", `${target}tim-kiem/`, { headers: { Cookie: cookie } }),
  );
  expect(
    new Headers(network.mock.calls[2][1].headers).get("cookie"),
  ).toBeNull();
  await proxy.fetch(
    request("proxy", "https://animevietsub.fan/phim/title/", {
      headers: { Cookie: cookie },
    }),
  );
  expect(
    new Headers(network.mock.calls[3][1].headers).get("cookie"),
  ).toBeNull();
});

test("an invalid session token never becomes an upstream Cookie header", async () => {
  network.mockImplementation(() => html());
  const response = await proxy.fetch(
    request("proxy", target, {
      headers: {
        Cookie:
          "avs-source-session=v1.invalid-token; source_session=pretend; app=private",
      },
    }),
  );
  expect(
    new Headers(network.mock.calls[0][1].headers).get("cookie"),
  ).toBeNull();
  expect(response.headers.getSetCookie()[0]).toContain("Max-Age=0");
});

test("an expired encrypted session starts a new anonymous jar", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  try {
    network
      .mockResolvedValueOnce(
        html("source", { "set-cookie": "session=old; Path=/; Secure" }),
      )
      .mockImplementation(() => html());
    const first = await proxy.fetch(request("proxy", target));
    const cookie = first.headers.getSetCookie()[0].split(";")[0];
    vi.setSystemTime(Date.now() + 3601_000);
    await proxy.fetch(
      request("proxy", target, { headers: { Cookie: cookie } }),
    );
    expect(
      new Headers(network.mock.calls[1][1].headers).get("cookie"),
    ).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});

test("a missing server key is reported before any upstream request", async () => {
  vi.stubEnv("AVS_SESSION_KEY", undefined);
  const response = await proxy.fetch(request("proxy", target));
  expect(response.status).toBe(503);
  expect((await response.json()).error).toBe("SESSION_NOT_CONFIGURED");
  expect(network).not.toHaveBeenCalled();
});

test("a source session that cannot fit a browser cookie fails explicitly instead of truncating it", async () => {
  const value = Array.from({ length: 80 }, (_, i) =>
    createHash("sha256").update(String(i)).digest("base64url"),
  ).join("");
  network.mockResolvedValue(
    html("source", { "set-cookie": `large=${value}; Path=/; Secure` }),
  );
  const response = await proxy.fetch(request("proxy", target));
  expect(response.status).toBe(502);
  expect((await response.json()).error).toBe("SESSION_TOO_LARGE");
});
