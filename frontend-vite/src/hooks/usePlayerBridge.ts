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
  /** 0 when muted; missing from bridges older than the volume command */
  volume?: number;
  ended: boolean;
}

/** "resume": answers the player's own resume box, 1 = "Xem tiếp", 0 = "Từ đầu" */
export type PlayerCommand = "play" | "pause" | "seek" | "rate" | "volume" | "resume";

/**
 * Remote control of the source player embedded in `iframeRef`.
 * `control`: the app draws the controls and the player's own are hidden (touch). Otherwise the player
 * keeps its controls and the app only follows the position (resume, next episode).
 * `ready` stays false when the bridge script is not there (old extension build); the caller then leaves
 * the player alone.
 */
export function usePlayerBridge(iframeRef: RefObject<HTMLIFrameElement | null>, embedUrl: string | undefined, control: boolean) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<PlayerState | null>(null);
  /** Position (s) the player's own resume box offers; the bridge hid that box, the app asks instead */
  const [resumeOffer, setResumeOffer] = useState<number | null>(null);

  const origin = embedUrl ? new URL(embedUrl).origin : "";
  const greeting = control ? "hello" : "observe";

  const send = useCallback(
    (type: PlayerCommand | "hello" | "observe", value?: number) => {
      if (origin) iframeRef.current?.contentWindow?.postMessage({ source: APP, type, value }, origin);
    },
    [iframeRef, origin]
  );

  useEffect(() => {
    setReady(false);
    setState(null);
    setResumeOffer(null);
    if (!origin) return;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== iframeRef.current?.contentWindow) return;
      const message = event.data;
      if (!message || message.source !== BRIDGE) return;

      if (message.type === "present") send(greeting);
      else if (message.type === "ready") setReady(true);
      else if (message.type === "state") setState(message as PlayerState);
      else if (message.type === "resume" && message.at > 0) setResumeOffer(message.at);
    };

    window.addEventListener("message", onMessage);
    send(greeting); // the frame may already be up
    return () => window.removeEventListener("message", onMessage);
  }, [embedUrl, greeting, origin, iframeRef, send]);

  return { ready, state, send, resumeOffer, clearResumeOffer: () => setResumeOffer(null) };
}
