import { useDrag } from "@use-gesture/react";
import {
  ChevronDown,
  Gauge,
  ListVideo,
  Lock,
  Maximize,
  RectangleHorizontal,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipForward,
  Sun,
  Unlock,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { PlayerCommand, PlayerState } from "../../hooks/usePlayerBridge";
import { cn } from "../../lib/utils";
import { hasNativeLevels, nativeLevels, refreshLevels, setNativeBrightness, setNativeVolume } from "../../logic/native-levels";
import {
  BRIGHTNESS_MAX,
  BRIGHTNESS_MIN,
  formatTime,
  swipeLevel,
  swipeSeek,
  tapZone,
} from "./player-logic";

interface TouchControlsProps {
  state: PlayerState;
  send: (type: PlayerCommand, value?: number) => void;
  title: string;
  episodeName: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  hasNextEpisode?: boolean;
  onNextEpisode?: () => void;
  brightness: number;
  onBrightness: (value: number) => void;
  onOpenSpeed: (anchorX: number) => void;
  isTheater: boolean;
  onToggleTheater: () => void;
  /** Only offered in full screen: inline, the episode grid is right under the player */
  onOpenEpisodes?: (anchorX: number) => void;
}

const SEEK_STEP = 10;
const AUTO_HIDE_MS = 3500;
const DOUBLE_TAP_MS = 280;
// iOS ignores HTMLMediaElement.volume: the hardware buttons are the only way there
const IS_IOS =
  /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 1);

/** fraction: the level as 0..1, what the bar and the percentage show */
type Hud = { kind: "volume" | "brightness"; fraction: number } | { kind: "seek"; value: number; delta: number };

const ROUND = "flex items-center justify-center rounded-full text-white transition active:scale-90";
const CHIP = "glass-button flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-white transition active:scale-95";

/**
 * Touch controls over the embedded player, the way phone video apps work: tap shows/hides, double tap a
 * side jumps 10 s, swipe sideways seeks; in full screen a vertical swipe on the right is volume and on
 * the left brightness.
 */
export const TouchControls: React.FC<TouchControlsProps> = ({
  state,
  send,
  title,
  episodeName,
  isFullscreen,
  onToggleFullscreen,
  hasNextEpisode,
  onNextEpisode,
  brightness,
  onBrightness,
  onOpenSpeed,
  isTheater,
  onToggleTheater,
  onOpenEpisodes,
}) => {
  const surfaceRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(true);
  const [locked, setLocked] = useState(false);
  const [scrub, setScrub] = useState<number | null>(null);
  const [jump, setJump] = useState<{ direction: -1 | 1; key: number } | null>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  // Bumped by every interaction so the auto-hide timer starts over
  const [activity, setActivity] = useState(0);

  const lastTap = useRef({ time: 0, zone: 0 });
  const tapTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hudTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dragFrom = useRef({ volume: 1, brightness: 1, time: 0, right: false });

  useEffect(() => {
    if (!visible || state.paused || scrub !== null || hud) return;
    const timer = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [visible, state.paused, scrub, hud, activity]);

  // In the app the swipes drive the phone's own volume and brightness: start from where they are now
  const native = hasNativeLevels();
  useEffect(() => {
    if (native) refreshLevels();
  }, [native, isFullscreen]);

  useEffect(
    () => () => {
      clearTimeout(tapTimer.current);
      clearTimeout(hudTimer.current);
    },
    []
  );

  const seekBy = (delta: number) =>
    send("seek", Math.min(Math.max(0, state.currentTime + delta), state.duration || state.currentTime + delta));

  // Desktop: the usual player keys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target as Element).closest("input, textarea, select, [contenteditable]")) return;
      const volume = (delta: number) => send("volume", Math.round(Math.min(1, Math.max(0, (state.volume ?? 1) + delta)) * 100) / 100);
      const key = e.key.toLowerCase();
      if (key === " " || key === "k") send(state.paused ? "play" : "pause");
      else if (key === "arrowleft") seekBy(-SEEK_STEP);
      else if (key === "arrowright") seekBy(SEEK_STEP);
      else if (key === "arrowup") volume(0.1);
      else if (key === "arrowdown") volume(-0.1);
      else if (key === "m") send("volume", state.volume ? 0 : 1);
      else if (key === "f") onToggleFullscreen();
      else if (key === "t") onToggleTheater();
      else return;
      e.preventDefault();
      setVisible(true);
      setActivity((n) => n + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // x of a button inside the player: where its drop-up popup is centred
  const anchorOf = (button: HTMLElement) =>
    button.getBoundingClientRect().left + button.offsetWidth / 2 - (surfaceRef.current?.getBoundingClientRect().left ?? 0);

  const act = (handler: () => void) => () => {
    setActivity((n) => n + 1);
    handler();
  };

  const handleTap = (x: number, width: number) => {
    const zone = tapZone(x, width);
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

  const bind = useDrag(
    ({ first, last, tap, axis, movement: [mx, my], initial: [ix], xy: [x], event }) => {
      // buttons and the seek bar handle their own pointer
      if ((event.target as Element).closest("button, input")) return;
      const surface = surfaceRef.current;
      if (!surface) return;
      const rect = surface.getBoundingClientRect();
      if (tap) return handleTap(x - rect.left, rect.width);
      if (locked) return;

      if (first) {
        clearTimeout(hudTimer.current);
        dragFrom.current = {
          volume: native ? nativeLevels().volume : (state.volume ?? 1),
          brightness: native ? nativeLevels().brightness : brightness,
          time: state.currentTime,
          right: ix - rect.left > rect.width / 2,
        };
      }
      const from = dragFrom.current;

      if (axis === "y" && isFullscreen) {
        if (from.right) {
          const volume = swipeLevel(from.volume, my, rect.height, 0, 1);
          if (native) setNativeVolume(volume);
          else if (IS_IOS || state.volume === undefined) return;
          else send("volume", Math.round(volume * 100) / 100);
          setHud({ kind: "volume", fraction: volume });
        } else if (native) {
          const value = swipeLevel(from.brightness, my, rect.height, 0.01, 1);
          setNativeBrightness(value);
          setHud({ kind: "brightness", fraction: value });
        } else {
          // a browser cannot touch the screen: dim or brighten the picture instead
          const value = swipeLevel(from.brightness, my, rect.height, BRIGHTNESS_MIN, BRIGHTNESS_MAX);
          onBrightness(value);
          setHud({ kind: "brightness", fraction: (value - BRIGHTNESS_MIN) / (BRIGHTNESS_MAX - BRIGHTNESS_MIN) });
        }
      } else if (axis === "x" && state.duration > 0) {
        const target = swipeSeek(from.time, mx, rect.width, state.duration);
        setHud({ kind: "seek", value: target, delta: target - from.time });
        if (last) send("seek", target);
      }

      if (last) hudTimer.current = setTimeout(() => setHud(null), 600);
    },
    { axis: "lock", filterTaps: true, pointer: { touch: window.matchMedia("(pointer: coarse)").matches } }
  );

  const commitScrub = () => {
    if (scrub === null) return;
    send("seek", scrub);
    setScrub(null);
    setActivity((n) => n + 1);
  };

  const shownTime = scrub ?? state.currentTime;
  const shownVolume = hud?.kind === "volume" ? hud.fraction : (state.volume ?? 1);
  const VolumeIcon = !shownVolume ? VolumeX : shownVolume < 0.5 ? Volume1 : Volume2;

  return (
    <section
      ref={surfaceRef}
      {...bind()}
      onMouseMove={() => {
        setVisible(true);
        setActivity((n) => n + 1);
      }}
      aria-label="Điều khiển video"
      className="absolute inset-0 z-10 select-none text-white"
      // full screen owns every swipe; inline, a vertical swipe still scrolls the page
      style={{ touchAction: isFullscreen ? "none" : "pan-y" }}
    >
      {jump && (
        <div
          key={jump.key}
          aria-hidden
          className={cn(
            "avs-jump glass pointer-events-none absolute top-1/2 rounded-full px-4 py-2 text-sm font-semibold",
            jump.direction < 0 ? "left-[10%]" : "right-[10%]"
          )}
        >
          {jump.direction < 0 ? "− 10 giây" : "+ 10 giây"}
        </div>
      )}

      {hud && (
        <div aria-live="polite" className="cn-pop glass pointer-events-none absolute left-1/2 top-[18%] z-20 -translate-x-1/2 rounded-2xl px-4 py-2.5">
          {hud.kind === "seek" ? (
            <p className="text-center text-sm font-semibold tabular-nums">
              {formatTime(hud.value)}
              <span className="ml-2 text-white/70">
                {hud.delta >= 0 ? "+" : "−"}
                {Math.abs(Math.round(hud.delta))}s
              </span>
            </p>
          ) : (
            <div className="flex items-center gap-3">
              {hud.kind === "volume" ? <VolumeIcon aria-hidden className="h-5 w-5" /> : <Sun aria-hidden className="h-5 w-5" />}
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white"
                  style={{ width: `${hud.fraction * 100}%` }}
                />
              </div>
              <span className="w-9 text-right text-xs font-semibold tabular-nums">
                {Math.round(hud.fraction * 100)}%
              </span>
            </div>
          )}
        </div>
      )}

      {locked ? (
        visible && (
          <button
            type="button"
            onClick={act(() => setLocked(false))}
            className="glass-button absolute bottom-6 left-1/2 flex h-11 -translate-x-1/2 items-center gap-2 rounded-full px-5 text-sm font-semibold"
          >
            <Unlock aria-hidden className="h-4 w-4" />
            Mở khoá màn hình
          </button>
        )
      ) : (
        <div
          className={cn(
            "absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-black/70 via-black/5 to-black/80 transition-opacity duration-200",
            visible ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          {/* Top: what is playing */}
          <div className="flex items-center gap-2 px-3 pt-[max(0.5rem,var(--inset-top))] landscape:px-[max(0.75rem,var(--inset-left))]">
            {isFullscreen && (
              <button type="button" aria-label="Thoát toàn màn hình" onClick={act(onToggleFullscreen)} className={cn(ROUND, "h-10 w-10")}>
                <ChevronDown aria-hidden className="h-6 w-6" />
              </button>
            )}
            <p className="min-w-0 flex-1 truncate text-sm font-semibold drop-shadow">
              {title}
              {episodeName && <span className="font-normal text-white/70"> · {episodeName}</span>}
            </p>
          </div>

          {/* Centre: back 10, play / pause, forward 10 */}
          <div className="flex items-center justify-center gap-10">
            <button type="button" aria-label="Lùi 10 giây" onClick={act(() => seekBy(-SEEK_STEP))} className={cn(ROUND, "relative h-12 w-12")}>
              <RotateCcw aria-hidden className="h-9 w-9" strokeWidth={1.5} />
              <span aria-hidden className="absolute text-[10px] font-bold">10</span>
            </button>

            <button
              type="button"
              aria-label={state.paused ? "Phát" : "Tạm dừng"}
              onClick={act(() => send(state.paused ? "play" : "pause"))}
              className={cn(ROUND, "glass-button h-16 w-16")}
            >
              {state.waiting ? (
                <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-white/25 border-t-white" />
              ) : state.paused ? (
                <Play aria-hidden className="h-8 w-8 translate-x-0.5 fill-current" />
              ) : (
                <Pause aria-hidden className="h-8 w-8 fill-current" />
              )}
            </button>

            <button type="button" aria-label="Tới 10 giây" onClick={act(() => seekBy(SEEK_STEP))} className={cn(ROUND, "relative h-12 w-12")}>
              <RotateCw aria-hidden className="h-9 w-9" strokeWidth={1.5} />
              <span aria-hidden className="absolute text-[10px] font-bold">10</span>
            </button>
          </div>

          {/* Bottom: seek bar, then the actions (Netflix order) */}
          <div className="space-y-1 px-3 pb-[max(0.5rem,var(--inset-bottom))] landscape:px-[max(0.75rem,var(--inset-left))]">
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
                className="avs-range flex-1"
                style={{ "--avs-progress": `${state.duration ? (shownTime / state.duration) * 100 : 0}%` } as React.CSSProperties}
              />
              <span className="text-white/70">{formatTime(state.duration)}</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
              <button type="button" aria-label={`Tốc độ phát, đang ${state.rate}x`} onClick={(e) => act(() => onOpenSpeed(anchorOf(e.currentTarget)))()} className={CHIP}>
                <Gauge aria-hidden className="h-4 w-4" />
                {state.rate}x
              </button>
              <button type="button" onClick={act(() => setLocked(true))} className={cn(CHIP, "lg:mr-auto")}>
                <Lock aria-hidden className="h-4 w-4" />
                Khoá
              </button>
              {onOpenEpisodes && (
                <button type="button" onClick={(e) => act(() => onOpenEpisodes(anchorOf(e.currentTarget)))()} className={cn(CHIP, !isFullscreen && "max-lg:hidden")}>
                  <ListVideo aria-hidden className="h-4 w-4" />
                  Tập
                </button>
              )}
              {hasNextEpisode && onNextEpisode && (
                <button type="button" onClick={act(onNextEpisode)} className={CHIP}>
                  <SkipForward aria-hidden className="h-4 w-4" />
                  Tập tiếp
                </button>
              )}
              {!isFullscreen && (
                <button
                  type="button"
                  aria-label={isTheater ? "Thoát chế độ rạp" : "Chế độ rạp phim"}
                  aria-pressed={isTheater}
                  onClick={act(onToggleTheater)}
                  className={cn(ROUND, "h-9 w-9 shrink-0 max-lg:hidden", isTheater && "bg-white/20")}
                >
                  <RectangleHorizontal aria-hidden className="h-5 w-5" />
                </button>
              )}
              <button
                type="button"
                aria-label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
                onClick={act(onToggleFullscreen)}
                className={cn(ROUND, "h-9 w-9 shrink-0", "max-lg:ml-auto")}
              >
                {isFullscreen ? <Minimize aria-hidden className="h-5 w-5" /> : <Maximize aria-hidden className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
