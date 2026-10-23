
import { motion } from "framer-motion";
import { useEnrichedItem } from "@/core/queries";
import { useHdArt } from "@/features/title/hooks/useHdArt";
import React, { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { AnimeItem } from "@/core/types/anime";
import { useUIStore } from "@/features/title/store";
import { useHistoryStore } from "@/core/stores/history";
import { cn } from "@/shared/lib/utils";
import { Heart, Info, Play, Star } from "lucide-react";
import { PosterImg } from "@/features/title/components/LazyImage";
import { loopOffset } from "@/features/home/mobile/StackCarousel";

interface HeroBannerProps {
  items: AnimeItem[];
}

const MAX_THUMBS = 16;
const AUTO_ADVANCE_MS = 5000;
const META_BADGE = "h-6 shrink-0 border-white/70 px-2 py-0 font-medium text-white";
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

  const hd = useHdArt(current);

  if (slides.length === 0 || !current) return null;

  // Resolve sharpest backdrop and poster. The phone card is taller than wide: the 720 px source banner is
  // blown up 3x there, the 460x650 cover far less, so phones take the cover once it is known.
  const posterImg = current.poster || current.image || "";
  const wideBackdrop = current.backdrop || current.banner || posterImg;
  const backdropImg = hd?.cover && !matchMedia("(min-width: 1024px)").matches ? hd.cover : wideBackdrop;

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
      {/* Bottom margin leaves room for the thumbnail strip hanging over the card edge */}
      <div className="relative mb-14 md:mb-12">
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

          {/* Details (kept inside the left 46% on desktop so it never covers the clear part of the image).
              Every row has a fixed height and clips, so changing slide never moves the buttons */}
          <div className="relative z-10 flex h-full max-w-[700px] lg:max-w-[46%] flex-col justify-center gap-3 px-6 md:px-12 pb-12">
            <div>
              <h1 className="h-[2.5em] text-2xl md:text-3xl font-bold text-white leading-tight line-clamp-2">
                {current.title}
              </h1>
              <p className="mt-1.5 h-[1.5em] text-sm md:text-base text-amber-300 line-clamp-1">{current.subTitle}</p>
            </div>

            {/* Meta Badges */}
            <div className="flex h-6 flex-nowrap items-center gap-2 overflow-hidden">
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
            <div className="flex h-6 flex-nowrap items-center gap-2 overflow-hidden">
                {genres.map((genre) => (
                  <Badge
                    key={genre}
                    variant="unstyled"
                    shape="rounded"
                    className="h-6 shrink-0 border-transparent bg-white/10 px-2 py-0 font-medium text-white"
                  >
                    {genre}
                  </Badge>
                ))}
            </div>

            <p className="h-[4.875em] text-sm md:text-[15px] text-white/90 leading-relaxed line-clamp-3">{current.synopsis}</p>

            {/* Actions: play + favorite / info pill */}
            <div className="flex items-center gap-6 pt-3">
              <Link
                to="/watch"
                search={{ slug: current.slug }}
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

        {/* Phones: the thumbnails loop around the picked one, which sits large in the middle (coverflow) */}
        {slides.length > 1 && (
          <div className="absolute inset-x-0 bottom-0 z-20 h-28 translate-y-[30%] overflow-hidden md:hidden">
            {slides.map((item, idx) => {
              const offset = loopOffset(idx, currentIndex, slides.length);
              const distance = Math.abs(offset);
              if (distance > 4) return null;
              // the big middle one needs more room than the rest
              const x = Math.sign(offset) * (distance <= 1 ? distance * 60 : 60 + (distance - 1) * 52);
              return (
                <button
                  key={item.slug || idx}
                  type="button"
                  aria-label={item.title}
                  aria-current={distance === 0 || undefined}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "absolute bottom-3 left-1/2 w-11 origin-bottom overflow-hidden rounded-lg border-2 bg-[#1c1c1f] transition-[transform,opacity,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    distance === 0
                      ? "z-10 border-white shadow-[0_12px_28px_rgba(0,0,0,0.65)]"
                      : distance === 1
                        ? "border-white/25"
                        : "border-transparent"
                  )}
                  style={{
                    transform: `translateX(calc(-50% + ${x}px)) translateY(${distance === 0 ? -4 : 0}px) scale(${distance === 0 ? 1.45 : distance === 1 ? 1.05 : 0.9})`,
                    opacity: distance === 0 ? 1 : distance === 1 ? 0.9 : distance >= 4 ? 0 : 0.55,
                  }}
                >
                  <PosterImg art={item} src={item.poster || item.image || ""} alt="" loading="lazy" className="aspect-[2/3] w-full object-cover" />
                </button>
              );
            })}
          </div>
        )}

        {/* Poster Thumbnail Strip (slide picker), tablet and up */}
        {slides.length > 1 && (
          <div
            ref={stripRef}
            className="absolute inset-x-0 bottom-0 z-20 hidden translate-y-1/3 overflow-x-auto no-scrollbar px-4 py-2 md:flex"
          >
            {/* mx-auto centers the row when it fits and falls back to start-aligned when it overflows */}
            <div className="mx-auto flex items-end gap-3 md:items-center md:gap-3">
            {slides.map((item, idx) => {
              const distance = Math.abs(idx - currentIndex);
              return (
              <button
                key={item.slug || idx}
                type="button"
                aria-label={item.title}
                aria-current={idx === currentIndex || undefined}
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  "w-11 md:w-16 flex-shrink-0 origin-bottom overflow-hidden rounded-lg border-2 bg-[#1c1c1f] transition-[transform,opacity,border-color,box-shadow] duration-300 ease-out md:origin-center",
                  // phones: the picked one grows and lifts in the middle, neighbours shrink away from it
                  distance === 0
                    ? "z-10 -translate-y-1 scale-[1.45] border-white shadow-[0_12px_28px_rgba(0,0,0,0.65)] md:translate-y-0 md:scale-105 md:shadow-none"
                    : distance === 1
                      ? "scale-105 border-white/25 opacity-90 md:scale-100 md:border-[#2e2e33] md:opacity-80 md:hover:opacity-100 md:hover:border-white/60"
                      : "scale-90 border-transparent opacity-55 md:scale-100 md:border-[#2e2e33] md:opacity-80 md:hover:opacity-100 md:hover:border-white/60"
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
              );
            })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
