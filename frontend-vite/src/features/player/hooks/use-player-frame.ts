import { useMemo, useState } from "react";
import { createPlayerFrame } from "@/platform/player-frame";
import { isNativeApp } from "@/platform/transport";

/** Retrying an identical source must still create a fresh iframe/channel and offer the saved position. */
export function usePlayerFrame(upstreamUrl: string | undefined) {
  const [attempt, setAttempt] = useState(0);
  const frame = useMemo(
    () => ({
      ...(createPlayerFrame(upstreamUrl, isNativeApp) ?? {
        url: undefined,
        channel: undefined,
      }),
      attempt,
    }),
    [upstreamUrl, attempt],
  );
  return { ...frame, reload: () => setAttempt((value) => value + 1) };
}
