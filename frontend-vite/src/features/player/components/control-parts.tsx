// The pieces both player control sets are built from (mobile/TouchControls, desktop/DesktopControls): the same
// look on every device, only the way they are driven differs.
import { ChevronDown, Maximize, Minimize, Pause, Play, RotateCcw, RotateCw } from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"

import { formatTime } from "@/core/format"
import type { PlayerCommand, PlayerState } from "@/features/player/engines/iframe-bridge"
import { cn } from "@/shared/lib/utils"

export const SEEK_STEP = 10
export const ROUND = "flex items-center justify-center rounded-full text-white transition active:scale-90"
export const CHIP =
  "glass-button flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-white transition active:scale-95"

/** What the player shell hands either control set */
export interface ControlsProps {
  state: PlayerState
  send: (type: PlayerCommand, value?: number) => void
  title: string
  episodeName: string
  isFullscreen: boolean
  onToggleFullscreen: () => void
  hasNextEpisode?: boolean
  onNextEpisode?: () => void
  brightness: number
  onBrightness: (value: number) => void
  onOpenSpeed: (anchorX: number) => void
  isTheater: boolean
  onToggleTheater: () => void
  onOpenEpisodes?: (anchorX: number) => void
}

/** Seek by `delta` seconds, kept inside the episode */
export const seekBy = ({ state, send }: Pick<ControlsProps, "state" | "send">, delta: number) =>
  send("seek", Math.min(Math.max(0, state.currentTime + delta), state.duration || state.currentTime + delta))

/** x of a button inside the player surface: where its drop-up popup is centred */
export const anchorOf = (button: HTMLElement, surface: HTMLElement | null) =>
  button.getBoundingClientRect().left + button.offsetWidth / 2 - (surface?.getBoundingClientRect().left ?? 0)

/** The dimmed layer the controls sit on; fades out when they hide */
export function ControlsLayer({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-black/70 via-black/5 to-black/80 transition-opacity duration-200",
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      {children}
    </div>
  )
}

/** Top: what is playing, and the way out of full screen */
export function TitleBar({ title, episodeName, isFullscreen, onExit }: { title: string; episodeName: string; isFullscreen: boolean; onExit: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 pt-[max(0.5rem,var(--inset-top))] landscape:px-[max(0.75rem,var(--inset-left))]">
      {isFullscreen && (
        <button type="button" aria-label="Thoát toàn màn hình" onClick={onExit} className={cn(ROUND, "h-10 w-10")}>
          <ChevronDown aria-hidden className="h-6 w-6" />
        </button>
      )}
      <p className="min-w-0 flex-1 truncate text-sm font-semibold drop-shadow">
        {title}
        {episodeName && <span className="font-normal text-white/70"> · {episodeName}</span>}
      </p>
    </div>
  )
}

/** Centre: back 10 s, play / pause (a spinner while it buffers), forward 10 s */
export function CenterControls({ state, onSeek, onToggle }: { state: PlayerState; onSeek: (delta: number) => void; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-center gap-10">
      <button type="button" aria-label="Lùi 10 giây" onClick={() => onSeek(-SEEK_STEP)} className={cn(ROUND, "relative h-12 w-12")}>
        <RotateCcw aria-hidden className="h-9 w-9" strokeWidth={1.5} />
        <span aria-hidden className="absolute text-[10px] font-bold">10</span>
      </button>

      <button type="button" aria-label={state.paused ? "Phát" : "Tạm dừng"} onClick={onToggle} className={cn(ROUND, "glass-button h-16 w-16")}>
        {state.waiting ? (
          <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-white/25 border-t-white" />
        ) : state.paused ? (
          <Play aria-hidden className="h-8 w-8 translate-x-0.5 fill-current" />
        ) : (
          <Pause aria-hidden className="h-8 w-8 fill-current" />
        )}
      </button>

      <button type="button" aria-label="Tới 10 giây" onClick={() => onSeek(SEEK_STEP)} className={cn(ROUND, "relative h-12 w-12")}>
        <RotateCw aria-hidden className="h-9 w-9" strokeWidth={1.5} />
        <span aria-hidden className="absolute text-[10px] font-bold">10</span>
      </button>
    </div>
  )
}

/** The seek bar with both times; a drag scrubs and seeks once, on release. `onScrubbing` holds the auto-hide */
export function SeekBar({ state, onSeek, onScrubbing }: { state: PlayerState; onSeek: (to: number) => void; onScrubbing: (active: boolean) => void }) {
  const [scrub, setScrub] = useState<number | null>(null)
  const scrubbing = scrub !== null
  // biome-ignore lint/correctness/useExhaustiveDependencies: reports the change of the flag only
  useEffect(() => onScrubbing(scrubbing), [scrubbing])

  const commit = () => {
    if (scrub === null) return
    onSeek(scrub)
    setScrub(null)
  }
  const shown = scrub ?? state.currentTime

  return (
    <div className="flex items-center gap-3 text-xs font-medium tabular-nums">
      <span>{formatTime(shown)}</span>
      <input
        type="range"
        aria-label="Vị trí phát"
        min={0}
        max={Math.max(1, Math.floor(state.duration))}
        step={1}
        value={Math.floor(shown)}
        onChange={(e) => setScrub(Number(e.target.value))}
        onPointerUp={commit}
        onTouchEnd={commit}
        onKeyUp={commit}
        className="avs-range flex-1"
        style={{ "--avs-progress": `${state.duration ? (shown / state.duration) * 100 : 0}%` } as React.CSSProperties}
      />
      <span className="text-white/70">{formatTime(state.duration)}</span>
    </div>
  )
}

export function FullscreenButton({ isFullscreen, onToggle, className }: { isFullscreen: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
      onClick={onToggle}
      className={cn(ROUND, "h-9 w-9 shrink-0", className)}
    >
      {isFullscreen ? <Minimize aria-hidden className="h-5 w-5" /> : <Maximize aria-hidden className="h-5 w-5" />}
    </button>
  )
}
