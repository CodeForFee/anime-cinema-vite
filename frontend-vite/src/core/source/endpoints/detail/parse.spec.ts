import { describe, expect, test } from "vitest";

import expected from "@/core/source/endpoints/__fixtures__/assets/tonikaku-kawaii-a3860.json";

import html from "@/core/source/endpoints/__fixtures__/data/phim/tonikaku-kawaii-a3860.txt?raw";

import PhimId from "@/core/source/endpoints/detail/parse";

describe("[id]", () => {
  test("normal", async () => {
    const asset = structuredClone(expected) as unknown as Awaited<
      ReturnType<typeof PhimId>
    >;
    const result = JSON.parse(JSON.stringify(await PhimId(html, 0)));

    asset.toPut.forEach((item, index) => {
      item.time_release = result.toPut[index].time_release;
    });

    expect(result).toEqual(asset);
  });
});
