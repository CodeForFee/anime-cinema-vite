// pnpm domains: finds the source's current host. The official short link is the source's own announcement
// channel, so it comes first; then every known host is probed hop by hop, so each redirect chain shows.
// The list lives in src/core/source/hosts.json (the app reads the same file); update it when a new domain shows up and see
// docs/SOURCE-DOMAINS.md for how to tell the real site from look-alikes.
import hosts from "../src/core/source/hosts.json" with { type: "json" }

const UA = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36"
const KNOWN = [hosts.current, ...hosts.redirecting, ...hosts.unreachable, ...hosts.dead]

/** "301 -> a 301 -> b 200": every hop of a redirect chain, then the final status */
async function chain(url) {
  const hops = []
  for (let hop = 0; hop < 8; hop++) {
    try {
      const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(12_000), headers: { "user-agent": UA } })
      const location = res.headers.get("location")
      if (res.status < 300 || res.status >= 400 || !location) return [...hops, String(res.status)].join(" ")
      url = new URL(location, url).href
      hops.push(`${res.status} -> ${new URL(url).host}`)
    } catch (error) {
      return [...hops, `no answer (${error.cause?.code ?? error.name})`].join(" ")
    }
  }
  return [...hops, "too many redirects"].join(" ")
}

console.log(`list checked ${hosts.checked}; current host in the list: ${hosts.current}\n`)
console.log(`official link  ${await chain(hosts.officialLink)}\n`)
const results = await Promise.all(KNOWN.map(async (host) => [host, await chain(`https://${host}/`)]))
for (const [host, result] of results) console.log(host.padEnd(22), result)
console.log("\nA 403 at the end is the site refusing a script, not a dead host. When the current host changes,")
console.log("follow 'Switching the source host' in docs/SOURCE-DOMAINS.md.")
