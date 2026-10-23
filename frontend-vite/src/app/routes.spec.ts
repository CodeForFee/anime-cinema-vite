import { navKind } from "@/app/routes"

describe("page change animation", () => {
  test("tab to tab cross-fades, the player comes up from below, other pages slide in", () => {
    expect(navKind("/", "/explore")).toBe("tab")
    expect(navKind("/history", "/favorites")).toBe("tab")
    expect(navKind("/", "/watch")).toBe("up")
    expect(navKind("/explore", "/watch")).toBe("up")
    expect(navKind("/watch", "/search")).toBe("push")
    expect(navKind("/", "/nope")).toBe("push")
  })
})
