import { core, type SourceResponse } from "@/core/configure"
import { C_URL, HOST_CURL, isSourceHost, OFFICIAL_LINK, SOURCE_HOSTS, setSourceHost } from "@/core/source/hosts"
import { request } from "@/core/source/request"

const DAY = 86_400_000
const CHECKED = "capynime-source-checked"
let resolving: Promise<string | null> | undefined
let adopting: Promise<void> = Promise.resolve()

export function sourceOrigin(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" && !parsed.port && !parsed.username && !parsed.password && isSourceHost(parsed.hostname)
      ? parsed.hostname : null
  } catch { return null }
}

/** Require the home parser's HTML markers as well as a trusted redirect chain. */
export function isSourceHome(response: SourceResponse) {
  return response.status === 200 && Boolean(sourceOrigin(response.url)) &&
    /class\s*=\s*["'][^"']*\bMovieList(?:Top|Sld)Cn\b/i.test(response.data) &&
    /class\s*=\s*["'][^"']*\bTPostMv\b/i.test(response.data)
}

export function adoptSourceHost(host: string) {
  const next = adopting.catch(() => undefined).then(async () => {
    if (host === HOST_CURL || !isSourceHost(host)) return
    // New requests must see the new Referer rule before they see the new source origin.
    await core().transport.hostChanged?.(`https://${host}`)
    setSourceHost(host)
  })
  adopting = next
  return next
}

async function probe(url: string, failedHost?: string) {
  const response = await request("get", { url }, 6_000)
  if (!isSourceHome(response)) throw new Error("Invalid source home")
  const host = sourceOrigin(response.url)!
  if (host === failedHost) throw new Error("Source still unavailable")
  return host
}

/** Every failed caller shares one parallel discovery round. */
export function resolveSourceHost(candidates: readonly string[] = SOURCE_HOSTS, failedHost?: string): Promise<string | null> {
  if (resolving) return resolving
  if (typeof navigator !== "undefined" && navigator.onLine === false) return Promise.resolve(null)
  resolving = (async () => {
    try {
      const urls = [OFFICIAL_LINK, ...new Set([HOST_CURL, ...candidates])]
        .filter((host) => host === OFFICIAL_LINK || host !== failedHost && isSourceHost(host))
        .map((host) => host === OFFICIAL_LINK ? host : `https://${host}/#animevsub-vsub`)
      const host = await Promise.any(urls.map((url) => probe(url, failedHost)))
      await adoptSourceHost(host)
      return host
    } catch { return null }
    finally { resolving = undefined }
  })()
  return resolving
}

/** Idle once per day; startup catalog requests already check the current source. */
export async function checkOfficialSource() {
  if (!core().transport.version || typeof navigator !== "undefined" && navigator.onLine === false) return
  try {
    if (Date.now() - Number(localStorage.getItem(CHECKED)) < DAY) return
    await adoptSourceHost(await probe(OFFICIAL_LINK))
    localStorage.setItem(CHECKED, String(Date.now()))
  } catch { /* Keep the working source when idle discovery fails. */ }
}

export const syncSourceReferer = () => core().transport.hostChanged?.(C_URL)
