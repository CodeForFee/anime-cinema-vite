import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { QualityLevel } from "@/core/player/pick-quality";
import type { EnhanceSettings, EnhanceState } from "@/features/player/engines/enhance/model";

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
  /** Seconds buffered ahead of the playhead; missing from older bridges */
  ahead?: number;
}

/** The player's quality levels; null until it reports them (or forever, with an older bridge) */
export interface PlayerLevels {
  levels: QualityLevel[];
  current: number;
}

/** The level actually on screen; `auto` while the player's automatic choice is on */
export interface VisualQuality {
  label: string;
  height: number;
  auto: boolean;
}

/** "resume": answers the player's own resume box, 1 = "Xem tiếp", 0 = "Từ đầu" */
/** "quality": a level index from `levels` */
export type PlayerCommand =
  "play" | "pause" | "seek" | "rate" | "volume" | "resume" | "quality";

const MODES = new Set(["off", "fsr", "anime4k"]);
const NOTICES = new Set(["downgraded", "stopped"]);

/** The frame's "enhanced" answer, kept to the fields and values the app knows (it comes from another origin) */
export function parseEnhanced(message: Record<string, unknown>): EnhanceState | null {
  if (!MODES.has(message.upscale as string)) return null;
  const support = (message.support ?? {}) as Record<string, unknown>;
  return {
    surround: message.surround === true,
    surroundMode: message.surroundMode === "speakers" ? "speakers" : "headphones",
    upscale: message.upscale as EnhanceState["upscale"],
    color: message.color === true,
    support: {
      audio: support.audio === true,
      webgl2: support.webgl2 === true,
      webgpu: support.webgpu === true,
    },
    error: typeof message.error === "string" ? message.error.slice(0, 200) : undefined,
    notice: NOTICES.has(message.notice as string) ? (message.notice as EnhanceState["notice"]) : undefined,
  };
}

/**
 * Remote control of the source player embedded in `iframeRef`.
 * `control`: the app draws the controls and the player's own are hidden (touch). Otherwise the player
 * keeps its controls and the app only follows the position (resume, next episode).
 * `ready` stays false when the bridge script is not there (old extension build); the caller then leaves
 * the player alone.
 */
export function usePlayerBridge(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  embedUrl: string | undefined,
  control: boolean,
) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<PlayerState | null>(null);
  /** Position (s) the player's own resume box offers; the bridge hid that box, the app asks instead */
  const [resumeOffer, setResumeOffer] = useState<number | null>(null);
  const [levels, setLevels] = useState<PlayerLevels | null>(null);
  const [visual, setVisual] = useState<VisualQuality | null>(null);
  /** What the frame's enhancers actually run; null until it answers an "enhance" */
  const [enhanced, setEnhanced] = useState<EnhanceState | null>(null);
  /** When the app last sent a seek (ms): the wait after it is the seek loading, not a stall */
  const seekedAt = useRef(0);

  const origin = embedUrl ? new URL(embedUrl).origin : "";
  const greeting = control ? "hello" : "observe";

  const send = useCallback(
    (type: PlayerCommand | "hello" | "observe", value?: number) => {
      if (type === "seek") seekedAt.current = Date.now();
      if (origin)
        iframeRef.current?.contentWindow?.postMessage(
          { source: APP, type, value },
          origin,
        );
    },
    [iframeRef, origin],
  );

  useEffect(() => {
    setReady(false);
    setState(null);
    setResumeOffer(null);
    setLevels(null);
    setVisual(null);
    setEnhanced(null);
    if (!origin) return;

    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== origin ||
        event.source !== iframeRef.current?.contentWindow
      )
        return;
      const message = event.data;
      if (!message || message.source !== BRIDGE) return;

      if (message.type === "present") send(greeting);
      else if (message.type === "ready") setReady(true);
      else if (message.type === "state") setState(message as PlayerState);
      else if (message.type === "resume" && message.at > 0)
        setResumeOffer(message.at);
      else if (message.type === "levels" && Array.isArray(message.levels))
        setLevels({ levels: message.levels, current: message.current });
      else if (message.type === "enhanced") setEnhanced(parseEnhanced(message));
      else if (message.type === "visual")
        setVisual({
          label: message.label,
          height: message.height,
          auto: Boolean(message.auto),
        });
    };

    window.addEventListener("message", onMessage);
    send(greeting); // the frame may already be up
    return () => window.removeEventListener("message", onMessage);
  }, [embedUrl, greeting, origin, iframeRef, send]);

  /** The viewer's enhancement choice, for the frame's engines/enhance (via public/player-bridge.js) */
  const sendEnhance = useCallback(
    (value: EnhanceSettings) => {
      if (origin)
        iframeRef.current?.contentWindow?.postMessage({ source: APP, type: "enhance", value }, origin);
    },
    [iframeRef, origin],
  );

  return {
    ready,
    state,
    send,
    enhanced,
    sendEnhance,
    resumeOffer,
    clearResumeOffer: () => setResumeOffer(null),
    levels,
    visual,
    seekedAt,
  };
}
