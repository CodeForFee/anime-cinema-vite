// How the schedule page reads the source's day headings and air moments.

const SHORT: Record<string, string> = {
  "thứ hai": "T2",
  "thứ ba": "T3",
  "thứ tư": "T4",
  "thứ năm": "T5",
  "thứ sáu": "T6",
  "thứ bảy": "T7",
  "chủ nhật": "CN",
};

/** "Chủ Nhật, Ngày 25 tháng 10" -> { weekday: "Chủ Nhật", short: "CN", date: "25/10", today } */
export function dayLabel(heading: string, now = new Date()) {
  const [, weekday = heading, d, m] =
    heading.match(/^\s*([^,]+),\s*Ngày\s*(\d+)\s*tháng\s*(\d+)/i) ?? [];
  const date = d && m ? `${d.padStart(2, "0")}/${m.padStart(2, "0")}` : "";
  return {
    weekday: weekday.trim(),
    short: SHORT[weekday.trim().toLowerCase()] ?? weekday.trim().slice(0, 3),
    date,
    today: Number(d) === now.getDate() && Number(m) === now.getMonth() + 1,
  };
}

/** Time left until `at`: "Còn 4 giờ 12 phút", "Còn 2 ngày 3 giờ", or null once it has aired / is unknown */
export function untilAir(at: number | undefined, now = Date.now()): string | null {
  if (at === undefined || at <= now) return null;
  const minutes = Math.ceil((at - now) / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `Còn ${days} ngày${hours ? ` ${hours} giờ` : ""}`;
  if (hours > 0) return `Còn ${hours} giờ ${minutes % 60} phút`;
  return `Còn ${minutes} phút`;
}
