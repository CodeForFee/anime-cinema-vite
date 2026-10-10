# Anime Cinema (Vite)

Client-side version of the site: no backend. Every request leaves the viewer's browser through the
`avs-helper-extension` (sibling folder), the same way `anime-vsub/desktop-web` works.

## Run

```sh
# 1. build the extension and load manifest-v3/extension as "unpacked" in Edge/Chrome
cd ../avs-helper-extension && pnpm i && pnpm --filter ./manifest-v3 build

# 2. start the web (must be localhost, or a host listed in the extension's allowlist.yaml)
cd ../frontend-vite && pnpm i && pnpm dev      # http://localhost:4100
```

`pnpm test` runs the parser specs, `pnpm build` type-checks and builds.

## How it is wired

| Layer | Where | Origin |
|---|---|---|
| UI (pages, components, stores) | `src/pages`, `src/components`, `src/stores` | copied from `frontend-nextjs` in the anime-cinema repo |
| `animeApi` adapter the UI calls | `src/lib/api.ts` | new |
| Requests + HTML parsers (in Web Workers) | `src/apis`, `src/logic/http.ts` | ported from desktop-web |
| Player: link decrypt + patched hls.js loader | `src/apis/runs/ajax/player-link.ts`, `src/logic/hls-patched.ts`, `src/components/player/HlsPlayer.ts` | ported from desktop-web |

Two channels to the extension:

- `Http.get/post` (`src/logic/http.ts`): the extension's background worker does the fetch, so there is no CORS
  and the viewer's own cookies/IP are used.
- A `#animevsub-vsub_extra` tag on a URL the page fetches itself (images, HLS segments): the extension sets the
  source `Referer` and adds CORS headers to the response.

The source host is `src/constants.ts`; keep it equal to the Referer in `../avs-helper-extension/map-referer.json`.

## Known state (2026-10-10)

Home, detail, episode lists and playback work on localhost with the extension loaded.

Playback embeds the CDN's own player page in an iframe (`embedUrl` in `src/lib/api.ts`); the URL tag makes the
extension send the source Referer with the frame request. The player then runs on the CDN's origin and talks to
it from the viewer's IP. Consequences: its own ads show (for example on pause), there is no resume position, and
the page cannot see when an episode ends, so there is no automatic next episode.

The upstream decryptor path (`src/logic/new-dha/pkg`, release build of 2026-06-14) is only used when the source
answers with something other than its iframe player. For the iframe player it is rejected by the CDN
(`403 {"status":"fail","message":"Invalid session"}`), which is why the embed is used instead.

## License

GPL-3.0-only, because the data and player layers are derived from `anime-vsub/desktop-web` (GPL-3.0). See NOTICE.md.
