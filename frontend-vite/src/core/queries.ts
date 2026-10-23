
import { queryOptions, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { animeApi } from "@/core/anime-api";
import type { AnimeItem, HomeDataResponse } from "@/core/types/anime";

export const QUERY_KEYS = {
  HOME: ["anime", "home"] as const,
  DETAIL: (slug: string) => ["anime", "detail", slug] as const,
  STREAM: (hash: string, id: string, play: string) =>
    ["anime", "stream", hash, id, play] as const,
  SEARCH: (query: string) => ["anime", "search", query] as const,
};

// Shared by the hooks below and the router loaders (app/router.tsx), so both hit the same cache entry
export const detailQuery = (slug: string) =>
  queryOptions({
    queryKey: QUERY_KEYS.DETAIL(slug),
    queryFn: () => animeApi.getAnimeDetails(slug),
    staleTime: 10 * 60 * 1000,
  });

export const streamQuery = (hash: string, id: string, play: string) =>
  queryOptions({
    queryKey: QUERY_KEYS.STREAM(hash, id, play),
    queryFn: () => animeApi.getStreamUrl(hash, id, play),
    staleTime: 15 * 60 * 1000,
    retry: 2,
  });

export const searchQuery = (query: string) =>
  queryOptions({
    queryKey: QUERY_KEYS.SEARCH(query),
    queryFn: () => animeApi.search(query),
    staleTime: 2 * 60 * 1000,
  });

// 1. Home Data Query
// The last home page is kept on the device and shown at once on the next launch while the fresh one loads
const HOME_CACHE_KEY = "home-cache-v1";

export function useHomeQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.HOME,
    queryFn: async () => {
      const home = await animeApi.getHomeData();
      // a failed load must be an error: then Query retries it and never keeps (or persists) the empty page
      if (!home.success) throw new Error("home failed");
      try {
        localStorage.setItem(HOME_CACHE_KEY, JSON.stringify(home));
      } catch {
        // storage full or unavailable: the page still works, it just starts empty next time
      }
      return home;
    },
    placeholderData: () => {
      try {
        return JSON.parse(localStorage.getItem(HOME_CACHE_KEY) || "null") as HomeDataResponse | null ?? undefined;
      } catch {
        return undefined;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// Poster, wide banner and synopsis of one title, from its detail page. Until it arrives (or if it
// fails) the caller keeps the thumbnail-only item it already has.
export function useEnrichedItem(item?: AnimeItem) {
  const { data } = useQuery({
    queryKey: ["anime", "enriched", item?.slug] as const,
    queryFn: () => animeApi.enrich(item as AnimeItem),
    enabled: Boolean(item?.slug),
    staleTime: 30 * 60 * 1000,
  });
  return data ?? item;
}

// 2. Anime Detail Query
export function useAnimeDetailQuery(slug: string) {
  return useQuery({
    ...detailQuery(slug),
    enabled: Boolean(slug),
    // Switching to another part of the same show keeps the page up (isPlaceholderData) instead of a
    // full-page skeleton; any other title starts clean
    placeholderData: (previous) =>
      previous?.data.seasons?.some((season) => season.slug === slug) ? previous : undefined,
  });
}

// 3. Stream Source Query
export function useStreamQuery(hash: string, id: string, play: string) {
  return useQuery({ ...streamQuery(hash, id, play), enabled: Boolean(hash && id) });
}

// 5. Search Query
export function useSearchQuery(query: string) {
  return useQuery({ ...searchQuery(query), enabled: Boolean(query && query.trim().length > 0) });
}

// 5b. Navigation menu from the source site (changes rarely, so keep it for an hour)
export function useMenuQuery() {
  return useQuery({
    queryKey: ["anime", "menu"] as const,
    queryFn: () => animeApi.getMenu(),
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
}

// 5d. A whole list, one page more each time the viewer nears the end (pages/explore.tsx)
export function useBrowseInfiniteQuery(path: string) {
  return useInfiniteQuery({
    queryKey: ["anime", "browse-all", path] as const,
    queryFn: ({ pageParam }) => animeApi.browse(path, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (all.length < (last.totalPages || 1) ? all.length + 1 : undefined),
    enabled: Boolean(path),
    staleTime: 5 * 60 * 1000,
  });
}

// 5c. One page of a list from that menu
export function useBrowseQuery(path: string, page: number = 1) {
  return useQuery({
    queryKey: ["anime", "browse", path, page] as const,
    queryFn: () => animeApi.browse(path, page),
    enabled: Boolean(path),
    staleTime: 5 * 60 * 1000,
  });
}
