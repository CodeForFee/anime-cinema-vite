---
id: T-001
title: Fix debug JDK selection and release Java string compilation
owner: gpt-6
scope: frontend-vite/scripts/**, frontend-vite/package.json, frontend-vite/android/app/src/main/java/app/capynime/MainActivity.java, .agent/**
exit: pnpm build:apk succeeds with stale JAVA_HOME=17; signed assembleRelease/bundleRelease compile without changing package version
phase: done
created: 2026-10-24T1137Z
---

## Plan
- Share release's existing JDK21+ selection with debug packaging, preserve enhancement generation and all current feature/staged changes; fix the literal newline in MainActivity.java.
- Verify JDK selection with focused tests, run the actual debug build, then Gradle release tasks at existing version (no version bump/publish).

## Execute
- Log shows debug invalid source release:21 (JAVA_HOME17 overrides PATH21); release selects JDK21 but fails MainActivity.java:92-93 unclosed string literal.
- Existing worktree is heavily dirty and staged; no reset, restore, or broad staging. Other agent's claims are done. Map built for inspected Android build seam only.
- Added shared JDK selection used by debug and release; selects installed JDK21 when JAVA_HOME17 is stale. Debug wrapper retains enhance/Vite/Capacitor steps and runs wrapper with child-only JAVA_HOME.
- Fixed Java concatenation to enhance + escaped newline/semicolon + bridge; release now regenerates enhancement before Vite, using direct node execution for paths with spaces.

## Review
- Package version remains 2.0.20; no global JAVA_HOME change, signing-key changes, publish or feature resets. Existing staged and unstaged work left in place.
## Test
- `pnpm exec vitest run scripts/java-home.spec.ts --reporter=dot` -> 4 passed.
- `node --check scripts/{build-apk,java-home,release}.mjs` (each) and scoped Biome lint -> exit 0; 4 files checked.
- `pnpm build:apk` -> JAVA_HOME=Temurin21, BUILD SUCCESSFUL in 31s; Capynime-2.0.20-debug.apk, 9070964 bytes.
- Shared javaEnv + Gradle `assembleRelease bundleRelease --no-daemon -q` -> exit 0; Capynime-2.0.20.apk 4786849 bytes, app-release.aab 5230894 bytes. Did not invoke version-bumping pnpm release to verify.
## Handoff
- Claim released. Changes left uncommitted to avoid bundling another agent/user's existing staged reversal, package edits and uncommitted MainActivity enhancement feature. Do not stage the entire tree; coordinate the feature checkpoint before committing these overlapping files.
- Version remains 2.0.20; existing JAVA_HOME17 untouched globally. Both APK commands now select JDK21 in their own environment. Release artifacts remain in android/app/build/outputs; no release/ overwrite or publication.
