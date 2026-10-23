import { fileURLToPath } from "node:url"

import babel from "@rolldown/plugin-babel"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import { visualizer } from "rollup-plugin-visualizer"
import { VitePWA } from "vite-plugin-pwa"
import { defineConfig } from "vitest/config"

const src = fileURLToPath(new URL("./src", import.meta.url))

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // React Compiler memoizes components, so the 4 Hz player state does not re-render the whole page
    babel({
      presets: [reactCompilerPreset()],
      // UI only: the source layer, the platform adapters and the hls.js engine are plain code, nothing to memoize
      exclude: [/node_modules/, /rolldown[\/]runtime/, /[\/]src[\/](core[\/]source|platform|features[\/]player[\/]engines[\/]hls)[\/]/]
    }),
    VitePWA({
      registerType: "autoUpdate",
      // registered from main.tsx, on the web only: inside the Android app the files are local already
      injectRegister: false,
      // icons are generated into public/ by `pnpm icons` (pwa-assets.config.ts)
      manifest: {
        name: "Capynime",
        short_name: "Capynime",
        description: "Xem anime Vietsub, nhanh và gọn",
        lang: "vi",
        theme_color: "#0b0b0f",
        background_color: "#0b0b0f",
        display: "standalone",
        orientation: "any",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        // app shell only; catalog data is cached by TanStack Query in IndexedDB, video never
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // the decryptor and hls.js serve only the rare non-iframe source: fetched when needed, not up front
        globIgnores: ["**/*.wasm", "**/HlsPlayer-*.js", "**/hls.worker-*.js", "**/stats.html"],
        navigateFallback: "/index.html"
      }
    }),
    // pnpm analyze -> dist/stats.html
    mode === "analyze" ? visualizer({ filename: "dist/stats.html", gzipSize: true }) : null
  ],
  resolve: {
    alias: { "@": src }
  },
  // The extension only injects its bridge on the hosts in avs-helper-extension/allowlist.yaml
  server: { host: "localhost", port: 4100 },
  test: { environment: "jsdom", globals: true }
}))
