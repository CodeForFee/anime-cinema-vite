import { LazyImage } from "@/features/title/components/LazyImage"
import type { TitleView } from "@/features/title/hooks/use-title-detail"

/** "Nội dung tương tự": up to six related titles; a tap opens that title's preview in place */
export function TitleRelated({ t }: { t: TitleView }) {
  if (t.related.length === 0) return null

  return (
    <div className="space-y-4 pt-6">
      <h3 className="text-2xl font-bold text-white">Nội dung tương tự</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {t.related.slice(0, 6).map((item, index) => (
          <button
            type="button"
            key={item.slug || index}
            onClick={() => t.openRelated(item)}
            className="group rounded-[4px] overflow-hidden bg-[#2f2f2f] hover:bg-[#383838] transition-colors cursor-pointer flex flex-col text-left"
          >
            <div className="relative aspect-video w-full bg-black/40 overflow-hidden">
              <LazyImage
                art={item}
                src={item.image || item.poster || t.poster}
                alt={item.title}
                className="w-full h-full object-cover"
                fallbackSrc={t.poster}
              />
              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-[2px] bg-black/75 text-white text-[10px] font-bold">
                {item.latestEpisode || item.episode || "HD"}
              </div>
            </div>

            <div className="p-2.5 sm:p-4 space-y-2 sm:space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#46d369]">97% Phù hợp</span>
                  <span className="px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold border border-gray-500 text-gray-300">
                    {item.quality || "HD"}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-primaryRed transition-colors line-clamp-1">{item.title}</h4>
              </div>
              <p className="text-xs text-[#d2d2d2] line-clamp-3 leading-relaxed max-sm:hidden">
                {item.synopsis || "Khám phá bộ anime hấp dẫn với chất lượng hình ảnh sắc nét và nội dung lôi cuốn."}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
