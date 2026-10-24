import { CommentSection } from "@/features/comments";
import { TitleAbout } from "@/features/title/components/TitleAbout";
import { TitleEpisodes } from "@/features/title/components/TitleEpisodes";
import { TitleFacts } from "@/features/title/components/TitleFacts";
import { TitleHero } from "@/features/title/components/TitleHero";
import { TitleRelated } from "@/features/title/components/TitleRelated";
import type { TitleView } from "@/features/title/hooks/use-title-detail";

/** What the title preview shows, the same in the mobile sheet and the desktop dialog */
export function TitleBody({ t }: { t: TitleView }) {
  return (
    <div className="w-full bg-[#181818] text-white">
      <TitleHero t={t} />
      <div className="px-4 py-5 space-y-6 sm:px-8 sm:py-6 sm:space-y-8 bg-[#181818]">
        <TitleFacts t={t} />
        <TitleEpisodes t={t} />
        <TitleRelated t={t} />
        <TitleAbout t={t} />
        {/* only while open: the closed preview stays mounted for its animation and must not fetch */}
        {t.isOpen && t.detailSlug && <CommentSection slug={t.detailSlug} />}
      </div>
    </div>
  );
}
