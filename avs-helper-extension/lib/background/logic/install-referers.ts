import { createRule } from "./create-rule"
import { installRules } from "./install-rules"

const referrersInstalled = new Set<string>()
// eslint-disable-next-line @typescript-eslint/no-empty-function
const NOOP = () => {}

export function installReferrer(name: string, value: string) {
  if (referrersInstalled.has(name)) return NOOP
  referrersInstalled.add(name)

  return installRules(createRule(name, value))
}
// Rule ids below this belong to the Referer rules (create-rule.ts counts up from 1); ad-rules.ts starts at 9000
const REFERER_RULE_LIMIT = 9000

/**
 * Installs the Referer rules for `referers`, replacing the ones installed before. Without that, asking for a
 * new host (set:referrers) would leave the old rule next to the new one, both setting the same header.
 */
export async function installReferrers(referers: Record<string, string>) {
  const rules = Object.entries(referers).reduce((rules, [name, value]) => {
    rules.push(...createRule(name, value))
    return rules
    // eslint-disable-next-line no-undef
  }, [] as chrome.declarativeNetRequest.Rule[])
  // eslint-disable-next-line no-undef
  if (__DEV__) console.log(rules)
  if (!rules.length) return
  if (__MV3__) {
    const stale = (await chrome.declarativeNetRequest.getDynamicRules())
      .filter((rule) => rule.id < REFERER_RULE_LIMIT)
      .map((rule) => rule.id)
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: stale })
  }
  return installRules(rules)
}
