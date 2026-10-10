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

## Android app (no extension needed)

```sh
pnpm build:apk      # vite build + cap sync + gradlew assembleDebug
```

The APK lands in `android/app/build/outputs/apk/debug/app-debug.apk`. Gradle needs JDK 21: point `JAVA_HOME`
at one if the build stops with `invalid source release: 21`. It is a debug-signed build, fine to install by
hand; a store or long-lived build needs its own signing key.

Inside the app `src/logic/bridge.ts` sends requests through the native HTTP stack instead of the extension, and
`capacitor.config.ts` serves the bundled web under the source host so the embedded player gets the Referer it
expects. Not yet run on a device.

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

Playback embeds the CDN player page in an iframe (`embedUrl` in `src/lib/api.ts`); the URL tag makes the
extension send the source Referer with the frame request. The player then runs on the CDN origin and talks to
it from the viewer IP.

`public/player-bridge.js` is injected into that frame (by the extension as a content script, by the Android app
from `MainActivity.java`). It carries the ad shield and a postMessage remote control. On touch devices the app
draws its own controls over the player (`src/components/player/MobilePlayerControls.tsx`) and gets the end of an
episode from the bridge; with a mouse the player keeps its own controls. There is no resume position yet.

The upstream decryptor path (`src/logic/new-dha/pkg`, release build of 2026-06-14) is only used when the source
answers with something other than its iframe player. For the iframe player it is rejected by the CDN
(`403 {"status":"fail","message":"Invalid session"}`), which is why the embed is used instead.

## License

GPL-3.0-only, because the data and player layers are derived from `anime-vsub/desktop-web` (GPL-3.0). See NOTICE.md.
