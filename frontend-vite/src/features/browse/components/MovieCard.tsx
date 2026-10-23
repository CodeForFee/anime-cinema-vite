
import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Chip, Button, Tooltip } from "@heroui/react";
import { LazyImage } from "@/features/title/components/LazyImage";
import { AnimeItem } from "@/core/types/anime";
import { useHistoryStore } from "@/core/stores/history";
import { useUIStore } from "@/features/title/store";
import { cn } from "@/shared/lib/utils";
import { Heart, Info, Play, Star } from "lucide-react";

interface MovieCardProps {
  anime: AnimeItem;
  className?: string;
}

export const MovieCard: React.FC<MovieCardProps> = ({ anime, className }) => {
  const [mounted, setMounted] = useState(false);
  const favorites = useHistoryStore((state) => state.favorites);
  const toggleFavorite = useHistoryStore((state) => state.toggleFavorite);
  const openInfoModal = useUIStore((state) => state.openInfoModal);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isFavorite = mounted && anime?.slug ? favorites.some((f) => f.slug === anime.slug) : false;

  const fallbackImage =
    "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=60";

  if (!anime) return null;

  const handleCardClick = (e: React.MouseEvent) => {
    // If click didn't originate from a button or link, open info modal
    const target = e.target as HTMLElement;
    if (!target.closest("button") && !target.closest("a")) {
      openInfoModal(anime);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        // flex-shrink-0: in a horizontal shelf the card must keep its width and scroll, not squeeze to fit the row
        "card-lift group relative flex-shrink-0 bg-[#10121A]/90 hover:shadow-[0_10px_30px_rgba(229,9,20,0.25)] transition-all duration-300 rounded-xl overflow-hidden select-none cursor-pointer",
        // Grids pass w-full and size the card by their columns; everywhere else it gets the shelf width
        !className?.includes("w-full") && "w-44 md:w-52",
        className
      )}
    >
      <div className="p-0 overflow-hidden relative aspect-[2/3] bg-black/40">
        {/* Main Poster Image, under the card's glass rim (globals.css) */}
        <span aria-hidden className="glass-rim absolute inset-0 z-[5] rounded-t-xl" />
        <LazyImage
          alt={anime.title}
          art={anime}
          src={anime.poster || anime.image || fallbackImage}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-[transform,opacity] duration-500"
          fallbackSrc={fallbackImage}
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-20 pointer-events-auto">
          {/* Episode / Quality / Upcoming / Rank Chip */}
          <Chip
            size="sm"
            variant="shadow"
            className={`backdrop-blur-md text-white font-bold text-[10px] h-6 px-2 rounded-[4px] border ${
              anime.isUpcoming
                ? "bg-primaryRed text-white border-red-400"
                : anime.rank
                ? "bg-amber-500 text-black border-amber-300"
                : "bg-black/75 border-white/10"
            }`}
          >
            {anime.isUpcoming
              ? anime.releaseDate || "SẮP CHIẾU"
              : anime.rank
              ? `TOP #${anime.rank}`
              : anime.latestEpisode || anime.episode || anime.quality || "HD Vietsub"}
          </Chip>

          {/* Favorite Toggle Button */}
          <Tooltip content={isFavorite ? "Bỏ yêu thích" : "Yêu thích"} placement="left" delay={200}>
            <Button
              isIconOnly
              size="sm"
              radius="full"
              variant="flat"
              onPress={(e) => {
                toggleFavorite({
                  slug: anime.slug,
                  title: anime.title,
                  poster: anime.poster || anime.image || fallbackImage,
                  genres: anime.genres,
                  year: anime.year,
                  rating: anime.rating,
                });
              }}
              className={`w-7 h-7 min-w-7 backdrop-blur-md ${
                isFavorite
                  ? "bg-primaryRed text-white shadow-[0_0_10px_#E50914]"
                  : "bg-black/60 text-white/80 hover:text-white hover:bg-black/90 border border-white/10"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-current text-white" : "text-gray-300"}`} />
            </Button>
          </Tooltip>
        </div>

        {/* Hover Overlay with Quick Action Buttons. Mouse only: it can't be seen on a touch screen, so there
            it is removed and a tap anywhere on the card opens the details. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-300 flex flex-col items-center justify-end p-4 text-center z-10 [@media(hover:none)]:hidden">
          <Link
            to="/watch"
            search={{ slug: anime.slug }}
            aria-label={`Xem ${anime.title}`}
            onClick={(e) => e.stopPropagation()}
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primaryRed text-white shadow-xl shadow-red-600/50 transition-transform hover:scale-110 active:scale-95"
          >
            <Play className="fill-current w-5 h-5 ml-0.5" />
          </Link>

          <Button
            size="sm"
            variant="light"
            onPress={() => openInfoModal(anime)}
            className="text-gray-300 hover:text-white text-xs h-7 px-2"
            startContent={<Info className="w-3.5 h-3.5" />}
          >
            Chi tiết
          </Button>
        </div>
      </div>

      {/* Card Info Footer */}
      <div className="p-3 bg-[#0B0D14] flex flex-col items-start gap-1">
        <Link
          to="/watch"
          search={{ slug: anime.slug }}
          onClick={(e) => e.stopPropagation()}
          className="w-full"
        >
          <p className="text-xs md:text-sm font-semibold text-white truncate w-full group-hover:text-primaryRed transition-colors">
            {anime.title}
          </p>
        </Link>
        <div className="flex items-center justify-between w-full text-[11px] text-gray-400">
          <span>{anime.year || "Anime"}</span>
          <div className="flex items-center gap-1 text-amber-400 font-medium">
            <Star className="fill-current w-3 h-3 text-amber-400" />
            <span>{anime.rating || "9.5"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
