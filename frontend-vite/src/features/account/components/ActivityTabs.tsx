import { Link } from "@tanstack/react-router";
import { AtSign, Bell, CheckCircle2, Clock, EyeOff, Film, Loader2, Reply, XCircle } from "lucide-react";
import { useEffect } from "react";

import { formatTimeAgo } from "@/core/format";
import type { MyComment, Notification } from "@/core/source/endpoints/account/fetch";
import { useMarkNotificationsRead, useMyComments, useNotifications } from "@/features/account/hooks/use-account";
import { useOnVisible } from "@/shared/lib/use-on-visible";
import { CommentText } from "@/shared/ui/CommentText";
import { Skeleton } from "@/shared/ui/skeleton";

const EMPTY = "rounded-2xl bg-white/[0.04] px-4 py-12 text-center text-sm text-gray-400 ring-1 ring-white/10";
const slugOf = (url = "") => url.match(/\/phim\/([^/]+)\//)?.[1];

const Rows = () => (
  <div className="space-y-3">
    {[0, 1, 2].map((i) => (
      <Skeleton key={i} variant="rounded" className="h-20 rounded-2xl bg-white/10" />
    ))}
  </div>
);

function CommentRow({ c }: { c: MyComment }) {
  const slug = c.film_id ? (c.film_slug ? `${c.film_slug}-a${c.film_id}` : slugOf(c.comment_url)) : undefined;
  const episode = c.thread_key && !c.thread_key.startsWith("/") ? c.thread_key : undefined;
  const title = c.film_id ? c.film_name || `Phim #${c.film_id}` : c.page_label || "Hỏi/đáp";
  return (
    <li className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10 [content-visibility:auto]">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Film aria-hidden className="h-3.5 w-3.5 text-gray-500" />
        {slug ? (
          <Link to="/watch" search={{ slug, ep: episode }} className="font-semibold text-white hover:underline">
            {title}
          </Link>
        ) : (
          <span className="font-semibold text-white">{title}</span>
        )}
        {episode && <span className="glass-pill rounded-full px-2 py-px text-[10px] font-semibold text-gray-200">Tập {episode}</span>}
        <span className="ml-auto text-gray-500">{formatTimeAgo(c.created_at * 1000)}</span>
      </div>
      {Number(c.is_hidden) === 1 ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm italic text-red-300">
          <EyeOff aria-hidden className="h-4 w-4" /> Bình luận đã bị ẩn{c.hide_reason ? `: ${c.hide_reason}` : ""}
        </p>
      ) : (
        <p className="mt-2 line-clamp-4 whitespace-pre-line break-words text-sm leading-relaxed text-gray-200">
          <CommentText text={c.content} />
        </p>
      )}
      {Number(c.is_pending) === 1 && (
        <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-amber-400">
          <Clock aria-hidden className="h-3.5 w-3.5" /> Chờ duyệt
        </p>
      )}
    </li>
  );
}

/** Bình luận: everything the viewer wrote on the source, loading more as the end comes into view */
export function MyCommentsTab() {
  const list = useMyComments(true);
  const more = useOnVisible<HTMLDivElement>(
    () => void list.fetchNextPage(),
    Boolean(list.hasNextPage && !list.isFetchingNextPage && !list.isFetchNextPageError),
  );
  const comments = list.data?.pages.flatMap((p) => p.comments) ?? [];
  if (list.isLoading) return <Rows />;
  if (list.error) return <p className={EMPTY}>{list.error.message}</p>;
  if (comments.length === 0) return <p className={EMPTY}>Bạn chưa có bình luận nào.</p>;
  return (
    <>
      <ul className="space-y-3">
        {comments.map((c) => (
          <CommentRow key={c.id} c={c} />
        ))}
      </ul>
      {list.hasNextPage && (
        <div ref={more} className="flex justify-center py-4 text-sm text-gray-400">
          <Loader2 aria-hidden className="mr-2 h-4 w-4 animate-spin" /> Đang tải thêm...
        </div>
      )}
    </>
  );
}

const KIND: Record<string, { icon: typeof Bell; color: string; text: (who: string) => string }> = {
  approved: { icon: CheckCircle2, color: "text-emerald-400", text: () => "Bình luận của bạn đã được duyệt" },
  rejected: { icon: XCircle, color: "text-red-400", text: () => "Bình luận của bạn bị từ chối" },
  reply: { icon: Reply, color: "text-sky-400", text: (who) => `${who} đã trả lời bình luận của bạn` },
  mention: { icon: AtSign, color: "text-amber-400", text: (who) => `${who} đã nhắc đến bạn` },
};

function NotificationRow({ n }: { n: Notification }) {
  const kind = KIND[n.type] ?? { icon: Bell, color: "text-gray-400", text: () => "Thông báo mới" };
  const Icon = kind.icon;
  const slug = slugOf(n.film_url);
  const body = (
    <>
      <Icon aria-hidden className={`mt-0.5 h-5 w-5 shrink-0 ${kind.color}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-gray-100">{kind.text(n.from_user_fullname || n.from_user_name || "Ai đó")}</span>
        <span className="mt-1 block text-xs text-gray-500">{formatTimeAgo(n.created_at * 1000)}</span>
      </span>
      {Number(n.is_read) === 0 && <span aria-label="Chưa đọc" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primaryRed" />}
    </>
  );
  const row = "flex gap-3 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10";
  return (
    <li>
      {slug ? (
        <Link to="/watch" search={{ slug }} className={`${row} transition hover:bg-white/[0.07]`}>
          {body}
        </Link>
      ) : (
        <div className={row}>{body}</div>
      )}
    </li>
  );
}

/** Thông báo: replies, mentions, moderation; seeing them marks them read on the source */
export function NotificationsTab() {
  const list = useNotifications();
  const read = useMarkNotificationsRead();
  const { mutate } = read;
  useEffect(() => {
    if (list.unread > 0) mutate();
  }, [list.unread, mutate]);
  if (list.isLoading) return <Rows />;
  if (list.error) return <p className={EMPTY}>{list.error.message}</p>;
  if (!list.data?.length) return <p className={EMPTY}>Không có thông báo nào.</p>;
  return (
    <ul className="space-y-3">
      {list.data.map((n, i) => (
        <NotificationRow key={n.id ?? `${n.created_at}-${i}`} n={n} />
      ))}
    </ul>
  );
}
