/**
 * Only the source gets the viewer's cookies. Any script on an allowlisted page (every localhost dev server
 * included) can call the bridge, so without this check it could read every cookie of any site, httpOnly ones
 * too, and plant cookies anywhere. Other hosts are fetched without credentials and see no cookies.
 * godkit: matches animevietsub.<tld> only (frontend-vite/src/core/source/hosts.json); a source rebrand to
 * another name needs this pattern updated.
 */
export function isSourceHost(url: string) {
  try {
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    const { protocol, hostname } = new URL(url)
    return (
      (protocol === "https:" || protocol === "http:") &&
      /(^|\.)animevietsub\.[a-z]{2,}$/i.test(hostname)
    )
  } catch {
    return false
  }
}

/** chrome.cookies gives expirationDate in seconds since the epoch */
export const cookieExpires = (expirationDate: number) =>
  new Date(expirationDate * 1000)
