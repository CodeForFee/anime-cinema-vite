// The math behind the player's touch gestures (mobile controls): pure, so it is checked in gestures.spec.ts

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Left 35 % / centre / right 35 % of the player, the zones for double tap */
export const tapZone = (x: number, width: number): -1 | 0 | 1 => {
  const ratio = x / width
  return ratio < 0.35 ? -1 : ratio > 0.65 ? 1 : 0
}

/** The picture's own brightness range in a browser, which cannot change the screen's */
export const BRIGHTNESS_MIN = 0.3
export const BRIGHTNESS_MAX = 1.5

/**
 * Level after a vertical swipe: a swipe over the full player height moves across the whole range.
 * `dy` is the finger movement in px (negative = up = more).
 */
export function swipeLevel(start: number, dy: number, height: number, min: number, max: number) {
  return clamp(start - (dy / height) * (max - min), min, max)
}

/** Seek target of a horizontal swipe: the full player width is 90 s */
export const swipeSeek = (start: number, dx: number, width: number, duration: number) =>
  clamp(start + (dx / width) * 90, 0, duration || start + Math.abs(dx))
