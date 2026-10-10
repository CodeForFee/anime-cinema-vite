# AVS Helper

Browser extension (Chrome/Edge, Manifest V3) that `../frontend-vite` needs. Fork of
[anime-vsub/extension-animevsub-helper](https://github.com/anime-vsub/extension-animevsub-helper) v1.0.46 (MIT, see LICENSE).

## Build and load

```sh
pnpm i
pnpm --filter ./manifest-v3 build
```

Then open `edge://extensions` (or `chrome://extensions`), enable Developer mode, "Load unpacked" and pick
`manifest-v3/extension`. Rebuild and press reload there after any change.

## Configure

- `allowlist.yaml` — hosts allowed to use the bridge. Add the production host of the web here.
- `map-referer.json` — URL tag -> Referer the extension sends. Keep the host equal to `HOST_CURL` in
  `../frontend-vite/src/constants.ts`.

## What it does

- Pages on an allowlisted host dispatch `http:request` DOM events; the background worker performs the fetch
  (no CORS, the viewer's cookies) and answers with `http:response`.
- `declarativeNetRequest` rules keyed on a URL tag (`#animevsub-vsub`, `..._extra`, `...o`, `...ro`, `..._ua<name>`,
  `#rm-origin`) set Referer/Origin/User-Agent and add CORS response headers. See `lib/background/logic/create-rule.ts`.

## Changed from upstream

- Allowlist reduced to `localhost` / `127.0.0.1`; referer map reduced to the one tag the web uses.
- Removed the page-callable `browser.tabs` passthrough and the `activeTab` / `scripting` permissions.
- Removed the `<all_urls>` content scripts (`inject.ts`, `inject2.ts`) that rewrote the source site into the upstream app.
- Manifest V2 / Firefox build and the npm client package dropped (the web uses `client-ext-animevsub-helper` from npm).

Do not enable this together with the original AnimeVsub Helper: both answer the same events on localhost.
