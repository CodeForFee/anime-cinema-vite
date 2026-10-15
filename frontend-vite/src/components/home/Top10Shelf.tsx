
import React, { useRef, useState } from "react";
import { Link } from "@/lib/router";
import { Button, Tooltip, ScrollShadow } from "@heroui/react";
import type { LucideIcon } from "lucide-react";
import { AnimeItem } from "../../types/anime";
import { LazyImage } from "../movie/LazyImage";
import { partLabel, StackCarousel } from "./StackCarousel";
import { useUIStore } from "../../stores/useUIStore";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";

interface Top10ShelfProps {
  items: AnimeItem[];
  title?: string;
  /** Icon shown before the title */
  icon?: LucideIcon;
  seeMoreHref?: string;
}

export const Top10Shelf: React.FC<Top10ShelfProps> = ({
  items,
  title = "Phim Nổi Bật Đề Cử",
  seeMoreHref = "/explore?type=trending",
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const openInfoModal = useUIStore((state) => state.openInfoModal);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = direction === "left" ? -550 : 550;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="my-8 relative group/top10 select-none">
      {/* SVG Clip Path Definitions for Soft Rounded Slanted Cards */}
      <svg
        width="0"
        height="0"
        className="absolute pointer-events-none opacity-0"
        style={{ position: "absolute", width: 0, height: 0 }}
        aria-hidden="true"
      >
        <defs>
          {/* Card 1 (idx 0, 2, 4...): Top edge slopes DOWN (Left is higher y=0, Right is lower y=0.055) with soft rounded corners */}
          <clipPath id="rank-card-slope-down" clipPathUnits="objectBoundingBox">
            <path d="M 0,0.05 C 0,0.015 0.03,0 0.07,0.003 L 0.93,0.05 C 0.98,0.055 1,0.065 1,0.1 L 1,0.95 C 1,0.985 0.97,1 0.93,1 L 0.07,1 C 0.03,1 0,0.985 0,0.95 Z" />
          </clipPath>

          {/* Card 2 (idx 1, 3, 5...): Top edge slopes UP (Left is lower y=0.055, Right is higher y=0) with soft rounded corners */}
          <clipPath id="rank-card-slope-up" clipPathUnits="objectBoundingBox">
            <path d="M 0,0.1 C 0,0.065 0.02,0.055 0.07,0.05 L 0.93,0.003 C 0.97,0 1,0.015 1,0.05 L 1,0.95 C 1,0.985 0.97,1 0.93,1 L 0.07,1 C 0.03,1 0,0.985 0,0.95 Z" />
          </clipPath>
        </defs>
      </svg>

      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-4 md:px-12">
        {/* same header as MovieShelf */}
        <h3 className="font-display text-lg font-bold tracking-tight text-white md:text-2xl">{title}</h3>

        {seeMoreHref && (
          <Link
            href={seeMoreHref}
            className="glass-pill flex h-8 items-center gap-1 rounded-full pl-3.5 pr-2.5 text-xs font-semibold text-gray-200 transition hover:text-white"
          >
            Xem tất cả
            <ChevronRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {/* Phones: stacked cards, swipe to move */}
      <div className="md:hidden">
        <StackCarousel items={items} />
      </div>

      {/* Horizontal Cards Scroll Container (tablet and up) */}
      <div className="relative hidden px-4 md:block md:px-12">
        {/* Left Arrow Button */}
        <Tooltip content="Cuộn trái" placement="right">
          <Button
            isIconOnly
            size="md"
            radius="full"
            variant="flat"
            onPress={() => handleScroll("left")}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 bg-black/80 hover:bg-primaryRed text-white border border-white/10 backdrop-blur-md opacity-0 group-hover/top10:opacity-100 transition-all duration-300 shadow-2xl"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Tooltip>

        <ScrollShadow
          ref={scrollRef}
          orientation="horizontal"
          hideScrollBar
          className="flex items-start gap-4 md:gap-5 snap-shelf overflow-x-auto scroll-smooth py-4"
        >
          {items.map((anime, idx) => {
            const rank = idx + 1;
            const cleanEpNumber = (anime.episode || "").replace(/^TẬP\s*/i, "").trim();
            const isHovered = hoveredIdx === idx;
            const isFirst = idx === 0;

            // Alternating slope so each pair forms a V:
            // Card 1 (idx 0, 2, 4...): Top edge slopes DOWN (Left higher, Right lower)
            // Card 2 (idx 1, 3, 5...): Top edge slopes UP (Left lower, Right higher)
            const isSlopeUp = idx % 2 === 1;
            const clipPathStyle = isSlopeUp
              ? "url(#rank-card-slope-up)"
              : "url(#rank-card-slope-down)";

            // the part only when the title has one
            const seasonText = partLabel(anime);

            return (
              <div
                key={anime.slug || idx}
                onClick={() => openInfoModal(anime)}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="group relative flex-shrink-0 w-48 sm:w-52 md:w-60 cursor-pointer flex flex-col transition-all duration-300 hover:-translate-y-2"
              >
                {/* Outer Card Container with Soft Rounded Corners and Angled Shape */}
                <div
                  className="relative aspect-[283/400] w-full p-[2.5px] transition-all duration-300"
                  style={{
                    clipPath: clipPathStyle,
                    WebkitClipPath: clipPathStyle,
                    background:
                      isHovered || isFirst
                        ? "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)"
                        : "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.06) 100%)",
                  }}
                >
                  {/* Inner Image Container */}
                  <div
                    className="relative w-full h-full bg-[#141414] overflow-hidden"
                    // the angled clip cuts any outer shadow; the glass rim is drawn inside (globals.css)
                    style={{
                      clipPath: clipPathStyle,
                      WebkitClipPath: clipPathStyle,
                    }}
                  >
                    <LazyImage
                      art={anime}
                      src={anime.poster || anime.image || ""}
                      alt={anime.title}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-[transform,opacity] duration-500"
                    />
                    <span aria-hidden className="glass-rim absolute inset-0 z-[5]" />

                    {/* Center Play Button Overlay on Hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                      <div className="w-12 h-12 rounded-full bg-primaryRed text-white flex items-center justify-center shadow-xl shadow-red-600/50 transform group-hover:scale-110 transition-transform">
                        <Play className="fill-current w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>

                    {/* Bottom Badges Matching Target Style (PĐ. {ep} / TM. {ep} / Full) */}
                    <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 z-10">
                      <span className="bg-[#202020]/90 backdrop-blur-md text-gray-200 text-[10px] font-bold px-2 py-0.5 rounded border border-white/15 shadow-sm">
                        PĐ. {cleanEpNumber || "Full"}
                      </span>
                      <span className="bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-400/30 shadow-sm">
                        TM. {cleanEpNumber || "HD"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Ranked Number + Metadata */}
                <div className="flex items-center gap-3 pt-3 px-1">
                  {/* Huge Stylized Golden Number */}
                  <span className="text-4xl sm:text-5xl md:text-6xl font-black italic tracking-tighter text-amber-400 select-none leading-none drop-shadow-[0_2px_12px_rgba(251,191,36,0.6)]">
                    {rank}
                  </span>

                  {/* Title and Metadata */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    {/* Main Vietnamese / Official Title */}
                    <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1 leading-snug group-hover:text-amber-400 transition-colors drop-shadow">
                      {anime.title}
                    </h4>

                    {/* English / Secondary Subtitle (if available and different) */}
                    {anime.subTitle && anime.subTitle !== anime.title && (
                      <p className="text-[10px] sm:text-xs text-gray-400 line-clamp-1 italic">
                        {anime.subTitle}
                      </p>
                    )}

                    {/* Metadata line: [Phần X •] Tập Y, the part only when the title has one */}
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                      {seasonText && (
                        <>
                          <span className="text-gray-300">{seasonText}</span>
                          <span aria-hidden>•</span>
                        </>
                      )}
                      <span className="text-primaryRed font-bold">
                        {cleanEpNumber ? `Tập ${cleanEpNumber}` : "Tập mới"}
                      </span>
                    </div>
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
            size="md"
            radius="full"
            variant="flat"
            onPress={() => handleScroll("right")}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 bg-black/80 hover:bg-primaryRed text-white border border-white/10 backdrop-blur-md opacity-0 group-hover/top10:opacity-100 transition-all duration-300 shadow-2xl"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Tooltip>
      </div>
    </section>
  );
};
