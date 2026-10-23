import type { Cheerio } from "cheerio"
import type { Element } from "@/core/source/html/types"

import { getPathName } from "@/core/source/html/getPathName"

export function getInfoAnchor(a: Cheerio<Element>) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const path = getPathName(a.attr("href")!)
  const name = a.text()

  return { path, name }
}
