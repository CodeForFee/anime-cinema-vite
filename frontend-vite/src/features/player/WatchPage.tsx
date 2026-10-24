import { Sparkles } from "lucide-react";

import { MovieShelf } from "@/features/browse";
import { CommentSection } from "@/features/comments";
import { CinemaPlayer } from "@/features/player/components/CinemaPlayer";
import { EpisodeGrid } from "@/features/player/components/EpisodeGrid";
import {
  NowPlaying,
  WatchError,
  WatchSkeleton,
  WatchTopBar,
} from "@/features/player/components/WatchPanels";
import { useWatchSession } from "@/features/player/hooks/use-watch-session";
import { usePlayerStore } from "@/features/player/store";
import { AnimeDetailTabs, InfoModal } from "@/features/title";
import { AmbientBackdrop } from "@/shared/ui/AmbientBackdrop";

/** /watch?slug=&ep=: the player, what is playing, the episodes, the details and related titles */
export default function WatchPage() {
  const watch = useWatchSession();
  const isTheaterMode = usePlayerStore((s) => s.isTheaterMode);
  const { anime, episode, streamData } = watch;

  if (watch.isLoading) return <WatchSkeleton />;
  if (watch.error || !anime) return <WatchError />;

  return (
    <div
      // phones: the back / favourite bar sits right under the header, not a band lower
      className={`mx-auto px-4 md:px-8 pt-3 pb-6 md:pt-6 space-y-4 md:space-y-6 transition-[max-width] duration-300 ${
        // on desktop the column is never wider than a 16:9 player that still fits the screen height
        // (4rem = the column's side padding), so the player fills it with no black bars at the sides
        isTheaterMode
          ? "max-w-[1600px] lg:max-w-[min(1600px,calc((100vh_-_11rem)*16/9_+_4rem))]"
          : "max-w-6xl lg:max-w-[min(72rem,calc((100vh_-_11rem)*16/9_+_4rem))]"
      }`}
    >
      {/* blurred 64 px anyway: the poster the previous page already loaded, no new download while the episode starts */}
      <AmbientBackdrop src={anime.poster || anime.backdrop} />

      <WatchTopBar watch={watch} />

      <CinemaPlayer
        embedUrl={streamData?.embedUrl}
        sources={streamData?.sources}
        failed={watch.streamFailed}
        title={anime.title}
        episodeName={watch.episodeName}
        progressKey={watch.progressKey}
        episodes={watch.episodes}
        currentEpisodeId={episode?.id}
        onSelectEpisode={watch.select}
        onRefresh={watch.refetchStream}
        onNextEpisode={watch.playNext}
        hasNextEpisode={watch.hasNext}
        onNearEnd={watch.prefetchNext}
        skipLookup={watch.skipLookup || undefined}
      />

      <NowPlaying watch={watch} />

      <div
        aria-busy={watch.switchingPart}
        className={
          watch.switchingPart
            ? "pointer-events-none animate-pulse opacity-50 transition-opacity"
            : "transition-opacity"
        }
      >
        <EpisodeGrid
          episodes={anime.episodes || []}
          currentEpisodeSlug={episode?.name || ""}
          onSelectEpisode={watch.select}
          seasons={anime.seasons || []}
          // the picked part shows at once, even while its episodes load
          currentSlug={watch.slug}
        />
      </div>

      <AnimeDetailTabs anime={anime} />

      <CommentSection
        slug={watch.slug}
        episode={episode ? { id: episode.id, name: episode.name } : undefined}
      />

      {anime.related && anime.related.length > 0 && (
        <MovieShelf
          title="Phim Liên Quan"
          icon={Sparkles}
          items={anime.related}
        />
      )}

      <InfoModal />
    </div>
  );
}
