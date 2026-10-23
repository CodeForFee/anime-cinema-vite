import { resumePoint, useProgressStore } from "@/core/player/progress"

describe("resume", () => {
  test("only between the first seconds and the credits", () => {
    expect(resumePoint(undefined)).toBeNull()
    expect(resumePoint({ t: 5, d: 1400 })).toBeNull()
    expect(resumePoint({ t: 1380, d: 1400 })).toBeNull()
    expect(resumePoint({ t: 754, d: 1400 })).toBe(754)
    expect(resumePoint({ t: 754, d: 0 })).toBe(754)
  })

  test("progress store keeps the newest entries", () => {
    const { save } = useProgressStore.getState()
    save("a:1", 100, 1400)
    save("a:1", 120, 1400)
    expect(useProgressStore.getState().entries["a:1"].t).toBe(120)
    for (let i = 0; i < 510; i++) save(`b:${i}`, i, 1400)
    const keys = Object.keys(useProgressStore.getState().entries)
    expect(keys.length).toBe(500)
    expect(keys).toContain("b:509")
    expect(keys).not.toContain("a:1")
  })
})
