import { Play } from "lucide-react"

import { formatEpisodeName } from "@/core/format"
import type { Episode } from "@/core/types/anime"
import type { TitleView } from "@/features/title/hooks/use-title-detail"
import { PickerDropdown } from "@/shared/ui/PickerDropdown"
import { EpisodeRowsSkeleton } from "@/shared/ui/skeletons"

/** "Tập 12: Tên tập", without repeating "Tập 12: Tập 12" when the source title is only the number */
function episodeLabel(ep: Episode) {
  const formatted = formatEpisodeName(ep.name)
  if (!ep.title || ep.title.trim() === ep.name.trim() || ep.title.toLowerCase() === formatted.toLowerCase()) return formatted
  const own = ep.title.replace(/^xem phim\s+/i, "").replace(/^tập\s+\d+[:\s-]*/i, "").trim()
  return own && own !== ep.name ? `${formatted}: ${own}` : formatted
}

/** The episode list with part and range pickers; a tap plays the episode */
export function TitleEpisodes({ t }: { t: TitleView }) {
  if (t.isDetailLoading)
    return (
      <div className="pt-6">
        <h3 className="text-2xl font-bold text-white">Tập</h3>
        <EpisodeRowsSkeleton count={3} />
      </div>
    )
  if (t.episodes.length === 0 && t.seasons.length <= 1) return null

  return (
    <div className="pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-2xl font-bold text-white">Tập</h3>

        <div className="flex flex-wrap items-center gap-2">
          {t.episodeChunks.length > 1 && (
            <PickerDropdown
              label={t.episodeChunks[t.chunkIndex]?.rangeLabel || "Chọn tập"}
              selectedKey={String(t.chunkIndex)}
              onSelect={(key) => t.setChunkIndex(Number(key) || 0)}
              options={t.episodeChunks.map((chunk, index) => ({ key: String(index), label: chunk.rangeLabel }))}
            />
          )}
          {t.seasons.length > 1 && (
            <PickerDropdown
              label={t.activeSeason?.partLabel || "Chọn phần"}
              selectedKey={t.activeSlug}
              onSelect={t.pickSeason}
              options={t.seasons.map((s) => ({ key: s.slug, label: s.partLabel || s.title, hint: s.title }))}
            />
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white">
        {t.activeSeason && <span className="font-bold">{t.activeSeason.partLabel}:</span>}
        <span className="px-1.5 leading-5 border border-[#808080]">{t.ageCode}</span>
        <span className="text-[#bcbcbc]">{t.episodeStatus}</span>
      </div>

      {t.isSeasonLoading ? (
        <EpisodeRowsSkeleton />
      ) : t.episodes.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#a3a3a3]">Phần này chưa có tập nào.</p>
      ) : (
        <div className="mt-3">
          {t.shownEpisodes.map((ep, index) => {
            const number = t.firstShownNumber + index
            const label = episodeLabel(ep)
            return (
              <button
                type="button"
                key={ep.id || number}
                onClick={() => t.play(ep.name)}
                className="group flex w-full items-center gap-3 sm:gap-5 px-0 sm:px-6 py-3.5 sm:py-5 border-b border-[#404040] rounded-[4px] text-left hover:bg-[#333] transition-colors cursor-pointer"
              >
                <span className="w-8 flex-shrink-0 text-center text-xl sm:text-2xl text-[#d2d2d2] max-sm:hidden">{number}</span>

                <div className="relative w-28 sm:w-36 aspect-video rounded-[4px] overflow-hidden flex-shrink-0 bg-black/60">
                  <img
                    src={t.episodeThumb}
                    alt={label}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = t.poster
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-black/60 border border-white flex items-center justify-center">
                      <Play className="fill-current w-4 h-4 text-white ml-0.5" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <h4 className="text-base font-bold text-white truncate">{label}</h4>
                    <span className="text-base text-white flex-shrink-0">24 ph</span>
                  </div>
                  <p className="text-sm text-[#d2d2d2] leading-snug line-clamp-3 mt-1.5 max-sm:hidden">
                    Xem tập {ep.name} phụ đề VietSub chất lượng cao Full HD.
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
