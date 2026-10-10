import { type RefObject, useCallback, useEffect, useState } from "react";

// Names shared with public/player-bridge.js, the script running inside the player frame
const BRIDGE = "avs-player-bridge";
const APP = "avs-player-app";

export interface PlayerState {
  currentTime: number;
  duration: number;
  paused: boolean;
  /** Playing was requested but the video is still buffering */
  waiting: boolean;
  rate: number;
  ended: boolean;
}

export type PlayerCommand = "play" | "pause" | "seek" | "rate";

/**
 * Remote control of the source player embedded in `iframeRef`.
 * `ready` stays false when the bridge script is not there (old extension build, desktop web without
 * it), and the caller then leaves the player's own controls alone.
 */
export function usePlayerBridge(iframeRef: RefObject<HTMLIFrameElement>, embedUrl: string | undefined, enabled: boolean) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<PlayerState | null>(null);

  const origin = embedUrl ? new URL(embedUrl).origin : "";

  const send = useCallback(
    (type: PlayerCommand | "hello", value?: number) => {
      if (origin) iframeRef.current?.contentWindow?.postMessage({ source: APP, type, value }, origin);
    },
    [iframeRef, origin]
  );

  useEffect(() => {
    setReady(false);
    setState(null);
    if (!enabled || !origin) return;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== iframeRef.current?.contentWindow) return;
      const message = event.data;
      if (!message || message.source !== BRIDGE) return;

      if (message.type === "present") send("hello");
      else if (message.type === "ready") setReady(true);
      else if (message.type === "state") setState(message as PlayerState);
    };

    window.addEventListener("message", onMessage);
    send("hello"); // the frame may already be up
    return () => window.removeEventListener("message", onMessage);
  }, [embedUrl, enabled, origin, iframeRef, send]);

  return { ready, state, send };
}
