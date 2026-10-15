<div align="center">

# 🎬 Capynime

**Watch Vietsub anime fast and clean, with no backend.**

A web app plus an Android app. Every request goes straight from the viewer's own device.

[![Download APK](https://img.shields.io/badge/Android-download%20APK-3DDC84?logo=android&logoColor=white)](../../releases/latest)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor&logoColor=white)

</div>

---

## ✨ Features

- 🏠 **Home**: featured slider, top 10, smooth lazy-loaded shelves.
- 🔎 **Explore** by genre, fast search, watch history and favorites.
- ▶️ **The app's own player**, drawn over the source player, one UI on every device:
  - Double tap either side to seek ±10 s, swipe sideways to scrub.
  - Full screen: swipe up/down on the right for volume, on the left for brightness.
  - Speed and episode menus open as **drop-up popups** anchored to their button (desktop).
  - **Cinema mode**: centered, grows smoothly, shortcut `T`.
  - Desktop shortcuts: `Space`/`K` play/pause, `←` `→` seek, `↑` `↓` volume, `M` mute, `F` full screen, `T` cinema mode.
  - Remembers the position of every episode ("Continue watching"), next-episode card, skip intro.
- 🛡️ **Ad blocking** at the network layer and inside the player page.
- 📱 **PWA** on the web and an **Android app** (no extension needed).

## 🧱 Structure

| Folder | What | License |
|---|---|---|
| [`frontend-vite/`](frontend-vite/) | Vite + React + TypeScript web app, also the base of the Android app (Capacitor) | GPL-3.0-only (see `NOTICE.md`) |
| [`avs-helper-extension/`](avs-helper-extension/) | Chrome/Edge extension (Manifest V3) the web build needs | MIT |

## 🚀 Run

```sh
# 1. Build the extension, then load avs-helper-extension/manifest-v3/extension as "Load unpacked"
cd avs-helper-extension && pnpm i && pnpm build

# 2. Start the web app
cd ../frontend-vite && pnpm i && pnpm dev      # http://localhost:4100
```

After rebuilding the extension, **reload** it in `chrome://extensions`.

| Command (in `frontend-vite`) | What it does |
|---|---|
| `pnpm test` | Run the specs (Vitest) |
| `pnpm lint` | Biome, errors only |
| `pnpm build` | Type-check and build to `dist/` |
| `pnpm build:apk` | Debug APK |
| `pnpm release [patch\|minor\|major]` | Bump the version, build the signed APK + AAB into `release/` |

> `pnpm release` needs JDK 21 and `android/keystore.properties`. Details in [frontend-vite/README.md](frontend-vite/README.md).

## 📲 Install the Android app

Download the latest `.apk` from **[Releases](../../releases/latest)** and install it. The phone warns about any APK
installed outside Google Play; that is normal. If the install fails, the copy already installed is usually signed
with a different key: uninstall it and install again.

## 🌐 Deploy

The web app is static files (`pnpm build` → `frontend-vite/dist`); rewrite every path to `index.html`
(`vercel.json` already does this for Vercel). The server never contacts the source site, so its IP does not matter.

The extension only works on the hosts listed in [`avs-helper-extension/allowlist.yaml`](avs-helper-extension/allowlist.yaml):
add the production host there, rebuild, and have viewers install that build.

## 🔗 Source host

The source host is currently `animevietsub.sale` (player on `*.googleapiscdn.com`). To change it, update all of:

1. `frontend-vite/src/constants.ts`
2. `frontend-vite/capacitor.config.ts`
3. `avs-helper-extension/map-referer.json`

then rebuild the extension and the app.

## ⚖️ License

Web app: GPL-3.0-only, because the data and player layers are derived from `anime-vsub/desktop-web`. Extension: MIT.
