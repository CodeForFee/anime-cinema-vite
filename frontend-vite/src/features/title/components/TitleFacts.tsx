import type { TitleView } from "@/features/title/hooks/use-title-detail";
import { cn } from "@/shared/lib/utils";

function Fact({ label, value }: { label: string; value: unknown }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-[#777]">{label}: </span>
      <span className="text-white">{String(value)}</span>
    </div>
  );
}

/** Match score, year, length, rating and the synopsis on the left; people, genres and studio on the right */
export function TitleFacts({ t }: { t: TitleView }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-8 items-start">
      <div className="md:col-span-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2.5 text-base">
          <span className="text-[#46d369] font-bold">{t.ratingPercent}</span>
          <span className="text-[#bcbcbc]">{t.releaseYear}</span>
          <span className="text-[#bcbcbc]">{t.duration}</span>
          <span className="px-1.5 rounded-[3px] text-[11px] leading-[18px] font-medium uppercase border border-[#808080] text-[#e5e5e5]">
            {t.quality}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-sm text-white">
          <span className="px-2 leading-6 border border-[#808080]">
            {t.ageCode}
          </span>
          {t.ageNote && <span>{t.ageNote}</span>}
        </div>

        {Boolean(t.meta["Lịch chiếu"]) && (
          <p className="text-lg font-bold text-white pt-2">
            Tập mới ra mắt: {String(t.meta["Lịch chiếu"])}
          </p>
        )}

        <p
          className={cn(
            "text-[15px] text-white leading-relaxed font-normal pt-1",
            !t.isSynopsisOpen && "max-sm:line-clamp-4",
          )}
        >
          {t.synopsis}
        </p>
        {t.synopsis.length > 180 && (
          <button
            type="button"
            onClick={t.toggleSynopsis}
            className="text-sm font-semibold text-white underline-offset-4 hover:underline sm:hidden"
          >
            {t.isSynopsisOpen ? "Thu gọn" : "Xem thêm"}
          </button>
        )}
      </div>

      <div className="md:col-span-4 space-y-3 text-sm leading-relaxed">
        <Fact label="Diễn viên" value={t.shortCharacterNames} />
        <Fact label="Thể loại" value={t.genreNames} />
        <Fact label="Đạo diễn" value={t.meta["Đạo diễn"]} />
        <Fact label="Studio" value={t.meta.Studio} />
        <Fact label="Quốc gia" value={t.meta["Quốc gia"]} />
        <Fact label="Bộ phim này" value="Hóm hỉnh, Hồi hộp, Đầy cảm xúc" />
      </div>
    </div>
  );
}
