
import React, { Suspense, useEffect, useMemo, useRef } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { PosterTile } from "@/features/browse/components/PosterTile";
import { AmbientBackdrop } from "@/shared/ui/AmbientBackdrop";
import { InfoModal } from "@/features/title/components/InfoModal";
import { buttonVariants } from "@/shared/ui/button";
import { PosterGridSkeleton } from "@/shared/ui/skeletons";
import { useBrowseInfiniteQuery, useHomeQuery, useMenuQuery } from "@/core/queries";
import { cn } from "@/shared/lib/utils";

// Older links use ?type=...; each maps to the source list it always meant
const TYPE_PATHS: Record<string, { path: string; label: string }> = {
  "phim-bo": { path: "/anime-bo/", label: "TV/Series" },
  "phim-le": { path: "/anime-le/", label: "Movie/OVA" },
  "hoat-hinh-trung-quoc": { path: "/hoat-hinh-trung-quoc/", label: "HH Trung Quốc" },
  "sap-chieu": { path: "/anime-sap-chieu/", label: "Anime Sắp Chiếu" },
  "phim-moi": { path: "/danh-sach/list-dang-chieu/", label: "Anime Đang Chiếu" },
  "hoan-thanh": { path: "/danh-sach/list-tron-bo/", label: "Anime Trọn Bộ" },
  "top-day": { path: "/bang-xep-hang/day.html", label: "Top Anime Theo Ngày" },
  "top-month": { path: "/bang-xep-hang/month.html", label: "Top Anime Theo Tháng" },
  "top-season": { path: "/bang-xep-hang/season.html", label: "Top Anime Theo Mùa" },
  "top-year": { path: "/bang-xep-hang/year.html", label: "Top Anime Theo Năm" },
};


const PILL = "h-9 flex-shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors";
const PILL_IDLE = "glass-pill text-gray-200 hover:text-white";
const PILL_ACTIVE = "border-white bg-white text-black";
const GRID = "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5 xl:grid-cols-6";

function ExploreContent() {
  const search = useSearch({ from: "/explore" });
  const type = search.type || "";
  const path = search.path || TYPE_PATHS[type]?.path || "";

  const { data: menus = [] } = useMenuQuery();
  // No list picked -> the home page's featured titles
  const { data: homeRes, isLoading: isHomeLoading } = useHomeQuery();
  const browse = useBrowseInfiniteQuery(path);
  const isError = browse.isError;

  // pages can overlap when the source list moves between two requests: one card per title
  const items = useMemo(() => {
    if (!path) return homeRes?.featured?.length ? homeRes.featured : homeRes?.latest || [];
    const seen = new Set<string>();
    return (browse.data?.pages ?? []).flatMap((p) => p.items).filter((item) => {
      const key = item.slug || item.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [path, homeRes, browse.data]);
  const loading = path ? browse.isLoading : isHomeLoading;

  // Scrolling near the end asks for the next page, well before the viewer gets there
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = browse;
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && !isFetchingNextPage && void fetchNextPage(),
      { rootMargin: "1200px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, items.length]);

  // Name of the list: the menu entry it came from, with its group for genres / seasons / rankings
  const group = menus.find((g) => g.items.some((i) => i.path === path));
  const entry = group?.items.find((i) => i.path === path);
  const title = !path
    ? "Thịnh Hành"
    : entry
    ? group && group !== menus[0]
      ? `${group.label}: ${entry.label}`
      : entry.label
    : TYPE_PATHS[type]?.label || "Danh sách anime";

  const quickLinks = menus[0]?.items || [];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4 pb-6 md:py-10 space-y-5 md:space-y-6">
      <AmbientBackdrop src={items[0]?.poster || items[0]?.image} />
      <h1 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">{title}</h1>

      {/* Quick filter: the main anime types */}
      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-2 pt-1">
        <Link
          to="/explore"
          className={buttonVariants({ variant: "unstyled", size: "unstyled", className: cn(PILL, !path ? PILL_ACTIVE : PILL_IDLE) })}
        >
          Thịnh Hành
        </Link>
        {quickLinks.map((item) => (
          <Link
            key={item.path}
            to="/explore"
            search={{ path: item.path }}
            className={buttonVariants({
              variant: "unstyled",
              size: "unstyled",
              className: cn(PILL, item.path === path ? PILL_ACTIVE : PILL_IDLE),
            })}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {loading ? (
        <PosterGridSkeleton count={18} />
      ) : items.length === 0 ? (
        <div className="glass-card rounded-3xl px-6 py-12">
          <p className="text-base font-semibold text-white">
            {isError ? "Không tải được danh sách này." : "Chưa có phim nào trong mục này."}
          </p>
          <p className="mt-1 text-sm text-gray-400">Thử chọn mục khác ở trên hoặc trong menu.</p>
        </div>
      ) : (
        <div className={GRID}>
          {items.map((anime) => (
            // PosterTile skips layout and paint while off screen: long lists stay smooth
            <PosterTile key={anime.slug || anime.title} anime={anime} />
          ))}
        </div>
      )}

      {/* Next page: loads by itself as the sentinel nears the screen */}
      {path && hasNextPage && (
        <div ref={sentinel} className="flex justify-center py-6" aria-live="polite">
          {isFetchingNextPage ? (
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-white" aria-label="Đang tải thêm" />
          ) : (
            <button type="button" onClick={() => void fetchNextPage()} className={cn(PILL, PILL_IDLE)}>
              Tải thêm
            </button>
          )}
        </div>
      )}

      {/* Global Info Modal */}
      <InfoModal />
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <ExploreContent />
    </Suspense>
  );
}
