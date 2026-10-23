import type { GetOption } from "client-ext-animevsub-helper"
import { C_URL } from "src/constants"
import { Http } from "src/logic/bridge"

const noExt = () =>
  Promise.reject(
    Object.assign(new Error("Trang web cần extension AVS Helper để hoạt động bình thường"), {
      extesionNotExists: true
    })
  )

// Status and URL only, in development: whole HTML pages in the console cost memory and time on a phone
const trace = (method: string, url: string, status: number) => {
  if (import.meta.env.DEV) console.debug(`[source] ${method} ${status} ${url}`)
}

async function httpGet(url: string | GetOption, headers?: Record<string, string>) {
  const options =
    typeof url === "object" ? url : { url: url.includes("://") ? url : C_URL + url + "#animevsub-vsub", headers }
  const response = await Http.get(options)
  trace("GET", options.url, response.status)

  if (response.status !== 200 && response.status !== 201) throw response

  return response as Omit<typeof response, "data"> & { data: string }
}

async function httpPost(url: string, data: Record<string, number | string | boolean>, headers?: Record<string, string>) {
  const response = await Http.post({ url: C_URL + url + "#animevsub-vsub", headers, data })
  trace("POST", url, response.status)

  if (response.status !== 200 && response.status !== 201) throw response

  return response as Omit<typeof response, "data"> & { data: string }
}

export const get = Http.version ? httpGet : noExt
export const post = Http.version ? httpPost : noExt
