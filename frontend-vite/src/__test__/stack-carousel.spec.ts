import { episodeNumber, partLabel } from "src/components/home/StackCarousel"
import type { AnimeItem } from "src/types/anime"

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
