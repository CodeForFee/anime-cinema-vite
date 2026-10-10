import type PhimIdParser from "src/apis/parser/phim/[id]"
import { highResBanner } from "src/apis/parser/phim/banner"
import { useCache } from "src/apis/useCache"
import Worker from "src/apis/workers/phim/[id]?worker"
import { PostWorker } from "src/apis/wrap-worker"
import { get } from "src/logic/http"

/** The detail page of a title: what PhimId() parses, plus its high-resolution banner. One request. */
export async function PhimDetail(seasonId: string) {
  return await useCache(`/phim/${seasonId}#detail`, async () => {
    const { data: html } = await get(`/phim/${seasonId}/`)

    return {
      ...(await PostWorker<typeof PhimIdParser>(Worker, html, Date.now())),
      banner: highResBanner(html)
    }
  })
}
