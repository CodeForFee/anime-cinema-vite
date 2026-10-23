
import React from "react";
import { CalendarClock, Clapperboard, Flame, Sparkles, Swords, Tv, Zap, type LucideIcon } from "lucide-react";
import { HeroBanner } from "@/features/home/components/HeroBanner";
import { Top10Shelf } from "@/features/home/components/Top10Shelf";
import { MovieShelf } from "@/features/browse/components/MovieShelf";
import { LazyShelf } from "@/features/browse/components/LazyShelf";
import { InfoModal } from "@/features/title/components/InfoModal";
import { useHomeQuery } from "@/core/queries";
import { HomeSkeleton } from "@/shared/ui/skeletons";
import { AnimeItem, HomeDataResponse } from "@/core/types/anime";

interface ShelfConfig {
  key: string;
  title: string;
  icon: LucideIcon;
  seeMoreHref: string;
  /** Which part of the home data this shelf shows */
  items?: (res: HomeDataResponse) => AnimeItem[] | undefined;
  /** Or: a source list this shelf fetches by itself, once it is scrolled near the screen */
  path?: string;
}

// The shelves under the hero, in display order. Add, remove or reorder a shelf here.
const SHELVES: ShelfConfig[] = [
  { key: "latest", title: "Mới Cập Nhật Hôm Nay", icon: Zap, seeMoreHref: "/explore?type=phim-moi", items: (r) => r.latest },
  { key: "upcoming", title: "Anime Sắp Chiếu", icon: CalendarClock, seeMoreHref: "/explore?type=sap-chieu", items: (r) => r.sapChieu || r.upcoming },
  { key: "series", title: "Phim Bộ Đang Hot", icon: Tv, seeMoreHref: "/explore?type=phim-bo", path: "/anime-bo/" },
  { key: "movies", title: "Phim Lẻ Chiếu Rạp", icon: Clapperboard, seeMoreHref: "/explore?type=phim-le", path: "/anime-le/" },
  { key: "chinese", title: "Hoạt Hình 3D Trung Quốc", icon: Swords, seeMoreHref: "/explore?type=hoat-hinh-trung-quoc", path: "/hoat-hinh-trung-quoc/" },
  { key: "featured", title: "Phim Đề Cử Đặc Sắc", icon: Sparkles, seeMoreHref: "/explore", items: (r) => r.featured },
];

export default function HomePage() {
  const { data: res, isLoading } = useHomeQuery();

  if (isLoading) {
    return <HomeSkeleton />;
  }

  const featuredItems = res?.featured || [];
  const topSliderItems = res?.topSlider || [];
  const latestItems = res?.latest || [];

  // Top 10 ranked list (prefers topSlider -> featured -> latest)
  const top10Items =
    topSliderItems.length > 0
      ? topSliderItems
      : featuredItems.length > 0
      ? featuredItems
      : latestItems;

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden pb-16">
      {/* 1. Cinematic Hero Banner (Always at the TOP of the homepage), same list as the recommended shelf */}
      <HeroBanner items={top10Items} />

      {/* 2. Netflix-Style Ranked Cards Shelf (Full recommended list directly under Hero) */}
      {top10Items.length > 0 && (
        <Top10Shelf title="Phim Nổi Bật Đề Cử" icon={Flame} items={top10Items} seeMoreHref="/explore" />
      )}

      {/* 3. Main Shelves / Carousels (MovieShelf renders nothing when its list is empty) */}
      <div className="space-y-2 relative z-20">
        {res &&
          SHELVES.map((shelf) =>
            shelf.path ? (
              <LazyShelf
                key={shelf.key}
                title={shelf.title}
                icon={shelf.icon}
                path={shelf.path}
                seeMoreHref={shelf.seeMoreHref}
              />
            ) : (
              <MovieShelf
                key={shelf.key}
                title={shelf.title}
                icon={shelf.icon}
                items={shelf.items?.(res) || []}
                seeMoreHref={shelf.seeMoreHref}
              />
            )
          )}
      </div>

      {/* Global Anime Detail Modal */}
      <InfoModal />
    </div>
  );
}
