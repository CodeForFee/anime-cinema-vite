// pnpm domains: finds the source's current host. The official short link (bit.ly/animevietsubtv) is the
// source's own announcement channel, so it comes first; then every known host is probed and shown with
// where it redirects. Update HOSTS below when a new domain shows up (also see docs/SOURCE-DOMAINS.md).
const SHORT_LINK = "https://bit.ly/animevietsubtv"

// Known hosts: current, then older/alternate ones that redirect to it
const HOSTS = [
  "animevietsub.sale",
  "animevietsub.link",
  "animevietsub.xyz",
  "animevietsub.fan",
  "animevietsub.info",
  "animevietsub.site",
  "animevietsub.tv",
  "animevietsub.vip",
  "animevietsub.app",
  "animevietsub.in",
  "animevietsub.nl",
  "animevietsub.cc"
]

async function probe(url) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(12000) })
    return `${res.status} -> ${new URL(res.url).host}`
  } catch (error) {
    return `no answer (${error.cause?.code ?? error.name})`
  }
}

console.log(`official short link: ${await probe(SHORT_LINK)}\n`)
for (const host of HOSTS) console.log(host.padEnd(22), await probe(`https://${host}/`))
console.log("\nWhen the current host changes, follow 'Switching the source host' in docs/SOURCE-DOMAINS.md")
