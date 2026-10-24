// generate stub index.html files for dev entry
import { execSync } from "child_process"

import chokidar from "chokidar"
import fs from "fs-extra"

import { isDev, r } from "./utils"

function writeManifest() {
  execSync("npx tsx ./scripts/manifest.ts", { stdio: "inherit" })
}

fs.ensureDirSync(r("extension"))
fs.copySync(r("../lib/assets"), r("extension/assets"))
// one source for the web, the Android app and the extension
fs.copySync(r("../../frontend-vite/public/player-bridge.js"), r("extension/assets/player-bridge.js"))
// built by frontend-vite/scripts/build-enhance.mjs (pnpm build in frontend-vite)
fs.copySync(r("../../frontend-vite/public/player-enhance.js"), r("extension/assets/player-enhance.js"))
writeManifest()

if (isDev) {
  chokidar.watch([r("src/manifest.ts"), r("package.json")])
    .on("change", () => {
      writeManifest()
    })
}
