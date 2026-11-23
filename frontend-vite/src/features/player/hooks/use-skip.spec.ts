import { activeSegment, skipSegments } from "@/features/player/hooks/use-skip";

describe("skip segments", () => {
  const times = {
    recap: [0, 40] as [number, number],
    op: [40, 130] as [number, number],
    ed: [1300, 1390] as [number, number],
  };

  test("a mid-episode ending is skippable, the final credits are not", () => {
    expect(skipSegments(times, 1440).map((s) => s.kind)).toEqual([
      "recap",
      "op",
      "ed",
    ]);
    expect(skipSegments(times, 1400).map((s) => s.kind)).toEqual([
      "recap",
      "op",
    ]);
    expect(skipSegments(undefined, 1440)).toEqual([]);
  });

  test("the part playing now, unless skipped or in its last 2 s", () => {
    const segments = skipSegments(times, 1440);
    expect(activeSegment(segments, 10, new Set())?.kind).toBe("recap");
    expect(activeSegment(segments, 60, new Set())?.kind).toBe("op");
    expect(activeSegment(segments, 60, new Set(["op"]))).toBeUndefined();
    expect(activeSegment(segments, 129, new Set())).toBeUndefined();
    expect(activeSegment(segments, 500, new Set())).toBeUndefined();
    expect(activeSegment(segments, 1350, new Set())?.kind).toBe("ed");
  });
});
