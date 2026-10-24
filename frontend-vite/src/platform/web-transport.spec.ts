import { afterEach, expect, test, vi } from "vitest";
import { webTransport } from "@/platform/web-transport";

afterEach(() => vi.unstubAllGlobals());

test("requests the local API without relying on an extension", async () => {
  const data = {
    status: 200,
    url: "https://animevietsub.sale/",
    data: "catalog",
    headers: {},
  };
  const fetcher = vi.fn().mockResolvedValue(Response.json(data));
  vi.stubGlobal("fetch", fetcher);
  expect(await webTransport.get({ url: data.url })).toEqual(data);
  expect(fetcher.mock.calls[0][0]).toBe(
    "/api/proxy?url=https%3A%2F%2Fanimevietsub.sale%2F",
  );
  expect(webTransport.version).toBeTruthy();
});

test("POST keeps data and cancellation, and does not forward caller cookies", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json({
        status: 200,
        url: "https://animevietsub.sale/ajax/player",
        data: "{}",
        headers: {},
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  const controller = new AbortController();
  await webTransport.post({
    url: "https://animevietsub.sale/ajax/player",
    data: { id: 5 },
    signal: controller.signal,
    headers: { Cookie: "private" },
  });
  expect(fetcher.mock.calls[0][1]).toMatchObject({
    method: "POST",
    body: '{"id":5}',
    signal: controller.signal,
  });
  expect(fetcher.mock.calls[0][1].headers.Cookie).toBeUndefined();
});

test("source rejection stays a source rejection, not an empty success", async () => {
  const data = {
    status: 403,
    url: "https://animevietsub.sale/",
    data: "blocked",
    headers: {},
  };
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json(data, { status: 403 })),
  );
  expect(await webTransport.get({ url: data.url })).toEqual(data);
});

test("rejects an SPA fallback and surfaces API errors", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response("<html>app</html>"));
  vi.stubGlobal("fetch", fetcher);
  await expect(
    webTransport.get({ url: "https://animevietsub.sale/" }),
  ).rejects.toThrow("Không tải được dữ liệu nguồn");
  fetcher.mockResolvedValue(
    Response.json(
      { error: "UPSTREAM_TIMEOUT", message: "Nguồn phản hồi quá chậm" },
      { status: 504 },
    ),
  );
  await expect(
    webTransport.get({ url: "https://animevietsub.sale/" }),
  ).rejects.toMatchObject({ status: 504, message: "Nguồn phản hồi quá chậm" });
});
