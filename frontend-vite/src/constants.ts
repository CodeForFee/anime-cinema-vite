export const REGEXP_OLD_HOST_CURL = /animevietsub\.(?:\w+)/i

// Source host. Keep in sync with the Referer in avs-helper-extension/map-referer.json.
// Known alternates and the switch steps: docs/SOURCE-DOMAINS.md (or run `pnpm domains`)
export const HOST_CURL = "animevietsub.sale"
export const C_URL = "https://" + HOST_CURL

export const WARN = console.warn.bind(console)
