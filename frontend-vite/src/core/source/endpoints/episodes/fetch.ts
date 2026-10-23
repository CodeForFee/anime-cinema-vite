import { parse } from "@/core/configure"
import { cached, page } from "@/core/source/cached"

/** The watch page of a title: its episode list (id / play / hash per episode) */
export const PhimIdChap = (season: string) =>
  cached(`episodes ${season}`, async () => parse("episodes", await page(`/phim/${season}/xem-phim.html`)))
