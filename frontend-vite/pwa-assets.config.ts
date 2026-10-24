import {
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

// favicon.ico, apple-touch-icon and the PWA icons from public/app-icon.png (written by scripts/icons.mjs).
// The maskable icon needs a full-bleed background, so scripts/icons.mjs draws that one itself.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, sizes: [] },
  },
  images: ["public/app-icon.png"],
});
