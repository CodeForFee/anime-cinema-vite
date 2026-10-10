import React, { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Gauge,
  Lock,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipForward,
  Unlock,
} from "lucide-react";
import type { PlayerCommand, PlayerState } from "../../hooks/usePlayerBridge";
import { cn } from "../../lib/utils";

interface MobilePlayerControlsProps {
  state: PlayerState;
  send: (type: PlayerCommand, value?: number) => void;
  title: string;
  episodeName: string;
  hasNextEpisode?: boolean;
  onNextEpisode?: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

const RATES = [1, 1.25, 1.5, 2, 0.75];
const SEEK_STEP = 10;
const AUTO_HIDE_MS = 3500;
const DOUBLE_TAP_MS = 280;

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = Math.floor(s / 3600);
  return h > 0 ? `${h}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

const ROUND_BUTTON = "flex items-center justify-center rounded-full text-white active:scale-90 active:bg-white/15 transition";
const CHIP_BUTTON =
  "flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-white active:bg-white/15 transition";

/**
 * Touch controls drawn over the embedded player, in the manner of a phone video app:
 * tap to show or hide, double tap a side to jump 10 s, lock, speed, next episode, full screen.
 */
export const MobilePlayerControls: React.FC<MobilePlayerControlsProps> = ({
  state,
  send,
  title,
  episodeName,
  hasNextEpisode,
  onNextEpisode,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const [visible, setVisible] = useState(true);
  const [locked, setLocked] = useState(false);
  // Position under the thumb while the seek bar is dragged
  const [scrub, setScrub] = useState<number | null>(null);
  const [jump, setJump] = useState<{ direction: -1 | 1; key: number } | null>(null);
  // Bumped by every interaction so the auto-hide timer starts over
  const [activity, setActivity] = useState(0);

  const lastTap = useRef({ time: 0, zone: 0 });
  const tapTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!visible || state.paused || scrub !== null) return;
    const timer = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [visible, state.paused, scrub, activity]);

  useEffect(() => () => clearTimeout(tapTimer.current), []);

  const seekBy = (delta: number) =>
    send("seek", Math.min(Math.max(0, state.currentTime + delta), state.duration || state.currentTime + delta));

  /** Wraps a button handler: the tap must not reach the surface, and counts as activity */
  const act = (handler: () => void) => (event: React.MouseEvent) => {
    event.stopPropagation();
    setActivity((n) => n + 1);
    handler();
  };

  const handleSurfaceTap = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const zone = x < 0.35 ? -1 : x > 0.65 ? 1 : 0;
    const now = Date.now();

    if (!locked && zone !== 0 && lastTap.current.zone === zone && now - lastTap.current.time < DOUBLE_TAP_MS) {
      clearTimeout(tapTimer.current);
      lastTap.current = { time: 0, zone: 0 };
      seekBy(zone * SEEK_STEP);
      setJump({ direction: zone, key: now });
      return;
    }

    lastTap.current = { time: now, zone };
    clearTimeout(tapTimer.current);
    // A side tap waits a moment: it may be the first half of a double tap
    tapTimer.current = setTimeout(() => setVisible((v) => !v), zone === 0 ? 0 : DOUBLE_TAP_MS);
  };

  const commitScrub = () => {
    if (scrub === null) return;
    send("seek", scrub);
    setScrub(null);
    setActivity((n) => n + 1);
  };

  const shownTime = scrub ?? state.currentTime;
  const nextRate = RATES[(RATES.indexOf(state.rate) + 1) % RATES.length] ?? 1;

  return (
    <div
      role="group"
      aria-label="Điều khiển video"
      className="absolute inset-0 z-10 select-none touch-manipulation text-white"
      onClick={handleSurfaceTap}
    >
      {jump && (
        <div
          key={jump.key}
          aria-hidden
          className={cn(
            "avs-jump pointer-events-none absolute top-1/2 rounded-full bg-black/60 px-4 py-2 text-sm font-semibold",
            jump.direction < 0 ? "left-[10%]" : "right-[10%]"
          )}
        >
          {jump.direction < 0 ? "− 10 giây" : "+ 10 giây"}
        </div>
      )}

      {locked ? (
        visible && (
          <button
            type="button"
            onClick={act(() => setLocked(false))}
            className="absolute bottom-6 left-1/2 flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-black/65 px-5 text-sm font-semibold backdrop-blur-md"
          >
            <Unlock aria-hidden className="h-4 w-4" />
            Mở khoá màn hình
          </button>
        )
      ) : (
        <div
          className={cn(
            "absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-black/75 via-black/10 to-black/85 transition-opacity duration-200",
            visible ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          {/* Top: what is playing, lock */}
          <div className="flex items-center gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
            {isFullscreen && (
              <button type="button" aria-label="Thoát toàn màn hình" onClick={act(onToggleFullscreen)} className={cn(ROUND_BUTTON, "h-10 w-10")}>
                <ChevronDown aria-hidden className="h-6 w-6" />
              </button>
            )}
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">
              {title}
              {episodeName && <span className="font-normal text-white/70"> · {episodeName}</span>}
            </p>
            <button type="button" aria-label="Khoá màn hình" onClick={act(() => setLocked(true))} className={cn(ROUND_BUTTON, "h-10 w-10")}>
              <Lock aria-hidden className="h-5 w-5" />
            </button>
          </div>

          {/* Centre: back 10, play / pause, forward 10 */}
          <div className="flex items-center justify-center gap-9">
            <button type="button" aria-label="Lùi 10 giây" onClick={act(() => seekBy(-SEEK_STEP))} className={cn(ROUND_BUTTON, "relative h-12 w-12")}>
              <RotateCcw aria-hidden className="h-9 w-9" strokeWidth={1.5} />
              <span aria-hidden className="absolute text-[10px] font-bold">10</span>
            </button>

            <button
              type="button"
              aria-label={state.paused ? "Phát" : "Tạm dừng"}
              onClick={act(() => send(state.paused ? "play" : "pause"))}
              className={cn(ROUND_BUTTON, "h-16 w-16 bg-black/35")}
            >
              {state.waiting ? (
                <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-white/25 border-t-white" />
              ) : state.paused ? (
                <Play aria-hidden className="h-9 w-9 translate-x-0.5 fill-current" />
              ) : (
                <Pause aria-hidden className="h-9 w-9 fill-current" />
              )}
            </button>

            <button type="button" aria-label="Tới 10 giây" onClick={act(() => seekBy(SEEK_STEP))} className={cn(ROUND_BUTTON, "relative h-12 w-12")}>
              <RotateCw aria-hidden className="h-9 w-9" strokeWidth={1.5} />
              <span aria-hidden className="absolute text-[10px] font-bold">10</span>
            </button>
          </div>

          {/* Bottom: seek bar, then the actions */}
          <div className="space-y-1 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-3 text-xs font-medium tabular-nums">
              <span>{formatTime(shownTime)}</span>
              <input
                type="range"
                aria-label="Vị trí phát"
                min={0}
                max={Math.max(1, Math.floor(state.duration))}
                step={1}
                value={Math.floor(shownTime)}
                onChange={(e) => setScrub(Number(e.target.value))}
                onPointerUp={commitScrub}
                onTouchEnd={commitScrub}
                onKeyUp={commitScrub}
                onClick={(e) => e.stopPropagation()}
                className="avs-range flex-1"
                style={{ "--avs-progress": `${state.duration ? (shownTime / state.duration) * 100 : 0}%` } as React.CSSProperties}
              />
              <span className="text-white/70">{formatTime(state.duration)}</span>
            </div>

            <div className="flex items-center justify-between">
              <button type="button" aria-label={`Tốc độ ${state.rate}x, đổi sang ${nextRate}x`} onClick={act(() => send("rate", nextRate))} className={CHIP_BUTTON}>
                <Gauge aria-hidden className="h-4 w-4" />
                {state.rate}x
              </button>

              {hasNextEpisode && onNextEpisode && (
                <button type="button" onClick={act(onNextEpisode)} className={CHIP_BUTTON}>
                  <SkipForward aria-hidden className="h-4 w-4" />
                  Tập tiếp
                </button>
              )}

              <button
                type="button"
                aria-label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
                onClick={act(onToggleFullscreen)}
                className={cn(ROUND_BUTTON, "h-9 w-9")}
              >
                {isFullscreen ? <Minimize aria-hidden className="h-5 w-5" /> : <Maximize aria-hidden className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
