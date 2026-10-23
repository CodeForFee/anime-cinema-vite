import { HOST_CURL, REGEXP_OLD_HOST_CURL } from "@/core/source/hosts"

/** An URL of any older animevietsub.* host (images, links) on the current one */
export function redirectOldDomainCDN(url: string): string {
  return url.replace(REGEXP_OLD_HOST_CURL, HOST_CURL)
}

/** On the current host, and https: the source still hands out some http:// image links */
export function forceHttp2(url: string): string {
  url = redirectOldDomainCDN(url)

  if (url.startsWith("http://")) return "https" + url.slice(4)

  return url
}
