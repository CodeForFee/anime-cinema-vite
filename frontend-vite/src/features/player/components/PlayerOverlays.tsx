import { FastForward, Play, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatTime } from "@/core/format";

/** Counts down from `seconds` while `running`, then calls `onDone` once */
function useCountdown(seconds: number, running: boolean, onDone: () => void) {
  const [left, setLeft] = useState(seconds);
  // biome-ignore lint/correctness/useExhaustiveDependencies: onDone is a new closure every render; the tick depends on the count only
  useEffect(() => {
    if (!running) return setLeft(seconds);
    if (left <= 0) return onDone();
    const timer = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [left, running, seconds]);
  return left;
}

const RESUME_SECONDS = 8;

/** "Tự động + gợi ý": after two long stalls the automatic choice is still above 480p; one tap drops to it */
export function WeakNetworkHint({ onAccept, onDismiss }: { onAccept: () => void; onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="cn-pop glass absolute left-1/2 top-[max(3.5rem,calc(var(--inset-top)+3rem))] z-30 flex -translate-x-1/2 items-center gap-1 rounded-full py-1 pl-4 pr-1 text-sm text-white"
    >
      <span className="whitespace-nowrap">Mạng yếu</span>
      <button type="button" onClick={onAccept} className="whitespace-nowrap rounded-full bg-white px-3 py-1.5 font-semibold text-black transition active:scale-95">
        Chuyển 480p
      </button>
      <button type="button" aria-label="Bỏ qua" onClick={onDismiss} className="flex h-8 w-8 items-center justify-center rounded-full transition active:scale-90">
        <X aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );
}

/** The app's own "continue watching": the CDN player's prompt sits under our controls and cannot be tapped */
export function ResumePrompt({ at, onResume, onRestart }: { at: number; onResume: () => void; onRestart: () => void }) {
  const left = useCountdown(RESUME_SECONDS, true, onResume);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
      <div role="dialog" aria-label="Xem tiếp" className="cn-pop glass w-full max-w-sm rounded-3xl p-5 text-white">
        <p className="text-base font-bold">Bạn đang xem dở tập này</p>
        <p className="mt-1 text-sm text-white/70">Tự xem tiếp sau {left} giây</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            // biome-ignore lint/a11y/noAutofocus: the primary action of a modal prompt takes focus (keyboard, TV remote)
            autoFocus
            onClick={onResume}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-black transition active:scale-95"
          >
            <Play aria-hidden className="h-4 w-4 fill-current" />
            Xem tiếp từ {formatTime(at)}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="glass-button flex h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition active:scale-95"
          >
            <RotateCcw aria-hidden className="h-4 w-4" />
            Xem từ đầu
          </button>
        </div>
      </div>
    </div>
  );
}

const NEXT_SECONDS = 5;

/** Netflix's "next episode" card: shows in the last seconds, counts down once the episode has ended */
export function NextUpCard({
  label,
  ended,
  autoPlay,
  onPlay,
  onDismiss,
}: {
  label: string;
  ended: boolean;
  autoPlay: boolean;
  onPlay: () => void;
  onDismiss: () => void;
}) {
  const counting = ended && autoPlay;
  const left = useCountdown(NEXT_SECONDS, counting, onPlay);

  return (
    <div className="cn-pop glass absolute bottom-20 right-3 z-20 flex items-center gap-2 rounded-2xl p-2 pl-3 text-white landscape:right-[max(0.75rem,var(--inset-right))]">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-white/60">Tập tiếp theo</p>
        <p className="truncate text-sm font-semibold">{label}</p>
      </div>
      <button
        type="button"
        onClick={onPlay}
        className="relative flex h-10 items-center gap-1.5 overflow-hidden rounded-full bg-white px-4 text-sm font-bold text-black transition active:scale-95"
      >
        {counting && (
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 bg-black/15 transition-[width] duration-1000 ease-linear"
            style={{ width: `${((NEXT_SECONDS - left) / NEXT_SECONDS) * 100}%` }}
          />
        )}
        <Play aria-hidden className="relative h-4 w-4 fill-current" />
        <span className="relative">{counting ? `Phát sau ${left}s` : "Xem ngay"}</span>
      </button>
      <button type="button" aria-label="Ẩn" onClick={onDismiss} className="glass-button flex h-8 w-8 items-center justify-center rounded-full">
        <X aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );
}

export function SkipIntroButton({ onSkip }: { onSkip: () => void }) {
  return (
    <button
      type="button"
      onClick={onSkip}
      className="cn-pop glass-button absolute bottom-20 right-3 z-20 flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white transition active:scale-95 landscape:right-[max(0.75rem,var(--inset-right))]"
    >
      <FastForward aria-hidden className="h-4 w-4 fill-current" />
      Bỏ qua giới thiệu
    </button>
  );
}
