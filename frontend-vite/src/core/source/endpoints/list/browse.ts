import { parse } from "@/core/configure";
import { cached, page } from "@/core/source/cached";
import { BROWSE_PATH } from "@/core/source/endpoints/menu/parse";

/** One page of any list the source menu links to (the paths come from the menu endpoint) */
export async function Browse(path: string, pageNumber = 1) {
  if (!BROWSE_PATH.test(path))
    throw new Error(`Unsupported list path: ${path}`);

  const url =
    pageNumber > 1 && path.endsWith("/")
      ? `${path}trang-${pageNumber}.html`
      : path;

  return cached(`browse ${url}`, async () => {
    const html = await page(url);
    if (path.startsWith("/bang-xep-hang/"))
      return { kind: "ranking" as const, items: await parse("ranking", html) };

    const { items, curPage, maxPage } = await parse(
      "list",
      html,
      Date.now(),
      true,
    );
    return { kind: "list" as const, items, curPage, maxPage };
  });
}
