import type { AnimeItem } from "@/core/types/anime";
import { RankedShelf } from "@/features/home/components/RankedShelf";
import { HeroDesktop } from "@/features/home/desktop/HeroDesktop";
import { Top10Row } from "@/features/home/desktop/Top10Row";

/** Desktop top of the home page: the wide hero, then the ranked list as a row of slanted cards */
export default function HomeTop({ ranked }: { ranked: AnimeItem[] }) {
  return (
    <>
      <HeroDesktop items={ranked} />
      {ranked.length > 0 && (
        <RankedShelf title="Phim Nổi Bật Đề Cử" seeMore={{}}>
          <Top10Row items={ranked} />
        </RankedShelf>
      )}
    </>
  );
}
