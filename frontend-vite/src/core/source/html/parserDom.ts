// cheerio/slim parses with htmlparser2 only: parse5, the larger standards-exact parser, stays out of the worker
import { load } from "cheerio/slim"

export function parserDom(html: string) {
  return load(html)
}
