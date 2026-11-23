import { useEffect, useState } from "react";

import type { PlayerState } from "@/features/player/engines/iframe-bridge";

/** No word from the player frame this long after it loaded: the page or its CDN is not answering */
export const SILENT_MS = 15_000;
/** Buffering this long while meant to play: the stream has stalled */
export const STALLED_MS = 25_000;

export type StreamProblem = "error" | "silent" | "stalled";

/**
 * Whether the embedded player is in trouble. "error": the frame reported the video failed (shown as an error
 * screen). "silent" / "stalled": no bridge yet, or buffering for long — shown as a hint over a player that may
 * still recover by itself (an old extension without the bridge also looks silent, so that is never fatal).
 */
export function useStreamHealth({
  embedUrl,
  attempt,
  ready,
  state,
  error,
}: {
  embedUrl: string | undefined;
  /** bumped on every retry of the same URL */
  attempt: number;
  ready: boolean;
  state: PlayerState | null;
  error: string | null;
}): StreamProblem | null {
  const [silent, setSilent] = useState(false);
  const [stalled, setStalled] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: restarts for a new stream or a retry
  useEffect(() => {
    setSilent(false);
    if (!embedUrl || ready) return;
    const timer = setTimeout(() => setSilent(true), SILENT_MS);
    return () => clearTimeout(timer);
  }, [embedUrl, attempt, ready]);

  const buffering = Boolean(state && state.waiting && !state.paused);
  useEffect(() => {
    setStalled(false);
    if (!buffering) return;
    const timer = setTimeout(() => setStalled(true), STALLED_MS);
    return () => clearTimeout(timer);
  }, [buffering]);

  if (error) return "error";
  if (silent && !ready) return "silent";
  if (stalled) return "stalled";
  return null;
}
