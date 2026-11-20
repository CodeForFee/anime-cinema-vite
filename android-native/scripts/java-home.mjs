import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";

function installedJdks() {
  const roots = [
    "C:/Program Files/Eclipse Adoptium",
    "C:/Program Files/Java",
    "C:/Program Files/Microsoft",
  ];
  const onPath = (process.env.PATH || "").split(delimiter).flatMap((dir) => {
    try {
      return [
        dirname(
          dirname(
            realpathSync(
              join(dir, process.platform === "win32" ? "java.exe" : "java"),
            ),
          ),
        ),
      ];
    } catch {
      return [];
    }
  });
  return [
    process.env.JAVA_HOME,
    ...onPath,
    "C:/Program Files/Android/Android Studio/jbr",
    ...roots.flatMap((root) =>
      existsSync(root) ? readdirSync(root).map((dir) => join(root, dir)) : [],
    ),
  ].filter(Boolean);
}

/** JAVA_HOME takes precedence only when it can compile Java 21; PATH may already point to a newer JDK. */
export function findJdk(candidates = installedJdks()) {
  return candidates
    .map((dir) => resolve(dir))
    .find((dir) => {
      try {
        const version = readFileSync(join(dir, "release"), "utf8").match(
          /JAVA_VERSION="(\d+)/,
        );
        return (
          Number(version?.[1] || 0) >= 21 &&
          existsSync(
            join(
              dir,
              "bin",
              process.platform === "win32" ? "javac.exe" : "javac",
            ),
          )
        );
      } catch {
        return false;
      }
    });
}

export function androidJavaEnv() {
  const jdk = findJdk();
  if (!jdk)
    throw new Error(
      "No JDK 21+ found: install a JDK or point JAVA_HOME at it.",
    );
  return { ...process.env, JAVA_HOME: jdk };
}
