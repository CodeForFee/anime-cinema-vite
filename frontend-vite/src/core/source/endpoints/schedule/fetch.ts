import { parse } from "@/core/configure";
import { cached, page } from "@/core/source/cached";

/** The airing schedule, a week of days */
export const Schedule = () =>
  cached("schedule", async () => parse("schedule", await page("/lich-chieu-phim.html")));
