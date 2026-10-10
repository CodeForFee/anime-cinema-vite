# Capynime (Vite)

Client-side version of the site: no backend. Every request leaves the viewer's browser through the
`avs-helper-extension` (sibling folder), the same way `anime-vsub/desktop-web` works.

## Run

```sh
# 1. build the extension and load manifest-v3/extension as "unpacked" in Edge/Chrome
cd ../avs-helper-extension && pnpm i && pnpm --filter ./manifest-v3 build

# 2. start the web (must be localhost, or a host listed in the extension's allowlist.yaml)
cd ../frontend-vite && pnpm i && pnpm dev      # http://localhost:4100
```

`pnpm test` runs the specs, `pnpm lint` (Biome, errors only), `pnpm build` type-checks and builds,
`pnpm analyze` writes `dist/stats.html`.

Stack: Vite 8 (Rolldown) + React 19 with React Compiler (UI only: `src/apis` and `src/logic` are excluded in
`vite.config.ts`, their `use*` helpers are not hooks), TanStack Query persisted to IndexedDB, Zustand,
react-router with one lazy chunk per page (`src/lib/routes.ts`, preloaded on hover/touch), PWA shell via
vite-plugin-pwa (web only; the Android app unregisters it).

## Deploy (Vercel)

Root directory `frontend-vite`. `vercel.json` pins pnpm 11.15.1, rewrites routes to `index.html` (paths with a
dot are left alone, so a stale chunk 404s instead of coming back as HTML), caches `/assets` immutable and
revalidates `index.html`/`sw.js`. Node >= 22.12 (`engines`). The production host must be in the extension
allowlist.

## Icons

`pnpm icons` makes every icon from `assets/app-icon.png`: `public/app-icon.png` (in-app logo), favicon, PWA and
maskable icons, Android launcher icons and splash screens (`scripts/icons.mjs` + `pwa-assets.config.ts`).

## Android app (no extension needed)

```sh
pnpm build:apk       # debug: android/app/build/outputs/apk/debug/app-debug.apk
pnpm build:release   # signed + minified: apk/release/app-release.apk and bundle/release/app-release.aab
```

Gradle needs JDK 21 (`JAVA_HOME`). Release signing reads `android/keystore.properties` (git-ignored; copy
`keystore.properties.example`, create the key once with the `keytool` line in it and keep it safe: without it
installed apps cannot be updated). Without that file the release build comes out unsigned. App id `app.capynime`,
version from `package.json` (2.3.4 -> versionCode 20304).

Inside the app `src/logic/bridge.ts` sends requests through the native HTTP stack instead of the extension, and
`capacitor.config.ts` serves the bundled web under the source host so the embedded player gets the Referer it
expects. Checked on a Xiaomi (Android 16): home, header under the status bar, landscape full screen, sheets.

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

## Known state (2026-10-11)

Home, detail, episode lists and playback work on localhost with the extension loaded, and in the Android app.

Playback embeds the CDN player page in an iframe (`embedUrl` in `src/lib/api.ts`); the URL tag makes the
extension send the source Referer with the frame request. The player then runs on the CDN origin and talks to
it from the viewer IP.

`public/player-bridge.js` is injected into that frame (by the extension as a content script, by the Android app
from `MainActivity.java`). It carries the ad shield and a postMessage remote control. On touch devices the app
draws its own controls over the player (`src/components/player/TouchControls.tsx`: double tap 10 s, swipe to
seek, in full screen swipe right = volume / left = brightness, speed and episode sheets); with a mouse the
player keeps its own controls and the bridge only reports the position. Positions are kept per episode
(`useProgressStore` in `src/components/player/player-logic.ts`) for "Xem tiếp". The CDN player's own resume box
(`#avs-resume-overlay`) is hidden by the bridge and answered through the app's prompt.

The upstream decryptor path (`src/logic/new-dha/pkg`, release build of 2026-06-14) is only used when the source
answers with something other than its iframe player. For the iframe player it is rejected by the CDN
(`403 {"status":"fail","message":"Invalid session"}`), which is why the embed is used instead.

## License

GPL-3.0-only, because the data and player layers are derived from `anime-vsub/desktop-web` (GPL-3.0). See NOTICE.md.
