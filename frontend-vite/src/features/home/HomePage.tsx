import { CalendarClock, Clapperboard, type LucideIcon, Sparkles, Swords, Tv, Zap } from "lucide-react"
import { lazy, Suspense } from "react"

import { useHomeQuery } from "@/core/queries"
import type { AnimeItem, HomeDataResponse } from "@/core/types/anime"
import { type ExploreSearch, LazyShelf, MovieShelf } from "@/features/browse"
import { InfoModal } from "@/features/title"
import { useFormFactor } from "@/shared/lib/form-factor"
import { HomeSkeleton } from "@/shared/ui/skeletons"

// the hero and the ranked list differ by form factor: each form loads only its own chunk
const MobileTop = lazy(() => import("@/features/home/mobile/HomeTop"))
const DesktopTop = lazy(() => import("@/features/home/desktop/HomeTop"))

interface ShelfConfig {
  key: string
  title: string
  icon: LucideIcon
  seeMore: ExploreSearch
  /** Which part of the home data this shelf shows */
  items?: (res: HomeDataResponse) => AnimeItem[] | undefined
  /** Or: a source list this shelf fetches by itself, once it is scrolled near the screen */
  path?: string
}

// The shelves under the hero, in display order. Add, remove or reorder a shelf here.
const SHELVES: ShelfConfig[] = [
  { key: "latest", title: "Mới Cập Nhật Hôm Nay", icon: Zap, seeMore: { type: "phim-moi" }, items: (r) => r.latest },
  { key: "upcoming", title: "Anime Sắp Chiếu", icon: CalendarClock, seeMore: { type: "sap-chieu" }, items: (r) => r.sapChieu || r.upcoming },
  { key: "series", title: "Phim Bộ Đang Hot", icon: Tv, seeMore: { type: "phim-bo" }, path: "/anime-bo/" },
  { key: "movies", title: "Phim Lẻ Chiếu Rạp", icon: Clapperboard, seeMore: { type: "phim-le" }, path: "/anime-le/" },
  { key: "chinese", title: "Hoạt Hình 3D Trung Quốc", icon: Swords, seeMore: { type: "hoat-hinh-trung-quoc" }, path: "/hoat-hinh-trung-quoc/" },
  { key: "featured", title: "Phim Đề Cử Đặc Sắc", icon: Sparkles, seeMore: {}, items: (r) => r.featured }
]

export default function HomePage() {
  const { data: res, isLoading } = useHomeQuery()
  const formFactor = useFormFactor()

  if (isLoading) return <HomeSkeleton />

  // the ranked list: this season, else the featured titles, else the latest
  const ranked = [res?.topSlider, res?.featured, res?.latest].find((list) => list && list.length > 0) ?? []
  const Top = formFactor === "mobile" ? MobileTop : DesktopTop

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden pb-16">
      <Suspense fallback={<div className="h-[520px]" />}>
        <Top ranked={ranked} />
      </Suspense>

      {/* MovieShelf renders nothing when its list is empty */}
      <div className="space-y-2 relative z-20">
        {res &&
          SHELVES.map((shelf) =>
            shelf.path ? (
              <LazyShelf key={shelf.key} title={shelf.title} icon={shelf.icon} path={shelf.path} seeMore={shelf.seeMore} />
            ) : (
              <MovieShelf key={shelf.key} title={shelf.title} icon={shelf.icon} items={shelf.items?.(res) || []} seeMore={shelf.seeMore} />
            )
          )}
      </div>

      <InfoModal />
    </div>
  )
}
