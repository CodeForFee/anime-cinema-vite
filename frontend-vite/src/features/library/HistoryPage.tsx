import { Play, X } from "lucide-react";
import { PosterImg } from "@/features/title";
import { useEffect, useState } from "react";
import { EmptyShelf } from "@/features/library/components/EmptyShelf";
import { AmbientBackdrop } from "@/shared/ui/AmbientBackdrop";
import { InfoModal } from "@/features/title";
import { progressKey, useProgressStore } from "@/core/player/progress";
import { Link } from "@tanstack/react-router";
import { formatTimeAgo } from "@/core/format";
import { useHistoryStore } from "@/core/stores/history";
import type { HistoryItem } from "@/core/types/history";

const DAY = 24 * 60 * 60 * 1000;

/** "Hôm nay" / "Hôm qua" / "Tuần này" / "Trước đó", by local calendar day */
function dayGroup(timestamp: number) {
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  if (timestamp >= startOfToday) return "Hôm nay";
  if (timestamp >= startOfToday - DAY) return "Hôm qua";
  if (timestamp >= startOfToday - 6 * DAY) return "Tuần này";
  return "Trước đó";
}

export default function HistoryPage() {
  const history = useHistoryStore((state) => state.history);
  const removeFromHistory = useHistoryStore((state) => state.removeFromHistory);
  const clearHistory = useHistoryStore((state) => state.clearHistory);
  const progress = useProgressStore((state) => state.entries);

  // "Xoá hết" asks once more in place instead of a dialog
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => {
    if (!confirmClear) return;
    const timer = setTimeout(() => setConfirmClear(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmClear]);

  const watched = (item: HistoryItem) => {
    const entry = item.episodeId && progress[progressKey(item.slug, item.episodeId)];
    return entry && entry.d > 0 ? { percent: Math.min(100, (entry.t / entry.d) * 100), left: Math.max(0, entry.d - entry.t) } : null;
  };

  const groups: [string, HistoryItem[]][] = [];
  for (const item of history) {
    const label = dayGroup(item.updatedAt);
    const group = groups.find(([name]) => name === label);
    if (group) group[1].push(item);
    else groups.push([label, [item]]);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pt-4 pb-6 md:space-y-8 md:px-8 md:py-10">
      <AmbientBackdrop src={history[0]?.poster} />

      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">Đang xem</h1>
          {history.length > 0 && <p className="mt-1 text-sm text-gray-400">{history.length} phim, mới nhất ở trên</p>}
        </div>
        {history.length > 0 && (
          <button
            type="button"
            onClick={() => (confirmClear ? (clearHistory(), setConfirmClear(false)) : setConfirmClear(true))}
            className={`h-9 shrink-0 rounded-full px-4 text-sm font-medium transition ${
              confirmClear ? "bg-primaryRed text-white" : "glass-pill text-gray-300 hover:text-white"
            }`}
          >
            {confirmClear ? "Bấm lần nữa để xoá" : "Xoá hết"}
          </button>
        )}
      </header>

      {history.length === 0 ? (
        <EmptyShelf line="Chưa xem phim nào." hint="Tập bạn xem sẽ nằm ở đây, kèm chỗ đang dừng." />
      ) : (
        groups.map(([label, items]) => (
          <section key={label} className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400">{label}</h2>
            <ul className="space-y-3">
              {items.map((item) => {
                const progressInfo = watched(item);
                const watch = { slug: item.slug, ep: item.episodeSlug };
                return (
                  <li key={item.slug} className="glass-card group relative flex items-center gap-4 rounded-3xl p-3 pr-4">
                    <Link to="/watch" search={watch} className="relative block h-[92px] w-16 shrink-0 overflow-hidden rounded-2xl bg-white/5">
                      {item.poster && (
                        <PosterImg art={item} src={item.poster} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                      )}
                      <span aria-hidden className="glass-rim absolute inset-0" />
                      {progressInfo && (
                        <span className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
                          <span className="block h-full bg-primaryRed" style={{ width: `${progressInfo.percent}%` }} />
                        </span>
                      )}
                    </Link>

                    <Link to="/watch" search={watch} className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-semibold leading-snug text-white">{item.title}</p>
                      <p className="mt-1 text-sm text-gray-400">
                        {item.episodeName || item.episodeSlug}
                        {progressInfo && progressInfo.left > 60 && ` · còn ${Math.round(progressInfo.left / 60)} phút`}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">{formatTimeAgo(item.updatedAt)}</p>
                    </Link>

                    <Link
                      to="/watch"
                      search={watch}
                      aria-label={`Xem tiếp ${item.title}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black transition active:scale-90"
                    >
                      <Play className="h-5 w-5 translate-x-px fill-current" />
                    </Link>

                    <button
                      type="button"
                      aria-label={`Xoá ${item.title} khỏi lịch sử`}
                      onClick={() => removeFromHistory(item.slug)}
                      className="glass-pill absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full text-gray-300 opacity-100 transition hover:text-white md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <InfoModal />
    </div>
  );
}
