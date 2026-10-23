import { coverflow, episodeNumber, loopOffset, partLabel } from "@/features/home/model/coverflow"
import type { AnimeItem } from "@/core/types/anime"

const item = (title: string, extra: Record<string, unknown> = {}) => ({ slug: "x", title, ...extra }) as AnimeItem

describe("ranked card labels", () => {
  test("part from the title, the metadata, or nothing", () => {
    expect(partLabel(item("Black Clover 2nd Season"))).toBeNull()
    expect(partLabel(item("Re:Zero Season 4"))).toBe("Phần 4")
    expect(partLabel(item("Overlord Phần III"))).toBe("Phần III")
    expect(partLabel(item("Frieren", { metadata: { Season: "2" } }))).toBe("Phần 2")
    expect(partLabel(item("Frieren", { metadata: { Season: "1" } }))).toBeNull()
    expect(partLabel(item("Conan"))).toBeNull()
  })

  test("episode number without the TẬP prefix", () => {
    expect(episodeNumber(item("a", { episode: "TẬP 02" }))).toBe("02")
    expect(episodeNumber(item("a"))).toBe("")
  })
})

describe("looping stack", () => {
  test("neighbours wrap around the ends", () => {
    expect(loopOffset(9, 0, 10)).toBe(-1)
    expect(loopOffset(1, 0, 10)).toBe(1)
    expect(loopOffset(0, 9, 10)).toBe(1)
    expect(loopOffset(5, 0, 10)).toBe(5)
    expect(loopOffset(6, 0, 10)).toBe(-4)
    expect(loopOffset(3, 3, 10)).toBe(0)
  })

  test("cover flow: the middle faces front, neighbours turn inward symmetrically, mid-swipe in between", () => {
    expect(coverflow(0)).toBe("translate3d(calc(-50% + 0%), 0, 0px) rotateY(0deg)")
    expect(coverflow(1)).toContain("rotateY(-48deg)")
    expect(coverflow(-1)).toContain("rotateY(48deg)")
    expect(coverflow(2)).toContain("rotateY(-48deg)")
    expect(coverflow(0.5)).toContain("rotateY(-24deg)")
  })
})
