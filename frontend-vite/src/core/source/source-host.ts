import { core } from "@/core/configure"
import { C_URL, HOST_CURL, isSourceHost, SOURCE_HOSTS, setSourceHost } from "@/core/source/hosts"

const PROBE_TIMEOUT_MS = 10_000
const RELOADED_FOR = "capynime-host-reloaded"

/** The host the home page of `host` ends up on after redirects, or null if it does not answer */
async function probe(host: string): Promise<string | null> {
  try {
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), PROBE_TIMEOUT_MS))
    const res = await Promise.race([core().transport.get({ url: `https://${host}/#animevsub-vsub` }), timeout])
    if (res.status !== 200) return null
    const final = new URL(res.url).hostname
    return isSourceHost(final) ? final : null
  } catch {
    return null
  }
}

/**
 * Finds a source host that answers: the current one first, then the known alternates, following redirects to
 * the final host. A different host is remembered, the extension is told its Referer, and the page reloads once
 * so every request starts on it.
 */
export async function resolveSourceHost(candidates: readonly string[] = SOURCE_HOSTS) {
  const tried = new Set<string>()
  for (const host of [HOST_CURL, ...candidates]) {
    if (tried.has(host)) continue
    tried.add(host)

    const final = await probe(host)
    if (!final) continue

    const changed = final !== HOST_CURL
    if (changed) setSourceHost(final)
    // the extension's Referer rule is built for one host; the native app sets its own Referer from C_URL
    if (changed || final !== SOURCE_HOSTS[0]) await Promise.resolve(core().transport.hostChanged?.(C_URL)).catch(() => undefined)
    if (changed && sessionStorage.getItem(RELOADED_FOR) !== final) {
      sessionStorage.setItem(RELOADED_FOR, final)
      location.reload()
    }
    return final
  }
  return null
}
