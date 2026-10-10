# Anime Cinema (client-side)

A version of the Anime Cinema site with no backend: every request leaves the viewer's own browser,
through a browser extension. Two packages:

| Folder | What | License |
|---|---|---|
| [frontend-vite/](frontend-vite/) | Vite + React + TypeScript web app | GPL-3.0-only (see its NOTICE.md) |
| [avs-helper-extension/](avs-helper-extension/) | Chrome/Edge extension (Manifest V3) the web needs | MIT |

## Run

```sh
# 1. build the extension, then load avs-helper-extension/manifest-v3/extension as "unpacked"
cd avs-helper-extension && pnpm i && pnpm --filter ./manifest-v3 build

# 2. start the web
cd ../frontend-vite && pnpm i && pnpm dev      # http://localhost:4100
```

## Production

The web is static files (`pnpm build` -> `frontend-vite/dist`); serve them with a fallback of every path to
`index.html`. The server never contacts the source site, so its IP does not matter.

The extension only works on the hosts listed in `avs-helper-extension/allowlist.yaml`. Add the production host
there, rebuild, and have viewers install that build.

See each folder's README for details.
