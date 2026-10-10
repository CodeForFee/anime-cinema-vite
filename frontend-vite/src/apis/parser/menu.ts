import { getPathName } from "./__helpers__/getPathName"
import { parserDom } from "./__helpers__/parserDom"

// Lists src/apis/runs/browse.ts knows how to read
export const BROWSE_PATH =
  /^\/(?:the-loai\/[\w-]+|season\/(?:winter|spring|summer|autumn)\/\d{4}|anime-bo|anime-le|hoat-hinh-trung-quoc|anime-sap-chieu|danh-sach\/[\w-]+)\/$|^\/bang-xep-hang\/(?:day|voted|month|season|year)\.html$/

/** Navigation menu of the source site: one group per dropdown. */
export default function Menu(html: string) {
  const $ = parserDom(html)

  return $("nav.Menu ul.sub-menu")
    .map((_i, ul) => {
      const $ul = $(ul)
      const label = $ul.prev("a").text().trim()

      return {
        label:
          label === label.toUpperCase()
            ? label.toLowerCase().replace(/(^|\s)(\S)/g, (_all, sp, ch) => sp + ch.toUpperCase())
            : label,
        items: $ul
          .find("a")
          .map((_i, a) => ({
            label: $(a).text().trim(),
            path: getPathName($(a).attr("href") ?? "")
          }))
          .toArray()
          .filter((item) => BROWSE_PATH.test(item.path))
      }
    })
    .toArray()
    .filter((group) => group.items.length > 0)
}
