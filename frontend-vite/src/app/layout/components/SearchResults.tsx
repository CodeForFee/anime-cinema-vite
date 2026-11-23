import { Link } from "@tanstack/react-router";

import type { SearchBox } from "@/app/layout/hooks/use-search-box";
import { PosterImg } from "@/features/title";
import { cn } from "@/shared/lib/utils";
import { Skeleton } from "@/shared/ui/skeleton";

const links = (root: Element | null | undefined) =>
  Array.from(
    root?.querySelectorAll<HTMLAnchorElement>(".search-results a") ?? [],
  );

/** The search fields call this on keydown: ArrowDown moves from the field into the results */
export function onSearchKey(
  event: React.KeyboardEvent<HTMLInputElement>,
  box: SearchBox,
) {
  if (event.key === "Escape") box.close();
  if (event.key !== "ArrowDown") return;
  const first = links(event.currentTarget.parentElement)[0];
  if (!first) return;
  event.preventDefault();
  first.focus();
}

/** The live results under the search field: compact on desktop, large touch rows in the mobile popup */
export function SearchResults({
  box,
  large,
}: {
  box: SearchBox;
  large?: boolean;
}) {
  if (!box.showResults) return null;

  // Up/Down walk the results (Up from the first goes back to the field), Escape closes and returns to it
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const all = links(event.currentTarget.parentElement);
    const at = all.indexOf(document.activeElement as HTMLAnchorElement);
    if (event.key === "Escape") {
      box.close();
      return;
    }
    if (at === -1 || (event.key !== "ArrowDown" && event.key !== "ArrowUp"))
      return;
    event.preventDefault();
    const next = at + (event.key === "ArrowDown" ? 1 : -1);
    if (next < 0) box.inputRef.current?.focus();
    else all[Math.min(next, all.length - 1)]?.focus();
  };

  return (
    <section
      aria-label="Kết quả tìm kiếm"
      onKeyDown={onKeyDown}
      className={cn(
        "search-results cn-pop absolute top-full z-50 mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#181818] shadow-2xl",
        large ? "left-0 right-[-3.5rem]" : "right-0 w-[400px]",
      )}
    >
      {box.results.length > 0 ? (
        <>
          <ul
            className={cn(
              "overflow-y-auto overscroll-contain",
              large
                ? "max-h-[calc(100dvh-var(--inset-top)-6vh-9rem)] p-2"
                : "max-h-[60vh] p-1.5",
            )}
          >
            {box.results.slice(0, 8).map((item) => (
              <li key={item.slug}>
                <Link
                  to="/watch"
                  search={{ slug: item.slug }}
                  onClick={box.close}
                  className={cn(
                    "flex items-center transition-colors hover:bg-white/10 active:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none",
                    large ? "gap-4 rounded-2xl p-2.5" : "gap-3 rounded-lg p-2",
                  )}
                >
                  <PosterImg
                    thumb
                    art={item}
                    src={item.poster || item.image || ""}
                    alt=""
                    loading="lazy"
                    className={cn(
                      "flex-shrink-0 bg-white/10 object-cover",
                      large ? "h-24 w-16 rounded-xl" : "h-14 w-10 rounded",
                    )}
                  />
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block font-semibold text-white",
                        large
                          ? "line-clamp-2 text-base leading-snug"
                          : "truncate text-sm",
                      )}
                    >
                      {item.title}
                    </span>
                    {(item.latestEpisode || item.episode) && (
                      <span
                        className={cn(
                          "block truncate text-gray-400",
                          large ? "mt-1 text-sm" : "text-xs",
                        )}
                      >
                        {item.latestEpisode || item.episode}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            to="/search"
            search={{ q: box.trimmed }}
            onClick={box.close}
            className="block border-t border-white/10 px-4 py-2.5 text-center text-sm font-semibold text-gray-200 transition-colors hover:bg-white/10 hover:text-white"
          >
            Xem tất cả kết quả
          </Link>
        </>
      ) : box.isWaiting ? (
        <div className="space-y-1.5 p-1.5">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-3 p-2">
              <Skeleton className="h-14 w-10 flex-shrink-0 rounded bg-white/10" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-3/4 bg-white/10" />
                <Skeleton className="h-3 w-1/3 bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p
          role="status"
          className="px-4 py-6 text-center text-sm text-gray-400"
        >
          Không tìm thấy anime nào cho &ldquo;{box.trimmed}&rdquo;.
        </p>
      )}
    </section>
  );
}
