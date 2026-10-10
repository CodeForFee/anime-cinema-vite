import React, { useState, useEffect, useRef } from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "../lightswind/button";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { usePlayerBridge } from "../../hooks/usePlayerBridge";
import { cn } from "../../lib/utils";
import { Episode, StreamSource } from "../../types/anime";
import { mountSource } from "./HlsPlayer";
import { MobilePlayerControls } from "./MobilePlayerControls";

interface CinemaPlayerProps {
  /** The source's own player page; when set it is embedded and `sources` is ignored */
  embedUrl?: string;
  sources?: StreamSource[];
  /** The stream could not be resolved at all (request to the source failed) */
  failed?: boolean;
  title: string;
  episodeName: string;
  episodes?: Episode[];
  currentEpisodeSlug?: string;
  onSelectEpisode?: (ep: Episode) => void;
  onRefresh?: () => void;
  onNextEpisode?: () => void;
  hasNextEpisode?: boolean;
}

/** Set by the Android app (MainActivity.java): rotates to landscape and hides the system bars */
type NativeShell = { postMessage: (message: string) => void };
const nativeShell = () => (window as unknown as { AvsNative?: NativeShell }).AvsNative;

// Phones and tablets get the app's own touch controls; a mouse keeps the player's controls
const isTouchDevice = () => window.matchMedia("(pointer: coarse)").matches;

export const CinemaPlayer: React.FC<CinemaPlayerProps> = ({
  embedUrl,
  sources,
  failed,
  title,
  episodeName,
  onRefresh,
  onNextEpisode,
  hasNextEpisode,
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isTheaterMode = usePlayerStore((s) => s.isTheaterMode);
  const autoPlayNext = usePlayerStore((s) => s.autoPlayNext);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const source = embedUrl ? undefined : sources?.[0];
  const [touch] = useState(isTouchDevice);
  const bridge = usePlayerBridge(iframeRef, embedUrl, touch);
  const controlled = bridge.ready && bridge.state !== null;

  // (Re)mount the stream whenever the source changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);

    const video = videoRef.current;
    if (!video || !source) return;

    return mountSource(video, source, (message) => {
      console.warn("[Player]", message);
      setIsLoading(false);
      setHasError(true);
    });
  }, [embedUrl, source?.file, source?.type]);

  // The embedded player reports its end through the bridge (the plain <video> uses onEnded below)
  const ended = bridge.state?.ended ?? false;
  useEffect(() => {
    if (ended && autoPlayNext && hasNextEpisode && onNextEpisode) onNextEpisode();
    // only when `ended` flips
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended]);

  // Browser full screen can end without our button (system back, Esc)
  useEffect(() => {
    if (nativeShell()) return;
    const onChange = () => setIsFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

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

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl bg-black shadow-2xl transition-all duration-300",
        isTheaterMode && "max-w-none"
      )}
    >
      {/* 16:9 Cinema Aspect Ratio Frame */}
      <div
        ref={frameRef}
        className={cn(
          "relative mx-auto w-full aspect-video overflow-hidden bg-black",
          "lg:max-w-[min(100%,calc((100vh_-_11rem)*16/9))]",
          isFullscreen && "!fixed inset-0 z-[100] !aspect-auto h-[100dvh] w-screen !max-w-none"
        )}
      >
        {isLoading && !showError && (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black text-white">
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
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            onLoad={() => setIsLoading(false)}
          />
        )}

        {controlled && bridge.state && !showError && (
          <MobilePlayerControls
            state={bridge.state}
            send={bridge.send}
            title={title}
            episodeName={episodeName}
            hasNextEpisode={hasNextEpisode}
            onNextEpisode={onNextEpisode}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        )}

        <video
          ref={videoRef}
          hidden={Boolean(embedUrl)}
          aria-label={`${title} - ${episodeName}`}
          className="absolute inset-0 h-full w-full bg-black"
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
            if (hasNextEpisode && onNextEpisode) onNextEpisode();
          }}
        />
      </div>
    </div>
  );
};
