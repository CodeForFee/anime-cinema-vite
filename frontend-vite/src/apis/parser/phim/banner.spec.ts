import { describe, expect, test } from "vitest"

import { highResBanner } from "./banner"

const big = "https://cdn.animevietsub.sale/data/big_banner/2026/a.jpg"
const small = "https://cdn.animevietsub.sale/data/banner/2026/a.jpg"

describe("highResBanner", () => {
  test("prefers big_banner over everything else", () => {
    expect(highResBanner(`<img class="TPostBg" src="//x/bg.jpg"><a href="${small}"></a><i data-x="${big}"></i>`)).toBe(big)
  })
  test("falls back to the TPostBg image, then the gallery, then the small banner", () => {
    expect(highResBanner(`<img class="TPostBg lazy" src="//x/bg.jpg"><a href="${small}"></a>`)).toBe("https://x/bg.jpg")
    expect(highResBanner(`<div id="MvTb-Image"><img src="//x/g1.jpg"><img src="//x/g2.jpg"></div></div>`)).toBe(
      "https://x/g1.jpg"
    )
    expect(highResBanner(`<a href="${small}"></a>`)).toBe(small)
  })
  test("reads the TPostBg background style last, and returns an empty string when nothing is there", () => {
    expect(highResBanner(`<div class="TPostBg" style="background-image: url('//x/style.jpg')"></div>`)).toBe(
      "https://x/style.jpg"
    )
    expect(highResBanner("<p>no images</p>")).toBe("")
  })
})
