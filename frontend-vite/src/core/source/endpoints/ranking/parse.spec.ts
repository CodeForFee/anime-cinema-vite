import { describe, expect, test } from "vitest"

import expected from "@/core/source/endpoints/__fixtures__/assets/bang-xep-hang.json"
import html from "@/core/source/endpoints/__fixtures__/data/bang-xep-hang.txt?raw"
import BangXepHangType from "@/core/source/endpoints/ranking/parse"

describe("bang-xep-hang", () => {
  test("normal", async () => {
    const result = JSON.parse(JSON.stringify(await BangXepHangType(html)))

    expect(result).toEqual(expected)
  })
})
