import type { AnimeItem } from "@/core/types/anime"
import { HeroCard } from "@/features/home/components/HeroCard"
import { useHeroSlides } from "@/features/home/hooks/use-hero-slides"
import { loopOffset } from "@/features/home/model/coverflow"
import { PosterImg, useHdArt } from "@/features/title"
import { cn } from "@/shared/lib/utils"

/**
 * Mobile hero: the card is taller than wide, so it shows the sharp AniList cover once known (the 720 px source
 * banner would be blown up 3x). Under it the thumbnails loop around the picked one, which sits large in the middle.
 */
export function HeroMobile({ items }: { items: AnimeItem[] }) {
  const hero = useHeroSlides(items)
  const hd = useHdArt(hero.current)
  const wide = hero.current?.backdrop || hero.current?.banner || hero.poster
  const { slides, index } = hero

  const thumbs = (
    <div className="absolute inset-x-0 bottom-0 z-20 h-28 translate-y-[30%] overflow-hidden">
      {slides.map((item, i) => {
        const offset = loopOffset(i, index, slides.length)
        const distance = Math.abs(offset)
        if (distance > 4) return null
        // the big middle one needs more room than the rest
        const x = Math.sign(offset) * (distance <= 1 ? distance * 60 : 60 + (distance - 1) * 52)
        return (
          <button
            key={item.slug || i}
            type="button"
            aria-label={item.title}
            aria-current={distance === 0 || undefined}
            onClick={() => hero.setIndex(i)}
            className={cn(
              "absolute bottom-3 left-1/2 w-11 origin-bottom overflow-hidden rounded-lg border-2 bg-[#1c1c1f] transition-[transform,opacity,border-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
              distance === 0 ? "z-10 border-white shadow-[0_12px_28px_rgba(0,0,0,0.65)]" : distance === 1 ? "border-white/25" : "border-transparent"
            )}
            style={{
              transform: `translateX(calc(-50% + ${x}px)) translateY(${distance === 0 ? -4 : 0}px) scale(${distance === 0 ? 1.45 : distance === 1 ? 1.05 : 0.9})`,
              opacity: distance === 0 ? 1 : distance === 1 ? 0.9 : distance >= 4 ? 0 : 0.55
            }}
          >
            <PosterImg art={item} src={item.poster || item.image || ""} alt="" loading="lazy" className="aspect-[2/3] w-full object-cover" />
          </button>
        )
      })}
    </div>
  )

  return <HeroCard hero={hero} image={hd?.cover || wide} thumbs={thumbs} />
}
