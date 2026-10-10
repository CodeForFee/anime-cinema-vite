
import React, { useRef } from "react";
import { Link } from "@/lib/router";
import { Button, Tooltip, ScrollShadow } from "@heroui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faStar,
  faPlay,
} from "@fortawesome/free-solid-svg-icons";
import { AnimeItem } from "../../types/anime";
import { useUIStore } from "../../stores/useUIStore";

interface TopSliderProps {
  items: AnimeItem[];
}

export const TopSlider: React.FC<TopSliderProps> = ({ items }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const openInfoModal = useUIStore((state) => state.openInfoModal);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = direction === "left" ? -450 : 450;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="relative w-full px-4 md:px-12 pt-4 pb-2 group/topslider select-none">
      {/* Container Frame */}
      <div className="relative">
        {/* Left Arrow Button */}
        <Tooltip content="Cuộn trái" placement="right">
          <Button
            isIconOnly
            size="sm"
            radius="full"
            variant="flat"
            onPress={() => handleScroll("left")}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-30 bg-black/80 hover:bg-primaryRed text-white border border-white/10 backdrop-blur-md opacity-0 group-hover/topslider:opacity-100 transition-all duration-300 shadow-xl"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="w-3.5 h-3.5" />
          </Button>
        </Tooltip>

        {/* Horizontal Carousel */}
        <ScrollShadow
          ref={scrollRef}
          orientation="horizontal"
          hideScrollBar
          className="flex items-center gap-3 md:gap-4 snap-shelf overflow-x-auto scroll-smooth py-1"
        >
          {items.map((anime, idx) => {
            const isCompleted = anime.episode?.toLowerCase().includes("hoàn tất");

            return (
              <div
                key={anime.slug || idx}
                onClick={() => openInfoModal(anime)}
                className="group relative flex-shrink-0 w-28 sm:w-36 md:w-40 cursor-pointer rounded-xl overflow-hidden border border-white/10 hover:border-primaryRed transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_24px_rgba(229,9,20,0.35)] bg-[#181818]"
              >
                {/* Poster Image Container */}
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-black/40">
                  <img
                    src={anime.poster || anime.image || ""}
                    alt={anime.title}
                    className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />

                  {/* Rating Badge Top-Left */}
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-black/80 backdrop-blur-md border border-white/10 text-amber-400 font-black text-[10px] sm:text-xs px-1.5 py-0.5 rounded-md shadow-md">
                    <FontAwesomeIcon icon={faStar} className="w-2.5 h-2.5 text-amber-400" />
                    <span>{anime.rating || anime.vote || "9.5"}</span>
                  </div>

                  {/* Episode Badge Top-Right */}
                  <div
                    className={`absolute top-1.5 right-1.5 font-bold text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md shadow-md uppercase tracking-tight text-white ${
                      isCompleted ? "bg-amber-600" : "bg-primaryRed"
                    }`}
                  >
                    {anime.episode || "TẬP MỚI"}
                  </div>

                  {/* Center Play Icon Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full bg-primaryRed/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                      <FontAwesomeIcon icon={faPlay} className="w-3.5 h-3.5 text-white ml-0.5" />
                    </div>
                  </div>

                  {/* Bottom Gradient Fade for Title */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2 pt-6">
                    <h4 className="text-[11px] sm:text-xs font-bold text-white line-clamp-1 leading-tight text-center drop-shadow group-hover:text-primaryRed transition-colors">
                      {anime.title}
                    </h4>
                  </div>
                </div>
              </div>
            );
          })}
        </ScrollShadow>

        {/* Right Arrow Button */}
        <Tooltip content="Cuộn phải" placement="left">
          <Button
            isIconOnly
            size="sm"
            radius="full"
            variant="flat"
            onPress={() => handleScroll("right")}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-30 bg-black/80 hover:bg-primaryRed text-white border border-white/10 backdrop-blur-md opacity-0 group-hover/topslider:opacity-100 transition-all duration-300 shadow-xl"
          >
            <FontAwesomeIcon icon={faChevronRight} className="w-3.5 h-3.5" />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};
