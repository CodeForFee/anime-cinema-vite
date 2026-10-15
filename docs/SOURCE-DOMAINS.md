# Source domains

The source site changes its domain from time to time. This is the list of hosts known as of **2026-10-16**,
so a switch is a lookup, not a search.

## Current

| Role | Host |
|---|---|
| Site (use as `HOST_CURL`) | `animevietsub.sale` |
| Images | `cdn.animevietsub.sale`, `cdn.animevietsub.site` |
| Player / streams | `stream.googleapiscdn.com` (previously `storage.googleapiscdn.com`) |

Find the current host in one command (`frontend-vite`): `pnpm domains`. It follows the official short link and
probes every host below.

## Hosts that redirect to the current site (verified 2026-10-16)

`animevietsub.link`, `.xyz`, `.fan`, `.info`, `.site`, `.tv`, `.vip`, `.app`, `.in`, `.cc`

Chains seen: `xyz → link → sale`, `info → fan → sale`, `in → vip → sale`. They can be used as fallbacks while a
new domain is being rolled out, but the app should point at the final host (`sale`), not at a redirecting one.

## Dead

`animevietsub.nl` no longer resolves (NXDOMAIN). It was the host before `.sale`.

## Not the same site (do not use)

These matched searches but are other sites or parked pages: `animevietsub.global` (AnimeHay), `.dev`, `.wtf`,
`.red`, `.click`, `.one`, `.lol`, `.ru`, `.show`, `animevietsub1.net`, `animevietsubhd.cc`. Look-alike domains are
common, so check a new one against the official channels below before trusting it.

## Official announcement channels

- Short link: `https://bit.ly/animevietsubtv` (redirects to the current host; the safest first check)
- X / Twitter: `@AnimeVsub`
- Facebook page: `facebook.com/animevietsub.info`

## Switching the source host

Replace the old host with the new one in:

1. `frontend-vite/src/constants.ts` (`HOST_CURL`)
2. `frontend-vite/capacitor.config.ts` (`server.hostname`)
3. `avs-helper-extension/map-referer.json`

Then rebuild the extension (`pnpm build` in `avs-helper-extension`, reload it in the browser) and the app. URLs
carrying an older `animevietsub.*` host are rewritten to `HOST_CURL` automatically (`REGEXP_OLD_HOST_CURL`).

If the player host changes (the `*.googleapiscdn.com` part), see the "Player host" row in the README's
Configuration table. Finally, update this file and `HOSTS` in `frontend-vite/scripts/check-domains.mjs`.
