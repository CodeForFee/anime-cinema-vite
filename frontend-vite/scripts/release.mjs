// pnpm release [patch|minor|major]
// Bumps the version (Android versionCode follows it), builds the web, syncs Capacitor, builds the signed
// release APK + AAB and copies them to release/Capynime-<version>.apk|.aab. On failure the version is put back.
import { spawnSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { androidJavaEnv } from "./java-home.mjs"

const part = process.argv[2] || "patch"
if (!["patch", "minor", "major"].includes(part)) {
  console.error(`usage: pnpm release [patch|minor|major] (got "${part}")`)
  process.exit(1)
}

// Signing is what lets installed copies take the update: never ship an unsigned or differently signed build
if (!existsSync("android/keystore.properties")) {
  console.error("android/keystore.properties is missing: the build would come out unsigned. See android/keystore.properties.example.")
  process.exit(1)
}

const pkgPath = "package.json"
const original = readFileSync(pkgPath, "utf8")
const pkg = JSON.parse(original)
const [major, minor, patch] = pkg.version.split(".").map((n) => Number.parseInt(n, 10))
const next =
  part === "major" ? `${major + 1}.0.0` : part === "minor" ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`

const run = (cmd, args, opts = {}) => {
  console.log(`\n> ${cmd} ${args.join(" ")}`)
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...opts })
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed (${r.status})`)
}

try {
  const env = androidJavaEnv()

  writeFileSync(pkgPath, JSON.stringify({ ...pkg, version: next }, null, 2) + "\n")
  console.log(`Capynime ${pkg.version} -> ${next} (versionCode ${next.split(".").reduce((code, n, i) => code + Number(n) * [10000, 100, 1][i], 0)})`)

  run(process.execPath, [resolve("scripts/build-enhance.mjs")], { shell: false })
  run("pnpm", ["exec", "vite", "build"])
  run("pnpm", ["exec", "cap", "sync", "android"])
  // absolute: cmd.exe does not always look in the working directory for it
  run(resolve("android", process.platform === "win32" ? "gradlew.bat" : "gradlew"), ["assembleRelease", "bundleRelease", "--no-daemon", "-q"], {
    cwd: "android",
    env
  })

  mkdirSync("release", { recursive: true })
  const apk = `release/Capynime-${next}.apk`
  const aab = `release/Capynime-${next}.aab`
  copyFileSync(`android/app/build/outputs/apk/release/Capynime-${next}.apk`, apk)
  copyFileSync("android/app/build/outputs/bundle/release/app-release.aab", aab)
  console.log(`\nDone:\n  ${apk}   (install on a phone)\n  ${aab}   (upload to Google Play)\nCommit package.json to keep the version.`)
} catch (error) {
  writeFileSync(pkgPath, original)
  console.error(`\nRelease failed, version left at ${pkg.version}: ${error.message}`)
  process.exit(1)
}
