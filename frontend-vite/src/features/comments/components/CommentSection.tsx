import { Loader2 } from "lucide-react";

import { CommentComposer } from "@/features/comments/components/CommentComposer";
import { CommentItem } from "@/features/comments/components/CommentItem";
import { useComments, useNear, useOnVisible } from "@/features/comments/hooks/use-comments";
import { Skeleton } from "@/shared/ui/skeleton";

function CommentsSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Đang tải bình luận">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton variant="circle" className="h-10 w-10 shrink-0 bg-white/10" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-3 w-32 bg-white/10" />
            <Skeleton className="h-3 w-full bg-white/10" />
            <Skeleton className="h-3 w-2/3 bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The title's comment thread on AnimeVietsub, shared with the source site. Nothing is asked of the source until
 * the viewer scrolls near it, so it never competes with the page's own loading or the player starting.
 * On the watch page `episode` tags a new comment with the episode playing, like the source does.
 */
export function CommentSection({
  slug,
  episode,
}: {
  slug: string;
  episode?: { id: string; name: string };
}) {
  const { ref, near } = useNear<HTMLElement>();
  const { list, comments, total, send, valid } = useComments(slug, near, episode);
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = list;
  const more = useOnVisible<HTMLDivElement>(
    () => void fetchNextPage(),
    Boolean(hasNextPage && !isFetchingNextPage && !isFetchNextPageError),
  );
  if (!valid) return null;

  return (
    <section
      ref={ref}
      aria-labelledby="comments-title"
      className="glass-card space-y-6 rounded-3xl p-5 md:p-8"
    >
      <h2 id="comments-title" className="flex items-baseline gap-2 font-display text-lg font-bold tracking-tight text-white md:text-2xl">
        Bình luận
        {total > 0 && (
          <span className="text-sm font-medium text-gray-400 md:text-base">{total.toLocaleString("vi-VN")}</span>
        )}
      </h2>

      <CommentComposer
        onSend={(content, spoiler) => send.mutateAsync({ content, spoiler })}
        sending={send.isPending}
        error={send.error?.message}
        notice={send.data?.pending ? "Bình luận của bạn đang chờ duyệt." : undefined}
      />

      {(!near || list.isLoading) && <CommentsSkeleton />}
      {list.error && (
        <p className="text-sm text-gray-400">
          Chưa tải được bình luận.{" "}
          <button type="button" className="font-semibold text-white underline underline-offset-4" onClick={() => void list.refetch()}>
            Thử lại
          </button>
        </p>
      )}
      {list.isSuccess && comments.length === 0 && (
        <p className="text-sm text-gray-400">Chưa có bình luận nào. Hãy là người đầu tiên.</p>
      )}

      {comments.length > 0 && (
        <ul className="divide-y divide-white/[0.06]">
          {comments.map((c) => (
            <CommentItem key={c.id} c={c} />
          ))}
        </ul>
      )}

      {/* the next five load by themselves as the end comes into view */}
      {list.hasNextPage && (
        <div ref={more} className="flex justify-center py-2" aria-live="polite">
          {list.isFetchNextPageError ? (
            <button
              type="button"
              onClick={() => void list.fetchNextPage()}
              className="glass-pill h-9 rounded-full px-5 text-sm font-semibold text-gray-200"
            >
              Tải lại
            </button>
          ) : (
            <span className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              Đang tải thêm...
            </span>
          )}
        </div>
      )}
    </section>
  );
}
