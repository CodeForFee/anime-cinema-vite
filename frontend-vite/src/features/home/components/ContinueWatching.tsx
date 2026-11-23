import { Link } from "@tanstack/react-router";
import { History } from "lucide-react";

import { progressKey, useProgressStore } from "@/core/player/progress";
import { useHistoryStore } from "@/core/stores/history";
import { PosterImg } from "@/features/title";

const SHOWN = 12;

/** "Xem tiếp" on the home page: the last titles watched, each opening the episode where it was left */
export function ContinueWatching() {
  const history = useHistoryStore((s) => s.history);
  const progress = useProgressStore((s) => s.entries);
  if (history.length === 0) return null;

  return (
    <section
      aria-labelledby="continue-title"
      className="space-y-3 px-4 md:px-12"
    >
      <h2
        id="continue-title"
        className="flex items-center gap-2 font-display text-lg font-bold text-white md:text-xl"
      >
        <History aria-hidden className="h-5 w-5 text-primaryRed" />
        Xem tiếp
      </h2>
      <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:-mx-12 md:px-12">
        {history.slice(0, SHOWN).map((item) => {
          const entry = item.episodeId
            ? progress[progressKey(item.slug, item.episodeId)]
            : undefined;
          const part =
            entry && entry.d > 0 ? Math.min(1, entry.t / entry.d) : 0;
          return (
            <li key={item.slug} className="w-28 shrink-0 md:w-36">
              <Link
                to="/watch"
                search={{ slug: item.slug, ep: item.episodeSlug }}
                className="group block"
              >
                <span className="card-lift relative block aspect-[2/3] overflow-hidden rounded-2xl bg-white/5">
                  {item.poster && (
                    <PosterImg
                      art={item}
                      src={item.poster}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                  {part > 0 && (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-1 bg-black/50"
                    >
                      <span
                        className="block h-full bg-primaryRed"
                        style={{ width: `${part * 100}%` }}
                      />
                    </span>
                  )}
                </span>
                <span className="mt-2 line-clamp-1 text-sm font-semibold text-white">
                  {item.title}
                </span>
                <span className="block truncate text-xs text-gray-400">
                  {item.episodeName || item.episodeSlug}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
