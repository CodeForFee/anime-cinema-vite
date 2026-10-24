import { getInfoTPost } from "@/core/source/html/getInfoTPost";
import { parserDom } from "@/core/source/html/parserDom";

/** /lich-chieu-phim.html: one block per weekday, "Chủ Nhật, Ngày 25 tháng 10", with the titles airing that day */
export default function Schedule(html: string) {
  const $ = parserDom(html);
  const now = Date.now();

  return $("section.Homeschedule")
    .map((_i, section) => ({
      day: $(section).find(".Top h1").text().trim(),
      items: $(section)
        .find(".TPostMv")
        .map((_j, item) => ({
          ...getInfoTPost($(item), now),
          // "15 giờ 30 phút" -> "15:30"
          airTime: $(item)
            .find(".Image .b")
            .text()
            .replace(/(\d+)\s*giờ\s*(\d+)\s*phút/i, (_m, h, m) => `${h.padStart(2, "0")}:${m}`)
            .trim(),
        }))
        .toArray(),
    }))
    .toArray()
    .filter((day) => day.day);
}
