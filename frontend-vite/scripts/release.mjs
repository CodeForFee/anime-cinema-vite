// pnpm release [patch|minor|major]
// Bumps the version (Android versionCode follows it), builds the web, syncs Capacitor, builds the signed
// release APK + AAB and copies them to release/Capynime-<version>.apk|.aab. On failure the version is put back.
import { spawnSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

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

/** Gradle (AGP 8) needs JDK 21+: JAVA_HOME if it is one, else a common install location */
function findJdk() {
  const majorOf = (dir) => {
    try {
      const m = readFileSync(join(dir, "release"), "utf8").match(/JAVA_VERSION="(\d+)/)
      return m ? Number(m[1]) : 0
    } catch {
      return 0
    }
  }
  const roots = ["C:/Program Files/Eclipse Adoptium", "C:/Program Files/Java", "C:/Program Files/Microsoft"]
  const candidates = [
    process.env.JAVA_HOME,
    "C:/Program Files/Android/Android Studio/jbr",
    ...roots.flatMap((root) => (existsSync(root) ? readdirSync(root).map((d) => join(root, d)) : []))
  ].filter(Boolean)
  return candidates.find((dir) => majorOf(dir) >= 21)
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
  const jdk = findJdk()
  if (!jdk) throw new Error("no JDK 21+ found: install one or point JAVA_HOME at it")

  writeFileSync(pkgPath, JSON.stringify({ ...pkg, version: next }, null, 2) + "\n")
  console.log(`Capynime ${pkg.version} -> ${next} (versionCode ${next.split(".").reduce((code, n, i) => code + Number(n) * [10000, 100, 1][i], 0)})`)

  run("pnpm", ["exec", "vite", "build"])
  run("pnpm", ["exec", "cap", "sync", "android"])
  // absolute: cmd.exe does not always look in the working directory for it
  run(resolve("android", process.platform === "win32" ? "gradlew.bat" : "gradlew"), ["assembleRelease", "bundleRelease", "--no-daemon", "-q"], {
    cwd: "android",
    env: { ...process.env, JAVA_HOME: jdk }
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
