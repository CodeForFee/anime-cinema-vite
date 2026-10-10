import { handleBack, onBack } from "src/logic/back"

describe("android back button", () => {
  test("an open layer closes first, newest first", () => {
    const off = onBack(() => {})
    expect(handleBack(10_000, 0, true)).toBe("layer")
    off()
    expect(handleBack(10_000, 0, true)).not.toBe("layer")
  })

  test("pages go back, home needs a second press within 2 s", () => {
    expect(handleBack(10_000, 0, false)).toBe("page")
    expect(handleBack(10_000, 0, true)).toBe("arm")
    expect(handleBack(11_500, 10_000, true)).toBe("exit")
    expect(handleBack(13_000, 10_000, true)).toBe("arm")
  })
})
