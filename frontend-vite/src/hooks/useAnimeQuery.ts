
import { useQuery } from "@tanstack/react-query";
import { animeApi } from "../lib/api";

export const QUERY_KEYS = {
  HOME: ["anime", "home"] as const,
  DETAIL: (slug: string) => ["anime", "detail", slug] as const,
  STREAM: (hash: string, id: string, play: string) =>
    ["anime", "stream", hash, id, play] as const,
  SEARCH: (query: string) => ["anime", "search", query] as const,
};

// 1. Home Data Query
export function useHomeQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.HOME,
    queryFn: () => animeApi.getHomeData(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
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
