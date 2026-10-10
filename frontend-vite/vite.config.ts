import { fileURLToPath } from "node:url"

import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

const src = fileURLToPath(new URL("./src", import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    // "src/..." is how the modules ported from anime-vsub/desktop-web import each other
    alias: { "@": src, src }
  },
  // The extension only injects its bridge on the hosts in avs-helper-extension/allowlist.yaml
  server: { host: "localhost", port: 4100 },
  test: { environment: "jsdom", globals: true }
})
