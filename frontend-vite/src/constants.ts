export const REGEXP_OLD_HOST_CURL = /animevietsub\.(?:\w+)/i

// Source hosts, current first. The rest are known alternates that redirect to the current site: if the
// current one stops answering, src/logic/source-host.ts moves to the first that works and remembers it.
// Keep the first entry equal to the Referer in avs-helper-extension/map-referer.json and to the hostname in
// capacitor.config.ts. The list, its sources and the switch steps: docs/SOURCE-DOMAINS.md (or `pnpm domains`).
export const SOURCE_HOSTS = [
  "animevietsub.sale",
  "animevietsub.link",
  "animevietsub.fan",
  "animevietsub.xyz",
  "animevietsub.vip",
  "animevietsub.site",
  "animevietsub.tv",
  "animevietsub.app",
  "animevietsub.in",
  "animevietsub.info",
  "animevietsub.cc"
]

const SAVED_HOST_KEY = "capynime-source-host"
const isSourceHost = (host: string | null): host is string => Boolean(host && /^animevietsub\.[a-z.]+$/i.test(host))

function savedHost() {
  try {
    const host = localStorage.getItem(SAVED_HOST_KEY)
    return isSourceHost(host) ? host : null
  } catch {
    return null // no localStorage (a worker, private mode)
  }
}

// Live bindings: every importer sees a host that setSourceHost changes later
export let HOST_CURL = savedHost() ?? SOURCE_HOSTS[0]
export let C_URL = "https://" + HOST_CURL

export function setSourceHost(host: string) {
  if (!isSourceHost(host)) return
  HOST_CURL = host
  C_URL = "https://" + host
  try {
    localStorage.setItem(SAVED_HOST_KEY, host)
  } catch {
    // not remembered; the next start probes again
  }
}

export const WARN = console.warn.bind(console)
