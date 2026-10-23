import { core, type SourceRequest } from "@/core/configure"
import { C_URL } from "@/core/source/hosts"

const noTransport = () =>
  Object.assign(new Error("Trang web cần extension AVS Helper để hoạt động bình thường"), { extesionNotExists: true })

// Status and URL only, in development: whole HTML pages in the console cost memory and time on a phone
const trace = (method: string, url: string, status: number) => {
  if (import.meta.env.DEV) console.debug(`[source] ${method} ${status} ${url}`)
}

type Page = { status: number; url: string; data: string; headers: Record<string, string> }

/** GET a page of the source: a path is taken relative to the current host and sent with the source Referer */
export async function get(url: string | SourceRequest, headers?: Record<string, string>): Promise<Page> {
  const { transport } = core()
  if (!transport.version) throw noTransport()

  const request = typeof url === "object" ? url : { url: url.includes("://") ? url : `${C_URL}${url}#animevsub-vsub`, headers }
  const response = await transport.get(request)
  trace("GET", request.url, response.status)

  if (response.status !== 200 && response.status !== 201) throw response
  return response
}

/** POST a form to an endpoint of the source (path relative to the current host) */
export async function post(
  url: string,
  data: Record<string, number | string | boolean>,
  headers?: Record<string, string>
): Promise<Page> {
  const { transport } = core()
  if (!transport.version) throw noTransport()

  const response = await transport.post({ url: `${C_URL}${url}#animevsub-vsub`, headers, data })
  trace("POST", url, response.status)

  if (response.status !== 200 && response.status !== 201) throw response
  return response
}
