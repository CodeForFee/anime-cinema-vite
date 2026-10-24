import inventory from "../src/core/source/hosts.json" with { type: "json" };
import type { SourceSession } from "./session.js";

export type UpstreamKind = "source" | "player";
export const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const SOURCE_HOSTS = new Set([
  inventory.current,
  ...inventory.redirecting,
  ...inventory.unreachable,
]);
const PLAYER_HOSTS = new Set(["storage.googleapiscdn.com"]);
const OFFICIAL = new URL(inventory.officialLink);
const REDIRECTS = new Set([301, 302, 303, 307, 308]);

export class GatewayError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly upstreamStatus?: number,
  ) {
    super(message);
  }
}

export function allowedUrl(value: string | null, kind: UpstreamKind): URL {
  if (!value || value.length > 8192)
    throw new GatewayError(400, "INVALID_URL", "Thiếu hoặc sai URL nguồn");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new GatewayError(400, "INVALID_URL", "URL nguồn không hợp lệ");
  }
  url.hash = "";
  const allowed =
    kind === "player"
      ? PLAYER_HOSTS.has(url.hostname) && /^\/player(?:\/|$)/.test(url.pathname)
      : SOURCE_HOSTS.has(url.hostname) || url.href === OFFICIAL.href;
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    !allowed
  )
    throw new GatewayError(
      400,
      "FORBIDDEN_TARGET",
      "Địa chỉ nguồn không được phép",
    );
  return url;
}

async function readText(response: Response): Promise<string> {
  const length = Number(response.headers.get("content-length"));
  if (length > MAX_TEXT_BYTES) {
    await response.body?.cancel();
    throw new GatewayError(
      502,
      "UPSTREAM_TOO_LARGE",
      "Phản hồi nguồn vượt giới hạn",
      response.status,
    );
  }
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      size += value.byteLength;
      if (size > MAX_TEXT_BYTES) {
        await reader.cancel();
        throw new GatewayError(
          502,
          "UPSTREAM_TOO_LARGE",
          "Phản hồi nguồn vượt giới hạn",
          response.status,
        );
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

export async function upstream(
  value: string | null,
  kind: UpstreamKind,
  init: {
    method?: "GET" | "POST";
    body?: string;
    signal: AbortSignal;
    clientHeaders?: Headers;
    session?: SourceSession;
  },
) {
  let url = allowedUrl(value, kind);
  let method = init.method ?? "GET";
  let body = init.body;
  const signal = AbortSignal.any([init.signal, AbortSignal.timeout(12_000)]);
  for (let hop = 0; hop <= 5; hop++) {
    if (
      method === "POST" &&
      (kind !== "source" || url.pathname !== "/ajax/player")
    )
      throw new GatewayError(
        405,
        "FORBIDDEN_METHOD",
        "Nguồn không hỗ trợ thao tác này",
      );
    const referer =
      kind === "source" && SOURCE_HOSTS.has(url.hostname)
        ? `${url.origin}/`
        : `https://${inventory.current}/`;
    const headers: Record<string, string> = {
      Accept:
        method === "POST"
          ? "application/json, text/javascript, */*; q=0.01"
          : "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: referer,
      ...(body !== undefined
        ? {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
              Origin: url.origin,
          }
        : {}),
    };
    // Forward browser metadata only; app cookies, authorization and arbitrary caller headers stay private.
    for (const name of ["user-agent", "accept-language"]) {
      const value = init.clientHeaders?.get(name);
      if (value && value.length <= 1024) headers[name] = value;
    }
    const cookie = init.session?.cookies(url);
    if (cookie) headers.Cookie = cookie;
    const response = await fetch(url, {
      method,
      body,
      redirect: "manual",
      signal,
      headers,
    });
    init.session?.capture(response, url);
    if (REDIRECTS.has(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location || hop === 5)
        throw new GatewayError(
          502,
          "UPSTREAM_REDIRECT",
          "Nguồn chuyển hướng không hợp lệ",
        );
      url = allowedUrl(new URL(location, url).href, kind);
      if (
        response.status === 303 ||
        ((response.status === 301 || response.status === 302) &&
          method === "POST")
      ) {
        method = "GET";
        body = undefined;
      }
      continue;
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (
      contentType &&
      !/^(?:text\/|application\/(?:json|xhtml\+xml))/i.test(contentType)
    ) {
      await response.body?.cancel();
      throw new GatewayError(
        502,
        "UNSUPPORTED_CONTENT",
        "Nguồn không trả về HTML hoặc JSON",
      );
    }
    const responseHeaders: Record<string, string> = {};
    for (const name of [
      "content-type",
      "cache-control",
      "etag",
      "last-modified",
    ]) {
      const header = response.headers.get(name);
      if (header !== null) responseHeaders[name] = header;
    }
    return {
      status: response.status,
      url: url.href,
      data: await readText(response),
      headers: responseHeaders,
    };
  }
  throw new GatewayError(
    502,
    "UPSTREAM_REDIRECT",
    "Nguồn chuyển hướng quá nhiều lần",
  );
}

export function gatewayError(error: unknown): Response {
  const known = error instanceof GatewayError;
  const timedOut =
    error instanceof Error &&
    ["AbortError", "TimeoutError"].includes(error.name);
  return Response.json(
    {
      error: known
        ? error.code
        : timedOut
          ? "UPSTREAM_TIMEOUT"
          : "UPSTREAM_UNAVAILABLE",
      message: known
        ? error.message
        : timedOut
          ? "Nguồn phản hồi quá chậm"
          : "Không kết nối được nguồn",
      ...(known && error.upstreamStatus !== undefined
        ? { upstreamStatus: error.upstreamStatus }
        : {}),
    },
    {
      status: known ? error.status : timedOut ? 504 : 502,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
