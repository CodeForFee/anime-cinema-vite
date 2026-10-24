import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";

import { formatEpisodeName } from "@/core/format";
import { pickEpisode } from "@/core/player/pick-episode";
import { progressKey } from "@/core/player/progress";
import { episodeNumberOf, searchNames } from "@/core/player/skip-times";
import {
  streamQuery,
  useAnimeDetailQuery,
  useStreamQuery,
} from "@/core/queries";
import { useHistoryStore } from "@/core/stores/history";
import type { Episode } from "@/core/types/anime";
import { rememberPlayerOrigin } from "@/platform/preconnect";

/**
 * The watch page's state: the title of ?slug=, the episode that plays (the linked one, else where the viewer left
 * off, else the first), its stream, the history entry, and moving on to the next episode.
 */
export function useWatchSession() {
  const { slug, ep: requested = "" } = useSearch({ from: "/watch" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToHistory = useHistoryStore((s) => s.addToHistory);
  const getAnimeHistory = useHistoryStore((s) => s.getAnimeHistory);
  const favorites = useHistoryStore((s) => s.favorites);
  const toggleFavorite = useHistoryStore((s) => s.toggleFavorite);

  // another part of the same show is loading (isPlaceholderData): the page stays, only the player and episodes wait
  const {
    data: detailRes,
    isLoading,
    error,
    isPlaceholderData: switchingPart,
  } = useAnimeDetailQuery(slug);
  const anime = detailRes?.data;
  const episodes = anime?.episodes || [];

  const episode: Episode | null = useMemo(
    // the list on screen still belongs to the previous part: no episode, so no stream is asked for
    () =>
      switchingPart
        ? null
        : (pickEpisode(
            episodes,
            requested,
            getAnimeHistory(slug)?.episodeSlug,
          ) ?? null),
    [episodes, requested, slug, getAnimeHistory, switchingPart],
  );

  const stream = useStreamQuery(
    episode?.hash || "",
    episode?.id || "",
    episode?.play || "api",
  );
  const streamData = stream.data?.data;

  // the next episode can open its connection to the player host before /ajax/player answers (app/router.tsx)
  useEffect(() => {
    if (streamData?.embedUrl) rememberPlayerOrigin(streamData.embedUrl);
  }, [streamData?.embedUrl]);

  // into the history once the episode really has a stream
  // biome-ignore lint/correctness/useExhaustiveDependencies: the entry changes with these fields only
  useEffect(() => {
    if (!anime || !episode || !streamData?.playerUrl) return;
    addToHistory({
      slug: anime.slug,
      title: anime.title,
      poster: anime.poster || anime.image || "",
      episodeSlug: episode.name,
      episodeId: episode.id,
      episodeName: formatEpisodeName(episode.name),
      timestamp: Date.now(),
    });
  }, [
    anime?.slug,
    anime?.title,
    anime?.poster,
    episode?.name,
    streamData?.playerUrl,
    addToHistory,
  ]);

  const index = episodes.findIndex((e) => e.id === episode?.id);
  const next =
    index >= 0 && index < episodes.length - 1 ? episodes[index + 1] : undefined;
  const select = (ep: Episode) =>
    void navigate({
      to: "/watch",
      search: { slug, ep: ep.name },
      resetScroll: false,
    });

  return {
    slug,
    anime,
    isLoading,
    error,
    switchingPart,
    episodes,
    episode,
    episodeName: episode ? formatEpisodeName(episode.name) : "",
    streamData,
    streamFailed: stream.isError,
    refetchStream: () => void stream.refetch(),
    progressKey:
      anime && episode ? progressKey(anime.slug, episode.id) : undefined,
    skipLookup: anime && {
      slug: anime.slug,
      names: searchNames(anime.title, anime.subTitle),
      year: Number(anime.year) || undefined,
      episode: episode ? episodeNumberOf(episode.name) : null,
    },
    select,
    hasNext: Boolean(next),
    playNext: () => next && select(next),
    // at 80 % of an episode: the next one's stream is fetched so switching is instant
    prefetchNext: () => {
      if (next?.hash && next.id)
        void queryClient.prefetchQuery(
          streamQuery(next.hash, next.id, next.play || "api"),
        );
    },
    isFavorite: Boolean(
      anime?.slug && favorites.some((f) => f.slug === anime.slug),
    ),
    toggleFavorite: () =>
      anime &&
      toggleFavorite({
        slug: anime.slug,
        title: anime.title,
        poster: anime.poster || anime.image || "",
        genres: anime.genres,
        year: anime.year,
        rating: anime.rating,
      }),
  };
}

export type WatchSession = ReturnType<typeof useWatchSession>;
