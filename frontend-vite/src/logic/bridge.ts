// One transport, two hosts. In a browser the AVS Helper extension performs the request; inside the
// Android app (Capacitor) the native HTTP stack does. Either way there is no CORS, the request leaves
// the viewer's device, and a URL tagged "#animevsub-vsub" is sent with the source Referer.
import { Capacitor, CapacitorHttp } from "@capacitor/core"
import type { HttpType, PostOption } from "client-ext-animevsub-helper"
import { Http as ExtensionHttp } from "client-ext-animevsub-helper"
import { C_URL } from "src/constants"

export const isNativeApp = Capacitor.isNativePlatform()

async function nativeRequest(method: "GET" | "POST", { url, headers, data }: PostOption) {
  const [href, tag] = url.split("#")
  const body =
    data && typeof data === "object"
      ? new URLSearchParams(Object.entries(data).map(([key, value]) => [key, String(value)])).toString()
      : data

  const res = await CapacitorHttp.request({
    url: href,
    method,
    headers: {
      "User-Agent": navigator.userAgent,
      ...(tag?.startsWith("animevsub-vsub") ? { Referer: `${C_URL}/` } : {}),
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" } : {}),
      ...headers
    },
    data: body,
    responseType: "text"
  })

  return {
    headers: res.headers,
    // a JSON content-type comes back already parsed; callers expect the raw text
    data: typeof res.data === "string" ? res.data : JSON.stringify(res.data),
    url: res.url,
    status: res.status
  }
}

export const Http: Pick<HttpType, "version" | "get" | "post"> = isNativeApp
  ? {
      version: "native",
      get: (options) => nativeRequest("GET", options),
      post: (options) => nativeRequest("POST", options)
    }
  : ExtensionHttp
