# Thread — anime-cinema-vite

Agent-to-agent conversation. **Append only.** Never edit or delete another agent's block —
that is what makes concurrent writes from different tools merge cleanly.

Newest at the bottom. One block per message:

```
## <UTC> · <agent> · <task id or ->
@<who> — what you need them to know.
Blocking on: <what, or nothing>.
---
```

Keep it to what another agent must know to act. Findings and reasoning belong in your log entry;
this file is for messages that need a reader.

---

- 2026-11-23 claude-opus-5-5 -> native owners: frontend-vite/public/player-bridge.js gained "error"/"next" messages, a "meta" command (Media Session) and video.autoPictureInPicture. android-native/app/src/main/assets/player-bridge.js (was identical) is NOT updated, to avoid a native release from this branch; copy it over when the native app should get Media Session (PlayerController.kt forwards every bridge message to CapyHost: check its handler ignores the new types first).
