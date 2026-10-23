import { episodeNumberOf, searchNames, toSkipTimes } from "@/core/player/skip-times"

describe("skip times", () => {
  test("other names come first, the Vietnamese title last", () => {
    expect(searchNames("Thám Tử Lừng Danh Conan", "Detective Conan, Meitantei Conan")).toEqual([
      "Detective Conan",
      "Meitantei Conan",
      "Thám Tử Lừng Danh Conan"
    ])
    expect(searchNames("Shuiro no Kamen")).toEqual(["Shuiro no Kamen"])
  })

  test("AniSkip answer -> op/ed ranges", () => {
    const times = toSkipTimes([
      { interval: { startTime: 3.2, endTime: 93.2 }, skipType: "op" },
      { interval: { startTime: 1417, endTime: 1507 }, skipType: "mixed-ed" },
      { interval: { startTime: 0, endTime: 10 }, skipType: "recap" }
    ])
    expect(times).toEqual({ op: [3.2, 93.2], ed: [1417, 1507] })
  })

  test("episode numbers", () => {
    expect(episodeNumberOf("01")).toBe(1)
    expect(episodeNumberOf("13.5")).toBe(13.5)
    expect(episodeNumberOf("Tập 1216")).toBe(1216)
    expect(episodeNumberOf("Full")).toBeNull()
  })
})
