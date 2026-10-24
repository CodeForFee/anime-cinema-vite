# Capynime (Vite)

React/Vite frontend with same-project Vercel Functions. On the web, source HTML/JSON goes through
`api/proxy.ts`; `api/player.ts` injects the bridge into an isolated player frame. The web transport
does not require the sibling extension. Android keeps its native HTTP and bridge injection.

This branch is experimental: upstream acceptance and real playback must pass the Preview gate in
[`SERVERLESS.md`](SERVERLESS.md). API/build success alone does not prove extension-free playback.

## Run

```sh
pnpm install
cd .. # Vercel project Root Directory remains frontend-vite
npx vercel dev  # web + /api/*; requires a linked Vercel project
# pnpm dev runs the Vite UI only; it does not serve the Functions.
```

`pnpm test` runs the specs, `pnpm lint` (Biome, errors only), `pnpm build` type-checks and builds,
`pnpm analyze` writes `dist/stats.html`.

Stack: Vite 8 (Rolldown) + React 19 with React Compiler (UI only: `src/apis` and `src/logic` are excluded in
`vite.config.ts`, their `use*` helpers are not hooks), TanStack Query persisted to IndexedDB, Zustand,
TanStack Router with one lazy chunk per page and per form factor (`src/app/routes.tsx`), PWA shell via
vite-plugin-pwa (web only; the Android app unregisters it).

## Deploy (Vercel)

Root directory `frontend-vite`. `api/` sits next to `src/`, not inside `dist/`. `vercel.json` pins pnpm
11.15.1, bounds Functions to 30 seconds and excludes `/api/*` from the SPA rewrite. The PWA also excludes
API navigation from its offline fallback. Assets remain immutable; `index.html`/`sw.js` revalidate.
Node >= 22.12 (`engines`). Use a Preview deployment before merging; source-side 403/session restrictions
may still prevent playback. No extension allowlist change or Android rebuild is needed.

## Icons

`pnpm icons` makes every icon from `assets/app-icon.png`: `public/app-icon.png` (in-app logo), favicon, PWA and
maskable icons, Android launcher icons and splash screens (`scripts/icons.mjs` + `pwa-assets.config.ts`).

## Android app (no extension needed)

```sh
pnpm build:apk          # debug: android/app/build/outputs/apk/debug/Capynime-<version>-debug.apk
pnpm release [patch|minor|major]   # bump version, signed APK + AAB -> release/Capynime-<version>.apk|.aab
```

`pnpm release` bumps `package.json` (versionCode follows: 2.3.4 -> 20304, so every release can update the
installed app), builds, signs and copies the files to `release/`; on failure it puts the version back. It finds a
JDK 21+ itself (JAVA_HOME, Android Studio jbr, Adoptium). Commit `package.json` after a release.

Signing reads `android/keystore.properties` + `android/capynime-release.jks` (both git-ignored; back them up:
without them installed apps can no longer be updated). The script refuses to build without them. App id
`app.capynime`. Phones warn about any APK installed outside Google Play; that is normal for sideloading, not a
fault of the build. An install that fails is almost always a different signing key on the copy already installed.


Inside the app `src/platform/transport.ts` sends requests through the native HTTP stack instead of the extension, and
`capacitor.config.ts` serves the bundled web under the source host so the embedded player gets the Referer it
expects. Checked on a Xiaomi (Android 16): home, header under the status bar, landscape full screen, sheets.

## How it is wired

The layers, routing, domain failover and player pipeline are described in the [root README](../README.md#architecture).
In short:

| Layer | Where |
|---|---|
| Platform-free logic: source requests and parsers, queries, stores, player policy | `src/core` |
| Browser / Capacitor adapters: transport, parser worker, art cache, back button | `src/platform` |
| UI primitives and helpers | `src/shared` |
| One folder per feature, `mobile/` and `desktop/` apart | `src/features` |
| Shell, layout, router | `src/app` |

`pnpm test` includes `src/architecture.spec.ts`, which fails when a layer imports one it must not.

Two channels to the extension:

- The transport (`src/platform/transport.ts`): the extension's background worker does the fetch, so there is no
  CORS and the viewer's own cookies/IP are used.
- A `#animevsub-vsub_extra` tag on a URL the page fetches itself (images, HLS segments): the extension sets the
  source `Referer` and adds CORS headers to the response.

## Known state (2026-10-23)

Playback embeds the CDN player page in an iframe; `public/player-bridge.js` is injected into it (by the extension
as a content script, by the Android app from `MainActivity.java`). The app draws its own controls over it on
every device. The quality menu appears once the bridge reports JW Player's levels, so an extension built before
2026-10-23 shows no quality button until it is rebuilt.

The upstream decryptor path (`src/features/player/engines/hls/new-dha`) is only used when the source answers with
something other than its iframe player. For the iframe player it is rejected by the CDN
(`403 {"status":"fail","message":"Invalid session"}`), which is why the embed is used instead.

## License

GPL-3.0-only, because the data and player layers are derived from `anime-vsub/desktop-web` (GPL-3.0). See NOTICE.md.
