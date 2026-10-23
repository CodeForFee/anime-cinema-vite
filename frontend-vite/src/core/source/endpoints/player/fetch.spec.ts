import { expect, test } from "vitest"

import { safePlayerUrl } from "@/core/source/endpoints/player/fetch"

test("only https pages and streams, or a decrypted playlist, reach the player", () => {
  expect(safePlayerUrl("https://stream.googleapiscdn.com/player/abc")).toBe("https://stream.googleapiscdn.com/player/abc")
  expect(safePlayerUrl("//stream.googleapiscdn.com/x.m3u8")).toBe("https://stream.googleapiscdn.com/x.m3u8")
  expect(safePlayerUrl("data:application/vnd.apple.mpegurl;base64,I0VYVE0zVQ==")).toContain("data:application/vnd.apple.mpegurl")

  expect(() => safePlayerUrl("javascript:alert(1)")).toThrow()
  expect(() => safePlayerUrl("JaVaScRiPt:alert(1)")).toThrow()
  expect(() => safePlayerUrl("http://stream.googleapiscdn.com/player/abc")).toThrow()
  expect(() => safePlayerUrl("data:text/html,<script>alert(1)</script>")).toThrow()
  expect(() => safePlayerUrl("not a url")).toThrow()
})
