import { Gauge, ListVideo, RectangleHorizontal, SkipForward } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import {
  anchorOf,
  CenterControls,
  CHIP,
  type ControlsProps,
  ControlsLayer,
  FullscreenButton,
  QualityChip,
  ROUND,
  SEEK_STEP,
  SeekBar,
  seekBy,
  TitleBar
} from "@/features/player/components/control-parts"
import { useAutoHide } from "@/features/player/hooks/use-auto-hide"
import { cn } from "@/shared/lib/utils"

/** The usual player keys; ignored while typing in a field */
function useShortcuts(props: ControlsProps, show: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target as Element).closest("input, textarea, select, [contenteditable]")) return
      const { state, send } = props
      const volume = (delta: number) => send("volume", Math.round(Math.min(1, Math.max(0, (state.volume ?? 1) + delta)) * 100) / 100)
      const key = e.key.toLowerCase()
      if (key === " " || key === "k") send(state.paused ? "play" : "pause")
      else if (key === "arrowleft") seekBy(props, -SEEK_STEP)
      else if (key === "arrowright") seekBy(props, SEEK_STEP)
      else if (key === "arrowup") volume(0.1)
      else if (key === "arrowdown") volume(-0.1)
      else if (key === "m") send("volume", state.volume ? 0 : 1)
      else if (key === "f") props.onToggleFullscreen()
      else if (key === "t") props.onToggleTheater()
      else return
      e.preventDefault()
      show()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })
}

/**
 * Desktop: the same controls, driven by mouse and keyboard. Moving the mouse shows them, a click on the picture
 * plays or pauses, a double click toggles full screen; the speed and episode menus pop up from their buttons.
 */
export default function DesktopControls(props: ControlsProps) {
  const { state, send, isFullscreen } = props
  const surfaceRef = useRef<HTMLElement>(null)
  const [scrubbing, setScrubbing] = useState(false)
  const controls = useAutoHide({ paused: state.paused, hold: scrubbing })
  useShortcuts(props, controls.show)
  const act = (handler: () => void) => () => {
    controls.touch()
    handler()
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard has its own shortcuts (useShortcuts)
    <section
      ref={surfaceRef}
      aria-label="Điều khiển video"
      className={cn("absolute inset-0 z-10 select-none text-white", !controls.visible && "cursor-none")}
      onPointerMove={(e) => e.pointerType === "mouse" && controls.show()}
      onClick={(e) => {
        if ((e.target as Element).closest("button, input")) return
        send(state.paused ? "play" : "pause")
        controls.show()
      }}
      onDoubleClick={(e) => !(e.target as Element).closest("button, input") && props.onToggleFullscreen()}
    >
      <ControlsLayer visible={controls.visible}>
        <TitleBar title={props.title} episodeName={props.episodeName} isFullscreen={isFullscreen} onExit={act(props.onToggleFullscreen)} />
        <CenterControls state={state} onSeek={(delta) => act(() => seekBy(props, delta))()} onToggle={act(() => send(state.paused ? "play" : "pause"))} />

        <div className="space-y-1 px-3 pb-[max(0.5rem,var(--inset-bottom))]">
          <SeekBar state={state} onSeek={(to) => act(() => send("seek", to))()} onScrubbing={setScrubbing} />

          <div className="flex items-center gap-2 pb-0.5">
            <button
              type="button"
              aria-label={`Tốc độ phát, đang ${state.rate}x`}
              onClick={(e) => act(() => props.onOpenSpeed(anchorOf(e.currentTarget, surfaceRef.current)))()}
              className={CHIP}
            >
              <Gauge aria-hidden className="h-4 w-4" />
              {state.rate}x
            </button>
            {props.quality && (
              <QualityChip quality={props.quality} onOpen={(button) => act(() => props.quality?.onOpen(anchorOf(button, surfaceRef.current)))()} />
            )}
            <span className="flex-1" />
            {props.onOpenEpisodes && (
              <button
                type="button"
                onClick={(e) => act(() => props.onOpenEpisodes?.(anchorOf(e.currentTarget, surfaceRef.current)))()}
                className={CHIP}
              >
                <ListVideo aria-hidden className="h-4 w-4" />
                Tập
              </button>
            )}
            {props.hasNextEpisode && props.onNextEpisode && (
              <button type="button" onClick={act(props.onNextEpisode)} className={CHIP}>
                <SkipForward aria-hidden className="h-4 w-4" />
                Tập tiếp
              </button>
            )}
            {!isFullscreen && (
              <button
                type="button"
                aria-label={props.isTheater ? "Thoát chế độ rạp" : "Chế độ rạp phim"}
                aria-pressed={props.isTheater}
                onClick={act(props.onToggleTheater)}
                className={cn(ROUND, "h-9 w-9 shrink-0", props.isTheater && "bg-white/20")}
              >
                <RectangleHorizontal aria-hidden className="h-5 w-5" />
              </button>
            )}
            <FullscreenButton isFullscreen={isFullscreen} onToggle={act(props.onToggleFullscreen)} />
          </div>
        </div>
      </ControlsLayer>
    </section>
  )
}
