import { navKind } from "@/app/routes"

describe("page change animation", () => {
  test("forward: tab to tab cross-fades, the player comes up from below, other pages slide in", () => {
    expect(navKind("/", "/explore")).toBe("tab")
    expect(navKind("/history", "/favorites")).toBe("tab")
    expect(navKind("/", "/watch")).toBe("up")
    expect(navKind("/explore", "/watch")).toBe("up")
    expect(navKind("/watch", "/search")).toBe("push")
    expect(navKind("/watch", "/nope")).toBe("push")
  })

  test("back: the player goes down, pushed pages slide back out, tabs still cross-fade", () => {
    expect(navKind("/watch", "/", true)).toBe("down")
    expect(navKind("/watch", "/watch-other", true)).toBe("down")
    expect(navKind("/nope", "/watch", true)).toBe("pop")
    expect(navKind("/explore", "/", true)).toBe("tab")
  })
})
