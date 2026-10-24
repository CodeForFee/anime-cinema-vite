import {
  Gauge,
  ListVideo,
  Lock,
  SkipForward,
  Sun,
  Unlock,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useRef, useState } from "react";

import { formatTime } from "@/core/format";
import {
  anchorOf,
  CenterControls,
  CHIP,
  type ControlsProps,
  ControlsLayer,
  FullscreenButton,
  QualityChip,
  SeekBar,
  seekBy,
  TitleBar,
} from "@/features/player/components/control-parts";
import { useAutoHide } from "@/features/player/hooks/use-auto-hide";
import { useTouchGestures } from "@/features/player/hooks/use-touch-gestures";
import { cn } from "@/shared/lib/utils";

/**
 * Mobile: the controls over the player the way phone video apps work (gestures in use-touch-gestures.ts), plus a
 * lock that leaves only "Mở khoá" on screen.
 */
export default function TouchControls(props: ControlsProps) {
  const { state, send, isFullscreen } = props;
  const surfaceRef = useRef<HTMLElement>(null);
  const [locked, setLocked] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const toggleVisible = useRef(() => {});
  const { bind, jump, hud } = useTouchGestures(props, surfaceRef, {
    locked,
    toggleVisible: () => toggleVisible.current(),
  });
  // a level or a seek being swiped keeps the controls up, as scrubbing the bar does
  const controls = useAutoHide({
    paused: state.paused,
    hold: scrubbing || hud !== null,
  });
  toggleVisible.current = () => controls.setVisible((visible) => !visible);
  const act = (handler: () => void) => () => {
    controls.touch();
    handler();
  };

  const shownVolume =
    hud?.kind === "volume" ? hud.fraction : (state.volume ?? 1);
  const VolumeIcon = !shownVolume
    ? VolumeX
    : shownVolume < 0.5
      ? Volume1
      : Volume2;

  return (
    <section
      ref={surfaceRef}
      {...bind()}
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
            jump.direction < 0 ? "left-[10%]" : "right-[10%]",
          )}
        >
          {jump.direction < 0 ? "− 10 giây" : "+ 10 giây"}
        </div>
      )}

      {hud && (
        <div
          aria-live="polite"
          className="cn-pop glass pointer-events-none absolute left-1/2 top-[18%] z-20 -translate-x-1/2 rounded-2xl px-4 py-2.5"
        >
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
              {hud.kind === "volume" ? (
                <VolumeIcon aria-hidden className="h-5 w-5" />
              ) : (
                <Sun aria-hidden className="h-5 w-5" />
              )}
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full origin-left rounded-full bg-white"
                  style={{ transform: `scaleX(${hud.fraction})` }}
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
        controls.visible && (
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
        <ControlsLayer visible={controls.visible}>
          <TitleBar
            title={props.title}
            episodeName={props.episodeName}
            isFullscreen={isFullscreen}
            onExit={act(props.onToggleFullscreen)}
          />
          <CenterControls
            state={state}
            onSeek={(delta) => act(() => seekBy(props, delta))()}
            onToggle={act(() => send(state.paused ? "play" : "pause"))}
          />

          <div className="space-y-1 px-3 pb-[max(0.5rem,var(--inset-bottom))] landscape:px-[max(0.75rem,var(--inset-left))]">
            <SeekBar
              state={state}
              onSeek={(to) => act(() => send("seek", to))()}
              onScrubbing={setScrubbing}
            />

            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
              <button
                type="button"
                aria-label={`Tốc độ phát, đang ${state.rate}x`}
                onClick={(e) =>
                  act(() =>
                    props.onOpenSpeed(
                      anchorOf(e.currentTarget, surfaceRef.current),
                    ),
                  )()
                }
                className={CHIP}
              >
                <Gauge aria-hidden className="h-4 w-4" />
                {state.rate}x
              </button>
              {props.quality && (
                <QualityChip
                  quality={props.quality}
                  onOpen={(button) =>
                    act(() =>
                      props.quality?.onOpen(
                        anchorOf(button, surfaceRef.current),
                      ),
                    )()
                  }
                />
              )}
              <button
                type="button"
                onClick={act(() => setLocked(true))}
                className={CHIP}
              >
                <Lock aria-hidden className="h-4 w-4" />
                Khoá
              </button>
              {/* inline, the episode grid is right under the player */}
              {props.onOpenEpisodes && isFullscreen && (
                <button
                  type="button"
                  onClick={(e) =>
                    act(() =>
                      props.onOpenEpisodes?.(
                        anchorOf(e.currentTarget, surfaceRef.current),
                      ),
                    )()
                  }
                  className={CHIP}
                >
                  <ListVideo aria-hidden className="h-4 w-4" />
                  Tập
                </button>
              )}
              {props.hasNextEpisode && props.onNextEpisode && (
                <button
                  type="button"
                  onClick={act(props.onNextEpisode)}
                  className={CHIP}
                >
                  <SkipForward aria-hidden className="h-4 w-4" />
                  Tập tiếp
                </button>
              )}
              <FullscreenButton
                isFullscreen={isFullscreen}
                onToggle={act(props.onToggleFullscreen)}
                className="ml-auto"
              />
            </div>
          </div>
        </ControlsLayer>
      )}
    </section>
  );
}
