import { parse } from "@/core/configure"
import { cached, page } from "@/core/source/cached"

/** The navigation menu, read from the same home page HTML the home shelves use (one request for both) */
export const Menu = () => cached("menu", async () => parse("menu", await page("/")))
