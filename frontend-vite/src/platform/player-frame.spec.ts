import { expect, test } from "vitest";
import { createPlayerFrame } from "@/platform/player-frame";

const source =
  "https://storage.googleapiscdn.com/player/session#animevsub-vsub_extra";
test("each web frame gets an independent opaque-sandbox channel and preserves the bridge tag", () => {
  const first = createPlayerFrame(source, false);
  const second = createPlayerFrame(source, false);
  const url = new URL(first?.url ?? "", "https://app.test");
  expect(url.pathname).toBe("/api/player");
  expect(url.searchParams.get("url")).toBe(source.split("#")[0]);
  expect(url.searchParams.get("channel")).toMatch(/^[a-f0-9]{32}$/);
  expect(url.hash).toBe("#animevsub-vsub_extra");
  expect(first?.channel).not.toBe(second?.channel);
});

test("native frame URLs and missing sources are unchanged", () => {
  expect(createPlayerFrame(source, true)).toEqual({
    url: source,
    channel: undefined,
  });
  expect(createPlayerFrame(undefined, false)).toBeUndefined();
});
