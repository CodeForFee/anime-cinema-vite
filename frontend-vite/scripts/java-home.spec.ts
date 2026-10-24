// @vitest-environment node
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import { afterEach, expect, test } from "vitest";
import { findJdk } from "./java-home.mjs";

const roots: string[] = [];
function jdk(version: string, compiler = true) {
  const root = mkdtempSync(join(tmpdir(), "capynime-jdk-"));
  roots.push(root);
  mkdirSync(join(root, "bin"));
  writeFileSync(join(root, "release"), `JAVA_VERSION="${version}"\n`);
  if (compiler)
    writeFileSync(
      join(root, "bin", process.platform === "win32" ? "javac.exe" : "javac"),
      "",
    );
  return root;
}
afterEach(() => {
  for (const root of roots.splice(0)) {
    if (
      !resolve(root).startsWith(resolve(tmpdir()) + sep) ||
      !basename(root).startsWith("capynime-jdk-")
    )
      throw new Error("Refusing to remove a path outside test fixtures");
    rmSync(root, { recursive: true });
  }
});

test("ignores a stale JAVA_HOME=17 and selects the next installed JDK21", () => {
  const old = jdk("17.0.11");
  const current = jdk("21.0.12");
  expect(findJdk([old, current])).toBe(current);
});
test("keeps a valid configured JDK21 before fallback candidates", () => {
  const configured = jdk("21.0.1");
  expect(findJdk([configured, jdk("21.0.12")])).toBe(configured);
});
test("skips JRE-only and missing installations", () => {
  const jre = jdk("21.0.12", false);
  const current = jdk("21.0.12");
  expect(findJdk([join(jre, "missing"), jre, current])).toBe(current);
  expect(existsSync(jre)).toBe(true);
});
test("reports no usable compiler instead of selecting an incompatible Java", () => {
  expect(findJdk([jdk("17.0.11"), jdk("unknown")])).toBeUndefined();
  expect(findJdk([])).toBeUndefined();
});
