/* eslint-disable operator-linebreak */
/* eslint-disable no-undef */

import { onMessage } from "@tachibana-shin/webext-bridge/background"
import { serialize } from "cookie"
import browser from "webextension-polyfill"

import referrersDefault from "../../map-referer.json"
import { EXTRA } from "../env"
import { arrayBufferToBase64 } from "../logic/arrayBufferToBase64"

import { adRules } from "./logic/ad-rules"
import { globalRules } from "./logic/create-rule"
import { getReferrers, saveReferrers } from "./logic/get-referrers"
import { installReferrers } from "./logic/install-referers"
import { installRules } from "./logic/install-rules"
import { cookieExpires, isSourceHost } from "./logic/source-host"

// setup install rules default
// (the Referer sets go one after the other: each one replaces the Referer rules the previous one installed)
// (the map the web last set wins over the bundled default; see get-referrers.ts)
const setup = Promise.all([
  installRules(adRules),
  installRules(globalRules()),
  getReferrers().then((saved) =>
    installReferrers({ ...referrersDefault, ...saved })
  )
])

onMessage<Record<string, string>>("set:referrers", async ({ data }) => {
  await setup
  await installReferrers(data)
  await saveReferrers(data)
})

/** Upper bound for one request, whatever the page asks: a dead host must not keep the worker busy */
const MAX_TIMEOUT = 60_000
onMessage("get:HASH", async () => {
  await setup
  return EXTRA
})

export interface RequestResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers: Record<string, any>
  data: string | ArrayBuffer
  url: string
  status: number
}

export type RequestOption = Pick<
  RequestInit,
  | "method"
  | "cache"
  | "integrity"
  | "keepalive"
  | "redirect"
  | "referrerPolicy"
  | "window"
> & {
  url: string
  headers?: Record<string, string>
  responseType?: "arraybuffer" | "json" | "text"
  signalId?: string | true
  /** ms; the web aborts on its own too, this ends the fetch in the worker */
  timeout?: number
  data?: Record<string, number | string | boolean> | string
}

// eslint-disable-next-line functional/no-classes
const eventsAbort = new (class EventsAbort {
  // eslint-disable-next-line func-call-spacing
  private readonly store = new Map<string, () => void>()

  constructor() {
    onMessage<{ signalId: string }>(
      "http:aborted",
      ({ data: { signalId } }) => {
        eventsAbort.store.get(signalId)?.()
      }
    )
  }

  on(id: string, fn: () => void) {
    this.store.set(id, fn)

    return () => this.store.delete(id)
  }
})()

async function sendRequest({
  url,
  headers,
  responseType,
  signalId,
  method,
  data,
  timeout
}: RequestOption): Promise<RequestResponse> {
  // eslint-disable-next-line functional/no-let
  let form: FormData | string | undefined
  if (data) {
    if (typeof data === "object") {
      form = new FormData()

      Object.entries(data ?? {}).forEach(([key, val]) =>
        (form as FormData).append(key, val as string)
      )
    } else {
      form = data
    }
  }

  // eslint-disable-next-line functional/no-let
  let signal: AbortSignal | undefined
  // eslint-disable-next-line functional/no-let
  let cancelAbort: (() => void) | undefined

  if (signalId) {
    const controller = new AbortController()
    signal = controller.signal
    if (signalId === true) {
      controller.abort()
    } else {
      // init abortcontroller
      cancelAbort = eventsAbort.on(signalId, () => {
        controller.abort()
        cancelAbort?.()
      })
    }
  }

  await setup

  const trusted = isSourceHost(url)
  const { "c-cookie": cookie, ...rest } = headers ?? {}
  if (cookie && trusted) await setCookie(url, cookie)

  const limit = Math.min(
    typeof timeout === "number" && timeout > 0 ? timeout : MAX_TIMEOUT,
    MAX_TIMEOUT
  )
  const signals = [AbortSignal.timeout(limit), signal].filter(
    (item): item is AbortSignal => Boolean(item)
  )

  return fetch(url, {
    headers: new Headers(rest),
    credentials: trusted ? "include" : "omit",
    signal: AbortSignal.any(signals),
    method,
    body: form
  })
    .then(async (res) => {
      cancelAbort?.()

      return {
        headers: await mergeSetCookie(res.headers, res.url, trusted),
        data:
          responseType === "arraybuffer"
            ? // eslint-disable-next-line promise/no-nesting
              await res.arrayBuffer().then(arrayBufferToBase64)
            : await res.text(),
        url: res.url,
        status: res.status
      }
    })
    .catch((err) => {
      cancelAbort?.()
      // eslint-disable-next-line functional/no-throw-statements
      throw err
    })
}

onMessage<RequestOption, string>(
  "http:request",
  ({ data }): Promise<RequestResponse> => sendRequest(data)
)

async function mergeSetCookie(headers: Headers, url: string, trusted: boolean) {
  // eslint-disable-next-line n/no-unsupported-features/es-builtins, @typescript-eslint/no-explicit-any
  const obj = Object.fromEntries((headers as unknown as any).entries())
  // the final URL must be the source too: a redirect elsewhere gets no cookies back
  if (!trusted || !isSourceHost(url)) return obj
  obj["set-cookie"] = (await browser.cookies.getAll({ url }))
    .map((item) =>
      serialize(item.name, item.value, {
        ...item,
        sameSite: "none",
        ...(item.expirationDate
          ? { expires: cookieExpires(item.expirationDate) }
          : {})
      })
    )
    .join(",")

  return obj
}

async function setCookie(url: string, cookie: string) {
  return Promise.all(
    cookie.split(";").map(async (item) => {
      const equal = item.indexOf("=")
      if (equal === -1) return

      const name = item.slice(0, equal)
      const value = item.slice(equal + 1)

      await chrome.cookies.set({
        // eslint-disable-next-line n/no-unsupported-features/node-builtins
        domain: new URL(url).hostname,
        name,
        path: "/",
        value,
        url,
        httpOnly: true,
        secure: false,
        storeId: "0"
      })
    })
  )
}
