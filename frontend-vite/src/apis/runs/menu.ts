import { useCache } from "src/apis/useCache"
import Worker from "src/apis/workers/menu?worker"
import { get } from "src/logic/http"

import type MenuParser from "../parser/menu"
import { PostWorker } from "../wrap-worker"

export async function Menu() {
  return await useCache("/#menu", async () => {
    const { data: html } = await get("/")

    return PostWorker<typeof MenuParser>(Worker, html)
  })
}
