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
    hostname: "animevietsub.sale"
  },
  plugins: {
    // native requests (src/logic/bridge.ts) keep the source's session cookies between calls
    CapacitorCookies: { enabled: true },
    // The Android splash stays until the page asks it to go (index.html, the launch intro's first frame),
    // then cross-fades into it. 3 s is only the ceiling if that call never comes.
    SplashScreen: { launchAutoHide: true, launchShowDuration: 3000, launchFadeOutDuration: 200 }
  }
}

export default config
