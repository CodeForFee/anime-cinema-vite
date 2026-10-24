import { useEffect, useRef } from "react";

import type { AnimeItem } from "@/core/types/anime";
import { HeroCard } from "@/features/home/components/HeroCard";
import { useHeroSlides } from "@/features/home/hooks/use-hero-slides";
import { PosterImg } from "@/features/title";
import { cn } from "@/shared/lib/utils";

/** Desktop hero: the wide banner, uncropped on the right of the card, and a strip of posters to pick a slide */
export function HeroDesktop({ items }: { items: AnimeItem[] }) {
  const hero = useHeroSlides(items);
  const stripRef = useRef<HTMLDivElement>(null);
  const { slides, index } = hero;

  // keep the picked poster in view when the strip overflows (scrolls the strip only, never the page)
  useEffect(() => {
    const strip = stripRef.current;
    const thumb = strip?.firstElementChild?.children[index] as
      HTMLElement | undefined;
    if (!strip || !thumb) return;
    strip.scrollTo({
      left: thumb.offsetLeft - (strip.clientWidth - thumb.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [index]);

  const thumbs = (
    <div
      ref={stripRef}
      className="absolute inset-x-0 bottom-0 z-20 flex translate-y-1/3 overflow-x-auto no-scrollbar px-4 py-2"
    >
      {/* mx-auto centres the row when it fits and falls back to start-aligned when it overflows */}
      <div className="mx-auto flex items-center gap-3">
        {slides.map((item, i) => (
          <button
            key={item.slug || i}
            type="button"
            aria-label={item.title}
            aria-current={i === index || undefined}
            onClick={() => hero.setIndex(i)}
            className={cn(
              "w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 bg-[#1c1c1f] transition-[transform,opacity,border-color] duration-300 ease-out",
              i === index
                ? "z-10 scale-105 border-white"
                : "border-[#2e2e33] opacity-80 hover:border-white/60 hover:opacity-100",
            )}
          >
            <PosterImg
              art={item}
              src={item.poster || item.image || ""}
              alt={item.title}
              loading="lazy"
              className="aspect-[2/3] w-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <HeroCard
      hero={hero}
      image={hero.current?.backdrop || hero.current?.banner || hero.poster}
      thumbs={thumbs}
    />
  );
}
