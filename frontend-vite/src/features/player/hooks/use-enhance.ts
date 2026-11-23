import { type RefObject, useEffect, useRef, useState } from "react";

import type { Enhancer } from "@/features/player/engines/enhance";
import type {
  EnhanceSettings,
  EnhanceState,
} from "@/features/player/engines/enhance/model";
import { usePlayerStore } from "@/features/player/store";
import { isNativeApp } from "@/platform/transport";

// how long a frame has to answer "enhance" before its bridge counts as one without the enhancers
const ANSWER_MS = 3000;

/** Weak device (main.tsx sets html[data-lite]); touch devices and the app get the phone GPU budget */
const device = () => ({
  lite: document.documentElement.hasAttribute("data-lite"),
  mobile: isNativeApp || matchMedia("(pointer: coarse)").matches,
});

interface Bridge {
  ready: boolean;
  enhanced: EnhanceState | null;
  sendEnhance: (value: EnhanceSettings) => void;
}

/**
 * The viewer's surround / upscale / colour choice, applied where the video is: inside the player frame through the
 * bridge, or directly on the app's own <video> (hls.js / mp4 path). Answers with what actually runs. The stored
 * choice is the viewer's alone: a fallback the engine makes (Anime4K too slow, audio held back) only shows as a
 * note, and every episode, full-screen switch or reload applies the choice again.
 */
export function useEnhance(bridge: Bridge, video: RefObject<HTMLVideoElement | null>, local: boolean) {
  const surround = usePlayerStore((s) => s.surround);
  const surroundMode = usePlayerStore((s) => s.surroundMode);
  const upscale = usePlayerStore((s) => s.upscale);
  const color = usePlayerStore((s) => s.color);
  const [localState, setLocalState] = useState<EnhanceState | null>(null);
  const [outdated, setOutdated] = useState(false);
  const enhancer = useRef<Enhancer | null>(null);

  // the player frame
  const { ready, sendEnhance, enhanced } = bridge;
  useEffect(() => {
    if (local || !ready) return;
    setOutdated(false);
    sendEnhance({ surround, surroundMode, upscale, color, ...device() });
  }, [local, ready, sendEnhance, surround, surroundMode, upscale, color]);
  useEffect(() => {
    if (local || !ready || enhanced) return;
    const timer = setTimeout(() => setOutdated(true), ANSWER_MS);
    return () => clearTimeout(timer);
  }, [local, ready, enhanced]);

  // the app's own video
  useEffect(() => {
    const el = video.current;
    if (!local || !el) return;
    let cancelled = false;
    void import("@/features/player/engines/enhance").then(({ createEnhancer }) => {
      if (cancelled) return;
      enhancer.current = createEnhancer(el, setLocalState);
      void enhancer.current.set({ ...usePlayerStore.getState(), ...device() }).then(setLocalState);
    });
    return () => {
      cancelled = true;
      enhancer.current?.destroy();
      enhancer.current = null;
      setLocalState(null);
    };
  }, [local, video]);
  useEffect(() => {
    void enhancer.current?.set({ surround, surroundMode, upscale, color, ...device() }).then(setLocalState);
  }, [surround, surroundMode, upscale, color]);

  const state = local ? localState : enhanced?.error === "outdated" ? null : enhanced;
  const isOutdated = !local && (outdated || enhanced?.error === "outdated");

  return { state, outdated: isOutdated, surround, surroundMode, upscale, color };
}

export type EnhanceView = ReturnType<typeof useEnhance>;
