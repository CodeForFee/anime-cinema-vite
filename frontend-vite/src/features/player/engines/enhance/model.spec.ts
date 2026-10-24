import { expect, test } from "vitest";
import {
  around,
  canvasSize,
  contentRect,
  easuScale,
  FrameBudget,
  gradePixel,
  impulseResponse,
  needsEasu,
  rcasSharpness,
} from "@/features/player/engines/enhance/model";

test("picture rect inside the box, letterboxed or pillarboxed", () => {
  expect(contentRect(1600, 900, 1280, 720)).toEqual({ x: 0, y: 0, width: 1600, height: 900 });
  expect(contentRect(1000, 1000, 1280, 720)).toEqual({ x: 0, y: 218.75, width: 1000, height: 562.5 });
  expect(contentRect(1600, 900, 672, 480)).toEqual({ x: 170, y: 0, width: 1260, height: 900 });
  expect(contentRect(0, 900, 1280, 720)).toEqual({ x: 0, y: 0, width: 0, height: 900 });
});

test("canvas stays within each device's GPU budget", () => {
  const rect = { x: 0, y: 0, width: 1600, height: 900 };
  expect(canvasSize(rect, 1)).toEqual({ width: 1600, height: 900 });
  expect(canvasSize(rect, 3)).toEqual({ width: 3200, height: 1800 }); // desktop: DPR capped at 2
  expect(canvasSize({ ...rect, width: 2400, height: 1350 }, 2)).toEqual({ width: 3840, height: 2160 });
  expect(canvasSize({ ...rect, width: 800, height: 450 }, 3, true)).toEqual({ width: 1200, height: 675 });
  expect(canvasSize({ ...rect, width: 1600, height: 900 }, 2, true)).toEqual({ width: 1920, height: 1080 });
});

test("FSR constants and when EASU runs", () => {
  expect(easuScale(1280, 720, 2560, 1440)).toEqual([0.5, 0.5, -0.25, -0.25]);
  expect(needsEasu(1280, 1920)).toBe(true);
  expect(needsEasu(1920, 1920)).toBe(false);
  expect(needsEasu(1280, 1920, true)).toBe(false); // lite: RCAS only
  expect(rcasSharpness(0)).toBe(1);
  expect(rcasSharpness(1)).toBe(0.5);
});

test("room impulse: stereo, decays to silence, same every time", () => {
  const [l, r] = impulseResponse(48000, 1);
  expect(l.length).toBe(48000);
  expect(r.length).toBe(48000);
  const energy = (a: Float32Array, from: number, to: number) => a.slice(from, to).reduce((s, v) => s + v * v, 0);
  expect(energy(l, 0, 4800)).toBeGreaterThan(energy(l, 43200, 48000) * 100);
  expect(l[100]).not.toBe(r[100]);
  expect(impulseResponse(48000, 1)[0][1234]).toBe(l[1234]);
});

test("speaker positions around the listener", () => {
  const front = around(0);
  expect(front.x).toBeCloseTo(0);
  expect(front.z).toBeCloseTo(-1);
  expect(around(90).x).toBeCloseTo(1);
  expect(around(-110).z).toBeGreaterThan(0); // behind
});

test("colour grade: richer muted colours, protected skin, greys and range kept", () => {
  const sat = ([r, g, b]: number[]) => Math.max(r, g, b) - Math.min(r, g, b);
  // grey stays grey, black stays black, white stays white
  const grey = gradePixel(0.5, 0.5, 0.5);
  expect(sat(grey)).toBeCloseTo(0, 6);
  expect(gradePixel(0, 0, 0)).toEqual([0, 0, 0]);
  expect(gradePixel(1, 1, 1).every((x) => x > 0.99)).toBe(true);
  // a washed-out sky gains saturation
  const sky = [0.55, 0.65, 0.8];
  expect(sat(gradePixel(sky[0], sky[1], sky[2]))).toBeGreaterThan(sat(sky) * 1.2);
  // skin gains much less than a non-skin colour of the same saturation
  const skin = [0.9, 0.72, 0.6];
  const teal = [0.6, 0.72, 0.9];
  const gain = (c: number[]) => sat(gradePixel(c[0], c[1], c[2])) / sat(c);
  expect(gain(skin)).toBeLessThan(gain(teal));
  // an already vivid red barely moves; nothing leaves 0..1
  expect(gain([0.95, 0.1, 0.1])).toBeLessThan(1.15);
  for (const c of [[1, 0, 0], [0.02, 0.9, 0.3], [0.99, 0.98, 0.01]])
    expect(gradePixel(c[0], c[1], c[2]).every((x) => x >= 0 && x <= 1)).toBe(true);
  // contrast: darks a bit darker, lights a bit lighter
  expect(gradePixel(0.25, 0.25, 0.25)[0]).toBeLessThan(0.25);
  expect(gradePixel(0.75, 0.75, 0.75)[0]).toBeGreaterThan(0.75);
});

test("frame budget: a steady skip rate trips it, a single hiccup does not", () => {
  const budget = new FrameBudget(3000, 0.25);
  let tripped = false;
  for (let t = 0; t <= 3000; t += 40) tripped = budget.record(t === 1000 ? 30 : 1, t) || tripped;
  expect(tripped).toBe(false);
  budget.reset();
  for (let t = 0; t <= 3000; t += 40) tripped = budget.record(2, t) || tripped; // every other frame lost
  expect(tripped).toBe(true);
});
