
import { useQuery } from "@tanstack/react-query";
import { animeApi } from "../lib/api";
import type { AnimeItem, HomeDataResponse } from "../types/anime";

export const QUERY_KEYS = {
  HOME: ["anime", "home"] as const,
  DETAIL: (slug: string) => ["anime", "detail", slug] as const,
  STREAM: (hash: string, id: string, play: string) =>
    ["anime", "stream", hash, id, play] as const,
  SEARCH: (query: string) => ["anime", "search", query] as const,
};

// 1. Home Data Query
// The last home page is kept on the device and shown at once on the next launch while the fresh one loads
const HOME_CACHE_KEY = "home-cache-v1";

export function useHomeQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.HOME,
    queryFn: async () => {
      const home = await animeApi.getHomeData();
      try {
        if (home.success) localStorage.setItem(HOME_CACHE_KEY, JSON.stringify(home));
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
    queryKey: QUERY_KEYS.DETAIL(slug),
    queryFn: () => animeApi.getAnimeDetails(slug),
    enabled: Boolean(slug),
    staleTime: 10 * 60 * 1000,
  });
}

// 3. Stream Source Query
export function useStreamQuery(hash: string, id: string, play: string) {
  return useQuery({
    queryKey: QUERY_KEYS.STREAM(hash, id, play),
    queryFn: () => animeApi.getStreamUrl(hash, id, play),
    enabled: Boolean(hash && id),
    staleTime: 15 * 60 * 1000,
    retry: 2,
  });
}

// 5. Search Query
export function useSearchQuery(query: string) {
  return useQuery({
    queryKey: QUERY_KEYS.SEARCH(query),
    queryFn: () => animeApi.search(query),
    enabled: Boolean(query && query.trim().length > 0),
    staleTime: 2 * 60 * 1000,
  });
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

// 5c. One page of a list from that menu
export function useBrowseQuery(path: string, page: number = 1) {
  return useQuery({
    queryKey: ["anime", "browse", path, page] as const,
    queryFn: () => animeApi.browse(path, page),
    enabled: Boolean(path),
    staleTime: 5 * 60 * 1000,
  });
}
