import { parse } from "@/core/configure"
import { cached, page } from "@/core/source/cached"

/** The home page: carousels, latest, upcoming, this season */
export const Index = () => cached("home", async () => parse("home", await page("/")))
