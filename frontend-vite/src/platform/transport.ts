// One transport, two hosts. In a browser the AVS Helper extension performs the request; inside the
// Android app (Capacitor) the native HTTP stack does. Either way there is no CORS, the request leaves
// the viewer's device, and a URL tagged "#animevsub-vsub" is sent with the source Referer.
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import {
  Http as ExtensionHttp,
  setReferrers,
} from "client-ext-animevsub-helper";

import type {
  SourceRequest,
  SourceResponse,
  Transport,
} from "@/core/configure";
import { C_URL } from "@/core/source/hosts";

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
  : {
      // stamped on <html> by the extension at document start; empty without it
      get version() {
        return ExtensionHttp.version;
      },
      get: (request) => ExtensionHttp.get(request) as Promise<SourceResponse>,
      post: (request) => ExtensionHttp.post(request) as Promise<SourceResponse>,
      // the extension's Referer rule is built for one host: tell it the new one
      hostChanged: (origin) =>
        setReferrers({ "#animevsub-vsub": `${origin}/` }).then(() => undefined),
    };
