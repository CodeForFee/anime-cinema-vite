import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

// LazyImage looks up sharper AniList covers; not what this test is about
vi.mock("@/features/title/hooks/useHdArt", () => ({
  useHdArt: () => undefined,
}));

import { StackCarousel } from "@/features/home/mobile/StackCarousel";
import type { AnimeItem } from "@/core/types/anime";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const items = (...slugs: string[]) =>
  slugs.map(
    (slug) =>
      ({
        slug,
        title: slug,
        poster: `https://x.test/${slug}.jpg`,
      }) as AnimeItem,
  );

/** The dark layer over the card in the middle (the one that takes the tab focus) */
const middleShade = (host: HTMLElement) =>
  host.querySelector<HTMLElement>('button[tabindex="0"] span.bg-black');

test("a list refreshed under the carousel keeps every card lit and placed, without a swipe", () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  act(() =>
    root.render(<StackCarousel items={items("a", "b", "c", "d", "e")} />),
  );
  expect(middleShade(host)?.style.opacity).toBe("0");

  // the cached list showed first; the fresh one arrives in another order, so new cards mount while the index stays 0
  act(() =>
    root.render(<StackCarousel items={items("x", "a", "b", "c", "d")} />),
  );
  expect(middleShade(host)?.style.opacity).toBe("0");
  for (const shade of host.querySelectorAll<HTMLElement>("span.bg-black"))
    expect(shade.style.opacity).not.toBe("");
  for (const card of host.querySelectorAll<HTMLElement>("button[aria-label]")) {
    if (card.querySelector("span.bg-black"))
      expect(card.style.zIndex).not.toBe("");
  }

  act(() => root.unmount());
});
