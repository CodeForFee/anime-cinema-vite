import { describe, expect, test } from "vitest"

import expected from "@/core/source/endpoints/__fixtures__/assets/index.json"

import html from "@/core/source/endpoints/__fixtures__/data/index.txt?raw"

import Index from "@/core/source/endpoints/home/parse"

describe("Index", () => {
  test("normal", async () => {
    const asset = structuredClone(expected) as unknown as Awaited<ReturnType<typeof Index>>
    const result = JSON.parse(JSON.stringify(await Index(html)))

    asset.preRelease.forEach((item, index) => {
      item.time_release = result.preRelease[index].time_release
    })

    expect(result).toEqual(asset)
  })
})
