const abs = (url = "") => (url.startsWith("//") ? "https:" + url : url)

/**
 * Sharpest wide image of a title, read from its detail page. Same order of preference as
 * getAnimeDetails() in backend-hono/src/scraper.ts: big_banner, the TPostBg image, the gallery,
 * the small banner, the TPostBg background style. "" when the page has none of them.
 */
export function highResBanner(html: string): string {
  const big = html.match(/https?:\/\/cdn\.animevietsub\.\w+\/data\/big_banner\/[^"'\s)]+/i)?.[0]
  if (big) return big

  const bgImage = html.match(/<img[^>]+class=["'][^"']*TPostBg[^"']*["'][^>]+src=["']([^"']+)["']/i)?.[1]
  if (bgImage) return abs(bgImage)

  const galleryHtml =
    html.match(/id=["']MvTb-Image["'][\s\S]*?(?:<\/div>\s*<\/div>|<div\s+class=["']TPostBg["'])/i)?.[0] ?? ""
  const gallery = [...galleryHtml.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => abs(m[1]))
  if (gallery.length > 0) return gallery.find((src) => src.includes("big_banner")) ?? gallery[0]

  const banner = html.match(/https?:\/\/cdn\.animevietsub\.\w+\/data\/banner\/[^"'\s)]+/i)?.[0]
  if (banner) return banner

  return abs(html.match(/class=["']TPostBg["'][^>]*style=["'][^"']*url\(["']?([^"')]+)["']?\)/)?.[1])
}
