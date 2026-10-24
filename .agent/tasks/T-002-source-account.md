---
id: T-002
owner: gpt-6
phase: blocked
blocked: needs-evidence
scope: frontend-vite/src/features/account/**, frontend-vite/src/platform/source-account*, frontend-vite/src/core/source/endpoints/comments/fetch*, frontend-vite/android/app/src/main/AndroidManifest.xml, frontend-vite/android/app/src/main/java/app/capynime/{MainActivity,SourceAccountPlugin,SourceAccountActivity}.java, frontend-vite/docs/SOURCE-ACCOUNT.md, .agent/**
exit: Normal login and official registration available on web and Android; official Google web login rechecks source session; no false native OAuth/session success; tests, typecheck, lint and APK build recorded; real-account verification explicitly distinguished.
---

## Plan
- Sequential seams owned by gpt-6: harden source login/session verification; official-page opener + isolated native source WebView sharing CookieManager; login UI/return refresh/private cache isolation; tests/build/docs.
- User has no source OAuth configuration access. Chrome sessions cannot be read by the native app; embedded Google sign-in is unsupported. Native Google remains blocked unless source supplies a legitimate session handoff or native OAuth integration; do not spoof Google WebView user agents or copy browser cookies.
- Preserve restored extension transport and existing native player; no Vercel gateway.
## Execute
- Follow-up 2026-10-24T12:22Z: user proposes keeping source Google callback then returning to Capynime and reiterates registration. Investigate actual source callback/return contract before assuming new OAuth setup is mandatory for the browser flow; returning to an app alone does not demonstrate native session transfer.
- Source login/register direct fetch still HTTP403 (server cloudflare, blank non-script body); web reader also inaccessible; connected browser inventory empty. No reusable registration/login HTML or callback JS in inspected repository/adjacent source-code fixtures.
- User supplied a Google /gsi/log POST event onetap.closed.buttonFlowStarted (HTTP200), not a demonstrated source login callback. Requested source-domain request URL/method + payload field names only, and registration URL + form field names; explicitly exclude credential/token/cookie values.
- Arrived with clean worktree on feat/vercel-no-extension; inspected source account store, login POST and Capacitor HTTP, prior account log; source registration/login pages inaccessible to automated requests (region verification).
- User confirmed no source OAuth configuration access, then explicitly rejected opening the source login page and requested Google directly inside Capynime. Removed the provisional opener/actions/native Activity/plugin completely; no native bridge or manifest change remains.
- Retained independent session correctness fixes: fresh robust CSRF extraction, valid user markers, source-confirmed logout, challenge/network preservation, resume/focus recheck, race guard, per-user private query keys and cache disposal.
- User supplied a Google GIS popup URL bound to source origin; examined parameters only, never opened/replayed or committed its per-attempt state. Official Google docs confirm callback/login-URI contract and unsupported Android WebView sign-in. No source-approved credential/session handoff has been demonstrated.
## Test
- 16 new source/store/resume/cache tests passed; pnpm typecheck and pnpm lint passed (239 files).
- Full pnpm test: 95 passed, 3 pre-existing failed (home/ranking fixture CRLF, architecture component lengths); no new failures.
- pnpm build:apk: BUILD SUCCESSFUL in 16s; android/app/build/outputs/apk/debug/Capynime-2.0.20-debug.apk 9227410 bytes, 2026-10-24T12:14:16Z. No version bump or published release.
- No real source-account registration/login or Google tested; automated source login/register requests blocked/region verification and no test credentials/browser connection.
## Handoff
- Current next evidence: POST/Fetch/XHR to animevietsub.sale after successful Google account selection; source callback JS handling redirect/_fxRef; real registration link and form names. User has pending asynchronous questions for these. Do not hardcode an assumed Google callback or registration payload; registration should proceed independently once its contract is available.
- Immediate Google on both platforms has no verified callback/session contract yet. Native needs a source-supported handoff or native integration; inspect existing source flow before deciding source-owner changes are required. User has not authorized switching to a separate Capynime identity system. Do not hardcode the supplied Google URL, impersonate source origin, spoof WebView UA, or claim Chrome cookies are native app cookies.
- Registration and direct Google remain unimplemented; do not report the whole authentication task done. See frontend-vite/docs/SOURCE-ACCOUNT.md; keep independent verified session fixes only.
