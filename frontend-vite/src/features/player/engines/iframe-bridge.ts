import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { QualityLevel } from "@/core/player/pick-quality";

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

function isPlayerState(
  value: Record<string, unknown>,
): value is Record<string, unknown> & PlayerState {
  return (
    ["currentTime", "duration", "rate"].every(
      (key) =>
        typeof value[key] === "number" &&
        Number.isFinite(value[key]) &&
        (value[key] as number) >= 0,
    ) &&
    ["paused", "waiting", "ended"].every(
      (key) => typeof value[key] === "boolean",
    ) &&
    (value.volume === undefined ||
      (typeof value.volume === "number" &&
        Number.isFinite(value.volume) &&
        value.volume >= 0 &&
        value.volume <= 1)) &&
    (value.ahead === undefined ||
      (typeof value.ahead === "number" &&
        Number.isFinite(value.ahead) &&
        value.ahead >= 0))
  );
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
  channel?: string,
) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<PlayerState | null>(null);
  /** Position (s) the player's own resume box offers; the bridge hid that box, the app asks instead */
  const [resumeOffer, setResumeOffer] = useState<number | null>(null);
  const [levels, setLevels] = useState<PlayerLevels | null>(null);
  const [visual, setVisual] = useState<VisualQuality | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  /** When the app last sent a seek (ms): the wait after it is the seek loading, not a stall */
  const seekedAt = useRef(0);

  const origin = embedUrl ? new URL(embedUrl, window.location.href).origin : "";
  const greeting = control ? "hello" : "observe";

  const send = useCallback(
    (type: PlayerCommand | "hello" | "observe", value?: number) => {
      if (type === "seek") seekedAt.current = Date.now();
      if (origin)
        iframeRef.current?.contentWindow?.postMessage(
          { source: APP, type, value, ...(channel ? { channel } : {}) },
          channel ? "*" : origin,
        );
    },
    [iframeRef, origin, channel],
  );

  useEffect(() => {
    setReady(false);
    setState(null);
    setResumeOffer(null);
    setLevels(null);
    setVisual(null);
    setFailure(null);
    if (!origin) return;
    let timeout = channel
      ? setTimeout(() => {
          clearInterval(greetingTimer);
          setFailure(
            "Không khởi tạo được video từ nguồn. Vui lòng thử tải lại.",
          );
        }, 30_000)
      : undefined;
    const greetingTimer = channel
      ? setInterval(() => send(greeting), 500)
      : undefined;

    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== (channel ? "null" : origin) ||
        event.source !== iframeRef.current?.contentWindow
      )
        return;
      const message = event.data;
      if (
        !message ||
        typeof message !== "object" ||
        message.source !== BRIDGE ||
        (channel && message.channel !== channel)
      )
        return;

      if (message.type === "present") send(greeting);
      else if (message.type === "ready") {
        setReady(true);
        clearInterval(greetingTimer);
      } else if (message.type === "state" && isPlayerState(message)) {
        setState(message);
        if (message.duration > 0) {
          clearTimeout(timeout);
          timeout = undefined;
          setFailure(null);
        }
      } else if (
        message.type === "resume" &&
        Number.isFinite(message.at) &&
        message.at > 0
      )
        setResumeOffer(message.at);
      else if (
        message.type === "levels" &&
        Array.isArray(message.levels) &&
        message.levels.length <= 128 &&
        message.levels.every(
          (level: QualityLevel) =>
            level &&
            Number.isInteger(level.index) &&
            level.index >= 0 &&
            typeof level.label === "string" &&
            Number.isFinite(level.height) &&
            level.height >= 0,
        ) &&
        Number.isInteger(message.current)
      )
        setLevels({ levels: message.levels, current: message.current });
      else if (
        message.type === "visual" &&
        typeof message.label === "string" &&
        Number.isFinite(message.height) &&
        message.height >= 0 &&
        typeof message.auto === "boolean"
      )
        setVisual({
          label: message.label,
          height: message.height,
          auto: Boolean(message.auto),
        });
    };

    window.addEventListener("message", onMessage);
    send(greeting); // the frame may already be up
    return () => {
      clearTimeout(timeout);
      clearInterval(greetingTimer);
      window.removeEventListener("message", onMessage);
    };
  }, [embedUrl, greeting, origin, iframeRef, send, channel]);

  return {
    ready,
    failure,
    state,
    send,
    resumeOffer,
    clearResumeOffer: () => setResumeOffer(null),
    levels,
    visual,
    seekedAt,
  };
}
