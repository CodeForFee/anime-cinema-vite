
import React, { Suspense } from "react";
import { Link } from "@/lib/router";
import { useSearchParams } from "@/lib/router";
import { MovieCard } from "../components/movie/MovieCard";
import { InfoModal } from "../components/movie/InfoModal";
import { buttonVariants } from "../components/lightswind/button";
import { PosterGridSkeleton } from "../components/movie/Skeletons";
import { useBrowseQuery, useHomeQuery, useMenuQuery } from "../hooks/useAnimeQuery";
import { cn } from "../lib/utils";

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

const exploreLink = (path: string, page = 1) =>
  `/explore?path=${encodeURIComponent(path)}${page > 1 ? `&page=${page}` : ""}`;

const PILL = "h-9 flex-shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors";
const PILL_IDLE = "border-white/15 bg-white/5 text-gray-300 hover:border-white/40 hover:text-white";
const PILL_ACTIVE = "border-white bg-white text-black";
const GRID = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-8 sm:gap-x-6 sm:gap-y-9";

function ExploreContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "";
  const path = searchParams.get("path") || TYPE_PATHS[type]?.path || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  const { data: menus = [] } = useMenuQuery();
  // No list picked -> the home page's featured titles
  const { data: homeRes, isLoading: isHomeLoading } = useHomeQuery();
  const { data: browseRes, isLoading: isBrowseLoading, isError } = useBrowseQuery(path, page);

  const items = path ? browseRes?.items || [] : homeRes?.featured?.length ? homeRes.featured : homeRes?.latest || [];
  const totalPages = path ? browseRes?.totalPages || 1 : 1;
  const loading = path ? isBrowseLoading : isHomeLoading;

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
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold text-white">{title}</h1>

      {/* Quick filter: the main anime types */}
      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-2 pt-1">
        <Link
          href="/explore"
          className={buttonVariants({ variant: "unstyled", size: "unstyled", className: cn(PILL, !path ? PILL_ACTIVE : PILL_IDLE) })}
        >
          Thịnh Hành
        </Link>
        {quickLinks.map((item) => (
          <Link
            key={item.path}
            href={exploreLink(item.path)}
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
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <p className="text-base font-semibold text-white">
            {isError ? "Không tải được danh sách này." : "Chưa có phim nào trong mục này."}
          </p>
          <p className="mt-1 text-sm text-gray-400">Thử chọn mục khác ở trên hoặc trong menu.</p>
        </div>
      ) : (
        <div className={GRID}>
          {items.map((anime) => (
            <MovieCard key={anime.slug || anime.title} anime={anime} className="w-full" />
          ))}
        </div>
      )}

      {/* Pagination */}
      {path && totalPages > 1 && (
        <nav aria-label="Phân trang" className="flex items-center justify-center gap-3 pt-2">
          {page > 1 ? (
            <Link href={exploreLink(path, page - 1)} className={buttonVariants({ variant: "unstyled", size: "unstyled", className: cn(PILL, PILL_IDLE) })}>
              Trang trước
            </Link>
          ) : (
            <span className={cn(PILL, "inline-flex items-center border-white/10 text-gray-600")}>Trang trước</span>
          )}
          <span className="text-sm tabular-nums text-gray-300">
            Trang {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={exploreLink(path, page + 1)} className={buttonVariants({ variant: "unstyled", size: "unstyled", className: cn(PILL, PILL_IDLE) })}>
              Trang sau
            </Link>
          ) : (
            <span className={cn(PILL, "inline-flex items-center border-white/10 text-gray-600")}>Trang sau</span>
          )}
        </nav>
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
