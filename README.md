<div align="center">

<img src="frontend-vite/public/app-icon.png" alt="Capynime" width="120" height="120" />

# Capynime

**A fast, clean client for watching Vietsub anime. No backend, no accounts.**

[Download for Android](https://github.com/CodeForFee/anime-cinema-vite/releases/latest)
&nbsp;·&nbsp;
[Architecture](#architecture)
&nbsp;·&nbsp;
[Getting started](#getting-started)
&nbsp;·&nbsp;
[Configuration](#configuration)

<br />

<img src="https://cdn.simpleicons.org/react/61DAFB" alt="React" width="28" height="28" />&nbsp;
<img src="https://cdn.simpleicons.org/vite/646CFF" alt="Vite" width="28" height="28" />&nbsp;
<img src="https://cdn.simpleicons.org/typescript/3178C6" alt="TypeScript" width="28" height="28" />&nbsp;
<img src="https://cdn.simpleicons.org/tailwindcss/06B6D4" alt="Tailwind CSS" width="28" height="28" />&nbsp;
<img src="https://cdn.simpleicons.org/capacitor/119EFF" alt="Capacitor" width="28" height="28" />&nbsp;
<img src="https://cdn.simpleicons.org/googlechrome/4285F4" alt="Chrome extension" width="28" height="28" />

</div>

---

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Repository layout](#repository-layout)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Android app](#android-app)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Disclaimer](#disclaimer)
- [License](#license)

## Overview

Capynime is a client-side anime site. There is no server of its own: every request to the source site is made from
the viewer's own device, so the viewer's IP and cookies are used and nothing is proxied or stored remotely.

It ships in two forms that share one code base:

| Form | How requests are made | Install |
|---|---|---|
| Web app (PWA) | Through the **AVS Helper** browser extension | Open the site with the extension loaded |
| Android app | Through Capacitor's native HTTP stack | Install the APK from [Releases](https://github.com/CodeForFee/anime-cinema-vite/releases/latest) |

## Features

**Browsing**
- Home with a featured slider, a top 10 and lazy-loaded shelves.
- Explore by genre, search, watch history and favorites.

**Player** (the app draws its own controls over the source player, the same on every device)
- Double tap either side to seek 10 s, swipe sideways to scrub.
- In full screen, swipe vertically on the right for volume and on the left for brightness.
- Speed and episode menus open as drop-up popups anchored to their button on desktop.
- Cinema mode that grows the player smoothly and keeps it centered.
- Per-episode resume position, next-episode card and skip intro.

**Desktop keyboard shortcuts**

| Key | Action | Key | Action |
|---|---|---|---|
| `Space` / `K` | Play or pause | `M` | Mute |
| `←` / `→` | Seek 10 s | `F` | Full screen |
| `↑` / `↓` | Volume | `T` | Cinema mode |

**Other**
- Ad blocking at the network layer and inside the player page.
- Catalog answers are cached in IndexedDB, so returning viewers see pages immediately.

## Repository layout

| Folder | Contents | License |
|---|---|---|
| [`frontend-vite/`](frontend-vite/) | Vite + React + TypeScript web app and the Capacitor Android project | GPL-3.0-only |
| [`avs-helper-extension/`](avs-helper-extension/) | Chrome / Edge extension (Manifest V3) that the web build needs | MIT |

## Architecture

The app only ever talks to the source site, and only from the viewer's device, through one of two transports that
expose the same `Http.get` / `Http.post` API (`src/logic/bridge.ts`).

```mermaid
flowchart LR
  subgraph Viewer["Viewer's device"]
    UI["React UI<br/>pages · components · stores"]
    API["lib/api.ts<br/>animeApi adapter"]
    W["Web Workers<br/>HTML parsers"]
    BR["logic/bridge.ts<br/>one Http API"]
    UI --> API --> BR
    API --> W
    BR -- "browser" --> EXT["AVS Helper extension<br/>background worker"]
    BR -- "Android app" --> NAT["Capacitor native HTTP"]
    UI -- "iframe + postMessage" --> PL["Source player page<br/>+ player-bridge.js"]
  end
  EXT --> SRC[("Source site")]
  NAT --> SRC
  PL --> CDN[("Player / stream CDN")]
```

### Web app (`frontend-vite/src`)

| Path | Responsibility |
|---|---|
| `pages/` | One lazy route per page: `home`, `explore`, `search`, `watch`, `history`, `favorites`. Routes live in `lib/routes.ts` and are preloaded on hover or touch. |
| `components/` | `home/` slider and shelves, `layout/` header, dock and extension gate, `movie/` cards and detail views, `player/` the player UI, `lightswind/` UI primitives. |
| `lib/api.ts` | The `animeApi` adapter the UI calls: turns source pages into typed data and builds the player `embedUrl`. |
| `apis/` | One module per source endpoint. `runs/` performs the request, `parser/` turns HTML into data, `workers/` runs the parsing in a Web Worker. |
| `logic/` | Transport (`bridge.ts`, `http.ts`), HLS loading and decryption, native volume and brightness, Android back button, skip-intro lookup. |
| `stores/`, `contexts/` | Zustand stores (UI, player, history) and React contexts. |
| `hooks/` | `usePlayerBridge` (remote control of the player frame), data hooks, debounce, local storage. |
| `constants.ts` | `HOST_CURL`, the single source host everything derives from. |

State: TanStack Query caches catalog answers and persists them to IndexedDB (`idb-keyval`); Zustand holds UI and
player state; history, favorites and episode positions live in local storage.

### Player pipeline

1. `watch.tsx` asks `lib/api.ts` for an episode; the source answers with a link to its player page.
2. `CinemaPlayer.tsx` embeds that page in an `<iframe>` whose URL carries the `#animevsub-vsub_extra` tag, which makes the extension add the source Referer.
3. `public/player-bridge.js` runs inside the frame. It neutralizes the player's ads, hides the player's own controls and exposes a `postMessage` remote control (play, pause, seek, rate, volume, resume) with a state feed.
4. `usePlayerBridge` talks to the bridge. `TouchControls.tsx` draws the app's controls and sends commands through it.
5. If the source ever answers with a plain stream instead of its iframe player, `HlsPlayer.ts` plays it with a patched hls.js.

The bridge script is injected by the extension (content script) on the web and by `MainActivity.java` in the Android app.

### Extension (`avs-helper-extension`)

| Path | Responsibility |
|---|---|
| `lib/background/` | Manifest V3 service worker. Performs the fetches the page asks for and installs the `declarativeNetRequest` rules: `create-rule.ts` (Referer, Origin and User-Agent by URL tag, CORS headers), `ad-rules.ts` (ad domains), `install-referers.ts`. |
| `lib/contentScripts/` | Runs on allowlisted hosts. Relays `http:request` DOM events from the page to the worker and the answer back as `http:response`. |
| `manifest-v3/` | Build setup: `src/manifest.ts` generates `manifest.json`, `tsup` bundles into `extension/dist`. Also holds `assets/player-bridge.js`. |
| `allowlist.yaml` | Hosts allowed to use the bridge. |
| `map-referer.json` | URL tag to Referer map. Must match `HOST_CURL`. |

URL tags are how the app asks for header changes: `#animevsub-vsub` sends the source Referer, and `..._extra` also
adds CORS headers so the page can fetch images and HLS segments itself.

### Android shell (`frontend-vite/android`)

Capacitor wraps the same built web app. `bridge.ts` swaps the extension for Capacitor's native HTTP, and
`capacitor.config.ts` serves the bundle under the source host so the embedded player receives the right Referer.
`MainActivity.java` injects `player-bridge.js`, blocks ad URLs in the WebView and implements native full screen,
volume and brightness.

## Getting started

**Requirements:** Node.js 22.12 or newer, pnpm 11, and Chrome or Edge for the web build.

```sh
# 1. Build the extension, then load avs-helper-extension/manifest-v3/extension via "Load unpacked"
cd avs-helper-extension
pnpm install
pnpm build

# 2. Start the web app
cd ../frontend-vite
pnpm install
pnpm dev            # http://localhost:4100
```

After rebuilding the extension, reload it on `chrome://extensions`. The extension only works on `localhost` and the
hosts in its allowlist (see [Configuration](#configuration)).

**Scripts** (run in `frontend-vite`)

| Command | Description |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` | Type-check and build to `dist/` |
| `pnpm test` | Run the specs with Vitest |
| `pnpm lint` | Lint with Biome (errors only) |
| `pnpm analyze` | Build and write the bundle report to `dist/stats.html` |
| `pnpm build:apk` | Build a debug APK |
| `pnpm release [patch\|minor\|major]` | Bump the version and build the signed APK and AAB into `release/` |

## Android app

Download the latest `.apk` from [Releases](https://github.com/CodeForFee/anime-cinema-vite/releases/latest) and
install it. No extension is needed. Android warns about any APK installed outside Google Play; that is expected for
sideloading. If an install fails, the copy already on the phone is usually signed with a different key: uninstall
it and install again.

**Building a release** requires JDK 21, the Android SDK and a signing key (`android/keystore.properties` and
`android/capynime-release.jks`, both git-ignored). `pnpm release` bumps the version in `package.json`, builds, signs
and copies `Capynime-<version>.apk` and `.aab` into `frontend-vite/release/`. Commit `package.json` afterwards, and
keep a backup of the keystore: without it, installed apps can no longer be updated. More detail in
[`frontend-vite/README.md`](frontend-vite/README.md).

## Deployment

The web app is a static site: `pnpm build` produces `frontend-vite/dist`. Serve it with every path rewritten to
`index.html`; `vercel.json` already does this for Vercel. The server never contacts the source site, so its location
and IP do not matter.

Viewers need the extension build that lists your production host in `allowlist.yaml`.

## Configuration

| Setting | File | Purpose |
|---|---|---|
| Source host | `frontend-vite/src/constants.ts` (`HOST_CURL`) | The site all requests go to |
| Source host (Android) | `frontend-vite/capacitor.config.ts` (`server.hostname`) | Must equal `HOST_CURL` |
| Referer map | `avs-helper-extension/map-referer.json` | Must use the same host as `HOST_CURL` |
| Allowed web hosts | `avs-helper-extension/allowlist.yaml` | Hosts that may use the extension bridge |
| Player host | `avs-helper-extension/manifest-v3/src/manifest.ts`, `lib/background/logic/ad-rules.ts`, `MainActivity.java` | The player CDN (`*.googleapiscdn.com`) the bridge and ad rules apply to |

After changing any of these, rebuild the extension and the app. Known alternate source domains, the official
announcement channels and the exact switch steps are in [`docs/SOURCE-DOMAINS.md`](docs/SOURCE-DOMAINS.md); run
`pnpm domains` in `frontend-vite` to see which host is current.

## Disclaimer

Capynime hosts no media and operates no servers. It is a client that loads content from a third-party site the user
chooses to visit. It is not affiliated with that site, and users are responsible for how they use it and for
complying with the laws that apply to them.

## License

The web app is licensed under **GPL-3.0-only**, as its data and player layers are derived from
[`anime-vsub/desktop-web`](https://github.com/anime-vsub/desktop-web). The extension is a fork of
[`anime-vsub/extension-animevsub-helper`](https://github.com/anime-vsub/extension-animevsub-helper) and is licensed under **MIT**.
See `frontend-vite/NOTICE.md` and `avs-helper-extension/LICENSE`.
