import { Heart, Star } from "lucide-react";
import { useHistoryStore } from "@/core/stores/history";
import { useUIStore } from "@/features/title";
import type { AnimeItem } from "@/core/types/anime";
import { LazyImage } from "@/features/title";

/**
 * Poster for grids (explore, favorites): the art fills the tile, title and facts sit on a frosted strip
 * over it, heart in the corner. Tapping opens the title's preview (InfoModal), like MovieCard.
 */
export function PosterTile({ anime }: { anime: AnimeItem }) {
  const isFavorite = useHistoryStore((state) => state.favorites.some((f) => f.slug === anime.slug));
  const toggleFavorite = useHistoryStore((state) => state.toggleFavorite);
  const openInfoModal = useUIStore((state) => state.openInfoModal);
  const badge = anime.isUpcoming
    ? anime.releaseDate || "Sắp chiếu"
    : anime.rank
      ? `#${anime.rank}`
      : anime.latestEpisode || anime.episode || anime.quality;

  return (
    // skipped off-screen tiles keep the card's own 2:3 height: a guessed intrinsic size taller than the card
    // left an empty band under every shelf row
    <div className="relative aspect-[2/3] [content-visibility:auto]">
      <button
        type="button"
        onClick={() => openInfoModal(anime)}
        aria-label={anime.title}
        className="card-lift group relative block w-full overflow-hidden rounded-xl bg-white/5 text-left transition active:scale-[0.97]"
      >
        <span className="relative block aspect-[2/3]">
          <LazyImage
            art={anime}
            src={anime.poster || anime.image}
            alt=""
            className="h-full w-full object-cover transition-[transform,opacity] duration-500 md:group-hover:scale-105"
          />
          {badge && (
            <span className="absolute left-2 top-2 rounded-lg bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white ring-1 ring-white/15">
              {badge}
            </span>
          )}
          <span className="poster-caption absolute inset-x-2 bottom-2 rounded-xl px-2.5 py-2 ring-1 ring-white/15">
            <span className="line-clamp-2 text-sm font-semibold leading-tight text-white">{anime.title}</span>
            {(anime.year || anime.rating) && (
              <span className="mt-1 flex items-center gap-2 text-xs text-gray-300">
                {anime.year && <span>{anime.year}</span>}
                {anime.rating && (
                  <span className="flex items-center gap-0.5">
                    <Star aria-hidden className="h-3 w-3 fill-current text-amber-400" />
                    {anime.rating}
                  </span>
                )}
              </span>
            )}
          </span>
        </span>
        <span aria-hidden className="glass-rim absolute inset-0" />
      </button>
      <button
        type="button"
        aria-label={isFavorite ? `Bỏ ${anime.title} khỏi danh sách` : `Lưu ${anime.title}`}
        aria-pressed={isFavorite}
        onClick={() =>
          toggleFavorite({
            slug: anime.slug,
            title: anime.title,
            poster: anime.poster || anime.image || "",
            genres: anime.genres,
            year: anime.year,
            rating: anime.rating,
          })
        }
        className={`glass-pill absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full transition active:scale-90 ${
          isFavorite ? "text-primaryRed" : "text-white"
        }`}
      >
        <Heart aria-hidden className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
      </button>
    </div>
  );
}
