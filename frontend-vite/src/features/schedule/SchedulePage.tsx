import { CalendarX2, CircleAlert, RotateCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useScheduleQuery } from "@/core/queries";
import { ScheduleRow } from "@/features/schedule/components/ScheduleRow";
import { dayLabel } from "@/features/schedule/model/schedule";
import { InfoModal } from "@/features/title";
import { AmbientBackdrop } from "@/shared/ui/AmbientBackdrop";
import { Skeleton } from "@/shared/ui/skeleton";

/** The clock the countdowns read, once a minute */
function useMinute() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** /schedule: the source's week of new episodes, one day at a time (only that day's posters are drawn) */
export default function SchedulePage() {
  const { data: days = [], isLoading, error, refetch, isFetching } = useScheduleQuery();
  const now = useMinute();
  const labels = useMemo(() => days.map((d) => dayLabel(d.day)), [days]);
  const [picked, setPicked] = useState<number | null>(null);
  const index = picked ?? Math.max(0, labels.findIndex((l) => l.today));
  const day = days[index];
  const items = useMemo(
    () => [...(day?.items ?? [])].sort((a, b) => a.time.localeCompare(b.time)),
    [day],
  );
  const total = days.reduce((sum, d) => sum + d.items.length, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 pt-4 pb-6 md:space-y-7 md:px-8 md:py-10">
      <AmbientBackdrop src={items[0]?.anime.poster} />

      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
          Lịch chiếu
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          {total > 0 ? `${total} tập mới trong tuần · giờ Việt Nam` : "Tập mới trong tuần · giờ Việt Nam"}
        </p>
      </header>

      {/* day chips: scroll sideways on phones, the picked one is the solid white pill */}
      <div role="tablist" aria-label="Chọn ngày" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1 md:mx-0 md:px-0">
        {isLoading
          ? [0, 1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} variant="rounded" className="h-14 w-16 shrink-0 rounded-2xl bg-white/10" />
            ))
          : labels.map((l, i) => (
              <button
                key={days[i].day}
                type="button"
                role="tab"
                aria-selected={i === index}
                onClick={() => setPicked(i)}
                className={`flex h-14 min-w-16 shrink-0 flex-col items-center justify-center rounded-2xl px-3 transition active:scale-95 ${
                  i === index ? "bg-white text-black shadow-lg" : "glass-pill text-gray-200 hover:text-white"
                }`}
              >
                <span className="text-sm font-bold leading-none">{l.today ? "Hôm nay" : l.short}</span>
                <span className={`mt-1 text-[11px] tabular-nums ${i === index ? "text-black/60" : "text-gray-400"}`}>
                  {l.date} · {days[i].items.length}
                </span>
              </button>
            ))}
      </div>

      {day && (
        <h2 className="font-display text-lg font-bold tracking-tight text-white md:text-2xl">
          {labels[index].weekday}
          <span className="ml-2 text-base font-medium text-gray-400">{labels[index].date}</span>
        </h2>
      )}

      {isLoading && (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" className="h-[116px] rounded-3xl bg-white/10" />
          ))}
        </div>
      )}

      {error && !day && (
        <div className="glass-card mx-auto max-w-md space-y-4 rounded-3xl p-8 text-center">
          <CircleAlert className="mx-auto h-12 w-12 text-primaryRed" aria-hidden />
          <p className="text-sm text-gray-300">Chưa tải được lịch chiếu.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-6 font-semibold text-black disabled:opacity-60"
          >
            <RotateCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden />
            Thử lại
          </button>
        </div>
      )}

      {day && items.length === 0 && (
        <div className="glass-card flex items-center gap-3 rounded-3xl p-6 text-sm text-gray-400">
          <CalendarX2 className="h-5 w-5 shrink-0" aria-hidden />
          Ngày này chưa có tập mới.
        </div>
      )}

      {items.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            // a title can air twice in one day
            <ScheduleRow key={`${item.anime.slug}-${item.time}`} item={item} now={now} />
          ))}
        </ul>
      )}

      <InfoModal />
    </div>
  );
}
