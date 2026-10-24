// Entry of public/player-enhance.js (scripts/build-enhance.mjs): injected next to public/player-bridge.js into the
// source's player page, where the bridge calls window.__capyEnhance. Inert anywhere this app did not embed.
import { createEnhancer, support } from "@/features/player/engines/enhance";

const w = window as unknown as { __capyEnhance?: unknown };
if (window.top !== window && /animevsub-vsub/.test(location.hash) && !w.__capyEnhance)
  w.__capyEnhance = { version: 1, createEnhancer, support };
