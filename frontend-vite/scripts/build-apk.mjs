import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { androidJavaEnv } from "./java-home.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
try {
  const env = androidJavaEnv();
  console.log(`Using JAVA_HOME=${env.JAVA_HOME}`);
  const run = (command, args, cwd = root) => {
    const shell = process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
    const executable =
      shell && command.includes(" ") ? `"${command}"` : command;
    const result = spawnSync(executable, args, {
      cwd,
      env,
      shell,
      windowsHide: true,
      stdio: "inherit",
    });
    if (result.error) throw result.error;
    if (result.status !== 0)
      throw new Error(`${command} failed (${result.status})`);
  };
  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  run(process.execPath, [resolve(root, "scripts/build-enhance.mjs")]);
  run(pnpm, ["exec", "vite", "build"]);
  run(pnpm, ["exec", "cap", "sync", "android"]);
  run(
    resolve(
      root,
      "android",
      process.platform === "win32" ? "gradlew.bat" : "gradlew",
    ),
    ["assembleDebug", "--no-daemon"],
    resolve(root, "android"),
  );
} catch (error) {
  console.error(`APK build failed: ${error.message}`);
  process.exit(1);
}
