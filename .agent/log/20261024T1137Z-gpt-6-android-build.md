---
agent: gpt-6
session: android-build
started: 2026-10-24T1137Z
ended: 2026-10-24T1145Z
scope: frontend-vite/scripts/**, frontend-vite/package.json, frontend-vite/android/app/src/main/java/app/capynime/MainActivity.java, .agent/**
status: done
skills: godkit, godkit-lazy, godkit-map, godkit-test, godkit-handoff
---

## Task
- Fix pasted build:apk Java21 error and release MainActivity unclosed string literal.
## Did
- scripts/java-home.mjs shares JDK21+ lookup (valid JAVA_HOME, PATH, common installs, requires javac); scripts/build-apk.mjs runs enhancement/web/sync/debug with selected child-only JAVA_HOME.
- package.json build:apk uses the wrapper; scripts/release.mjs shares the lookup and regenerates enhancement before packaging.
- MainActivity.java:92 uses an escaped newline rather than a literal newline inside Java string. Current feature changes and staged gateway reversal preserved.
- Focused Android build map created; other application features are explicitly outside map coverage.
## Verified
- `pnpm exec vitest run scripts/java-home.spec.ts --reporter=dot` -> 4 tests pass; scoped Biome -> 4 files, no fixes; node --check on all 3 scripts passes.
- `pnpm build:apk` with global JAVA_HOME still17 -> uses Temurin21; BUILD SUCCESSFUL in 31s; debug APK 9070964 B.
- Shared androidJavaEnv + `gradlew.bat assembleRelease bundleRelease --no-daemon -q` -> exit 0; signed APK 4786849 B and AAB 5230894 B at version2.0.20.
## Bugs
- Fixed B-001 (debug bypassed JDK selection) and B-002 (literal Java newline), root causes and paths on board.
## Left / next
- No build failure remains. No global Java setting or package version changed; no APK was published.
- Changes are uncommitted because the package/Java source overlap substantial pre-existing staged/unstaged feature work. Avoid committing or resetting that unrelated work; this run preserved the user's index.
