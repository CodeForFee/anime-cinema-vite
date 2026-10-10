import {
  BRIGHTNESS_MAX,
  BRIGHTNESS_MIN,
  resumePoint,
  swipeLevel,
  swipeSeek,
  tapZone,
  useProgressStore
} from "src/components/player/player-logic"

describe("player gestures", () => {
  test("swipe up over the full height covers the whole range, clamped", () => {
    expect(swipeLevel(0.5, -200, 400, 0, 1)).toBeCloseTo(1)
    expect(swipeLevel(0.5, -800, 400, 0, 1)).toBe(1)
    expect(swipeLevel(0.5, 800, 400, 0, 1)).toBe(0)
    expect(swipeLevel(1, 400, 400, BRIGHTNESS_MIN, BRIGHTNESS_MAX)).toBeCloseTo(BRIGHTNESS_MIN)
  })

  test("horizontal swipe seeks within the episode", () => {
    expect(swipeSeek(100, 200, 400, 1400)).toBe(145)
    expect(swipeSeek(10, -400, 400, 1400)).toBe(0)
    expect(swipeSeek(1390, 400, 400, 1400)).toBe(1400)
  })

  test("tap zones", () => {
    expect(tapZone(10, 100)).toBe(-1)
    expect(tapZone(50, 100)).toBe(0)
    expect(tapZone(90, 100)).toBe(1)
  })
})

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
