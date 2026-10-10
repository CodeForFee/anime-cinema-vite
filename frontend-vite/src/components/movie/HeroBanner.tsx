
import { motion } from "framer-motion";
import { useEnrichedItem } from "../../hooks/useAnimeQuery";
import React, { useState, useEffect, useRef } from "react";
import { Link } from "@/lib/router";
import { Button, buttonVariants } from "../lightswind/button";
import { Badge } from "../lightswind/badge";
import { AnimeItem } from "../../types/anime";
import { useUIStore } from "../../stores/useUIStore";
import { useHistoryStore } from "../../stores/useHistoryStore";
import { cn } from "../../lib/utils";
import { ChevronRight, Heart, Info, Play, Star } from "lucide-react";

interface HeroBannerProps {
  items: AnimeItem[];
}

const MAX_THUMBS = 16;
const AUTO_ADVANCE_MS = 5000;
const META_BADGE = "h-6 border-white/70 px-2 py-0 font-medium text-white";
const PILL_BUTTON = "h-12 w-14 text-white transition-colors hover:bg-white/10 [&_svg]:size-5 flex items-center justify-center";

export const HeroBanner: React.FC<HeroBannerProps> = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  const openInfoModal = useUIStore((state) => state.openInfoModal);
  const favorites = useHistoryStore((state) => state.favorites);
  const toggleFavorite = useHistoryStore((state) => state.toggleFavorite);

  const slides = (items || []).slice(0, MAX_THUMBS);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-advance; restarts whenever the slide changes so a manual pick gets its full interval
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [currentIndex, slides.length]);

  // Keep the active thumbnail in view when the strip overflows (scrolls the strip only, never the page)
  useEffect(() => {
    const strip = stripRef.current;
    const thumb = strip?.firstElementChild?.children[currentIndex] as HTMLElement | undefined;
    if (!strip || !thumb) return;
    strip.scrollTo({ left: thumb.offsetLeft - (strip.clientWidth - thumb.offsetWidth) / 2, behavior: "smooth" });
  }, [currentIndex]);

  // Sharp banner for the slide on screen; the next one is fetched ahead so the 5 s auto-advance finds it ready
  const current = useEnrichedItem(slides[currentIndex] || slides[0]);
  useEnrichedItem(slides.length > 1 ? slides[(currentIndex + 1) % slides.length] : undefined);

  if (slides.length === 0 || !current) return null;

  // Resolve sharpest backdrop and poster
  const posterImg = current.poster || current.image || "";
  const backdropImg = current.backdrop || current.banner || posterImg;

  const genres = (Array.isArray(current.genres) ? current.genres : [])
    .map((g) => (typeof g === "string" ? g : ((g as unknown) as { name?: string })?.name || ""))
    .filter(Boolean)
    .slice(0, 4);

  const isFav = mounted && current?.slug ? favorites.some((f) => f.slug === current.slug) : false;

  const handleToggleFav = () => {
    toggleFavorite({
      slug: current.slug,
      title: current.title,
      poster: posterImg,
      year: String(current.year || "2025"),
      genres: current.genres,
      rating: current.rating,
    });
  };

  return (
    <section className="relative w-full px-4 md:px-12 pt-4 md:pt-6 select-none">
      {/* Section Heading */}
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-xl md:text-2xl font-bold text-white">Kho Tàng Anime Mới Nhất</h2>
        <Link
          href="/explore?type=phim-moi"
          aria-label="Xem tất cả anime mới"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-white/40 text-white transition-colors hover:bg-white/10"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Bottom margin leaves room for the thumbnail strip hanging over the card edge */}
      <div className="relative mb-10 md:mb-12">
        {/* On desktop the card's aspect ratio makes the 58%-wide image area exactly 16:9, so banners show uncropped */}
        <motion.div
          className="relative h-[460px] lg:h-auto lg:aspect-[3.065/1] lg:min-h-[440px] overflow-hidden rounded-3xl bg-[#1c1c1f]"
          // Follows the finger with a rubber-band pull and springs back; a long or fast swipe changes slide
          drag={slides.length > 1 ? "x" : false}
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.22}
          onDragStart={() => {
            dragged.current = true;
          }}
          onDragEnd={(_event, info) => {
            setTimeout(() => (dragged.current = false), 0);
            if (info.offset.x < -60 || info.velocity.x < -500) setCurrentIndex((i) => (i + 1) % slides.length);
            else if (info.offset.x > 60 || info.velocity.x > 500) setCurrentIndex((i) => (i - 1 + slides.length) % slides.length);
          }}
          // a drag must not also press the button it started on
          onClickCapture={(event) => {
            if (dragged.current) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          {/* Backdrop on the right: only its left edge fades into the card, the rest stays untouched */}
          <motion.img
            key={backdropImg}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            draggable={false}
            src={backdropImg}
            alt={current.title}
            className="absolute inset-y-0 right-0 h-full w-full lg:w-[58%] object-cover object-center lg:[mask-image:linear-gradient(to_right,transparent,black_30%)]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = posterImg;
            }}
          />
          {/* Small screens: image is full-bleed behind the text, so dim it instead */}
          <div className="absolute inset-0 bg-[#1c1c1f]/70 lg:hidden" />

          {/* Details (kept inside the left 46% on desktop so it never covers the clear part of the image) */}
          <div className="relative z-10 flex h-full max-w-[700px] lg:max-w-[46%] flex-col justify-center gap-3 px-6 md:px-12 pb-12">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight line-clamp-2">
                {current.title}
              </h1>
              {current.subTitle && (
                <p className="mt-1.5 text-sm md:text-base text-amber-300 line-clamp-1">{current.subTitle}</p>
              )}
            </div>

            {/* Meta Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {current.rating && (
                <Badge variant="unstyled" shape="rounded" className={cn(META_BADGE, "gap-1 border-amber-300 text-amber-300")}>
                  <Star className="fill-current h-3 w-3" />
                  <span>{current.rating}</span>
                </Badge>
              )}
              <Badge variant="unstyled" shape="rounded" className={cn(META_BADGE, "border-white bg-white font-bold text-black")}>
                {current.quality || "HD"}
              </Badge>
              {current.year && (
                <Badge variant="unstyled" shape="rounded" className={META_BADGE}>
                  {current.year}
                </Badge>
              )}
              {current.latestEpisode && (
                <Badge variant="unstyled" shape="rounded" className={META_BADGE}>
                  {current.latestEpisode}
                </Badge>
              )}
            </div>

            {/* Genre Chips */}
            {genres.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {genres.map((genre) => (
                  <Badge
                    key={genre}
                    variant="unstyled"
                    shape="rounded"
                    className="h-6 border-transparent bg-white/10 px-2 py-0 font-medium text-white"
                  >
                    {genre}
                  </Badge>
                ))}
              </div>
            )}

            {current.synopsis && (
              <p className="text-sm md:text-[15px] text-white/90 leading-relaxed line-clamp-3">{current.synopsis}</p>
            )}

            {/* Actions: play + favorite / info pill */}
            <div className="flex items-center gap-6 pt-3">
              <Link
                href={`/watch?slug=${current.slug}`}
                aria-label={`Xem ${current.title}`}
                className={buttonVariants({
                  variant: "unstyled",
                  size: "unstyled",
                  className:
                    "h-16 w-16 rounded-full bg-gradient-to-br from-amber-200 to-amber-400 text-black shadow-[0_6px_24px_rgba(251,191,36,0.35)] transition-transform hover:scale-105 [&_svg]:size-6 flex items-center justify-center",
                })}
              >
                <Play className="fill-current ml-1 h-6 w-6" />
              </Link>

              <div className="flex items-center overflow-hidden rounded-full border border-white/20">
                <Button
                  variant="unstyled"
                  size="unstyled"
                  aria-label={isFav ? "Xóa khỏi danh sách của tôi" : "Thêm vào danh sách của tôi"}
                  onClick={handleToggleFav}
                  className={cn(PILL_BUTTON, isFav && "text-primaryRed")}
                >
                  <Heart className="h-4 w-4" />
                </Button>
                <span className="h-6 w-px bg-white/20" />
                <Button
                  variant="unstyled"
                  size="unstyled"
                  aria-label="Thông tin chi tiết"
                  onClick={() => openInfoModal(current)}
                  className={PILL_BUTTON}
                >
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Poster Thumbnail Strip (slide picker) */}
        {slides.length > 1 && (
          <div
            ref={stripRef}
            className="absolute inset-x-0 bottom-0 z-20 flex translate-y-1/3 overflow-x-auto no-scrollbar px-4 py-2"
          >
            {/* mx-auto centers the row when it fits and falls back to start-aligned when it overflows */}
            <div className="mx-auto flex gap-2 md:gap-3">
            {slides.map((item, idx) => (
              <button
                key={item.slug || idx}
                type="button"
                aria-label={item.title}
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  "w-11 md:w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 bg-[#1c1c1f] transition-all duration-200",
                  idx === currentIndex
                    ? "border-white scale-105"
                    : "border-[#2e2e33] opacity-80 hover:opacity-100 hover:border-white/60"
                )}
              >
                <img
                  src={item.poster || item.image || ""}
                  alt={item.title}
                  loading="lazy"
                  className="aspect-[2/3] w-full object-cover"
                />
              </button>
            ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
