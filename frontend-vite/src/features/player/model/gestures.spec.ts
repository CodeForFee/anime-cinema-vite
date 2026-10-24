import {
  BRIGHTNESS_MAX,
  BRIGHTNESS_MIN,
  swipeLevel,
  swipeSeek,
  tapZone,
} from "@/features/player/model/gestures";

describe("player gestures", () => {
  test("swipe up over the full height covers the whole range, clamped", () => {
    expect(swipeLevel(0.5, -200, 400, 0, 1)).toBeCloseTo(1);
    expect(swipeLevel(0.5, -800, 400, 0, 1)).toBe(1);
    expect(swipeLevel(0.5, 800, 400, 0, 1)).toBe(0);
    expect(swipeLevel(1, 400, 400, BRIGHTNESS_MIN, BRIGHTNESS_MAX)).toBeCloseTo(
      BRIGHTNESS_MIN,
    );
  });

  test("horizontal swipe seeks within the episode", () => {
    expect(swipeSeek(100, 200, 400, 1400)).toBe(145);
    expect(swipeSeek(10, -400, 400, 1400)).toBe(0);
    expect(swipeSeek(1390, 400, 400, 1400)).toBe(1400);
  });

  test("tap zones", () => {
    expect(tapZone(10, 100)).toBe(-1);
    expect(tapZone(50, 100)).toBe(0);
    expect(tapZone(90, 100)).toBe(1);
  });
});
