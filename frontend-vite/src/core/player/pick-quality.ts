// "Tự động + gợi ý": the player's own automatic choice by default, a cap at 480p when the device asks to save
// data, and on a weak network a one-tap suggestion to drop to 480p. The viewer's choice is kept as a height,
// not a level index, so it carries over to the next episode whatever levels that one has.

/** One of the player's quality levels, as the bridge reports it */
export interface QualityLevel {
  index: number;
  label: string;
  height: number;
}

/** "auto", or the tallest picture wanted (px) */
export type QualityPref = "auto" | number;

export const WEAK_HEIGHT = 480;
/** A stall shorter than this is a hiccup, not a weak network */
export const STALL_MS = 1000;
const STALL_WINDOW_MS = 60_000;
const STALLS_FOR_WEAK = 2;

export const isAutoLevel = (level: QualityLevel) => /auto/i.test(level.label);
/** Height in px; some sources only say it in the label ("720p") */
export const heightOf = (level: QualityLevel) =>
  level.height || Number.parseInt(level.label, 10) || 0;

/** The levels a viewer can pick, tallest first (the automatic one is offered on its own) */
export const sizedLevels = (levels: QualityLevel[]) =>
  levels
    .filter((level) => !isAutoLevel(level) && heightOf(level) > 0)
    .sort((a, b) => heightOf(b) - heightOf(a));

/** The level index to play for `pref`, or null to leave the player as it is */
export function pickLevel(
  levels: QualityLevel[],
  pref: QualityPref,
  saveData = false,
): number | null {
  const cap = pref !== "auto" ? pref : saveData ? WEAK_HEIGHT : null;
  if (cap === null) return levels.find(isAutoLevel)?.index ?? null;
  const sized = sizedLevels(levels);
  if (sized.length === 0) return null;
  // the tallest that fits, else the smallest there is
  return (
    sized.find((level) => heightOf(level) <= cap) ?? sized[sized.length - 1]
  ).index;
}

/** Ends (ms) of the stalls longer than STALL_MS: weak once two of them fall within a minute */
export const isWeakNetwork = (stallEnds: number[], now: number) =>
  stallEnds.filter((end) => now - end <= STALL_WINDOW_MS).length >=
  STALLS_FOR_WEAK;

/** Offer 480p only to someone on the automatic choice who is above it, when a level at or under it exists */
export const shouldSuggestWeak = (
  levels: QualityLevel[],
  pref: QualityPref,
  playingHeight: number,
) =>
  pref === "auto" &&
  (playingHeight === 0 || playingHeight > WEAK_HEIGHT) &&
  sizedLevels(levels).some((level) => heightOf(level) <= WEAK_HEIGHT);
