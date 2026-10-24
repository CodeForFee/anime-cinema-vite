import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { animeApi } from "@/core/anime-api";
import { patchSourceUser, setSourceUser, useSourceUser } from "@/features/account/store";

const INFO = ["source", "account"] as const;
const NOTIFICATIONS = ["source", "notifications"] as const;

/** The account page of the source; signs the app out if the source no longer knows the viewer */
export function useAccountInfo() {
  const { user } = useSourceUser();
  const query = useQuery({ queryKey: [...INFO, user?.id], queryFn: animeApi.account.AccountInfo, enabled: Boolean(user), staleTime: 30 * 1000 });
  useEffect(() => {
    if (query.isSuccess && query.data === null) setSourceUser(null);
    if (query.data) patchSourceUser({ name: query.data.name, avatar: query.data.avatar });
  }, [query.isSuccess, query.data]);
  return query;
}

/** One write to the account: on success the page is read again, so it shows what the source saved */
function useAccountWrite<A, R>(fn: (args: A) => Promise<R>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => client.invalidateQueries({ queryKey: INFO }) });
}

export const useSaveProfile = () => useAccountWrite(animeApi.account.UpdateProfile);
export const useChangeUsername = () => useAccountWrite(animeApi.account.ChangeUsername);
export const useChangeEmail = () =>
  useAccountWrite(({ email, password }: { email: string; password?: string }) =>
    animeApi.account.RequestEmailChange(email, password),
  );
export const useChangePassword = () =>
  useAccountWrite(({ next, confirm, current }: { next: string; confirm: string; current?: string }) =>
    animeApi.account.ChangePassword(next, confirm, current),
  );

/** The viewer's own comments across the source, newest first, more as the list scrolls */
export function useMyComments(enabled: boolean) {
  const { user } = useSourceUser();
  return useInfiniteQuery({
    queryKey: ["source", "my-comments", user?.id] as const,
    queryFn: ({ pageParam }) => animeApi.account.MyComments(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasMore ? last.offset : undefined),
    enabled: enabled && Boolean(user),
    staleTime: 60 * 1000,
  });
}

/** Replies, mentions and moderation results; the header shows how many are unread */
export function useNotifications() {
  const { user } = useSourceUser();
  const query = useQuery({
    queryKey: [...NOTIFICATIONS, user?.id],
    queryFn: animeApi.account.Notifications,
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
  });
  const unread = (query.data ?? []).filter((n) => Number(n.is_read) === 0).length;
  return { ...query, unread };
}

/** Opening the list marks everything read, on the source too */
export function useMarkNotificationsRead() {
  const { user } = useSourceUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: animeApi.account.MarkNotificationsRead,
    onSuccess: () =>
      client.setQueryData([...NOTIFICATIONS, user?.id], (list?: { is_read: number | string }[]) =>
        list?.map((n) => ({ ...n, is_read: 1 })),
      ),
  });
}
