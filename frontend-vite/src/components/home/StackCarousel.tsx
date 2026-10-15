import { useDrag } from "@use-gesture/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { useUIStore } from "../../stores/useUIStore";
import type { AnimeItem } from "../../types/anime";
import { LazyImage } from "../movie/LazyImage";

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
const STEP = 0.92;
const FAN = 0.3;
// how far a neighbour is turned away (degrees) and pushed back (px)
const TURN = 48;
const DEPTH = 120;
const VISIBLE = 2;
const SETTLE = "transform 460ms cubic-bezier(0.32, 0.72, 0, 1), opacity 460ms";

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

/**
 * Phones: the ranked list as a stack of cards. The current one is large in the middle, its neighbours
 * shrink and darken behind it; swipe sideways to move, tap the middle card to open it.
 * While the finger moves, transforms are written straight to the cards (no React render per frame);
 * React only renders when the current card changes.
 */
export function StackCarousel({ items }: { items: AnimeItem[] }) {
  const [index, setIndex] = useState(0);
  const cards = useRef(new Map<number, HTMLButtonElement>());
  const shades = useRef(new Map<number, HTMLSpanElement>());
  const openInfoModal = useUIStore((state) => state.openInfoModal);
  const count = items.length;
  const around = (i: number) => loopOffset(i, index, count);
  const go = (step: number) => setIndex((i) => (((i + step) % count) + count) % count);

  /** Places every mounted card for a drag of `drag` cards (0 = at rest) */
  const layout = (drag: number, animate: boolean) => {
    for (const [i, card] of cards.current) {
      const offset = around(i) + drag;
      const distance = Math.min(Math.abs(offset), VISIBLE + 1);
      card.style.transition = animate ? SETTLE : "none";
      card.style.transform = coverflow(offset);
      card.style.zIndex = String(10 - Math.round(distance));
      card.style.opacity = distance > VISIBLE + 0.4 ? "0" : "1";
      const shade = shades.current.get(i);
      if (shade) {
        shade.style.transition = animate ? "opacity 420ms" : "none";
        // the middle card stays clear; one step out is already well in the dark
        shade.style.opacity = String(Math.min(Math.min(distance, VISIBLE) * 0.42, 0.78));
      }
    }
  };

  // a new current card slides into place
  // biome-ignore lint/correctness/useExhaustiveDependencies: layout reads the refs, index is the trigger
  useLayoutEffect(() => layout(0, true), [index]);

  const bind = useDrag(
    ({ active, movement: [mx], velocity: [vx], direction: [dx], tap }) => {
      if (tap) return;
      const width = cards.current.get(index)?.offsetWidth || 240;
      const drag = mx / (width * STEP);
      if (active) return layout(drag, false);

      const flick = vx > 0.35 ? -dx : 0;
      const step = Math.abs(mx) > width * 0.2 ? -Math.sign(mx) : flick;
      if (step === 0) layout(0, true);
      else go(step);
    },
    { axis: "x", filterTaps: true, pointer: { touch: true } }
  );

  if (items.length === 0) return null;
  const current = items[index] ?? items[0];
  const currentPart = partLabel(current);
  const currentEpisode = episodeNumber(current);

  return (
    <div className="px-4">
      <div
        {...bind()}
        className="relative mx-auto h-[min(93vw,420px)] touch-pan-y select-none [perspective:1000px]"
      >
        {items.map((anime, i) => {
          // the list loops: the last titles sit to the left of the first
          if (Math.abs(around(i)) > VISIBLE + 1) return null;
          const episode = episodeNumber(anime);
          return (
            <button
              type="button"
              key={anime.slug || i}
              ref={(node) => {
                if (node) cards.current.set(i, node);
                else cards.current.delete(i);
              }}
              tabIndex={i === index ? 0 : -1}
              aria-label={anime.title}
              onClick={() => (i === index ? openInfoModal(anime) : setIndex(i))}
              className={`absolute left-1/2 top-0 aspect-[2/3] w-[min(62vw,280px)] overflow-hidden rounded-xl bg-[#1c1c1f] text-left [backface-visibility:hidden] will-change-transform ${
                i === index ? "stack-card-front" : "shadow-[0_10px_20px_rgba(0,0,0,0.55)] ring-1 ring-white/10"
              }`}
              // first paint before the layout effect runs: already roughly in place
              style={{ transform: coverflow(around(i)) }}
            >
              <LazyImage art={anime} src={anime.poster || anime.image} alt="" className="h-full w-full object-cover" />
              {/* cards behind the middle one sink into the dark */}
              <span
                ref={(node) => {
                  if (node) shades.current.set(i, node);
                  else shades.current.delete(i);
                }}
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-black"
              />
              {/* the middle card wears a liquid-glass rim and sheen (globals.css) */}
              <span
                aria-hidden
                className={`glass-rim absolute inset-0 ${i === index ? "opacity-100" : "opacity-0"}`}
              />
              {/* same badges as the desktop ranked cards */}
              <span className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5">
                <span className="rounded border border-white/15 bg-[#202020]/90 px-2 py-0.5 text-[11px] font-bold text-gray-200 shadow-sm">
                  PĐ. {episode || "Full"}
                </span>
                <span className="rounded border border-emerald-400/30 bg-emerald-600/90 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                  TM. {episode || "HD"}
                </span>
              </span>
            </button>
          );
        })}

        {/* for those who tap rather than swipe */}
        {count > 1 && (
          <button
            type="button"
            aria-label="Phim trước"
            onClick={() => go(-1)}
            className="glass-button absolute left-0 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white transition active:scale-90"
          >
            <ChevronLeft aria-hidden className="h-5 w-5" />
          </button>
        )}
        {count > 1 && (
          <button
            type="button"
            aria-label="Phim sau"
            onClick={() => go(1)}
            className="glass-button absolute right-0 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white transition active:scale-90"
          >
            <ChevronRight aria-hidden className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* the middle card: same rank / title / part • episode as the desktop shelf */}
      <div key={current.slug || index} className="cn-pop mx-auto mt-3 flex max-w-[min(70vw,300px)] items-center gap-3 px-1">
        <span className="select-none text-5xl font-black italic leading-none tracking-tighter text-amber-400 drop-shadow-[0_2px_12px_rgba(251,191,36,0.6)]">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <h4 className="line-clamp-1 text-sm font-bold leading-snug text-white drop-shadow">{current.title}</h4>
          {current.subTitle && current.subTitle !== current.title && (
            <p className="line-clamp-1 text-xs italic text-gray-400">{current.subTitle}</p>
          )}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
            {currentPart && (
              <>
                <span className="text-gray-300">{currentPart}</span>
                <span aria-hidden>•</span>
              </>
            )}
            <span className="font-bold text-primaryRed">{currentEpisode ? `Tập ${currentEpisode}` : "Tập mới"}</span>
          </div>
        </div>
      </div>

      {/* position */}
      <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
        {items.map((anime, i) => (
          <span
            key={anime.slug || i}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-5 bg-white" : "w-1.5 bg-white/30"}`}
          />
        ))}
      </div>
    </div>
  );
}
