# Same-project Vercel runtime

Branch: `feat/vercel-no-extension`, based on `v3@1deaf6e`. Keep Vercel Root Directory at `frontend-vite`.
The source remains AnimeVietsub. Android and the legacy extension are unchanged. No database, VPS,
external gateway, upstream authentication bypass or video-segment relay is introduced.

## Run and deploy

```sh
pnpm install
cd .. # run Vercel CLI from the repository root; project Root Directory is frontend-vite
npx vercel login
npx vercel link --project anime-cinema-vite
npx vercel dev
# Preview only, after checks:
npx vercel deploy
```

Do not pass `--prod`. Plain `pnpm dev` and `pnpm preview` run only the UI, not the API. Never point an
existing production deployment at this branch until the playback gate below passes.

## Interfaces and isolation

- `GET /api/proxy?url=...`: source page; `POST` uses the same query plus a JSON object of scalar form
  fields, only for upstream `/ajax/player`. Returns `{status, url, data, headers}`. Upstream 4xx/5xx
  stay errors. Other methods and untrusted destinations are rejected.
- `GET /api/player?url=...&channel=<32 lowercase hex characters>`: allowed player HTML only. It
  resolves assets against the final player URL and prepends the absolute app bridge URL. The frame
  URL retains `#animevsub-vsub_extra`; neither a source session nor a media request is rewritten.
- Every redirect is validated against the checked-in inventory. Unknown new source domains require
  an inventory update; the API deliberately does not trust an arbitrary `animevietsub.*` hostname.
  Player destinations are limited to `storage.googleapiscdn.com/player` and its subpaths.
- HTML/JSON requests have a 12-second upstream deadline, at most five redirects, a 2 MiB decoded
  response cap, a 4 MiB serialized JSON cap and `no-store`. The Function duration is capped at 30 seconds. Caller cookies and
  arbitrary headers are not forwarded; source cookies are not shared between viewers.
- Player responses enforce `CSP: sandbox allow-scripts; frame-ancestors 'self'`, and the parent iframe
  also omits `allow-same-origin`. Remote code cannot read the app's DOM/storage. Classic bridge script
  loading remains cross-origin inside this sandbox; no wildcard API CORS permission is needed.
- Commands/states require the exact iframe window and per-load channel. Sandboxed replies have
  origin `null`; the bridge checks the app origin for incoming commands. Legacy native callers keep
  their original origin-checked protocol without a channel. An absent video times out after 30 seconds.

Vercel Hobby has usage limits. Moving HTML to the app origin does not move external JS, playlist, key,
or segment requests there. The player can reject opaque origins or need cookies/storage unavailable
in a sandbox. Do not remove isolation to make an upstream player work.

## Acceptance gate

Run `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm test`. New gateway/transport/bridge tests must
pass. Before this change the suite had 61 passed / 3 failed: CRLF differences in home/ranking parser
fixtures and existing component line-limit violations. Report those separately from new regressions.

On the actual Vercel Preview, using a browser with no helper extension:

1. Load home, search, detail and episode list; verify the `/ajax/player` request through the API.
2. Confirm playlist and segment responses, then at least 60 seconds of actual advancing playback.
3. Check play/pause, seek, rate, volume, supported quality levels, fullscreen, reload/resume and episode switch.
4. Confirm the sandbox cannot access parent storage and forged messages cannot control the app.
5. Reject off-inventory URLs and redirects; a source 403/challenge or invalid session must not be shown
   as a successful player. Stop expansion on that failure and record the exact request/status.

API responses, bridge readiness, metadata, mocks and a successful build are not proof of real playback.

## Current evidence

- Local invocation of the real `/api/proxy` handler for `https://animevietsub.sale/` returned HTTP 403
  with `upstreamStatus: 403`, `content-type: text/html;charset=utf8` and a 661-byte body on 2026-10-24.
  The handler preserved the rejection. No upstream bypass was attempted.
- Preview playback is unverified. Vercel CLI authentication is available and the existing project
  is linked from the repository root, with Root Directory `frontend-vite` and Node.js 24.x. The root
  `.vercelignore` excludes Android, signing keys, environment files, extension and build artifacts.
  Credentials must not be copied into source, terminal output or chat.
