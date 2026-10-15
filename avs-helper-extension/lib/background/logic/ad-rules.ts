/* eslint-disable no-undef */
// Ad requests of the source player, blocked at the network layer. Same list as
// animevietsub-adshield-extension/rules.json plus the player's own ad endpoint; keep in sync with
// AD_URL_PARTS in frontend-vite/android/.../MainActivity.java.
// Ids start far above the ones create-rule.ts hands out.
const FIRST_ID = 9000

const blocked: [urlFilter: string, resourceTypes: string[]][] = [
  ["||adqc.net", ["script", "xmlhttprequest", "image", "sub_frame", "other"]],
  ["||popads.net", ["script", "xmlhttprequest", "sub_frame"]],
  ["||adsterra.com", ["script", "xmlhttprequest", "sub_frame"]],
  ["||propellerads.com", ["script", "xmlhttprequest", "sub_frame"]],
  // the player's service worker re-fetches these, and a worker fetch is not typed "script"
  ["||googleapiscdn.com/static/jwplayer/vast.js", ["script", "xmlhttprequest", "other"]],
  ["||googleapiscdn.com/admin/api/ads/active", ["script", "xmlhttprequest", "other"]]
]

export const adRules = blocked.map(
  ([urlFilter, resourceTypes], index) =>
    ({
      id: FIRST_ID + index,
      priority: 2,
      action: { type: "block" },
      condition: { urlFilter, resourceTypes }
    }) as chrome.declarativeNetRequest.Rule
)
