import type { AnimeItem } from "@/core/types/anime"

/** "02" from "TẬP 02" */
export const episodeNumber = (anime: AnimeItem) => (anime.episode || "").replace(/^TẬP\s*/i, "").trim();

/** "Phần 2" when the title or its metadata names a part, otherwise null (part 1 is not worth saying) */
export function partLabel(anime: AnimeItem): string | null {
  const inTitle = anime.title.match(/(?:Season|Mùa|Phần|SS|Part)\s*(\d+|[IVXLCDM]+)/i);
  if (inTitle) return `Phần ${inTitle[1]}`;
  const meta = String((anime as { metadata?: Record<string, string> }).metadata?.Season ?? "").trim();
  if (!meta || meta === "1" || meta === "Phần 1") return null;
  return meta.startsWith("Phần") ? meta : `Phần ${meta}`;
}

/** Offset of card i from the current one on a loop of count cards: the shortest way round, in (-count/2, count/2] */
export function loopOffset(i: number, current: number, count: number) {
  const raw = (((i - current) % count) + count) % count;
  return raw > count / 2 ? raw - count : raw;
}

// how far the first neighbour sits from the centre, as a share of the card width; further ones fan in closer.
// Turned 48° and seen in perspective, a neighbour's inner edge clears the middle card only from ~0.89 up:
// 0.92 leaves a small gap between them
export const STEP = 0.92;
const FAN = 0.3;
// how far a neighbour is turned away (degrees) and pushed back (px)
const TURN = 48;
const DEPTH = 120;
export const VISIBLE = 2;

/**
 * Cover flow: the middle card faces the viewer, the ones beside it are turned inward on its edges like
 * open doors. A card at `offset` (fractional while dragging) is placed and turned continuously, so a swipe
 * swings the next card round to the front instead of sliding one card over another.
 */
export function coverflow(offset: number) {
  const side = Math.sign(offset);
  const near = Math.min(Math.abs(offset), 1);
  const far = Math.max(Math.abs(offset) - 1, 0);
  const x = side * (near * STEP + far * FAN) * 100;
  const z = -(near + far * 0.6) * DEPTH;
  // a right-hand card turns its outer (right) edge away: negative rotateY
  return `translate3d(calc(-50% + ${x}%), 0, ${z}px) rotateY(${-side * near * TURN}deg)`;
}

/** How dark a card sits behind the middle one: the middle stays clear, one step out is already well in the dark */
export const shadeOpacity = (offset: number) => Math.min(Math.min(Math.abs(offset), VISIBLE) * 0.42, 0.78);

/**
 * Where a card at `offset` sits and how dark it is. Render uses it too, so a card that mounts without the
 * index changing (the list refreshed under the carousel) is already in place and lit on its first frame.
 */
export function place(offset: number) {
  const distance = Math.min(Math.abs(offset), VISIBLE + 1);
  return {
    transform: coverflow(offset),
    zIndex: 10 - Math.round(distance),
    opacity: distance > VISIBLE + 0.4 ? 0 : 1,
    shade: shadeOpacity(offset),
  };
}
