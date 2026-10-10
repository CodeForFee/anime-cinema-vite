import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, X } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { cn, formatEpisodeName } from "../../lib/utils";
import type { Episode } from "../../types/anime";

/**
 * Panel inside the player frame: a bottom sheet in portrait, a side panel in landscape.
 * Rendered in the frame, not portalled to <body>, or it would not show in full screen.
 * Closing plays the exit animation first; children get `close` for the same reason.
 */
function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: (close: () => void) => React.ReactNode;
}) {
  const [closing, setClosing] = useState(false);
  const close = () => setClosing(true);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setClosing(true);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="absolute inset-0 z-30" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Đóng"
        onClick={close}
        className={cn("absolute inset-0 bg-black/45", closing ? "cn-fade-out" : "cn-fade")}
      />
      <div
        onAnimationEnd={(event) => closing && event.target === event.currentTarget && onClose()}
        className={cn(
          "glass-sheet absolute inset-x-0 bottom-0 flex max-h-full flex-col rounded-t-3xl text-white",
          "landscape:inset-y-0 landscape:left-auto landscape:right-0 landscape:w-[min(400px,48%)] landscape:rounded-none landscape:rounded-l-3xl",
          closing ? "cn-sheet-out" : "cn-sheet"
        )}
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

export function SpeedSheet({ rate, onSelect, onClose }: { rate: number; onSelect: (rate: number) => void; onClose: () => void }) {
  return (
    <Sheet title="Tốc độ phát" onClose={onClose}>
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

const COLUMNS = 5;
const ROW_HEIGHT = 48;

export function EpisodeSheet({
  episodes,
  currentId,
  onSelect,
  onClose,
}: {
  episodes: Episode[];
  currentId?: string;
  onSelect: (episode: Episode) => void;
  onClose: () => void;
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
    <Sheet title={`Danh sách tập · ${episodes.length}`} onClose={onClose}>
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
