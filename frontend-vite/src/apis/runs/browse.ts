import type TypeNormalValueParser from "src/apis/parser/[type_normal]/[value]"
import type BangXepHangTypeParser from "src/apis/parser/bang-xep-hang/[type]"
import { BROWSE_PATH } from "src/apis/parser/menu"
import { useCache } from "src/apis/useCache"
import ListWorker from "src/apis/workers/[type_normal]/[value]?worker"
import RankWorker from "src/apis/workers/bang-xep-hang/[type]?worker"
import { PostWorker } from "src/apis/wrap-worker"
import { get } from "src/logic/http"

type ListPage = Pick<ReturnType<typeof TypeNormalValueParser>, "items" | "curPage" | "maxPage">

/** One page of any list the source menu links to (the path comes from src/apis/runs/menu.ts). */
export async function Browse(path: string, page = 1) {
  if (!BROWSE_PATH.test(path)) throw new Error(`Unsupported list path: ${path}`)

  const url = page > 1 && path.endsWith("/") ? `${path}trang-${page}.html` : path

  return await useCache(url, async () => {
    const { data: html } = await get(url)

    if (path.startsWith("/bang-xep-hang/"))
      return { kind: "ranking" as const, items: await PostWorker<typeof BangXepHangTypeParser>(RankWorker, html) }

    const list: ListPage = await PostWorker<typeof TypeNormalValueParser>(ListWorker, html, Date.now(), true)
    return { kind: "list" as const, ...list }
  })
}
