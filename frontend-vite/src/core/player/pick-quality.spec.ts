import { expect, test } from "vitest";

import {
  isWeakNetwork,
  pickLevel,
  type QualityLevel,
  shouldSuggestWeak,
  sizedLevels,
} from "./pick-quality";

const hls: QualityLevel[] = [
  { index: 0, label: "Auto", height: 0 },
  { index: 1, label: "1080p", height: 1080 },
  { index: 2, label: "720p", height: 720 },
  { index: 3, label: "360p", height: 360 },
];
// mp4 sources: no automatic level, heights only in the labels
const mp4: QualityLevel[] = [
  { index: 0, label: "360p", height: 0 },
  { index: 1, label: "720p", height: 0 },
];

test("auto picks the player's automatic level, or leaves it when there is none", () => {
  expect(pickLevel(hls, "auto")).toBe(0);
  expect(pickLevel(mp4, "auto")).toBeNull();
});

test("a height picks the tallest level that fits, else the smallest", () => {
  expect(pickLevel(hls, 720)).toBe(2);
  expect(pickLevel(hls, 480)).toBe(3);
  expect(pickLevel(hls, 240)).toBe(3);
  expect(pickLevel(mp4, 1080)).toBe(1);
});

test("data saver caps the automatic choice at 480p", () => {
  expect(pickLevel(hls, "auto", true)).toBe(3);
  expect(pickLevel(hls, 1080, true)).toBe(1); // an explicit choice wins
});

test("levels a viewer can pick are tallest first, without Auto", () => {
  expect(sizedLevels(hls).map((l) => l.label)).toEqual([
    "1080p",
    "720p",
    "360p",
  ]);
});

test("two long stalls within a minute mean a weak network", () => {
  expect(isWeakNetwork([10_000], 20_000)).toBe(false);
  expect(isWeakNetwork([10_000, 50_000], 60_000)).toBe(true);
  expect(isWeakNetwork([10_000, 50_000], 80_000)).toBe(false);
});

test("480p is suggested only to someone on auto above it", () => {
  expect(shouldSuggestWeak(hls, "auto", 1080)).toBe(true);
  expect(shouldSuggestWeak(hls, "auto", 360)).toBe(false);
  expect(shouldSuggestWeak(hls, 720, 720)).toBe(false);
  expect(
    shouldSuggestWeak(
      [{ index: 0, label: "1080p", height: 1080 }],
      "auto",
      1080,
    ),
  ).toBe(false);
});
