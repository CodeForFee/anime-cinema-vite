import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "app.capynime",
  appName: "Capynime",
  webDir: "dist",
  server: {
    androidScheme: "https",
    // The WebView serves the bundled app under the source host. The embedded player page is then
    // requested with the Referer the source expects, which is the job the extension does on the web.
    // Keep equal to HOST_CURL in src/constants.ts.
    hostname: "animevietsub.nl"
  },
  plugins: {
    // native requests (src/logic/bridge.ts) keep the source's session cookies between calls
    CapacitorCookies: { enabled: true }
  }
}

export default config
