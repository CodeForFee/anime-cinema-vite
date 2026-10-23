import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, X } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { formatEpisodeName } from "@/core/format";
import { heightOf, isAutoLevel, type QualityLevel, type QualityPref, sizedLevels } from "@/core/player/pick-quality";
import { cn } from "@/shared/lib/utils";
import { onBack } from "@/platform/back";
import type { Episode } from "@/core/types/anime";

// keep equal to the .cn-sheet-out duration in globals.css
const SHEET_OUT_MS = 220;

/**
 * Panel inside the player frame: a bottom sheet in portrait, a side panel in landscape.
 * Rendered in the frame, not portalled to <body>, or it would not show in full screen.
 * Closing plays the exit animation first; children get `close` for the same reason.
 */
function Sheet({
  title,
  onClose,
  anchorX = 0,
  width,
  children,
}: {
  title: string;
  onClose: () => void;
  /** Desktop: x (px, inside the player) of the button that opened it; the popup is centred over it */
  anchorX?: number;
  /** Desktop popup width */
  width: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [closing, setClosing] = useState(false);
  const close = () => setClosing(true);

  // A timer, not animationend: that event may never come (reduced motion, interrupted animation), and a
  // sheet left mounted is an invisible layer that swallows every tap on the player
  // biome-ignore lint/correctness/useExhaustiveDependencies: onClose is a new closure every render
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(onClose, SHEET_OUT_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  // Android back closes the sheet before anything else
  useEffect(() => onBack(() => setClosing(true)), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setClosing(true);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={cn("absolute inset-0 z-30", closing && "pointer-events-none")} role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Đóng"
        onClick={close}
        className={cn("absolute inset-0 bg-black/45 lg:bg-transparent", closing ? "cn-fade-out" : "cn-fade")}
      />
      <div
        className={cn(
          // a floating card with the same gap and radius on every side, in both orientations
          "glass-sheet absolute inset-x-2 bottom-2 flex max-h-[calc(100%-1rem)] flex-col overflow-hidden rounded-3xl text-white",
          "landscape:inset-y-2 landscape:left-auto landscape:right-[max(0.5rem,var(--inset-right))] landscape:w-[min(380px,46%)]",
          // desktop: a drop-up popover above the control bar, like Netflix, not a side panel
          "lg:!inset-y-auto lg:!bottom-[5.5rem] lg:!left-[clamp(0.5rem,calc(var(--ax)_-_var(--w)/2),calc(100%_-_var(--w)_-_0.5rem))] lg:!right-auto lg:!w-[var(--w)] lg:!max-h-[min(70%,420px)] lg:rounded-2xl",
          closing ? "cn-sheet-out" : "cn-sheet"
        )}
        style={{ "--w": width, "--ax": `${anchorX}px` } as React.CSSProperties}
      >
        <div className="flex shrink-0 items-center justify-between px-4 pb-1 pt-3 landscape:pr-[max(1rem,var(--inset-right))]">
          <h3 className="text-sm font-bold">{title}</h3>
          <button type="button" aria-label="Đóng" onClick={close} className="glass-button flex h-8 w-8 items-center justify-center rounded-full">
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
        {children(close)}
      </div>
    </div>
  );
}

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function SpeedSheet({
  rate,
  onSelect,
  onClose,
  anchorX,
}: {
  rate: number;
  onSelect: (rate: number) => void;
  onClose: () => void;
  anchorX?: number;
}) {
  return (
    <Sheet title="Tốc độ phát" onClose={onClose} anchorX={anchorX} width="min(260px,60%)">
      {(close) => (
      <div className="grid grid-cols-4 gap-2 overflow-y-auto px-4 pb-[max(1rem,var(--inset-bottom))] pt-1 landscape:grid-cols-2">
        {RATES.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={value === rate}
            onClick={() => {
              onSelect(value);
              close();
            }}
            className={cn(
              "flex h-10 items-center justify-center gap-1 rounded-xl text-sm font-semibold transition active:scale-95",
              value === rate ? "bg-white text-black" : "glass-button text-white"
            )}
          >
            {value === rate && <Check aria-hidden className="h-4 w-4" />}
            {value === 1 ? "Chuẩn" : `${value}x`}
          </button>
        ))}
      </div>
      )}
    </Sheet>
  );
}

/** The player's levels, tallest first, with "Tự động" on top when the player has an automatic choice */
export function QualitySheet({
  levels,
  pref,
  onSelect,
  onClose,
  anchorX,
}: {
  levels: QualityLevel[];
  pref: QualityPref;
  onSelect: (pref: QualityPref) => void;
  onClose: () => void;
  anchorX?: number;
}) {
  const options: { value: QualityPref; label: string }[] = [
    ...(levels.some(isAutoLevel) ? [{ value: "auto" as const, label: "Tự động" }] : []),
    ...sizedLevels(levels).map((level) => ({ value: heightOf(level), label: `${heightOf(level)}p` })),
  ];
  return (
    <Sheet title="Chất lượng" onClose={onClose} anchorX={anchorX} width="min(240px,60%)">
      {(close) => (
        <div className="flex flex-col gap-2 overflow-y-auto px-4 pb-[max(1rem,var(--inset-bottom))] pt-1">
          {options.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={value === pref}
              onClick={() => {
                onSelect(value);
                close();
              }}
              className={cn(
                "flex h-10 shrink-0 items-center justify-center gap-1 rounded-xl text-sm font-semibold transition active:scale-95",
                value === pref ? "bg-white text-black" : "glass-button text-white"
              )}
            >
              {value === pref && <Check aria-hidden className="h-4 w-4" />}
              {label}
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}

const COLUMNS = 5;
const ROW_HEIGHT = 48;

export function EpisodeSheet({
  episodes,
  currentId,
  onSelect,
  onClose,
  anchorX,
}: {
  episodes: Episode[];
  currentId?: string;
  onSelect: (episode: Episode) => void;
  onClose: () => void;
  anchorX?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = Math.ceil(episodes.length / COLUMNS);
  // long shows run past a thousand episodes: only the rows in view are in the DOM
  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
  });

  const currentIndex = episodes.findIndex((ep) => ep.id === currentId);
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to the current episode on open only
  useEffect(() => {
    if (currentIndex >= 0) virtualizer.scrollToIndex(Math.floor(currentIndex / COLUMNS), { align: "center" });
  }, []);

  return (
    <Sheet title={`Danh sách tập · ${episodes.length}`} onClose={onClose} anchorX={anchorX} width="min(380px,60%)">
      {(close) => (
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,var(--inset-bottom))]">
        <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((row) => (
            <div
              key={row.key}
              className="absolute inset-x-0 grid gap-2"
              style={{ top: row.start, height: ROW_HEIGHT, gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))` }}
            >
              {episodes.slice(row.index * COLUMNS, row.index * COLUMNS + COLUMNS).map((ep) => {
                const current = ep.id === currentId;
                return (
                  <button
                    key={ep.id}
                    type="button"
                    aria-current={current || undefined}
                    title={formatEpisodeName(ep.name)}
                    onClick={() => {
                      onSelect(ep);
                      close();
                    }}
                    className={cn(
                      "my-1 truncate rounded-xl px-1 text-sm font-semibold transition active:scale-95",
                      current ? "bg-primaryRed text-white shadow-[0_0_18px_rgba(229,9,20,0.55)]" : "glass-button text-white/90"
                    )}
                  >
                    {ep.name}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      )}
    </Sheet>
  );
}
