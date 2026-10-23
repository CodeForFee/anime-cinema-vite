
import React, { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Button, Tooltip } from "@heroui/react";
import type { LucideIcon } from "lucide-react";
import { PosterTile } from "@/features/browse/components/PosterTile";
import { AnimeItem } from "@/core/types/anime";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Search of the explore page a "see all" link opens (app/router.tsx) */
export type ExploreSearch = { path?: string; type?: string };

interface MovieShelfProps {
  title: string;
  /** Kept for callers; the glass shelves show the title alone */
  icon?: LucideIcon;
  items: AnimeItem[];
  /** The explore page this shelf continues on */
  seeMore?: ExploreSearch;
}

export const MovieShelf: React.FC<MovieShelfProps> = ({
  title,
  items,
  seeMore,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === "left" ? -500 : 500;
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="my-5 md:my-8 relative group/shelf">
      {/* Shelf Header */}
      <div className="flex items-center justify-between mb-3 px-4 md:px-12">
        <h3 className="font-display text-lg font-bold tracking-tight text-white md:text-2xl">{title}</h3>

        {seeMore && (
          <Link
            to="/explore"
            search={seeMore}
            className="glass-pill flex h-8 items-center gap-1 rounded-full pl-3.5 pr-2.5 text-xs font-semibold text-gray-200 transition hover:text-white"
          >
            Xem tất cả
            <ChevronRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {/* Horizontal Cards ScrollShadow Container */}
      <div className="relative px-4 md:px-12">
        {/* Left Arrow Button */}
        <Tooltip content="Cuộn trái" placement="right">
          <Button
            isIconOnly
            size="md"
            radius="full"
            variant="flat"
            onPress={() => handleScroll("left")}
            className="glass-button absolute left-2 top-1/2 -translate-y-1/2 z-30 text-white opacity-0 group-hover/shelf:opacity-100 transition-opacity duration-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Tooltip>

        {/* a plain scroller: HeroUI ScrollShadow masks the whole row, repainted on every page scroll */}
        <div
          ref={scrollContainerRef}
          className="no-scrollbar flex items-start gap-3 snap-shelf overflow-x-auto scroll-smooth py-2 md:gap-4"
        >
          {items.map((anime) => (
            <div key={anime.slug || anime.title} className="w-44 shrink-0 md:w-52">
              <PosterTile anime={anime} />
            </div>
          ))}
        </div>

        {/* Right Arrow Button */}
        <Tooltip content="Cuộn phải" placement="left">
          <Button
            isIconOnly
            size="md"
            radius="full"
            variant="flat"
            onPress={() => handleScroll("right")}
            className="glass-button absolute right-2 top-1/2 -translate-y-1/2 z-30 text-white opacity-0 group-hover/shelf:opacity-100 transition-opacity duration-300"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Tooltip>
      </div>
    </section>
  );
};
