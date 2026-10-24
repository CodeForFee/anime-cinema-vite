// Web requests go through this deployment's Vercel API; the native HTTP adapter stays on-device.
import { Capacitor, CapacitorHttp } from "@capacitor/core";

import type {
  SourceRequest,
  SourceResponse,
  Transport,
} from "@/core/configure";
import { C_URL } from "@/core/source/hosts";
import { webTransport } from "@/platform/web-transport";

export const isNativeApp = Capacitor.isNativePlatform();

async function nativeRequest(
  method: "GET" | "POST",
  { url, headers, data, timeout }: SourceRequest,
): Promise<SourceResponse> {
  const [href, tag] = url.split("#");
  const body = data
    ? new URLSearchParams(
        Object.entries(data).map(([key, value]) => [key, String(value)]),
      ).toString()
    : undefined;

  const res = await CapacitorHttp.request({
    url: href,
    method,
    connectTimeout: timeout,
    readTimeout: timeout,
    headers: {
      "User-Agent": navigator.userAgent,
      ...(tag?.startsWith("animevsub-vsub") ? { Referer: `${C_URL}/` } : {}),
      ...(body
        ? { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" }
        : {}),
      ...headers,
    },
    data: body,
    responseType: "text",
  });

  return {
    headers: res.headers,
    // a JSON content-type comes back already parsed; callers expect the raw text
    data: typeof res.data === "string" ? res.data : JSON.stringify(res.data),
    url: res.url,
    status: res.status,
  };
}

export const transport: Transport = isNativeApp
  ? {
      version: "native",
      get: (request) => nativeRequest("GET", request),
      post: (request) => nativeRequest("POST", request),
      // no hostChanged: the native request sets the Referer from C_URL every time
    }
  : webTransport;
