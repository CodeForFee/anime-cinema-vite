
import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "@/lib/router";
import { useAnimeDetailQuery, useStreamQuery } from "../hooks/useAnimeQuery";
import { useHistoryStore } from "../stores/useHistoryStore";
import { CinemaPlayer } from "../components/player/CinemaPlayer";
import { EpisodeGrid } from "../components/player/EpisodeGrid";
import { MovieShelf } from "../components/movie/MovieShelf";
import { InfoModal } from "../components/movie/InfoModal";
import { AnimeDetailTabs } from "../components/movie/AnimeDetailTabs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCircleExclamation,
  faHeart as faHeartSolid,
} from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartRegular } from "@fortawesome/free-regular-svg-icons";
import { Button, buttonVariants } from "../components/lightswind/button";
import { Skeleton } from "../components/lightswind/skeleton";
import { usePlayerStore } from "../stores/usePlayerStore";
import { Link } from "@/lib/router";
import { Sparkles } from "lucide-react";
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
    if (episodes.length === 0) return null;
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
  }, [episodes, epParam, slug, mounted, getAnimeHistory]);

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
        <FontAwesomeIcon icon={faCircleExclamation} className="w-14 h-14 text-primaryRed mx-auto" />
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
      {/* Top Back & Quick Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
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
            className={`h-9 rounded-full border px-4 text-sm font-semibold transition-colors flex items-center gap-2 ${
              isFavorite
                ? "border-primaryRed/40 bg-primaryRed/15 text-primaryRed"
                : "border-white/15 bg-white/5 text-gray-200 hover:border-white/40 hover:text-white"
            }`}
          >
            <FontAwesomeIcon icon={isFavorite ? faHeartSolid : faHeartRegular} className="w-3.5 h-3.5" />
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
        episodes={episodes}
        currentEpisodeSlug={currentEpisode?.name || ""}
        onSelectEpisode={handleSelectEpisode}
        onRefresh={() => refetchStream()}
        onNextEpisode={handleNextEpisode}
        hasNextEpisode={hasNextEpisode}
      />

      {/* Episode Selector Grid with Seasons Switcher */}
      <EpisodeGrid
        episodes={anime.episodes || []}
        currentEpisodeSlug={currentEpisode?.name || ""}
        onSelectEpisode={handleSelectEpisode}
        seasons={anime.seasons || []}
        currentSlug={anime.slug}
      />

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
