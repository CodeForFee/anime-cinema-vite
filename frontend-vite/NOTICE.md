# Third-party code in this project

## anime-vsub/desktop-web — GPL-3.0

https://github.com/anime-vsub/desktop-web — Copyright (c) Tachibana Shin and contributors.

Copied from v1.1.135 (`main`), with only i18n/auth-store references removed:

- `src/apis/parser/**`, `src/apis/runs/**`, `src/apis/workers/**` (except `menu.ts` and `browse.ts`, written here),
  `src/apis/useCache.ts`, `src/apis/wrap-worker.ts`
- `src/logic/**` except `new-dha/`
- `src/__test__/**` (fixtures for the parser specs)

`src/components/player/HlsPlayer.ts` is a React port of the HLS section of their `src/components/BrtPlayer.vue`.

`src/logic/new-dha/pkg/**` is their prebuilt WebAssembly module, taken unmodified from the `release` branch at
commit `d17bb5b79f3a8de121cc6cba960320b20d86af13` (2026-06-14). Its Rust source is a private submodule and is
not available here.

Because of the above, this project as a whole is distributed under GPL-3.0-only (see LICENSE).

## client-ext-animevsub-helper — MIT

npm package, the page-side client of the helper extension. Copyright (c) 2022 Tachibana Shin.
