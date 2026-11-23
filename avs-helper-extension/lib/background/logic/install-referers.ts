import { createRule, GLOBAL_RULE_ID, resetRuleIds } from "./create-rule"
import { installRules } from "./install-rules"

const referrersInstalled = new Set<string>()
// eslint-disable-next-line @typescript-eslint/no-empty-function
const NOOP = () => {}

export function installReferrer(name: string, value: string) {
  if (referrersInstalled.has(name)) return NOOP
  referrersInstalled.add(name)

  return installRules(createRule(name, value))
}

// eslint-disable-next-line functional/no-let
let queue: Promise<unknown> = Promise.resolve()

/**
 * Installs the Referer rules for `referers`, replacing the ones installed before. Without that, asking for a
 * new host (set:referrers) would leave the old rule next to the new one, both setting the same header.
 * Calls run one after the other (two at once would both remove the same ids and add duplicates), and ids
 * restart at 1 each time, so they never climb into the global (8000+) or ad (9000+) ranges.
 */
export function installReferrers(referers: Record<string, string>) {
  const run = queue.then(async () => {
    resetRuleIds()
    const rules = Object.entries(referers).flatMap(([name, value]) =>
      createRule(name, value)
    )
    // eslint-disable-next-line no-undef
    if (__DEV__) console.log(rules)
    if (!rules.length) return
    if (__MV3__) {
      const stale = (await chrome.declarativeNetRequest.getDynamicRules())
        .filter((rule) => rule.id < GLOBAL_RULE_ID)
        .map((rule) => rule.id)
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: stale
      })
    }
    await installRules(rules)
  })
  queue = run.catch(() => undefined)
  return run
}
