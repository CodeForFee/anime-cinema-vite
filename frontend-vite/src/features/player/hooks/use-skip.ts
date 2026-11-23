import { useEffect, useState } from "react";

import type { SkipTimes } from "@/core/player/skip-times";
import type { PlayerState } from "@/features/player/engines/iframe-bridge";

type Kind = "recap" | "op" | "ed";
const LABELS: Record<Kind, string> = {
  recap: "Bỏ qua tóm tắt",
  op: "Bỏ qua giới thiệu",
  ed: "Bỏ qua ending",
};
// an ending this close to the end is the final credits: the next-episode card handles it, not a skip
const FINAL_CREDITS_S = 30;

export interface SkipSegment {
  kind: Kind;
  range: [number, number];
}

/** The parts worth skipping, in playing order; the final credits are left to the next-episode card */
export function skipSegments(
  times: SkipTimes | undefined,
  duration: number,
): SkipSegment[] {
  if (!times) return [];
  const list: SkipSegment[] = [];
  if (times.recap) list.push({ kind: "recap", range: times.recap });
  if (times.op) list.push({ kind: "op", range: times.op });
  if (times.ed && duration > 0 && times.ed[1] < duration - FINAL_CREDITS_S)
    list.push({ kind: "ed", range: times.ed });
  return list;
}

/** The segment playing at `now`, unless already skipped; never in its last 2 s (nothing left to skip) */
export function activeSegment(
  segments: SkipSegment[],
  now: number,
  skipped: ReadonlySet<Kind>,
) {
  return segments.find(
    ({ kind, range }) =>
      !skipped.has(kind) && now >= range[0] && now < range[1] - 2,
  );
}

/**
 * "Bỏ qua …" for the recap, the opening and a mid-episode ending. With `auto` the jump happens by itself, once
 * per part and episode; a seek back into a part the viewer already skipped does not skip it again.
 */
export function useSkip({
  times,
  state,
  episodeKey,
  hold,
  auto,
  seek,
}: {
  times: SkipTimes | undefined;
  state: PlayerState | null;
  episodeKey: string | undefined;
  /** e.g. while the resume prompt is up */
  hold: boolean;
  auto: boolean;
  seek: (seconds: number) => void;
}) {
  const [skipped, setSkipped] = useState<Set<Kind>>(() => new Set());
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new episode starts with nothing skipped
  useEffect(() => setSkipped(new Set()), [episodeKey]);

  const segments = skipSegments(times, state?.duration ?? 0);
  const active =
    state && !hold
      ? activeSegment(segments, state.currentTime, skipped)
      : undefined;

  const skip = (segment: SkipSegment) => {
    seek(segment.range[1]);
    setSkipped((set) => new Set(set).add(segment.kind));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: fires when a new part starts, not every tick
  useEffect(() => {
    // the switch promises OP and recap only: a mid-episode ending may hide a scene the viewer wants
    if (auto && active && active.kind !== "ed" && state && !state.paused)
      skip(active);
  }, [auto, active?.kind]);

  return active
    ? { label: LABELS[active.kind], onSkip: () => skip(active) }
    : null;
}
