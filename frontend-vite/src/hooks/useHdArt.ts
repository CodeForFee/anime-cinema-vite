import { useEffect, useSyncExternalStore } from "react"
import { PhimDetail } from "src/apis/runs/phim/detail"
import { type Art, artFor, requestArt, splitNames, subscribeArt } from "src/logic/hd-art"

/** What any card, history entry or detail knows about a title */
export type Titled = {
  slug?: string
  title?: string
  subTitle?: string
  originalTitle?: string
  year?: string | number
  poster?: string
}

/** AniList artwork for a title once found (logic/hd-art.ts); asks for it the first time the title is drawn */
export function useHdArt(item?: Titled): Art | undefined {
  const key = item?.slug || item?.poster || ""
  const art = useSyncExternalStore(subscribeArt, () => (key ? artFor(key) : undefined))

  const slug = item?.slug
  const title = item?.title ?? ""
  const others = `${item?.subTitle ?? ""},${item?.originalTitle ?? ""}`
  const year = Number.parseInt(String(item?.year ?? ""), 10)
  useEffect(() => {
    if (!key || !title) return
    requestArt({
      key,
      names: [title, ...splitNames(others)],
      year: Number.isFinite(year) ? year : undefined,
      // a Vietnamese title: the detail page has the original ones
      moreNames: slug ? async () => splitNames((await PhimDetail(slug)).othername) : undefined
    })
  }, [key, slug, title, others, year])

  return art
}
