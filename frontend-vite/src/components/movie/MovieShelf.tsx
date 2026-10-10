
import React, { useRef } from "react";
import { Link } from "@/lib/router";
import { Button, ScrollShadow, Tooltip } from "@heroui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import type { LucideIcon } from "lucide-react";
import { MovieCard } from "./MovieCard";
import { AnimeItem } from "../../types/anime";

interface MovieShelfProps {
  title: string;
  /** Icon shown before the title */
  icon?: LucideIcon;
  items: AnimeItem[];
  seeMoreHref?: string;
}

export const MovieShelf: React.FC<MovieShelfProps> = ({
  title,
  icon: Icon,
  items,
  seeMoreHref,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === "left" ? -500 : 500;
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="my-8 relative group/shelf">
      {/* Shelf Header */}
      <div className="flex items-center justify-between mb-3 px-4 md:px-12">
        <h3 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          {Icon && <Icon aria-hidden className="h-6 w-6 flex-shrink-0 text-primaryRed" strokeWidth={2.25} />}
          <span>{title}</span>
        </h3>

        {seeMoreHref && (
          <Link href={seeMoreHref}>
            <Button
              size="sm"
              variant="light"
              className="text-xs md:text-sm font-semibold text-gray-400 hover:text-white"
              endContent={<FontAwesomeIcon icon={faChevronRight} className="w-3 h-3" />}
            >
              Xem tất cả
            </Button>
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
            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 bg-black/80 text-white border border-white/10 backdrop-blur-md opacity-0 group-hover/shelf:opacity-100 transition-opacity duration-300 hover:bg-primaryRed shadow-xl"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4" />
          </Button>
        </Tooltip>

        <ScrollShadow
          ref={scrollContainerRef}
          orientation="horizontal"
          hideScrollBar
          className="flex items-center gap-4 snap-shelf overflow-x-auto scroll-smooth py-2"
        >
          {items.map((anime) => (
            <MovieCard
              key={anime.slug || anime.title}
              anime={anime}
            />
          ))}
        </ScrollShadow>

        {/* Right Arrow Button */}
        <Tooltip content="Cuộn phải" placement="left">
          <Button
            isIconOnly
            size="md"
            radius="full"
            variant="flat"
            onPress={() => handleScroll("right")}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 bg-black/80 text-white border border-white/10 backdrop-blur-md opacity-0 group-hover/shelf:opacity-100 transition-opacity duration-300 hover:bg-primaryRed shadow-xl"
          >
            <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4" />
          </Button>
        </Tooltip>
      </div>
    </section>
  );
};
