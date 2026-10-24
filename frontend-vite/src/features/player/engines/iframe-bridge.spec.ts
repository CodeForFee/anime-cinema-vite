import { expect, test } from "vitest";
import { parseEnhanced } from "@/features/player/engines/iframe-bridge";

test("the frame's enhanced answer keeps only known fields and values", () => {
  expect(
    parseEnhanced({
      upscale: "anime4k",
      surround: true,
      support: { audio: true, webgl2: true, webgpu: "yes" },
      notice: "downgraded",
      extra: "<script>",
    }),
  ).toEqual({
    surround: true,
    surroundMode: "headphones",
    upscale: "anime4k",
    color: false,
    support: { audio: true, webgl2: true, webgpu: false },
    error: undefined,
    notice: "downgraded",
  });
  expect(parseEnhanced({ upscale: "8k" })).toBeNull();
  // an old bridge without the enhancer script
  expect(parseEnhanced({ upscale: "off", support: null, error: "outdated" })).toMatchObject({
    upscale: "off",
    error: "outdated",
    support: { audio: false, webgl2: false, webgpu: false },
  });
  expect(parseEnhanced({ upscale: "fsr", error: "x".repeat(500) })?.error).toHaveLength(200);
});
