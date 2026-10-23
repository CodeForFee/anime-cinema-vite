import { useDrag } from "@use-gesture/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { AnimeItem } from "@/core/types/anime";
import { episodeNumber, loopOffset, partLabel, place, STEP, VISIBLE } from "@/features/home/model/coverflow";
import { LazyImage, useUIStore } from "@/features/title";

const SETTLE = "transform 460ms var(--ease-ios), opacity 460ms";

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
      const spot = place(around(i) + drag);
      card.style.transition = animate ? SETTLE : "none";
      card.style.transform = spot.transform;
      card.style.zIndex = String(spot.zIndex);
      card.style.opacity = String(spot.opacity);
      const shade = shades.current.get(i);
      if (shade) {
        shade.style.transition = animate ? "opacity 420ms" : "none";
        shade.style.opacity = String(spot.shade);
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
          const spot = place(around(i));
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
              style={{ transform: spot.transform, zIndex: spot.zIndex, opacity: spot.opacity }}
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
                style={{ opacity: spot.shade }}
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
      {/* the dots never change size; one pill slides over the current one (transform only, no relayout) */}
      <div className="mt-3 flex justify-center" aria-hidden>
        <div className="relative flex gap-1.5">
          {items.map((anime, i) => (
            <span key={anime.slug || i} className="h-1.5 w-1.5 rounded-full bg-white/30" />
          ))}
          <span
            className="absolute left-0 top-0 h-1.5 w-5 rounded-full bg-white transition-transform duration-300 ease-[var(--ease-ios)]"
            // dot pitch 12 px (6 + 6 gap); the 20 px pill is centred on its dot
            style={{ transform: `translateX(${index * 12 - 7}px)` }}
          />
        </div>
      </div>
    </div>
  );
}
