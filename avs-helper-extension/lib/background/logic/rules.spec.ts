import { beforeAll, describe, expect, test, vi } from "vitest"

import { cookieExpires, isSourceHost } from "./source-host"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).__DEV__ = false
// create-rule.ts reads chrome?.declarativeNetRequest; outside a browser it falls back to plain strings
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).chrome = undefined
vi.mock("../../../allowlist.yaml", () => ({
  default: { hosts: ["localhost"] }
}))

// eslint-disable-next-line functional/no-let
let rules: typeof import("./create-rule")
beforeAll(async () => {
  // after the globals above: create-rule.ts reads them when it loads
  rules = await import("./create-rule")
})

describe("rule ids", () => {
  test("Referer rules restart at 1 and stay below the global range, however often they are set", () => {
    let max = 0
    for (let i = 0; i < 200; i++) {
      rules.resetRuleIds()
      const ids = rules
        .createRule("#animevsub-vsub", "https://animevietsub.sale/")
        .map((rule) => rule.id)
      expect(Math.min(...ids)).toBe(1)
      max = Math.max(max, ...ids)
    }
    expect(max).toBeLessThan(rules.GLOBAL_RULE_ID)
  })

  test("global rules own fixed ids in 8000-8999", () => {
    const ids = rules.globalRules().map((rule) => rule.id)
    expect(ids).toEqual([rules.GLOBAL_RULE_ID, rules.GLOBAL_RULE_ID + 1])
    expect(Math.max(...ids)).toBeLessThan(9000)
  })
})

describe("source host", () => {
  test("only animevietsub hosts are trusted with cookies", () => {
    expect(isSourceHost("https://animevietsub.sale/ajax/player")).toBe(true)
    expect(isSourceHost("https://www.animevietsub.moe/")).toBe(true)
    expect(isSourceHost("https://google.com/")).toBe(false)
    expect(isSourceHost("https://animevietsub.sale.evil.com/")).toBe(false)
    expect(isSourceHost("https://evilanimevietsub.sale/")).toBe(false)
    expect(isSourceHost("javascript:alert(1)")).toBe(false)
    expect(isSourceHost("not a url")).toBe(false)
  })

  test("cookie expirationDate is seconds since the epoch", () => {
    expect(cookieExpires(1_800_000_000).toISOString()).toBe(
      "2027-01-15T08:00:00.000Z"
    )
  })
})
