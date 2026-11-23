/* eslint-disable no-undef */

import { sendMessage } from "@tachibana-shin/webext-bridge/content-script"

import { version } from "../../package.json"
import type { RequestOption, RequestResponse } from "../background"
import { isFirefox } from "../env"
import { base64ToArrayBuffer } from "../logic/base64ToArrayBuffer"
import { encodeDetail } from "../logic/encoder-detail"

export interface DetailCustomEvent_sendToInject {
  id: string
  isBuffer?: boolean
  ok: boolean
  res: RequestResponse
}

document.addEventListener("http:request", (async ({
  detail
}: CustomEvent<{
  id: string
  req: RequestOption
}>) => {
  document.dispatchEvent(
    new CustomEvent<DetailCustomEvent_sendToInject>("http:response", {
      detail: encodeDetail(
        await (
          sendMessage(
            "http:request",
            detail.req
          ) as unknown as Promise<RequestResponse>
        )
          .then((res): DetailCustomEvent_sendToInject => {
            switch (detail.req.responseType) {
              case "arraybuffer":
                res.data = isFirefox
                  ? (res.data as string)
                  : base64ToArrayBuffer(res.data as string)
                break
              case "json":
                res.data = JSON.parse(res.data as string)
                break
            }

            return {
              id: detail.id,
              isBuffer: isFirefox && detail.req.responseType === "arraybuffer",
              ok: true,
              res
            }
          })
          .catch((err) => {
            return {
              id: detail.id,
              ok: false,
              // a plain object: the page gets a name and message whatever the bridge serialized
              res: toError(err) as unknown as RequestResponse
            }
          })
      )
    })
  )
}) as unknown as EventListenerOrEventListenerObject)
document.addEventListener("http:aborted", (({
  detail: { signalId }
}: CustomEvent<{ signalId: string }>) => {
  sendMessage("http:aborted", { signalId })
}) as unknown as EventListenerOrEventListenerObject)
document.addEventListener("set:referrers", (async ({
  detail
}: CustomEvent<{
  id: string
  referrers: Record<string, string>
}>) => {
  // the page awaits this answer (source-host.ts adoptSourceHost): it must come even when the worker failed
  await Promise.resolve(sendMessage("set:referrers", detail.referrers)).catch(
    (err) => console.warn("[AVS Helper] set:referrers failed", err)
  )
  document.dispatchEvent(
    new CustomEvent("res:set:referrers", {
      detail: encodeDetail({
        id: detail.id
      })
    })
  )
}) as unknown as EventListenerOrEventListenerObject)

function toError(err: unknown) {
  const { name, message, status } = (err ?? {}) as {
    name?: string
    message?: string
    status?: number
  }
  return {
    name: name || "Error",
    message: message || String(err),
    ...(typeof status === "number" ? { status } : {})
  }
}

document.documentElement.dataset.httpVersion = version
document.documentElement.dataset.httpAllow = JSON.stringify(true)
document.documentElement.dataset.tabsApi = JSON.stringify(false)
document.documentElement.dataset.customReferer = JSON.stringify(true)
