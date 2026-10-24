import { Clock, Star } from "lucide-react";

import type { ScheduleDay } from "@/core/anime-api";
import { untilAir } from "@/features/schedule/model/schedule";
import { PosterImg, useUIStore } from "@/features/title";

/** One title of the day, like a History row: poster, air time, name, and the time left until it airs */
export function ScheduleRow({ item, now }: { item: ScheduleDay["items"][number]; now: number }) {
  const openInfoModal = useUIStore((s) => s.openInfoModal);
  const { anime, time, at } = item;
  const left = untilAir(at, now);
  const aired = at !== undefined && !left;

  return (
    <li className="[content-visibility:auto] [contain-intrinsic-size:auto_116px]">
      <button
        type="button"
        onClick={() => openInfoModal(anime)}
        className="glass-card group flex w-full items-center gap-4 rounded-3xl p-3 pr-4 text-left transition active:scale-[0.98]"
      >
        <span className="card-lift relative block h-[92px] w-16 shrink-0 overflow-hidden rounded-2xl bg-white/5">
          <PosterImg
            art={anime}
            src={anime.poster}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 md:group-hover:scale-105"
          />
          <span aria-hidden className="glass-rim absolute inset-0" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={`font-display text-xl font-bold tabular-nums ${aired ? "text-gray-500" : "text-white"}`}>
              {time || "--:--"}
            </span>
            {anime.episode && (
              <span className="glass-pill rounded-full px-2 py-0.5 text-[11px] font-semibold text-gray-200">
                {anime.episode}
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate font-semibold text-white">{anime.title}</span>
          <span className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
            {anime.rating ? (
              <span className="flex shrink-0 items-center gap-0.5">
                <Star aria-hidden className="h-3 w-3 fill-current text-amber-400" />
                {anime.rating}
              </span>
            ) : null}
            <span className="truncate">{anime.year}</span>
          </span>
          <span
            className={`mt-1.5 flex items-center gap-1 text-xs font-semibold ${left ? "text-primaryRed" : "text-gray-500"}`}
          >
            <Clock aria-hidden className="h-3 w-3" />
            {left ?? (aired ? "Đã ra tập" : "Chưa rõ giờ")}
          </span>
        </span>
      </button>
    </li>
  );
}
