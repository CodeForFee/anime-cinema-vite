import { isVietnamese, normalizeTitle, pickMatch, splitNames } from "src/logic/hd-art"

const media = (romaji: string, year: number, english?: string) => ({
  title: { romaji, english },
  seasonYear: year,
  coverImage: { extraLarge: `cover-${romaji}-${year}` }
})

describe("sharp covers from AniList", () => {
  test("only an exact title from the right year is taken", () => {
    const results = [media("Black Clover", 2017), media("Black Clover Season 2", 2026), media("Shuiro no Kamen", 2026)]
    expect(pickMatch(["Black Clover 2nd Season"], 2026, results)?.coverImage?.extraLarge).toBe("cover-Black Clover Season 2-2026")
    expect(pickMatch(["Black Clover"], 2026, results)).toBeUndefined()
    expect(pickMatch(["Black Clover"], undefined, results)?.seasonYear).toBe(2017)
    expect(pickMatch(["Firefly Wedding"], 2026, [media("Hotaru no Yomeiri", 2026, "Firefly Wedding")])).toBeDefined()
    expect(pickMatch(["Shuiro"], 2026, results)).toBeUndefined()
  })

  test("names", () => {
    expect(normalizeTitle("Re:Zero kara Hajimeru Isekai Seikatsu 4th Season")).toBe("re zero kara hajimeru isekai seikatsu season 4")
    expect(splitNames("Hotaru no Yomeiri, Firefly Wedding")).toEqual(["Hotaru no Yomeiri", "Firefly Wedding"])
    expect(isVietnamese("Đám Cưới Đom Đóm")).toBe(true)
    expect(isVietnamese("Võ Thần Chúa Tể")).toBe(true)
    expect(isVietnamese("Kōkaku Kidōtai")).toBe(false)
    expect(isVietnamese("Shuiro no Kamen")).toBe(false)
  })
})
