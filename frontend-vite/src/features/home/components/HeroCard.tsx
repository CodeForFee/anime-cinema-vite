import { Link } from "@tanstack/react-router"
import { motion } from "framer-motion"
import { Heart, Info, Play, Star } from "lucide-react"
import type React from "react"
import { useRef } from "react"

import type { HeroSlides } from "@/features/home/hooks/use-hero-slides"
import { useUIStore } from "@/features/title"
import { cn } from "@/shared/lib/utils"
import { Badge } from "@/shared/ui/badge"
import { Button, buttonVariants } from "@/shared/ui/button"

const META_BADGE = "h-6 shrink-0 border-white/70 px-2 py-0 font-medium text-white"
const PILL_BUTTON = "h-12 w-14 text-white transition-colors hover:bg-white/10 [&_svg]:size-5 flex items-center justify-center"

/**
 * The hero card, the same on both forms: the slide's picture, title, badges, synopsis and actions. It follows a
 * drag with a rubber band and a long or fast swipe changes slide. `image` is the picture each form picks;
 * `thumbs` the slide picker each form draws under the card.
 */
export function HeroCard({ hero, image, thumbs }: { hero: HeroSlides; image: string; thumbs: React.ReactNode }) {
  const dragged = useRef(false)
  const openInfoModal = useUIStore((state) => state.openInfoModal)
  const { current, slides } = hero
  if (slides.length === 0 || !current) return null

  const genres = (Array.isArray(current.genres) ? current.genres : [])
    .map((g) => (typeof g === "string" ? g : ((g as unknown as { name?: string })?.name ?? "")))
    .filter(Boolean)
    .slice(0, 4)

  return (
    <section className="relative w-full px-4 md:px-12 pt-4 md:pt-6 select-none">
      {/* bottom margin leaves room for the slide picker hanging over the card edge */}
      <div className="relative mb-14 md:mb-12">
        {/* on desktop the card's aspect ratio makes the 58%-wide image area exactly 16:9, so banners show uncropped */}
        <motion.div
          className="relative h-[460px] lg:h-auto lg:aspect-[3.065/1] lg:min-h-[440px] overflow-hidden rounded-3xl bg-[#1c1c1f]"
          drag={slides.length > 1 ? "x" : false}
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.22}
          onDragStart={() => {
            dragged.current = true
          }}
          onDragEnd={(_event, info) => {
            setTimeout(() => (dragged.current = false), 0)
            if (info.offset.x < -60 || info.velocity.x < -500) hero.next()
            else if (info.offset.x > 60 || info.velocity.x > 500) hero.previous()
          }}
          // a drag must not also press the button it started on
          onClickCapture={(event) => {
            if (!dragged.current) return
            event.preventDefault()
            event.stopPropagation()
          }}
        >
          {/* backdrop on the right: only its left edge fades into the card */}
          <motion.img
            key={image}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            draggable={false}
            src={image}
            alt={current.title}
            className="absolute inset-y-0 right-0 h-full w-full lg:w-[58%] object-cover object-center lg:[mask-image:linear-gradient(to_right,transparent,black_30%)]"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = hero.poster
            }}
          />
          {/* small screens: the picture is full-bleed behind the text, so it is dimmed */}
          <div className="absolute inset-0 bg-[#1c1c1f]/70 lg:hidden" />

          {/* every row has a fixed height and clips, so changing slide never moves the buttons */}
          <div className="relative z-10 flex h-full max-w-[700px] lg:max-w-[46%] flex-col justify-center gap-3 px-6 md:px-12 pb-12">
            <div>
              <h1 className="h-[2.5em] text-2xl md:text-3xl font-bold text-white leading-tight line-clamp-2">{current.title}</h1>
              <p className="mt-1.5 h-[1.5em] text-sm md:text-base text-amber-300 line-clamp-1">{current.subTitle}</p>
            </div>

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

            <div className="flex h-6 flex-nowrap items-center gap-2 overflow-hidden">
              {genres.map((genre) => (
                <Badge key={genre} variant="unstyled" shape="rounded" className="h-6 shrink-0 border-transparent bg-white/10 px-2 py-0 font-medium text-white">
                  {genre}
                </Badge>
              ))}
            </div>

            <p className="h-[4.875em] text-sm md:text-[15px] text-white/90 leading-relaxed line-clamp-3">{current.synopsis}</p>

            <div className="flex items-center gap-6 pt-3">
              <Link
                to="/watch"
                search={{ slug: current.slug }}
                aria-label={`Xem ${current.title}`}
                className={buttonVariants({
                  variant: "unstyled",
                  size: "unstyled",
                  className:
                    "h-16 w-16 rounded-full bg-gradient-to-br from-amber-200 to-amber-400 text-black shadow-[0_6px_24px_rgba(251,191,36,0.35)] transition-transform hover:scale-105 [&_svg]:size-6 flex items-center justify-center"
                })}
              >
                <Play className="fill-current ml-1 h-6 w-6" />
              </Link>

              <div className="flex items-center overflow-hidden rounded-full border border-white/20">
                <Button
                  variant="unstyled"
                  size="unstyled"
                  aria-label={hero.isFavorite ? "Xóa khỏi danh sách của tôi" : "Thêm vào danh sách của tôi"}
                  onClick={hero.toggleFavorite}
                  className={cn(PILL_BUTTON, hero.isFavorite && "text-primaryRed")}
                >
                  <Heart className="h-4 w-4" />
                </Button>
                <span className="h-6 w-px bg-white/20" />
                <Button variant="unstyled" size="unstyled" aria-label="Thông tin chi tiết" onClick={() => openInfoModal(current)} className={PILL_BUTTON}>
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {slides.length > 1 && thumbs}
      </div>
    </section>
  )
}
