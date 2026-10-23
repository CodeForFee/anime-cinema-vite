# Source domains

The source site changes its domain from time to time. This is the list of hosts known as of **2026-10-23**,
so a switch is a lookup, not a search. The machine-readable copy, which the app and `pnpm domains` both read, is
[`frontend-vite/src/hosts.json`](../frontend-vite/src/hosts.json): edit that file, then this page.

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

The hosts above are compiled into the app (`SOURCE_HOSTS` in `frontend-vite/src/constants.ts`). On start,
`src/logic/source-host.ts` checks the current host in the background. If it does not answer, it tries the other
hosts in order, follows redirects to the final host, remembers the one that works (local storage), tells the
extension the new Referer (`setReferrers`) and reloads the page once. So when the source moves to a host already on
the list, the web app and the Android app recover by themselves, no rebuild needed.

Limits: a domain that is not on the list still needs the manual switch below (add it to `SOURCE_HOSTS` and
`HOSTS` in `scripts/check-domains.mjs`). In the Android app the embedded player's Referer comes from the WebView
hostname in `capacitor.config.ts`, which is fixed at build time, so a move needs a new APK for the player to
keep working even though the app's own requests follow the new host.

## Switching the source host

Replace the old host with the new one in:

1. `frontend-vite/src/constants.ts` (`HOST_CURL`)
2. `frontend-vite/capacitor.config.ts` (`server.hostname`)
3. `avs-helper-extension/map-referer.json`

Then rebuild the extension (`pnpm build` in `avs-helper-extension`, reload it in the browser) and the app. URLs
carrying an older `animevietsub.*` host are rewritten to `HOST_CURL` automatically (`REGEXP_OLD_HOST_CURL`).

If the player host changes (the `*.googleapiscdn.com` part), see the "Player host" row in the README's
Configuration table. Finally, update this file and `HOSTS` in `frontend-vite/scripts/check-domains.mjs`.
