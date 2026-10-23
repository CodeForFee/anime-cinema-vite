import { useQuery } from "@tanstack/react-query"
import { type RefObject, useEffect, useRef, useState } from "react"

import { holdArt } from "@/core/hd-art"
import { resumePoint, useProgressStore } from "@/core/player/progress"
import { findMalId, getSkipTimes } from "@/core/player/skip-times"
import type { Episode } from "@/core/types/anime"
import { usePlayerBridge } from "@/features/player/engines/iframe-bridge"
import { onBack } from "@/platform/back"

const SAVE_EVERY_MS = 5000
// without ending times, the next-episode card comes this many seconds before the end
const NEXT_UP_BEFORE_END = 20
// cover lookups wait while less than this is buffered ahead of a playing video
const ART_WAITS_UNDER_S = 10

/** Set by the Android app (MainActivity.java): rotates to landscape and hides the system bars */
type NativeShell = { postMessage: (message: string) => void }
const nativeShell = () => (window as unknown as { AvsNative?: NativeShell }).AvsNative

export interface SessionOptions {
  embedUrl?: string
  /** Where the watch position of this episode is kept (core/player/progress.ts progressKey) */
  progressKey?: string
  episodes?: Episode[]
  currentEpisodeId?: string
  hasNextEpisode?: boolean
  onNextEpisode?: () => void
  /** Called once per episode at 80 %: time to fetch the next one so switching is instant */
  onNearEnd?: () => void
  /** What to look the opening / ending up by (core/player/skip-times.ts); no skip button without it */
  skipLookup?: { slug: string; names: string[]; year?: number; episode: number | null }
}

/**
 * One episode being watched, whatever draws its controls: the remote-controlled player frame, where it resumes
 * ("Xem tiếp"), saving the position, the next-episode card, skip intro, and full screen.
 */
export function usePlayerSession(
  { embedUrl, progressKey, episodes, currentEpisodeId, hasNextEpisode, onNextEpisode, onNearEnd, skipLookup }: SessionOptions,
  refs: { iframe: RefObject<HTMLIFrameElement | null>; frame: RefObject<HTMLDivElement | null> }
) {
  const bridge = usePlayerBridge(refs.iframe, embedUrl, true)
  const state = bridge.ready ? bridge.state : null

  // ---- per-episode state: resume point, dismissed cards ----
  const [resumeAt, setResumeAt] = useState<number | null>(null)
  const [introSkipped, setIntroSkipped] = useState(false)
  const [nextDismissed, setNextDismissed] = useState(false)
  const lastSave = useRef(0)
  const nearEndSent = useRef(false)

  useEffect(() => {
    setResumeAt(progressKey ? resumePoint(useProgressStore.getState().entries[progressKey]) : null)
    setIntroSkipped(false)
    setNextDismissed(false)
    lastSave.current = 0
    nearEndSent.current = false
  }, [progressKey])

  // our saved position wins; else the one the player's own (hidden) resume box offers
  const offeredAt = resumeAt ?? bridge.resumeOffer
  // the player's box comes before its video loads; our own position waits for the video to be there
  const askResume = offeredAt !== null && (bridge.resumeOffer !== null || (state !== null && state.duration > 0))

  // hold the episode while the viewer picks "Xem tiếp" or "Xem từ đầu"
  useEffect(() => {
    if (askResume) bridge.send("pause")
  }, [askResume, bridge.send])

  const answerResume = (resume: boolean) => {
    const seconds = resume ? (offeredAt ?? 0) : 0
    if (bridge.resumeOffer !== null) {
      // let the player close its box its own way; for our own position it only needs dismissing
      const playerResumes = resume && resumeAt === null
      bridge.send("resume", playerResumes ? 1 : 0)
      bridge.clearResumeOffer()
      if (playerResumes) {
        setResumeAt(null)
        return
      }
    }
    // after the player's "Từ đầu" has run its own seek to 0
    setTimeout(
      () => {
        bridge.send("seek", seconds)
        bridge.send("play")
      },
      bridge.resumeOffer !== null ? 400 : 0
    )
    setResumeAt(null)
  }

  useEffect(() => {
    if (!state || nearEndSent.current || state.duration <= 0 || state.currentTime / state.duration < 0.8) return
    nearEndSent.current = true
    onNearEnd?.()
  }, [state, onNearEnd])

  // keep the position; never while the prompt is up, or the 0:00 under it would overwrite the saved one
  useEffect(() => {
    if (!state || !progressKey || offeredAt !== null || state.duration <= 0) return
    const now = Date.now()
    if (now - lastSave.current < SAVE_EVERY_MS && !state.paused && !state.ended) return
    lastSave.current = now
    useProgressStore.getState().save(progressKey, state.currentTime, state.duration)
  }, [state, progressKey, offeredAt])

  // the video comes first: no cover lookups while it waits for data or has little buffered (bridge 'ahead')
  const starved =
    state !== null &&
    !state.paused &&
    (state.waiting || (state.ahead !== undefined && state.ahead < ART_WAITS_UNDER_S && state.currentTime + state.ahead < state.duration - 1))
  useEffect(() => holdArt(starved), [starved])
  useEffect(() => () => holdArt(false), [])

  // ---- full screen ----
  const [isFullscreen, setIsFullscreen] = useState(false)

  // browser full screen can end without our button (system back, Esc)
  useEffect(() => {
    if (nativeShell()) return
    const onChange = () => setIsFullscreen(document.fullscreenElement === refs.frame.current)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [refs.frame])

  const toggleFullscreen = () => {
    const shell = nativeShell()
    if (shell) {
      // the WebView has no element full screen: fill the window with CSS and let the app rotate
      shell.postMessage(isFullscreen ? "fullscreen:off" : "fullscreen:on")
      setIsFullscreen(!isFullscreen)
    } else if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void refs.frame.current
        ?.requestFullscreen()
        // landscape where the browser allows it (phones); desktop rejects, which is fine
        .then(() => (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.("landscape"))
        .catch(() => undefined)
    }
  }

  // Android back leaves full screen first, before it leaves the page
  // biome-ignore lint/correctness/useExhaustiveDependencies: toggleFullscreen is a new closure every render
  useEffect(() => (isFullscreen ? onBack(toggleFullscreen) : undefined), [isFullscreen])
  // never leave the app rotated after the player is gone
  useEffect(() => () => nativeShell()?.postMessage("fullscreen:off"), [])

  // ---- opening / ending: MyAnimeList id once per title, times once per episode and cut ----
  const duration = Math.round(state?.duration ?? 0)
  const { data: malId } = useQuery({
    queryKey: ["skip", "mal-id", skipLookup?.slug],
    queryFn: () => findMalId(skipLookup?.names ?? [], skipLookup?.year),
    enabled: Boolean(skipLookup?.names.length),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 7 * 24 * 60 * 60 * 1000
  })
  const { data: skipTimes } = useQuery({
    queryKey: ["skip", "times", malId, skipLookup?.episode, duration],
    queryFn: () => getSkipTimes(malId as number, skipLookup?.episode as number, duration),
    enabled: Boolean(malId && skipLookup?.episode && duration > 0),
    staleTime: 24 * 60 * 60 * 1000
  })
  const op = skipTimes?.op
  const ed = skipTimes?.ed
  const now = state?.currentTime ?? 0
  const remaining = state && state.duration > 0 ? state.duration - state.currentTime : Number.POSITIVE_INFINITY
  const inEnding = ed !== undefined && now >= ed[0] && ed[1] >= duration - 30

  return {
    bridge,
    state,
    askResume,
    offeredAt,
    answerResume,
    isFullscreen,
    toggleFullscreen,
    nextEpisode: episodes && currentEpisodeId ? episodes[episodes.findIndex((e) => e.id === currentEpisodeId) + 1] : undefined,
    showNextUp:
      !askResume && !nextDismissed && Boolean(hasNextEpisode && onNextEpisode) && state !== null && (state.ended || remaining <= NEXT_UP_BEFORE_END || inEnding),
    dismissNextUp: () => setNextDismissed(true),
    // only while the opening is actually playing: resuming past it never shows the button
    showSkipIntro: !askResume && !introSkipped && state !== null && op !== undefined && now >= op[0] && now < op[1] - 2,
    skipIntro: () => {
      if (op) bridge.send("seek", op[1])
      setIntroSkipped(true)
    }
  }
}
