---
id: T-003
owner: gpt-6
phase: done
scope: .agent/**, frontend-vite/docs/SOURCE-ACCOUNT.md, C:/Users/NEO/.codex/config.toml, C:/Users/NEO/.codex/tools/chrome-devtools-mcp/**
exit: Official Chrome DevTools MCP installed and registered in Codex; MCP initialize/tool discovery and current-browser connection tested; no claim that direct app Google/registration features are implemented.
---
## Plan
- User explicitly requests MCP browser control, then tags Browser plugin. Try bundled Browser first; if still unavailable, configure official ChromeDevTools/chrome-devtools-mcp autoConnect for current Chrome, not a replacement browser profile.
- Inspect/save existing Codex settings, install a pinned official package outside app repo, register via codex mcp add, verify MCP protocol/tool discovery and current-browser connection; Chrome security/connection dialogs and Google authentication remain user-operated.
## Execute
- Bundled Browser inventory remains apps=[]/browsers=[]; Computer Use earlier fails native pipe unavailable. Current running Chrome 156.0.8078.47 meets documented autoConnect Chrome144+ requirement.
- Official OpenAI MCP docs and Chrome DevTools MCP advanced/configuration docs read; npm registry version1.12.0 repository verified as ChromeDevTools/chrome-devtools-mcp. No existing Codex server named chrome-devtools.
- Installed pinned chrome-devtools-mcp1.12.0 + SDK1.32.2 under C:/Users/NEO/.codex/tools/chrome-devtools-mcp; codex mcp add registered global chrome-devtools with native node.exe command, autoConnect, no usage statistics/CrUX, startup30s/tool120s. Previous config backed up to config.toml.before-chrome-mcp-20261024T123256Z.bak.
- User enabled Chrome remote debugging and allowed the connection. Actual current Chrome connection succeeded (6 tabs), source login/register HTTP200 through its browser context; no replacement Chrome profile launched.
- probe.mjs verifies MCP protocol/capabilities; session.mjs keeps an SDK connection for current-turn inspection before Codex reloads its tool catalog; network-metadata.mjs hides header/body values from get_network_request output, with a runnable synthetic-secret check.
- User manually completed Google; observed source POST /login/google/ status302, credential/g_csrf_token field names, fresh source session signed-in=true and Capynime localhost4100 rememberedUser=true/loginButtonPresent=false. Application direct-Google UI and registration are still not implemented.
- Temporary metadata-only form-submit instrumentation removed; SDK sessions closed cleanly; Chrome and source sign-in retained. Node_REPL import issues (zod/v4 resolution, blocked node:process) avoided with official SDK CLI client, not a custom Computer Use helper.
## Test
- codex mcp get chrome-devtools --json -> enabled=true, command/args correct, startup_timeout_sec30 and tool_timeout_sec120.
- node C:/Users/NEO/.codex/tools/chrome-devtools-mcp/probe.mjs -> initialized=true, server1.12.0, 32 tools; required list_pages/navigate_page/list_network_requests/get_network_request/take_snapshot all present.
- probe.mjs --connect -> browserConnected=true, pageCount6 after user allowed Chrome; real source read and app-state observations via MCP succeeded.
- node network-metadata.spec.mjs -> form, JSON and error redaction passed; node --check session.mjs -> exit0. No application code changed, app tests/build not repeated.
## Handoff
- Setup done. Restart/reload Codex IDE extension if new tools do not appear in its MCP catalog; SDK scripts work without that reload. Existing-browser autoConnect may ask user to Allow again after reconnect/Chrome restart; security/auth dialogs remain user-operated.
- Continue T-002 from recorded source contract and live Google test. Source's Google path ended at source homepage even when login requested _fxRef=http://localhost:4100/; returning to app requires app-side verified-session handling or a source-supported return, not an assumed redirect. Android session handoff remains unverified; browser debugging during development is not a runtime auth transport for APK.
