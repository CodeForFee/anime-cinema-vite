import hosts from "@/core/source/hosts.json"

export const REGEXP_OLD_HOST_CURL = /animevietsub\.(?:\w+)/i

// Source hosts, current first, then the known alternates that redirect to it (hosts.json, which
// scripts/check-domains.mjs reads too). If the current one stops answering, src/logic/source-host.ts moves to
// one that works and remembers it. Keep `current` equal to the Referer in avs-helper-extension/map-referer.json
// and to the hostname in capacitor.config.ts. How the list is kept: docs/SOURCE-DOMAINS.md (or `pnpm domains`).
export const SOURCE_HOSTS: readonly string[] = [hosts.current, ...hosts.redirecting, ...hosts.unreachable]
export const OFFICIAL_LINK = hosts.officialLink
const LOOKALIKES = new Set(hosts.lookalikes)

const SAVED_HOST_KEY = "capynime-source-host"

/** An animevietsub.* host that is not one of the look-alike sites named the same way (hosts.json) */
export const isSourceHost = (host: string | null | undefined): host is string =>
  Boolean(host && /^animevietsub\.[a-z.]+$/i.test(host) && !LOOKALIKES.has(host.toLowerCase()))

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

