
import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "@/lib/router";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS, useAnimeDetailQuery, useStreamQuery } from "../hooks/useAnimeQuery";
import { animeApi } from "../lib/api";
import { useHistoryStore } from "../stores/useHistoryStore";
import { CinemaPlayer } from "../components/player/CinemaPlayer";
import { AmbientBackdrop } from "../components/layout/AmbientBackdrop";
import { progressKey } from "../components/player/player-logic";
import { EpisodeGrid } from "../components/player/EpisodeGrid";
import { MovieShelf } from "../components/movie/MovieShelf";
import { InfoModal } from "../components/movie/InfoModal";
import { AnimeDetailTabs } from "../components/movie/AnimeDetailTabs";
import { Button, buttonVariants } from "../components/lightswind/button";
import { Skeleton } from "../components/lightswind/skeleton";
import { usePlayerStore } from "../stores/usePlayerStore";
import { Link } from "@/lib/router";
import { ArrowLeft, CircleAlert, Heart, SkipForward, Sparkles } from "lucide-react";
import { formatEpisodeName } from "../lib/utils";
import { Episode } from "../types/anime";

// Placeholder with the same layout as the loaded page: player box, server row, episode card
function WatchSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <Skeleton className="h-5 w-24 bg-white/10" />
      <Skeleton variant="rounded" className="aspect-video w-full bg-white/10" />
      <Skeleton variant="rounded" className="h-16 w-full bg-white/10" />
      <Skeleton variant="rounded" className="h-40 w-full bg-white/10" />
    </div>
  );
}

function WatchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const slug = searchParams.get("slug") || "";
  const epParam = searchParams.get("ep") || "";

  const [mounted, setMounted] = useState(false);
  const addToHistory = useHistoryStore((s) => s.addToHistory);
  const toggleFavorite = useHistoryStore((s) => s.toggleFavorite);
  const getAnimeHistory = useHistoryStore((s) => s.getAnimeHistory);
  const favorites = useHistoryStore((s) => s.favorites);
  const isTheaterMode = usePlayerStore((s) => s.isTheaterMode);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Fetch Anime Details from backend
  const {
    data: detailRes,
    isLoading: isAnimeLoading,
    error: animeError,
    // another part of the same show is loading: the page stays, only the player and episodes wait
    isPlaceholderData: switchingPart,
  } = useAnimeDetailQuery(slug);
  const anime = detailRes?.data;

  // Helper to match episode by name, id, index or numeric value
  const matchEpisode = (ep: Episode, target: string) => {
    if (!target) return false;
    const t = target.trim().toLowerCase();
    const name = (ep.name || "").trim().toLowerCase();
    const id = (ep.id || "").trim();
    const title = (ep.title || "").trim().toLowerCase();
    const index = String(ep.index || "");

    if (name === t || id === t || index === t || title === t) return true;
    const numT = t.replace(/^tập\s*/i, "").replace(/^0+/, "");
    const numName = name.replace(/^tập\s*/i, "").replace(/^0+/, "");
    if (numT && numName && numT === numName) return true;
    return false;
  };

  // 2. Determine Active Episode
  const episodes = anime?.episodes || [];
  const currentEpisode: Episode | null = useMemo(() => {
    // the list on screen still belongs to the previous part: no episode, so no stream is asked for
    if (switchingPart || episodes.length === 0) return null;
    if (epParam) {
      const match = episodes.find((e) => matchEpisode(e, epParam));
      if (match) return match;
    }
    if (mounted) {
      const historyItem = getAnimeHistory(slug);
      if (historyItem?.episodeSlug) {
        const match = episodes.find((e) => matchEpisode(e, historyItem.episodeSlug));
        if (match) return match;
      }
    }
    return episodes[0];
  }, [episodes, epParam, slug, mounted, getAnimeHistory, switchingPart]);

  const episodeHash = currentEpisode?.hash || "";
  const episodeId = currentEpisode?.id || "";
  const episodePlay = currentEpisode?.play || "api";

  // 3. Fetch Stream Source (Primary)
  const {
    data: streamRes,
    isError: isStreamError,
    refetch: refetchStream,
  } = useStreamQuery(episodeHash, episodeId, episodePlay);
  const streamData = streamRes?.data;

  // 4. Save to Watch History when stream data is available
  useEffect(() => {
    if (mounted && anime && currentEpisode && streamData?.playerUrl) {
      addToHistory({
        slug: anime.slug,
        title: anime.title,
        poster: anime.poster || anime.image || "",
        episodeSlug: currentEpisode.name,
        episodeId: currentEpisode.id,
        episodeName: formatEpisodeName(currentEpisode.name),
        timestamp: Date.now(),
      });
    }
  }, [mounted, anime?.slug, anime?.title, anime?.poster, currentEpisode?.name, streamData?.playerUrl, addToHistory]);

  const handleSelectEpisode = (ep: Episode) => {
    router.push(`/watch?slug=${slug}&ep=${encodeURIComponent(ep.name)}`, { scroll: false });
  };

  const currentEpIndex = episodes.findIndex((e) => e.id === currentEpisode?.id);
  const hasNextEpisode = currentEpIndex >= 0 && currentEpIndex < episodes.length - 1;

  const queryClient = useQueryClient();
  const prefetchNextEpisode = () => {
    const next = hasNextEpisode ? episodes[currentEpIndex + 1] : undefined;
    if (next?.hash && next.id)
      void queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.STREAM(next.hash, next.id, next.play || "api"),
        queryFn: () => animeApi.getStreamUrl(next.hash, next.id, next.play || "api"),
        staleTime: 15 * 60 * 1000,
      });
  };

  const handleNextEpisode = () => {
    if (hasNextEpisode) {
      handleSelectEpisode(episodes[currentEpIndex + 1]);
    }
  };

  if (isAnimeLoading) {
    return <WatchSkeleton />;
  }

  if (animeError || !anime) {
    return (
      <div className="max-w-xl mx-auto my-20 p-8 rounded-3xl bg-[#10121A] border border-white/10 text-center space-y-4">
        <CircleAlert className="w-14 h-14 text-primaryRed mx-auto" />
        <h2 className="text-xl font-bold text-white">Không thể tải thông tin phim</h2>
        <p className="text-sm text-gray-400">
          Vui lòng kiểm tra kết nối hoặc quay lại trang chủ.
        </p>
        <Link
          href="/"
          className={buttonVariants({
            variant: "unstyled",
            size: "unstyled",
            className: "mt-4 h-10 rounded-full bg-primaryRed px-6 font-semibold text-white hover:bg-red-600",
          })}
        >
          Quay lại Trang Chủ
        </Link>
      </div>
    );
  }

  const isFavorite = mounted && anime?.slug ? favorites.some((f) => f.slug === anime.slug) : false;

  return (
    <div
      className={`mx-auto px-4 md:px-8 py-6 space-y-6 transition-[max-width] duration-300 ${
        // On desktop the column is never wider than a 16:9 player that still fits the screen height
        // (4rem = the column's side padding), so the player fills it with no black bars at the sides
        isTheaterMode
          ? "max-w-[1600px] lg:max-w-[min(1600px,calc((100vh_-_11rem)*16/9_+_4rem))]"
          : "max-w-6xl lg:max-w-[min(72rem,calc((100vh_-_11rem)*16/9_+_4rem))]"
      }`}
    >
      <AmbientBackdrop src={anime.backdrop || anime.poster} />

      {/* Top Back & Quick Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="glass-pill inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium text-gray-200 transition-colors hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="unstyled"
            size="unstyled"
            onClick={() =>
              toggleFavorite({
                slug: anime.slug,
                title: anime.title,
                poster: anime.poster || anime.image || "",
                genres: anime.genres,
                year: anime.year,
                rating: anime.rating,
              })
            }
            className={`h-9 rounded-full px-4 text-sm font-semibold transition-colors flex items-center gap-2 ${
              isFavorite
                ? "border border-primaryRed/50 bg-primaryRed/20 text-white shadow-[0_0_18px_rgba(229,9,20,0.35)]"
                : "glass-pill text-gray-200 hover:text-white"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-current" : ""}`} />
            <span>{isFavorite ? "Đã yêu thích" : "Yêu thích"}</span>
          </Button>
        </div>
      </div>

      {/* Main Cinema Player */}
      <CinemaPlayer
        embedUrl={streamData?.embedUrl}
        sources={streamData?.sources}
        failed={isStreamError}
        title={anime.title}
        episodeName={currentEpisode ? formatEpisodeName(currentEpisode.name) : ""}
        progressKey={currentEpisode ? progressKey(anime.slug, currentEpisode.id) : undefined}
        episodes={episodes}
        currentEpisodeId={currentEpisode?.id}
        onSelectEpisode={handleSelectEpisode}
        onRefresh={() => refetchStream()}
        onNextEpisode={handleNextEpisode}
        hasNextEpisode={hasNextEpisode}
        onNearEnd={prefetchNextEpisode}
      />

      {/* Now playing */}
      <div className="glass-card flex items-center gap-3 rounded-3xl p-3 pr-4 md:p-4">
        <img
          src={anime.poster || anime.image}
          alt=""
          decoding="async"
          className="h-16 w-12 shrink-0 rounded-xl object-cover shadow-lg md:h-20 md:w-14"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primaryRed">Đang xem</p>
          <h1 className="truncate font-display text-base font-bold text-white md:text-xl">{anime.title}</h1>
          <p className="truncate text-xs text-gray-400 md:text-sm">
            {currentEpisode ? formatEpisodeName(currentEpisode.name) : ""}
            {episodes.length > 0 && ` · ${episodes.length} tập`}
          </p>
        </div>
        {hasNextEpisode && (
          <Button
            variant="unstyled"
            size="unstyled"
            onClick={handleNextEpisode}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-bold text-black transition active:scale-95"
          >
            <SkipForward className="h-4 w-4 fill-current" />
            <span className="hidden sm:inline">Tập tiếp</span>
          </Button>
        )}
      </div>

      {/* Episode Selector Grid with Seasons Switcher */}
      <div
        aria-busy={switchingPart}
        className={switchingPart ? "pointer-events-none animate-pulse opacity-50 transition-opacity" : "transition-opacity"}
      >
        <EpisodeGrid
          episodes={anime.episodes || []}
          currentEpisodeSlug={currentEpisode?.name || ""}
          onSelectEpisode={handleSelectEpisode}
          seasons={anime.seasons || []}
          // the picked part shows at once, even while its episodes load
          currentSlug={slug}
        />
      </div>

      {/* Rich Anime Information, Trailer, Cast & Gallery Tabs */}
      <AnimeDetailTabs anime={anime} />

      {/* Related Anime Shelf if any */}
      {anime.related && anime.related.length > 0 && (
        <MovieShelf
          title="Phim Liên Quan"
          icon={Sparkles}
          items={anime.related}
        />
      )}

      {/* Global Info Modal */}
      <InfoModal />
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense
      fallback={
        <WatchSkeleton />
      }
    >
      <WatchContent />
    </Suspense>
  );
}
