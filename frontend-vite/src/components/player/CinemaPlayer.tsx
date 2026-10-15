import type React from "react";
import { useState, useEffect, useRef } from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "../lightswind/button";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { useQuery } from "@tanstack/react-query";
import { usePlayerBridge } from "../../hooks/usePlayerBridge";
import { findMalId, getSkipTimes } from "../../logic/skip-times";
import { onBack } from "../../logic/back";
import { cn, formatEpisodeName } from "../../lib/utils";
import type { Episode, StreamSource } from "../../types/anime";
import { resumePoint, useProgressStore } from "./player-logic";
import { NextUpCard, ResumePrompt, SkipIntroButton } from "./PlayerOverlays";
import { EpisodeSheet, SpeedSheet } from "./PlayerSheets";
import { TouchControls } from "./TouchControls";

interface CinemaPlayerProps {
  /** The source's own player page; when set it is embedded and `sources` is ignored */
  embedUrl?: string;
  sources?: StreamSource[];
  /** The stream could not be resolved at all (request to the source failed) */
  failed?: boolean;
  title: string;
  episodeName: string;
  /** Where the watch position of this episode is kept (player-logic.ts progressKey) */
  progressKey?: string;
  episodes?: Episode[];
  currentEpisodeId?: string;
  onSelectEpisode?: (ep: Episode) => void;
  onRefresh?: () => void;
  onNextEpisode?: () => void;
  hasNextEpisode?: boolean;
  /** Called once per episode at 80 %: time to fetch the next one so switching is instant */
  onNearEnd?: () => void;
  /** What to look the opening / ending up by (logic/skip-times.ts); no skip button without it */
  skipLookup?: { slug: string; names: string[]; year?: number; episode: number | null };
}

/** Set by the Android app (MainActivity.java): rotates to landscape and hides the system bars */
type NativeShell = { postMessage: (message: string) => void };
const nativeShell = () => (window as unknown as { AvsNative?: NativeShell }).AvsNative;


const SAVE_EVERY_MS = 5000;
// "Bỏ qua giới thiệu": most TV openings are ~90 s and start within the first 2.5 min
// without ending times, the next-episode card comes this many seconds before the end
const NEXT_UP_BEFORE_END = 20;

export const CinemaPlayer: React.FC<CinemaPlayerProps> = ({
  embedUrl,
  sources,
  failed,
  title,
  episodeName,
  progressKey,
  episodes,
  currentEpisodeId,
  onSelectEpisode,
  onRefresh,
  onNextEpisode,
  hasNextEpisode,
  onNearEnd,
  skipLookup,
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isTheaterMode = usePlayerStore((s) => s.isTheaterMode);
  const toggleTheaterMode = usePlayerStore((s) => s.toggleTheaterMode);
  const autoPlayNext = usePlayerStore((s) => s.autoPlayNext);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const [sheet, setSheet] = useState<"speed" | "episodes" | null>(null);
  const [anchorX, setAnchorX] = useState(0);

  const source = embedUrl ? undefined : sources?.[0];
  const touch = true; // the app's own controls on every device, mouse included
  const bridge = usePlayerBridge(iframeRef, embedUrl, touch);
  const state = bridge.ready ? bridge.state : null;

  // ---- per-episode state: resume point, dismissed cards ----
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const [introSkipped, setIntroSkipped] = useState(false);
  const [nextDismissed, setNextDismissed] = useState(false);
  const lastSave = useRef(0);
  const nearEndSent = useRef(false);

  useEffect(() => {
    setResumeAt(progressKey ? resumePoint(useProgressStore.getState().entries[progressKey]) : null);
    setIntroSkipped(false);
    setNextDismissed(false);
    lastSave.current = 0;
    nearEndSent.current = false;
  }, [progressKey]);

  // Our saved position wins; else the one the player's own (hidden) resume box offers
  const offeredAt = resumeAt ?? bridge.resumeOffer;
  // the player's box comes before its video loads; our own position waits for the video to be there
  const askResume =
    offeredAt !== null && (bridge.resumeOffer !== null || (state !== null && state.duration > 0));

  // Hold the episode while the viewer picks "Xem tiếp" or "Xem từ đầu"
  useEffect(() => {
    if (askResume) bridge.send("pause");
  }, [askResume, bridge.send]);

  const answerResume = (resume: boolean) => {
    const seconds = resume ? offeredAt ?? 0 : 0;
    if (bridge.resumeOffer !== null) {
      // let the player close its box its own way; for our own position it only needs dismissing
      const playerResumes = resume && resumeAt === null;
      bridge.send("resume", playerResumes ? 1 : 0);
      bridge.clearResumeOffer();
      if (playerResumes) {
        setResumeAt(null);
        return;
      }
    }
    // after the player's "Từ đầu" has run its own seek to 0
    setTimeout(() => {
      bridge.send("seek", seconds);
      bridge.send("play");
    }, bridge.resumeOffer !== null ? 400 : 0);
    setResumeAt(null);
  };

  useEffect(() => {
    if (!state || nearEndSent.current || state.duration <= 0 || state.currentTime / state.duration < 0.8) return;
    nearEndSent.current = true;
    onNearEnd?.();
  }, [state, onNearEnd]);

  // Keep the position; never while the prompt is up, or the 0:00 under it would overwrite the saved one
  useEffect(() => {
    if (!state || !progressKey || offeredAt !== null || state.duration <= 0) return;
    const now = Date.now();
    if (now - lastSave.current < SAVE_EVERY_MS && !state.paused && !state.ended) return;
    lastSave.current = now;
    useProgressStore.getState().save(progressKey, state.currentTime, state.duration);
  }, [state, progressKey, offeredAt]);

  // (Re)mount the stream whenever the source changes; hls.js and the decryptor load only for this path
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);

    const video = videoRef.current;
    if (!video || !source) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void import("./HlsPlayer").then(({ mountSource }) => {
      if (cancelled) return;
      cleanup = mountSource(video, source, (message) => {
        console.warn("[Player]", message);
        setIsLoading(false);
        setHasError(true);
      });
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [embedUrl, source?.file, source?.type]);

  // Browser full screen can end without our button (system back, Esc)
  useEffect(() => {
    if (nativeShell()) return;
    const onChange = () => setIsFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Android back leaves full screen first, before it leaves the page
  // biome-ignore lint/correctness/useExhaustiveDependencies: toggleFullscreen is a new closure every render
  useEffect(() => (isFullscreen ? onBack(toggleFullscreen) : undefined), [isFullscreen]);

  // Never leave the app rotated after the player is gone
  useEffect(() => () => nativeShell()?.postMessage("fullscreen:off"), []);

  const toggleFullscreen = () => {
    const shell = nativeShell();
    if (shell) {
      // The WebView has no element full screen: fill the window with CSS and let the app rotate
      shell.postMessage(isFullscreen ? "fullscreen:off" : "fullscreen:on");
      setIsFullscreen(!isFullscreen);
    } else if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void frameRef.current
        ?.requestFullscreen()
        // landscape where the browser allows it (phones); desktop rejects, which is fine
        .then(() => (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.("landscape"))
        .catch(() => undefined);
    }
  };

  const showError = hasError || failed;
  const nextEpisode = episodes && currentEpisodeId ? episodes[episodes.findIndex((e) => e.id === currentEpisodeId) + 1] : undefined;
  const remaining = state && state.duration > 0 ? state.duration - state.currentTime : Infinity;
  // This episode's real opening / ending: MyAnimeList id once per title, times once per episode and cut
  const duration = Math.round(state?.duration ?? 0);
  const { data: malId } = useQuery({
    queryKey: ["skip", "mal-id", skipLookup?.slug],
    queryFn: () => findMalId(skipLookup?.names ?? [], skipLookup?.year),
    enabled: Boolean(skipLookup?.names.length),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 7 * 24 * 60 * 60 * 1000,
  });
  const { data: skipTimes } = useQuery({
    queryKey: ["skip", "times", malId, skipLookup?.episode, duration],
    queryFn: () => getSkipTimes(malId as number, skipLookup?.episode as number, duration),
    enabled: Boolean(malId && skipLookup?.episode && duration > 0),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const op = skipTimes?.op;
  const ed = skipTimes?.ed;
  const now = state?.currentTime ?? 0;

  const inEnding = ed !== undefined && now >= ed[0] && ed[1] >= duration - 30;
  const showNextUp =
    !askResume && !nextDismissed && hasNextEpisode && onNextEpisode && state !== null &&
    (state.ended || remaining <= NEXT_UP_BEFORE_END || inEnding);
  // only while the opening is actually playing: resuming past it never shows the button
  const showSkipIntro =
    !askResume && !introSkipped && state !== null && op !== undefined && now >= op[0] && now < op[1] - 2;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl bg-black shadow-2xl transition-[width] duration-300 ease-out",
        // desktop: always centred, so cinema mode only grows the width (animated) and never moves sideways;
        // the plain width fits the screen height, cinema mode is wider but still capped
        "lg:left-1/2 lg:-translate-x-1/2",
        isTheaterMode
          ? "lg:w-[min(1360px,calc(100vw_-_4rem),calc((100vh_-_8rem)*16/9))]"
          : "lg:w-[min(100%,calc((100vh_-_11rem)*16/9))]",
        // a transformed parent would hold the fixed full-screen frame inside itself
        isFullscreen && "lg:!transform-none"
      )}
    >
      {/* 16:9 Cinema Aspect Ratio Frame */}
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
              <Button
                variant="unstyled"
                size="unstyled"
                onClick={onRefresh}
                className="h-10 rounded-full bg-white px-6 font-semibold text-black hover:bg-white/90"
              >
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

        {touch && state && !showError && (
          <TouchControls
            state={state}
            send={bridge.send}
            title={title}
            episodeName={episodeName}
            hasNextEpisode={hasNextEpisode}
            onNextEpisode={onNextEpisode}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            brightness={brightness}
            onBrightness={setBrightness}
            onOpenSpeed={(x) => {
              setAnchorX(x);
              setSheet("speed");
            }}
            isTheater={isTheaterMode}
            onToggleTheater={toggleTheaterMode}
            onOpenEpisodes={
              episodes && episodes.length > 1 && onSelectEpisode
                ? (x) => {
                    setAnchorX(x);
                    setSheet("episodes");
                  }
                : undefined
            }
          />
        )}

        {showSkipIntro && (
          <SkipIntroButton
            onSkip={() => {
              bridge.send("seek", op[1]);
              setIntroSkipped(true);
            }}
          />
        )}

        {showNextUp && (
          <NextUpCard
            key={progressKey}
            label={nextEpisode ? formatEpisodeName(nextEpisode.name) : "Tập tiếp"}
            ended={state.ended}
            autoPlay={autoPlayNext}
            onPlay={onNextEpisode}
            onDismiss={() => setNextDismissed(true)}
          />
        )}

        {askResume && (
          <ResumePrompt key={progressKey} at={offeredAt} onResume={() => answerResume(true)} onRestart={() => answerResume(false)} />
        )}

        {sheet === "speed" && state && (
          <SpeedSheet anchorX={anchorX} rate={state.rate} onSelect={(rate) => bridge.send("rate", rate)} onClose={() => setSheet(null)} />
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
              setIsLoading(false);
              setHasError(true);
            }
          }}
          onEnded={() => {
            if (autoPlayNext && hasNextEpisode && onNextEpisode) onNextEpisode();
          }}
        />
      </div>
    </div>
  );
};
