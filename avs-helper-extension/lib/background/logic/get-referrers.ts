import Browser from "webextension-polyfill"

/**
 * The Referer map the web last asked for (set:referrers). Kept in storage because the MV3 service worker is
 * stopped after ~30 s idle: without it every restart fell back to map-referer.json and a source host the web
 * had moved to lost its Referer until the next page load.
 */
export async function getReferrers(): Promise<Record<string, string>> {
  const res = await Browser.storage.local.get("referrers")
  const referrers = res.referrers
  return referrers && typeof referrers === "object"
    ? (referrers as Record<string, string>)
    : {}
}

export function saveReferrers(referrers: Record<string, string>) {
  return Browser.storage.local.set({ referrers })
}
