# Source domains

The source site changes its domain from time to time. This is the list of hosts known as of **2026-10-23**,
so a switch is a lookup, not a search. The machine-readable copy, which the app and `pnpm domains` both read, is
[`frontend-vite/src/core/source/hosts.json`](../frontend-vite/src/core/source/hosts.json): edit that file, then this page.

## Current

| Role | Host |
|---|---|
| Site (use as `HOST_CURL`) | `animevietsub.sale` |
| Images | `cdn.animevietsub.sale`, `cdn.animevietsub.site` |
| Player / streams | `stream.googleapiscdn.com` (previously `storage.googleapiscdn.com`) |

Find the current host in one command (`frontend-vite`): `pnpm domains`. It follows the official short link and
probes every host below.

## Hosts that redirect to the current site (verified 2026-10-23)

`animevietsub.link`, `.fan`, `.vip`, `.bio`, `.me`, `.moe`, `.now`, `.cam`, `.xyz`, `.info`, `.in`, `.us`
(`.bio`, `.me`, `.moe`, `.now`, `.cam` and `.us` are new on 2026-10-23)

Chains seen: `xyz → link → sale`, `info → fan → sale`, `in → vip → sale`, `us → vip → sale`. They can be used as
fallbacks while a new domain is being rolled out, but the app should point at the final host (`sale`), not at a
redirecting one.

Redirected on 2026-10-16 but answer only now and then from a Vietnamese connection (kept, tried last):
`.site`, `.tv`, `.app`, `.cc`.

## Dead

`animevietsub.nl` no longer resolves (NXDOMAIN). It was the host before `.sale`.

## Not the same site (do not use)

These matched searches or a guess but are other sites, parked pages or worse (checked 2026-10-23):

- copy sites: `.wtf` (titled "AnimeVietsub"), `.global`, `.gg`, `.ac`, `.fm`, `.stream`, `.co`, `.ws` (all go to
  `animevsub.de`, AnimeHay), `animevietsub1.net`, `animevietsubhd.cc`, `animevietsubs.com`, `animevietsubs.cc`
- elsewhere: `.to` (`shi-atsu.nl`), `.mobi` (a gambling site), `.life` (spam)
- parked, test pages or no site: `.biz`, `.red`, `.asia`, `.run`, `.blog`, `.click`, `.ru`, `.pw`, `.dev`, `.one`,
  `.lol`, `.show`

Look-alike domains are common and some answer 200 with an "AnimeVietsub" title, so a name alone proves nothing.
The app refuses every host in `lookalikes` of `hosts.json`; check a new domain against the official channels below
before adding it.

## Official announcement channels

- Short link: `https://bit.ly/animevietsubtv` (redirects to the current host; the safest first check)
- X / Twitter: `@AnimeVsub`
- Facebook page: `facebook.com/animevietsub.info`

## Automatic fallback (built in)

The list is compiled into the app (`frontend-vite/src/core/source/hosts.json`). Every request to the source goes
through `src/core/source/transport.ts`, which handles a move without the viewer noticing:

- **Timeouts.** A request to the source gives up after 12 s instead of hanging on a dead host.
- **Failover.** A network error, a timeout or a 5xx answer (while the device is online) starts one discovery round,
  shared by every request waiting at that moment: the official short link and every known host are probed in
  parallel (6 s each) and the first valid answer wins. The failed request is then sent again, same path and body,
  to the new host; the screen only sees a slower request. A 404 or an offline device never starts a round.
- **Redirects.** When a request lands on another `animevietsub.*` host (the source moved and the old domain
  redirects), that host is adopted for every later request once its home page checks out.
- **Trust.** A host is adopted only when a trusted entry point (the official link or a known host) leads to it, it
  is not in `lookalikes`, and its home page carries the markers the home parser needs (`MovieListTopCn` /
  `MovieListSldCn` and `TPostMv`). A domain that only has the name is never used. A new domain reached through the
  official link works without a rebuild.
- **No reload.** The host changes while the app runs: the extension gets the new Referer first, then the host is
  switched, active queries refetch and cached image URLs are rewritten to the new host when drawn.
- **Daily check.** Once a day, when the app is idle, the official link is followed, so a new domain is learned
  before the old one dies.

Limits: in the Android app the embedded player's Referer comes from the WebView hostname in `capacitor.config.ts`,
which is fixed at build time. Whether the CDN still plays with an older source domain as the Referer could not be
tested from an automated browser (the CDN refuses those); check it on a phone. If it does not, a move still needs
a new APK for the player, while the app's own requests follow the new host either way.

## Switching the source host

Replace the old host with the new one in:

1. `frontend-vite/src/core/source/hosts.json` (`current`; move the old one into `redirecting`)
2. `frontend-vite/capacitor.config.ts` (`server.hostname`)
3. `avs-helper-extension/map-referer.json`

Then rebuild the extension (`pnpm build` in `avs-helper-extension`, reload it in the browser) and the app. URLs
carrying an older `animevietsub.*` host are rewritten to `HOST_CURL` automatically (`REGEXP_OLD_HOST_CURL`).

If the player host changes (the `*.googleapiscdn.com` part), see the "Player host" row in the README's
Configuration table. Finally, update this file (`pnpm domains` reads `hosts.json`).
