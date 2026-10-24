import { parse } from "@/core/configure";
import { cached, page } from "@/core/source/cached";
import { highResBanner } from "@/core/source/endpoints/detail/banner";

/** The detail page of a title: what the detail parser reads, plus its high-resolution banner. One request. */
export const PhimDetail = (seasonId: string) =>
  cached(`detail ${seasonId}`, async () => {
    const html = await page(`/phim/${seasonId}/`);
    return {
      ...(await parse("detail", html, Date.now())),
      banner: highResBanner(html),
    };
  });
