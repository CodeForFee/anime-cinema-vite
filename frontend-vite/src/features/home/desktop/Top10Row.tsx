import { ChevronLeft, ChevronRight, Play } from "lucide-react"
import { useRef } from "react"

import type { AnimeItem } from "@/core/types/anime"
import { episodeNumber, partLabel } from "@/features/home/model/coverflow"
import { LazyImage, useUIStore } from "@/features/title"

// Each pair of cards forms a V: the top edge of even cards slopes down, of odd ones up (soft rounded corners)
const SLOPE_DOWN = "url(#rank-card-slope-down)"
const SLOPE_UP = "url(#rank-card-slope-up)"
const ARROW =
  "absolute top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/80 text-white shadow-2xl opacity-0 transition-[opacity,background-color] duration-300 hover:bg-primaryRed group-hover/top10:opacity-100"
const GOLD = "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)"
const GLASS = "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.06) 100%)"

/** Desktop: the ranked list as a row of slanted cards with big golden numbers, scrolled by the arrows or the wheel */
export function Top10Row({ items }: { items: AnimeItem[] }) {
  const rowRef = useRef<HTMLDivElement>(null)
  const openInfoModal = useUIStore((state) => state.openInfoModal)
  const scroll = (direction: -1 | 1) => rowRef.current?.scrollBy({ left: direction * 550, behavior: "smooth" })

  return (
    <div className="relative px-4 md:px-12">
      <svg width="0" height="0" className="pointer-events-none absolute" aria-hidden="true">
        <defs>
          <clipPath id="rank-card-slope-down" clipPathUnits="objectBoundingBox">
            <path d="M 0,0.05 C 0,0.015 0.03,0 0.07,0.003 L 0.93,0.05 C 0.98,0.055 1,0.065 1,0.1 L 1,0.95 C 1,0.985 0.97,1 0.93,1 L 0.07,1 C 0.03,1 0,0.985 0,0.95 Z" />
          </clipPath>
          <clipPath id="rank-card-slope-up" clipPathUnits="objectBoundingBox">
            <path d="M 0,0.1 C 0,0.065 0.02,0.055 0.07,0.05 L 0.93,0.003 C 0.97,0 1,0.015 1,0.05 L 1,0.95 C 1,0.985 0.97,1 0.93,1 L 0.07,1 C 0.03,1 0,0.985 0,0.95 Z" />
          </clipPath>
        </defs>
      </svg>

      <button type="button" aria-label="Cuộn trái" title="Cuộn trái" onClick={() => scroll(-1)} className={`${ARROW} left-2`}>
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div ref={rowRef} className="scroll-fade-x no-scrollbar flex items-start gap-4 overflow-x-auto scroll-smooth py-4 md:gap-5">
        {items.map((anime, index) => {
          const episode = episodeNumber(anime)
          const part = partLabel(anime)
          const clip = index % 2 === 1 ? SLOPE_UP : SLOPE_DOWN
          return (
            <button
              type="button"
              key={anime.slug || index}
              onClick={() => openInfoModal(anime)}
              aria-label={anime.title}
              className="group relative flex w-48 flex-shrink-0 cursor-pointer flex-col text-left transition-transform duration-300 hover:-translate-y-2 sm:w-52 md:w-60"
            >
              {/* the gold edge of the first card and of the one under the pointer is the outer box, the poster sits inside */}
              <div className="relative aspect-[283/400] w-full p-[2.5px]" style={{ clipPath: clip, background: index === 0 ? GOLD : GLASS }}>
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: GOLD }}
                />
                <div className="relative h-full w-full overflow-hidden bg-[#141414]" style={{ clipPath: clip }}>
                  <LazyImage
                    art={anime}
                    src={anime.poster || anime.image || ""}
                    alt=""
                    className="h-full w-full object-cover object-center transition-[transform,opacity] duration-500 group-hover:scale-105"
                  />
                  <span aria-hidden className="glass-rim absolute inset-0 z-[5]" />

                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primaryRed text-white shadow-xl shadow-red-600/50 transition-transform group-hover:scale-110">
                      <Play className="ml-0.5 h-5 w-5 fill-current" />
                    </div>
                  </div>

                  <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1.5">
                    <span className="rounded border border-white/15 bg-[#202020]/95 px-2 py-0.5 text-[10px] font-bold text-gray-200 shadow-sm">
                      PĐ. {episode || "Full"}
                    </span>
                    <span className="rounded border border-emerald-400/30 bg-emerald-600/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      TM. {episode || "HD"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 px-1 pt-3">
                <span className="select-none text-4xl font-black italic leading-none tracking-tighter text-amber-400 drop-shadow-[0_2px_12px_rgba(251,191,36,0.6)] sm:text-5xl md:text-6xl">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h4 className="line-clamp-1 text-xs font-bold leading-snug text-white drop-shadow transition-colors group-hover:text-amber-400 sm:text-sm">
                    {anime.title}
                  </h4>
                  {anime.subTitle && anime.subTitle !== anime.title && (
                    <p className="line-clamp-1 text-[10px] italic text-gray-400 sm:text-xs">{anime.subTitle}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                    {part && (
                      <>
                        <span className="text-gray-300">{part}</span>
                        <span aria-hidden>•</span>
                      </>
                    )}
                    <span className="font-bold text-primaryRed">{episode ? `Tập ${episode}` : "Tập mới"}</span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <button type="button" aria-label="Cuộn phải" title="Cuộn phải" onClick={() => scroll(1)} className={`${ARROW} right-2`}>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
