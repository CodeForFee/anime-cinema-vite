import { HOST_CURL, isSourceHost } from "@/core/source/hosts"

/** An URL of any older animevietsub.* host (images, links) on the current one */
export function redirectOldDomainCDN(url: string): string {
  try {
    const parsed = new URL(url)
    if (isSourceHost(parsed.hostname)) {
      parsed.hostname = HOST_CURL
      return parsed.href
    }
  } catch { /* Relative artwork URLs need no host rewrite. */ }
  return url
}

/** On the current host, and https: the source still hands out some http:// image links */
export function forceHttp2(url: string): string {
  url = redirectOldDomainCDN(url)

  if (url.startsWith("http://")) return "https" + url.slice(4)

  return url
}
