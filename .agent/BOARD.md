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
| gpt-6 | .agent/**; frontend-vite/docs/SOURCE-ACCOUNT.md; C:/Users/NEO/.codex/config.toml and tools/chrome-devtools-mcp/** | T-003 configure Chrome MCP for current browser after bundled Browser/Computer Use unavailable | 2026-10-24T12:31Z | done (released); current Chrome connected, source callback captured; app direct-Google/register features remain incomplete |
| gpt-6 | .agent/** | T-002 inspect source callback/registration contract after user proposes return via source | 2026-10-24T12:22Z | released; needs source-domain callback request + registration form; source requests HTTP403 |
| gpt-6 | frontend-vite/src/{features/account/**,platform/source-account*,core/source/endpoints/comments/fetch*}, frontend-vite/android/app/src/main/{AndroidManifest.xml,java/app/capynime/{MainActivity,SourceAccountPlugin,SourceAccountActivity}.java}, frontend-vite/docs/SOURCE-ACCOUNT.md, .agent/** | T-002 source account login/register and direct Google | 2026-10-24T12:06Z | released; independent session fixes verified; no opener/native Activity retained |
| gpt-6 | frontend-vite/{scripts/**,package.json,android/app/src/main/java/app/capynime/MainActivity.java}, .agent/** | fix debug JDK selection and release Java string compilation; preserve existing staged/unstaged work | 2026-10-24T11:37Z | done (released); debug + signed release/AAB built |
| claude-opus-5-5 | frontend-vite/{api/proxy.ts,server/**,src/core/**,src/features/{comments,schedule,title,player}/**,src/app/**,SERVERLESS.md} | schedule/comments/account; revert to extension | 2026-10-24 | done |
| claude-opus-5-5 | frontend-vite/{src/features/player/**,public/player-*.js,scripts/build-enhance.mjs,package.json,android/**/MainActivity.java}, avs-helper-extension/manifest-v3/{src/manifest.ts,scripts/prepare.ts} | player upscale (FSR1, Anime4K) + virtual surround | 2026-10-24 | done |

One owner per file. If your scope overlaps an open row, do not edit — see AGENTS.md.

## Tasks

| id | title | owner | phase | file |
|---|---|---|---|---|
| T-001 | fix Android debug/release build | gpt-6 | done | tasks/T-001-android-build.md |
| T-002 | source account authentication on web/Android | gpt-6 | blocked (needs-evidence) | tasks/T-002-source-account.md |
| T-003 | connect existing Chrome with MCP | gpt-6 | done | tasks/T-003-chrome-mcp.md |

## Bugs

<!-- B-NNN monotonic, never reused. Fixed bugs stay listed with their root-cause location. -->
- [x] B-001 debug build used JAVA_HOME17 despite PATH21; root package.json build:apk bypassed the release JDK selector. Fixed with shared scripts/java-home.mjs + scripts/build-apk.mjs (2026-10-24, gpt-6).
- [x] B-002 MainActivity.java:92-93 contained a literal newline inside a Java string. Fixed to escaped newline; assembleDebug, assembleRelease and bundleRelease compile (2026-10-24, gpt-6).
- [ ] B-003 pre-existing full-suite failures: home/parse.spec.ts and ranking/parse.spec.ts CRLF fixtures; architecture.spec.ts component size guard (6 existing files). T-002 adds no failures; fix separately (2026-10-24, gpt-6).
- [ ] B-004 existing log/20261024T1110Z-claude-opus-5-5-9290e952.md lacks agent frontmatter; godkit verify reports no-identity. Original history preserved; new T-002 task/log have identity (2026-10-24, gpt-6).

## Decisions

<!-- One line each: date, what was decided, why, who. These bind the next agent. -->
- 2026-10-24: Vercel gateway (api/, server/, web-transport) removed at the user's request; the web app needs the AVS Helper extension again (requests carry the browser's own AnimeVietsub cookies, so its login is shared). Backup of the gateway state: `git stash list` -> "backup before reverting Vercel gateway" — claude-opus-5-5

## Last 3 handoffs

<!-- newest first, trimmed to three -->
- 2026-10-24 gpt-6: T-003 Chrome DevTools MCP installed globally/tested, current Chrome connected. User Google POST /login/google/ ->302; source signed-in + Capynime received user verified. Registration schema/Turnstile recorded in T-002; app Google/register UI still unimplemented, native handoff unproven. Sessions/hooks cleaned; log/20261024T1253Z-gpt-6-01a16bc1.md.
- 2026-10-24 gpt-6: T-002 follow-up needs-evidence; source login/register HTTP403 and no connected browser. Supplied /gsi/log is a Google event, not source callback; pending source POST URL/method/field names + registration link/form names. No application code changed; log/20261024T1223Z-gpt-6-01a16bc1.md.
- 2026-10-24 gpt-6: T-002 partial; 16 auth/session/cache tests pass, typecheck/lint pass, debug APK built; 3 existing suite failures. User rejected source-tab login; direct Google + registration not done. Source OAuth/session handoff requires source owner; docs/SOURCE-ACCOUNT.md and log/20261024T1215Z-gpt-6-01a16bc1.md.
