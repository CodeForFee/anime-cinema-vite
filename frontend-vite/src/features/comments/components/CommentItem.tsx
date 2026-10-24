import { ChevronDown, MessageCircle, Pin, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";

import { formatTimeAgo } from "@/core/format";
import type { SourceComment } from "@/core/source/endpoints/comments/fetch";
import { useReplies } from "@/features/comments/hooks/use-comments";
import { CommentText as Content } from "@/shared/ui/CommentText";

const Avatar = ({ src, small }: { src: string; small?: boolean }) => (
  <img
    src={src}
    alt=""
    loading="lazy"
    decoding="async"
    className={`${small ? "h-8 w-8" : "h-10 w-10"} shrink-0 rounded-full bg-white/10 object-cover ring-1 ring-white/15`}
  />
);

/** One comment of the source thread, its replies loaded when opened */
export function CommentItem({ c, reply = false }: { c: SourceComment; reply?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reveal, setReveal] = useState(false);
  const replies = useReplies(c.id, open);
  const pinned = Boolean(c.is_pinned || c.is_global_pinned);
  const episode = /^\d+/.test(c.thread_key) ? `Tập ${c.thread_key}` : "";

  return (
    <li className={`flex gap-3 [content-visibility:auto] ${reply ? "py-3" : "py-4 first:pt-0 last:pb-0"}`}>
      <Avatar src={c.user_avatar} small={reply} />
      <div className="min-w-0 flex-1">
        {pinned && (
          <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-primaryRed">
            <Pin aria-hidden className="h-3 w-3" /> Ghim
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-white">{c.user_fullname || c.user_name}</span>
          {c.badges.map((b) => (
            <span
              key={b.name}
              className="rounded-md px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-white"
              style={{ backgroundColor: b.color }}
            >
              {b.name}
            </span>
          ))}
          {episode && (
            <span className="glass-pill rounded-full px-2 py-px text-[10px] font-semibold text-gray-200">{episode}</span>
          )}
          <span className="text-xs text-gray-500">{formatTimeAgo(c.created_at * 1000)}</span>
        </div>

        <div className="mt-1.5">
          {c.user_ban ? (
            <p className="text-sm italic text-gray-500">Bình luận của thành viên bị khoá.</p>
          ) : c.is_spoiler && !reveal ? (
            <button
              type="button"
              onClick={() => setReveal(true)}
              className="glass-pill rounded-xl px-3 py-2 text-left text-xs font-medium text-gray-300"
            >
              Có spoiler · nhấn để xem
            </button>
          ) : (
            <p className="whitespace-pre-line break-words text-sm leading-relaxed text-gray-200">
              <Content text={c.content} />
            </p>
          )}
        </div>

        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1 tabular-nums">
            <ThumbsUp className="h-3.5 w-3.5" aria-label="Thích" /> {c.votes_up}
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            <ThumbsDown className="h-3.5 w-3.5" aria-label="Không thích" /> {c.votes_down}
          </span>
          {!reply && c.replies_count > 0 && (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              className="flex items-center gap-1 font-semibold text-gray-300 transition hover:text-white"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
              {open ? "Ẩn trả lời" : `${c.replies_count} trả lời`}
              <ChevronDown aria-hidden className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>

        {open && (
          <ul className="mt-2 divide-y divide-white/[0.06] border-l-2 border-white/10 pl-4">
            {replies.isLoading && <li className="py-3 text-xs text-gray-500">Đang tải trả lời...</li>}
            {replies.error && <li className="py-3 text-xs text-red-400">Chưa tải được trả lời.</li>}
            {replies.data?.map((r) => (
              <CommentItem key={r.id} c={r} reply />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
