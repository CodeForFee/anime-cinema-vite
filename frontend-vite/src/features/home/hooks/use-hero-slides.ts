import { useEffect, useState } from "react";

import { useEnrichedItem } from "@/core/queries";
import { useHistoryStore } from "@/core/stores/history";
import type { AnimeItem } from "@/core/types/anime";

const MAX_SLIDES = 16;
const AUTO_ADVANCE_MS = 5000;

/** The hero's slides: which one shows, auto-advance, its full details and its favourite state */
export function useHeroSlides(items: AnimeItem[]) {
  const [index, setIndex] = useState(0);
  const slides = (items || []).slice(0, MAX_SLIDES);
  const favorites = useHistoryStore((state) => state.favorites);
  const toggleFavorite = useHistoryStore((state) => state.toggleFavorite);

  // restarts whenever the slide changes, so a manual pick gets its full interval
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setTimeout(
      () => setIndex((i) => (i + 1) % slides.length),
      AUTO_ADVANCE_MS,
    );
    return () => clearTimeout(timer);
  }, [index, slides.length]);

  // the sharp banner of the slide on screen; the next one is fetched ahead so the auto-advance finds it ready
  const current = useEnrichedItem(slides[index] || slides[0]);
  const next = useEnrichedItem(
    slides.length > 1 ? slides[(index + 1) % slides.length] : undefined,
  );
  // ...and its picture downloaded too, so the next slide appears sharp at once instead of loading in
  const nextImage = next?.backdrop || next?.banner;
  useEffect(() => {
    if (nextImage) new Image().src = nextImage;
  }, [nextImage]);

  const step = (by: number) =>
    setIndex((i) => (i + by + slides.length) % slides.length);
  const poster = current?.poster || current?.image || "";

  return {
    slides,
    index,
    setIndex,
    next: () => step(1),
    previous: () => step(-1),
    current,
    poster,
    isFavorite: Boolean(
      current?.slug && favorites.some((f) => f.slug === current.slug),
    ),
    toggleFavorite: () =>
      current &&
      toggleFavorite({
        slug: current.slug,
        title: current.title,
        poster,
        year: String(current.year || "2025"),
        genres: current.genres,
        rating: current.rating,
      }),
  };
}

export type HeroSlides = ReturnType<typeof useHeroSlides>;
