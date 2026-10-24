# Board — anime-cinema-vite

One screen. Current truth. Rewritten often. Read this before you edit anything.

**Sprint:** none — `godkit sprint new "<goal>"` opens one

## Roster

Name the **model**, not the tool. One tool runs many models, and cost and capability belong to the
model. These rows are examples — replace them with the models this project actually uses.

| model | tool | can | cost | use for |
|---|---|---|---|---|
| claude-opus-5 | claude-code | repo-wide, shell, plan | high | root cause, multi-file refactor, cutting seams |
| claude-sonnet-5 | claude-code, cursor | repo-wide, shell | mid | scoped edits, tests, review passes |
| codex-5.6-terra | codex | repo, shell | mid | mechanical passes, scripted repeats |
| gemini-3.8-flash | antigravity | repo, browser | low | UI work, verification against a running app |
| commands | — | rg, test suite, tsc | free | every "does X / did it pass" question |

Route by capability first, then cheapest. Delete rows for models this project does not use.

## Now (claims)

| model | scope (file globs) | task | since (UTC) | status |
|---|---|---|---|---|
| gpt-6 | frontend-vite/{scripts/**,package.json,android/app/src/main/java/app/capynime/MainActivity.java}, .agent/** | fix debug JDK selection and release Java string compilation; preserve existing staged/unstaged work | 2026-10-24T11:37Z | done (released); debug + signed release/AAB built |
| claude-opus-5-5 | frontend-vite/{api/proxy.ts,server/**,src/core/**,src/features/{comments,schedule,title,player}/**,src/app/**,SERVERLESS.md} | schedule/comments/account; revert to extension | 2026-10-24 | done |
| claude-opus-5-5 | frontend-vite/{src/features/player/**,public/player-*.js,scripts/build-enhance.mjs,package.json,android/**/MainActivity.java}, avs-helper-extension/manifest-v3/{src/manifest.ts,scripts/prepare.ts} | player upscale (FSR1, Anime4K) + virtual surround | 2026-10-24 | done |

One owner per file. If your scope overlaps an open row, do not edit — see AGENTS.md.

## Tasks

| id | title | owner | phase | file |
|---|---|---|---|---|
| T-001 | fix Android debug/release build | gpt-6 | done | tasks/T-001-android-build.md |

## Bugs

<!-- B-NNN monotonic, never reused. Fixed bugs stay listed with their root-cause location. -->
- [x] B-001 debug build used JAVA_HOME17 despite PATH21; root package.json build:apk bypassed the release JDK selector. Fixed with shared scripts/java-home.mjs + scripts/build-apk.mjs (2026-10-24, gpt-6).
- [x] B-002 MainActivity.java:92-93 contained a literal newline inside a Java string. Fixed to escaped newline; assembleDebug, assembleRelease and bundleRelease compile (2026-10-24, gpt-6).

## Decisions

<!-- One line each: date, what was decided, why, who. These bind the next agent. -->
- 2026-10-24: Vercel gateway (api/, server/, web-transport) removed at the user's request; the web app needs the AVS Helper extension again (requests carry the browser's own AnimeVietsub cookies, so its login is shared). Backup of the gateway state: `git stash list` -> "backup before reverting Vercel gateway" — claude-opus-5-5

## Last 3 handoffs

<!-- newest first, trimmed to three -->
- 2026-10-24 gpt-6: APK fix T-001 done; shared JDK21 selection, Java string corrected, release regenerates enhancement; 4 tests pass, debug and signed release/AAB build; version stays 2.0.20. Existing dirty index/user features preserved; see log/20261024T1137Z-gpt-6-android-build.md.
