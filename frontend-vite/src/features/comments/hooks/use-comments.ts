import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { animeApi } from "@/core/anime-api";
import { filmIdOf } from "@/core/source/endpoints/comments/fetch";
import { recheckSourceUser } from "@/features/account";
import { useOnVisible } from "@/shared/lib/use-on-visible";

export { useOnVisible };

/** True once `ref` is within a screen of the viewport: comments wait until the viewer scrolls toward them */
export function useNear<T extends Element>() {
  const [near, setNear] = useState(false);
  const ref = useOnVisible<T>(() => setNear(true), !near);
  return { ref, near };
}

/** A title's comment thread on the source, newest first, five more at a time; and posting to it */
export function useComments(slug: string, enabled: boolean, episode?: { id: string; name: string }) {
  const client = useQueryClient();
  const filmId = filmIdOf(slug);
  const key = ["source", "comments", filmId] as const;
  const list = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => animeApi.comments.list(filmId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasMore ? last.offset : undefined),
    enabled: enabled && filmId > 0,
    staleTime: 60 * 1000,
  });
  const send = useMutation({
    mutationFn: ({ content, spoiler }: { content: string; spoiler: boolean }) =>
      animeApi.comments.post({
        filmId,
        episodeId: episode?.id,
        episodeName: episode?.name,
        content,
        spoiler,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
    // the source session may have ended: then the sign-in form comes back
    onError: recheckSourceUser,
  });
  const pages = list.data?.pages ?? [];
  // a comment posted between two pages shows up on both: keep the first
  const seen = new Set<number>();
  const comments = pages
    .flatMap((page) => page.comments)
    .filter((c) => !seen.has(c.id) && seen.add(c.id));
  return { list, comments, total: pages[0]?.total ?? 0, send, valid: filmId > 0 };
}

export function useReplies(commentId: number, open: boolean) {
  return useQuery({
    queryKey: ["source", "replies", commentId] as const,
    queryFn: () => animeApi.comments.replies(commentId),
    enabled: open,
    staleTime: 60 * 1000,
  });
}
