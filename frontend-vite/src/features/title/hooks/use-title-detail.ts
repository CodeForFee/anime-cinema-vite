import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAnimeDetailQuery } from "@/core/queries";
import { useHistoryStore } from "@/core/stores/history";
import { useUIStore } from "@/features/title/store";
import { onBack } from "@/platform/back";
import { haptic } from "@/platform/haptics";

// Long series (One Piece, Conan) list their episodes 50 at a time
const CHUNK_SIZE = 50;
const FALLBACK_POSTER =
  "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=60";

const names = (list: unknown[]) =>
  list
    .map((item) =>
      typeof item === "object" && item
        ? ((item as { name?: string; slug?: string }).name ??
          (item as { slug?: string }).slug)
        : String(item),
    )
    .filter(Boolean)
    .join(", ");

/**
 * Everything the title preview shows and does, for both of its forms (mobile sheet, desktop dialog).
 * `closeDelayMs`: how long the preview takes to leave before the player opens (the sheet's slide on mobile).
 */
export function useTitleDetail({
  closeDelayMs = 0,
}: { closeDelayMs?: number } = {}) {
  const navigate = useNavigate();
  const selectedAnime = useUIStore((state) => state.selectedAnime);
  const isOpen = useUIStore((state) => state.isInfoModalOpen);
  const close = useUIStore((state) => state.closeInfoModal);
  const openRelated = useUIStore((state) => state.openInfoModal);
  // Android back closes the preview instead of leaving the page
  useEffect(() => (isOpen ? onBack(close) : undefined), [isOpen, close]);

  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  // Phones show a short synopsis until it is expanded
  const [isSynopsisOpen, setIsSynopsisOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const trailerRef = useRef<HTMLIFrameElement>(null);

  const favorites = useHistoryStore((state) => state.favorites);
  const toggleFavoriteIn = useHistoryStore((state) => state.toggleFavorite);

  const { data: detailRes, isLoading: isDetailLoading } = useAnimeDetailQuery(
    selectedAnime?.slug || "",
  );
  const detail = detailRes?.data;

  // Season picked in the episode list (null = the title the preview was opened for)
  const [seasonSlug, setSeasonSlug] = useState<string | null>(null);
  const { data: seasonRes, isLoading: isSeasonLoading } = useAnimeDetailQuery(
    seasonSlug || "",
  );
  const episodeSource = seasonSlug ? seasonRes?.data : detail;

  // A fresh start every time the preview opens
  useEffect(() => {
    if (!isOpen) return;
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    setIsMuted(true);
    setSeasonSlug(null);
    setIsSynopsisOpen(false);
  }, [isOpen, selectedAnime?.slug]);

  const anime = detail || selectedAnime;
  const slug = anime?.slug || selectedAnime?.slug || "";
  const title = anime?.title || selectedAnime?.title || "Anime";
  const subTitle =
    anime?.subTitle || selectedAnime?.subTitle || anime?.originalTitle || "";
  const synopsis =
    anime?.synopsis ||
    selectedAnime?.synopsis ||
    "Đang cập nhật nội dung chi tiết cho bộ anime này...";
  const poster =
    anime?.poster ||
    anime?.image ||
    selectedAnime?.poster ||
    selectedAnime?.image ||
    FALLBACK_POSTER;
  const backdrop =
    detail?.banner ||
    anime?.backdrop ||
    anime?.banner ||
    (Array.isArray(detail?.gallery) && detail.gallery.length > 0
      ? detail.gallery[0]
      : null) ||
    poster;

  const meta: Record<string, unknown> =
    detail?.metadata && typeof detail.metadata === "object"
      ? detail.metadata
      : {};
  const trailerUrl =
    typeof detail?.trailerUrl === "string" ? detail.trailerUrl : "";
  const episodes = Array.isArray(episodeSource?.episodes)
    ? episodeSource.episodes
    : [];
  const seasons = Array.isArray(detail?.seasons) ? detail.seasons : [];
  const activeSlug = seasonSlug || slug;
  const activeSeason =
    seasons.find((s) => s.slug === activeSlug) ||
    seasons.find((s) => s.isCurrent);
  const characters = Array.isArray(detail?.characters) ? detail.characters : [];
  const related = Array.isArray(detail?.related) ? detail.related : [];
  const genres: unknown[] = Array.isArray(anime?.genres)
    ? anime.genres
    : Array.isArray(selectedAnime?.genres)
      ? selectedAnime.genres
      : [];

  const ratingPercent = detail?.ratingPercent
    ? `${detail.ratingPercent} Phù hợp`
    : anime?.rating
      ? `${Math.round(Number(anime.rating) * 10)}% Phù hợp`
      : "98% Phù hợp";
  const releaseYear = String(
    meta.Season || (anime?.year ? String(anime.year) : "2025"),
  );
  const totalEpisodes = detail?.episodes?.length || 0;
  const duration =
    seasons.length > 1
      ? `${seasons.length} phần`
      : String(
          meta["Thời lượng"] ||
            (totalEpisodes > 0
              ? `${totalEpisodes} tập`
              : selectedAnime?.latestEpisode || detail?.status || "HD Vietsub"),
        );
  const ageRating = String(meta.Rating || "T16");
  // "PG-13 - Teens 13 tuổi trở lên" -> boxed code + plain description, like Netflix
  const [ageCode, ...ageNoteParts] = ageRating.split(" - ");
  const ageNote = ageNoteParts.join(" - ");
  const episodeThumb =
    (seasonSlug && (seasonRes?.data?.banner || seasonRes?.data?.backdrop)) ||
    backdrop;
  const quality = anime?.quality || "HD";

  const episodeChunks = useMemo(() => {
    if (episodes.length <= CHUNK_SIZE) return [];
    const chunks = [];
    for (let i = 0; i < episodes.length; i += CHUNK_SIZE) {
      const end = Math.min(i + CHUNK_SIZE, episodes.length);
      chunks.push({
        rangeLabel: `Tập ${i + 1} - ${end}`,
        startIndex: i,
        endIndex: end,
      });
    }
    return chunks;
  }, [episodes]);

  const [chunkIndex, setChunkIndex] = useState(0);
  // the newest episodes first: the last chunk
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new part starts at its newest chunk
  useEffect(
    () => setChunkIndex(Math.max(0, episodeChunks.length - 1)),
    [episodeChunks.length, activeSlug],
  );

  const chunk =
    episodeChunks[chunkIndex] ?? episodeChunks[episodeChunks.length - 1];
  const shownEpisodes = chunk
    ? episodes.slice(chunk.startIndex, chunk.endIndex)
    : episodes;
  const firstShownNumber = (chunk?.startIndex ?? 0) + 1;

  // The trailer is a muted YouTube embed; sound goes on and off through its postMessage API
  const toggleAudio = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    trailerRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        event: "command",
        func: nextMuted ? "mute" : "unMute",
        args: [],
      }),
      "*",
    );
  };
  const trailerEmbed = trailerUrl
    ? `${trailerUrl}${trailerUrl.includes("?") ? "&" : "?"}autoplay=1&mute=1&controls=0&loop=1&enablejsapi=1&playsinline=1&modestbranding=1&rel=0`
    : "";

  const play = (episodeName?: string) => {
    haptic();
    close();
    // Episodes belong to whichever part is picked in the list
    const search = episodeName
      ? { slug: activeSlug, ep: episodeName }
      : { slug };
    const go = () => void navigate({ to: "/watch", search });
    // on mobile the sheet first drops away completely, then the player rises (app/routes.ts "up"): starting both
    // at once froze a half-closed sheet into the page change
    if (closeDelayMs > 0) setTimeout(go, closeDelayMs);
    else go();
  };

  const isFavorite = Boolean(
    anime?.slug && favorites.some((f) => f.slug === anime.slug),
  );
  const toggleFavorite = () => {
    haptic();
    toggleFavoriteIn({
      slug,
      title,
      poster,
      genres: genres as string[],
      year: anime?.year,
      rating: anime?.rating,
    });
  };

  return {
    // stays mounted while closed, so the overlay can play its closing animation
    hasContent: Boolean(selectedAnime || detail),
    isOpen,
    close,
    bodyRef,
    trailerRef,
    title,
    subTitle,
    synopsis,
    poster,
    backdrop,
    meta,
    trailerUrl,
    trailerEmbed,
    isMuted,
    toggleAudio,
    isLiked,
    toggleLike: () => setIsLiked((liked) => !liked),
    isFavorite,
    toggleFavorite,
    isSynopsisOpen,
    toggleSynopsis: () => setIsSynopsisOpen((open) => !open),
    play,
    openRelated,
    isDetailLoading,
    isSeasonLoading: Boolean(seasonSlug) && isSeasonLoading,
    detailSlug: detail?.slug,
    episodeStatus: String(
      episodeSource?.metadata?.["Trạng thái"] || `${episodes.length} tập`,
    ),
    episodes,
    shownEpisodes,
    firstShownNumber,
    episodeChunks,
    chunkIndex,
    setChunkIndex,
    seasons,
    activeSlug,
    activeSeason,
    pickSeason: (next: string) =>
      setSeasonSlug(next === detail?.slug ? null : next),
    characterNames: names(characters),
    shortCharacterNames:
      names(characters.slice(0, 4)) + (characters.length > 4 ? ", thêm" : ""),
    genreNames: names(genres),
    related,
    ratingPercent,
    releaseYear,
    duration,
    ageRating,
    ageCode,
    ageNote,
    episodeThumb,
    quality,
  };
}

export type TitleView = ReturnType<typeof useTitleDetail>;
