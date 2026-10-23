import { AlertCircle, RotateCw } from "lucide-react"
import { lazy, Suspense, useEffect, useRef, useState } from "react"

import { formatEpisodeName } from "@/core/format"
import type { StreamSource } from "@/core/types/anime"
import { NextUpCard, ResumePrompt, SkipIntroButton, WeakNetworkHint } from "@/features/player/components/PlayerOverlays"
import { EpisodeSheet, QualitySheet, SpeedSheet } from "@/features/player/components/PlayerSheets"
import { type SessionOptions, usePlayerSession } from "@/features/player/hooks/use-player-session"
import { useQuality } from "@/features/player/hooks/use-quality"
import { usePlayerStore } from "@/features/player/store"
import { useFormFactor } from "@/shared/lib/form-factor"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"

// the controls differ by form factor: each loads only its own set
const TouchControls = lazy(() => import("@/features/player/mobile/TouchControls"))
const DesktopControls = lazy(() => import("@/features/player/desktop/DesktopControls"))

interface CinemaPlayerProps extends SessionOptions {
  /** The source's own player page; when set it is embedded and `sources` is ignored */
  embedUrl?: string
  sources?: StreamSource[]
  /** The stream could not be resolved at all (request to the source failed) */
  failed?: boolean
  title: string
  episodeName: string
  onSelectEpisode?: (ep: NonNullable<SessionOptions["episodes"]>[number]) => void
  onRefresh?: () => void
}

/** The player on the watch page: the source's own player in a frame (or hls.js), with the app's controls over it */
export function CinemaPlayer(props: CinemaPlayerProps) {
  const { embedUrl, sources, failed, title, episodeName, episodes, currentEpisodeId, onSelectEpisode, onRefresh, onNextEpisode, hasNextEpisode } = props
  const frameRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const isTheaterMode = usePlayerStore((s) => s.isTheaterMode)
  const toggleTheaterMode = usePlayerStore((s) => s.toggleTheaterMode)
  const autoPlayNext = usePlayerStore((s) => s.autoPlayNext)
  const formFactor = useFormFactor()
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [brightness, setBrightness] = useState(1)
  const [sheet, setSheet] = useState<"speed" | "episodes" | "quality" | null>(null)
  const [anchorX, setAnchorX] = useState(0)

  const session = usePlayerSession(props, { iframe: iframeRef, frame: frameRef })
  const { state, bridge, isFullscreen } = session
  const quality = useQuality({ ...bridge, state }, props.progressKey)
  const source = embedUrl ? undefined : sources?.[0]

  // (re)mount the stream whenever the source changes; hls.js and the decryptor load only for this path
  // biome-ignore lint/correctness/useExhaustiveDependencies: the source is identified by its file and type
  useEffect(() => {
    setIsLoading(true)
    setHasError(false)
    const video = videoRef.current
    if (!video || !source) return

    let cleanup: (() => void) | undefined
    let cancelled = false
    void import("@/features/player/engines/hls/HlsPlayer").then(({ mountSource }) => {
      if (cancelled) return
      cleanup = mountSource(video, source, (message) => {
        console.warn("[Player]", message)
        setIsLoading(false)
        setHasError(true)
      })
    })
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [embedUrl, source?.file, source?.type])

  const showError = hasError || failed
  const Controls = formFactor === "mobile" ? TouchControls : DesktopControls
  const openSheet = (kind: NonNullable<typeof sheet>) => (x: number) => {
    setAnchorX(x)
    setSheet(kind)
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl bg-black shadow-2xl transition-[width] duration-300 ease-out",
        // desktop: always centred, so cinema mode only grows the width (animated) and never moves sideways;
        // the plain width fits the screen height, cinema mode is wider but still capped
        "lg:left-1/2 lg:-translate-x-1/2",
        isTheaterMode ? "lg:w-[min(1360px,calc(100vw_-_4rem),calc((100vh_-_8rem)*16/9))]" : "lg:w-[min(100%,calc((100vh_-_11rem)*16/9))]",
        // a transformed parent would hold the fixed full-screen frame inside itself
        isFullscreen && "lg:!transform-none"
      )}
    >
      <div
        ref={frameRef}
        className={cn(
          "relative mx-auto w-full aspect-video overflow-hidden bg-black",
          // anchored by inset, not 100vw/100dvh: those lag behind a rotation on Android WebView
          isFullscreen && "!fixed !inset-0 z-[100] !m-0 !aspect-auto !h-auto !w-auto !max-w-none"
        )}
      >
        {isLoading && !showError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black">
            <span className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-primaryRed" />
            <p className="text-sm text-gray-300">Đang tải video...</p>
          </div>
        )}

        {showError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black p-6 text-center">
            <AlertCircle className="h-14 w-14 text-primaryRed" />
            <div>
              <h4 className="text-lg font-bold text-white">Không tải được nguồn phát</h4>
              <p className="mt-1 max-w-md text-sm text-gray-400">Bấm tải lại để thử lấy lại nguồn phát.</p>
            </div>
            {onRefresh && (
              <Button variant="unstyled" size="unstyled" onClick={onRefresh} className="h-10 rounded-full bg-white px-6 font-semibold text-black hover:bg-white/90">
                <RotateCw className="mr-2 h-4 w-4" />
                Tải lại video
              </Button>
            )}
          </div>
        )}

        {embedUrl && !showError && (
          <iframe
            ref={iframeRef}
            key={embedUrl}
            src={embedUrl}
            title={`${title} - ${episodeName}`}
            className="absolute inset-0 z-[5] h-full w-full border-0"
            style={brightness !== 1 ? { filter: `brightness(${brightness})` } : undefined}
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            onLoad={() => setIsLoading(false)}
          />
        )}

        {state && !showError && (
          <Suspense fallback={null}>
            <Controls
              state={state}
              send={bridge.send}
              title={title}
              episodeName={episodeName}
              hasNextEpisode={hasNextEpisode}
              onNextEpisode={onNextEpisode}
              isFullscreen={isFullscreen}
              onToggleFullscreen={session.toggleFullscreen}
              brightness={brightness}
              onBrightness={setBrightness}
              onOpenSpeed={openSheet("speed")}
              isTheater={isTheaterMode}
              onToggleTheater={toggleTheaterMode}
              onOpenEpisodes={episodes && episodes.length > 1 && onSelectEpisode ? openSheet("episodes") : undefined}
              quality={quality.levels ? { label: quality.label, onOpen: openSheet("quality") } : undefined}
            />
          </Suspense>
        )}

        {quality.suggest && !session.askResume && <WeakNetworkHint onAccept={quality.acceptSuggestion} onDismiss={quality.dismissSuggestion} />}

        {session.showSkipIntro && <SkipIntroButton onSkip={session.skipIntro} />}

        {session.showNextUp && state && onNextEpisode && (
          <NextUpCard
            key={props.progressKey}
            label={session.nextEpisode ? formatEpisodeName(session.nextEpisode.name) : "Tập tiếp"}
            ended={state.ended}
            autoPlay={autoPlayNext}
            onPlay={onNextEpisode}
            onDismiss={session.dismissNextUp}
          />
        )}

        {session.askResume && session.offeredAt !== null && (
          <ResumePrompt key={props.progressKey} at={session.offeredAt} onResume={() => session.answerResume(true)} onRestart={() => session.answerResume(false)} />
        )}

        {sheet === "speed" && state && (
          <SpeedSheet anchorX={anchorX} rate={state.rate} onSelect={(rate) => bridge.send("rate", rate)} onClose={() => setSheet(null)} />
        )}
        {sheet === "quality" && quality.levels && (
          <QualitySheet anchorX={anchorX} levels={quality.levels} pref={quality.pref} onSelect={quality.choose} onClose={() => setSheet(null)} />
        )}
        {sheet === "episodes" && episodes && onSelectEpisode && (
          <EpisodeSheet anchorX={anchorX} episodes={episodes} currentId={currentEpisodeId} onSelect={onSelectEpisode} onClose={() => setSheet(null)} />
        )}

        {/* biome-ignore lint/a11y/useMediaCaption: the streams are hardsubbed, there is no caption track */}
        <video
          ref={videoRef}
          hidden={Boolean(embedUrl)}
          aria-label={`${title} - ${episodeName}`}
          className="absolute inset-0 h-full w-full bg-black"
          style={brightness !== 1 ? { filter: `brightness(${brightness})` } : undefined}
          controls
          autoPlay
          playsInline
          onCanPlay={() => setIsLoading(false)}
          onError={() => {
            // hls.js reports its own errors; this only fires for a plain (mp4) source
            if (videoRef.current?.src) {
              setIsLoading(false)
              setHasError(true)
            }
          }}
          onEnded={() => {
            if (autoPlayNext && hasNextEpisode && onNextEpisode) onNextEpisode()
          }}
        />
      </div>
    </div>
  )
}
