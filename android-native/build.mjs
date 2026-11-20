import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { androidJavaEnv } from "./scripts/java-home.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2] ?? "release";
const modes = {
  debug: [":app:assembleDebug"],
  release: [":app:assembleRelease"],
  verify: [":app:testDebugUnitTest", ":app:lintRelease", ":app:assembleRelease"],
  dependencies: [":app:dependencies", "--configuration", "debugRuntimeClasspath"],
};
if (!Object.hasOwn(modes, mode)) throw new Error("Usage: node build.mjs [debug|release|verify|dependencies]");
if (mode === "verify") {
  const probe = spawnSync(process.execPath, ["--test", join(root, "app/src/test/kotlin/app/capynime/compose/player/native-media-probe.test.mjs")], { stdio: "inherit" });
  if (probe.status !== 0) process.exit(probe.status ?? 1);
}
const env = androidJavaEnv();
env.DEBUG = "";
const sdk = env.ANDROID_HOME || env.ANDROID_SDK_ROOT ||
  (env.LOCALAPPDATA ? join(env.LOCALAPPDATA, "Android", "Sdk") : "");
if (sdk && existsSync(sdk)) env.ANDROID_HOME = sdk;
const args = [...modes[mode], ...process.argv.slice(3), "--console=plain"]; // extra args go to Gradle (-P...)
const child = process.platform === "win32"
  ? spawn(env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `""${join(root, "gradlew.bat")}" ${args.join(" ")}"`], { cwd: root, env, stdio: "inherit", windowsVerbatimArguments: true })
  : spawn("./gradlew", args, { cwd: root, env, stdio: "inherit" });
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
  if (code !== 0 || mode === "dependencies") return;
  const variant = mode === "debug" ? "debug" : "release";
  const from = join(root, "app", "build", "outputs", "apk", variant, `app-${variant}.apk`);
  const destDir = join(root, "artifacts");
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, `Capynime-native-${variant}.apk`);
  copyFileSync(from, dest);
  console.log(`\nAPK: ${dest} (${(statSync(dest).size / 1024 / 1024).toFixed(2)} MiB)`);
});
