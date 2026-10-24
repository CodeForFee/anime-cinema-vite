import { expect, test } from "vitest";
import { dayLabel, untilAir } from "@/features/schedule/model/schedule";

test("day headings become chips, today marked", () => {
  const now = new Date(2026, 9, 25, 12);
  expect(dayLabel("Chủ Nhật, Ngày 25 tháng 10", now)).toEqual({
    weekday: "Chủ Nhật",
    short: "CN",
    date: "25/10",
    today: true,
  });
  expect(dayLabel("Thứ Hai, Ngày 3 tháng 11", now)).toMatchObject({ short: "T2", date: "03/11", today: false });
});

test("countdown to the air time", () => {
  const now = 1_000_000_000_000;
  const min = 60_000;
  expect(untilAir(undefined, now)).toBeNull();
  expect(untilAir(now - 1, now)).toBeNull();
  expect(untilAir(now + 5 * min, now)).toBe("Còn 5 phút");
  expect(untilAir(now + 125 * min, now)).toBe("Còn 2 giờ 5 phút");
  expect(untilAir(now + (2 * 1440 + 180) * min, now)).toBe("Còn 2 ngày 3 giờ");
  expect(untilAir(now + 1440 * min, now)).toBe("Còn 1 ngày");
});
