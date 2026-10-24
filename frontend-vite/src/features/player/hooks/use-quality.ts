import { type RefObject, useEffect, useRef, useState } from "react";

import {
  isWeakNetwork,
  pickLevel,
  type QualityPref,
  STALL_MS,
  shouldSuggestWeak,
  WEAK_HEIGHT,
} from "@/core/player/pick-quality";
import type {
  PlayerLevels,
  PlayerState,
  VisualQuality,
} from "@/features/player/engines/iframe-bridge";
import { usePlayerStore } from "@/features/player/store";
import { prefersSavingData } from "@/platform/network";

// a wait that starts this soon after a seek is the seek loading, not the network failing
const SEEK_GRACE_MS = 1500;

interface Bridge {
  state: PlayerState | null;
  levels: PlayerLevels | null;
  visual: VisualQuality | null;
  seekedAt: RefObject<number>;
  send: (type: "quality", value: number) => void;
}

/**
 * The quality menu and the "Tự động + gợi ý" policy (core/player/pick-quality.ts) over the player's own levels:
 * the viewer's choice is applied to each episode as its levels arrive, and two long stalls in a minute offer 480p.
 */
export function useQuality(bridge: Bridge, episodeKey: string | undefined) {
  const pref = usePlayerStore((s) => s.quality);
  const setPref = usePlayerStore((s) => s.setQuality);
  const { state, levels, visual, send, seekedAt } = bridge;
  const [suggest, setSuggest] = useState(false);
  const dismissed = useRef(false);
  const stalls = useRef<number[]>([]);
  const waitingSince = useRef<number | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: per episode
  useEffect(() => {
    setSuggest(false);
    dismissed.current = false;
    stalls.current = [];
    waitingSince.current = null;
  }, [episodeKey]);

  // apply the choice to each new level list; `pref` is read, not watched: choose() sends its own command
  // biome-ignore lint/correctness/useExhaustiveDependencies: on each level list only
  useEffect(() => {
    if (!levels) return;
    const index = pickLevel(levels.levels, pref, prefersSavingData());
    if (index !== null && index !== levels.current) send("quality", index);
  }, [levels]);

  // stalls: how long each wait for data lasted
  const waiting = Boolean(state?.waiting);
  // biome-ignore lint/correctness/useExhaustiveDependencies: on the flag only
  useEffect(() => {
    const now = Date.now();
    if (waiting) {
      // the first frame and a seek both wait for data without the network being weak
      const loading =
        (state?.currentTime ?? 0) < 1 || now - seekedAt.current < SEEK_GRACE_MS;
      waitingSince.current = loading ? null : now;
      return;
    }
    const since = waitingSince.current;
    waitingSince.current = null;
    if (since === null || now - since < STALL_MS) return;
    stalls.current = [...stalls.current, now];
    if (
      !dismissed.current &&
      levels &&
      isWeakNetwork(stalls.current, now) &&
      shouldSuggestWeak(levels.levels, pref, visual?.height ?? 0)
    )
      setSuggest(true);
  }, [waiting]);

  const choose = (next: QualityPref) => {
    setPref(next);
    setSuggest(false);
    const index = levels
      ? pickLevel(levels.levels, next, prefersSavingData())
      : null;
    if (index !== null) send("quality", index);
  };

  return {
    /** null: the player has no levels to pick from (or the bridge is too old to say) */
    levels: levels && levels.levels.length > 1 ? levels.levels : null,
    pref,
    /** "Tự động · 720p", "480p" */
    label:
      pref === "auto"
        ? visual?.height
          ? `Tự động · ${visual.height}p`
          : "Tự động"
        : `${pref}p`,
    choose,
    suggest,
    acceptSuggestion: () => choose(WEAK_HEIGHT),
    dismissSuggestion: () => {
      dismissed.current = true;
      setSuggest(false);
    },
  };
}
