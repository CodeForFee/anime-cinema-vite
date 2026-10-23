import type { TitleView } from "@/features/title/hooks/use-title-detail"

function Line({ label, value }: { label: string; value: unknown }) {
  if (!value) return null
  return (
    <div>
      <span>{label}: </span>
      <span className="text-[#a3a3a3]">{String(value)}</span>
    </div>
  )
}

/** "Giới thiệu về …": the full credits at the end of the preview */
export function TitleAbout({ t }: { t: TitleView }) {
  return (
    <div className="space-y-4 pt-6 text-sm text-[#777]">
      <h3 className="text-2xl font-normal text-white">
        Giới thiệu về <span className="font-bold">{t.title}</span>
      </h3>
      <div className="space-y-2 leading-relaxed">
        <Line label="Đạo diễn" value={t.meta["Đạo diễn"]} />
        <Line label="Diễn viên" value={t.characterNames} />
        <Line label="Studio sản xuất" value={t.meta.Studio} />
        <Line label="Thể loại" value={t.genreNames} />
        <Line
          label="Xếp hạng độ tuổi"
          value={`${t.ageRating} - Thích hợp cho khán giả từ 13 tuổi trở lên. Có chứa các yếu tố tình cảm, tâm lý học đường.`}
        />
      </div>
    </div>
  )
}
