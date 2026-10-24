import type { AnimeItem } from "@/core/types/anime";
import { RankedShelf } from "@/features/home/components/RankedShelf";
import { HeroMobile } from "@/features/home/mobile/HeroMobile";
import { StackCarousel } from "@/features/home/mobile/StackCarousel";

/** Mobile top of the home page: the hero, then the ranked list as a cover flow to swipe */
export default function HomeTop({ ranked }: { ranked: AnimeItem[] }) {
  return (
    <>
      <HeroMobile items={ranked} />
      {ranked.length > 0 && (
        <RankedShelf title="Phim Nổi Bật Đề Cử" seeMore={{}}>
          <StackCarousel items={ranked} />
        </RankedShelf>
      )}
    </>
  );
}
