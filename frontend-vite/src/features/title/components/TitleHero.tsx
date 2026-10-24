import { Check, Play, Plus, ThumbsUp, Volume2, VolumeX, X } from "lucide-react";

import type { TitleView } from "@/features/title/hooks/use-title-detail";
import { Button } from "@/shared/ui/button";

const ROUND =
  "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer";
const ROUND_IDLE =
  "bg-[#2a2a2a]/60 border-[#808080] hover:border-white text-white hover:bg-[#2a2a2a]/90";

/** Trailer (or backdrop), title and the play / list / like buttons. On mobile dragging it pulls the sheet down. */
export function TitleHero({ t }: { t: TitleView }) {
  return (
    <div
      data-sheet-handle
      className="relative w-full sm:aspect-video bg-[#181818] sm:bg-black overflow-hidden select-none"
    >
      {/* the trailer plays muted behind the title */}
      {t.trailerEmbed ? (
        <iframe
          ref={t.trailerRef}
          src={t.trailerEmbed}
          title={`Trailer ${t.title}`}
          className="w-full aspect-video bg-black sm:aspect-auto sm:h-full pointer-events-none"
          allow="autoplay; encrypted-media"
        />
      ) : (
        <img
          src={t.backdrop}
          alt={t.title}
          className="w-full aspect-video sm:aspect-auto sm:h-full object-cover object-top"
          onError={(e) => {
            (e.target as HTMLImageElement).src = t.poster;
          }}
        />
      )}

      {/* only where the title sits over the picture */}
      <div className="absolute inset-0 hidden sm:block bg-gradient-to-t from-[#181818] via-[#181818]/30 to-transparent" />
      <div className="absolute inset-0 hidden sm:block bg-gradient-to-r from-[#181818]/70 via-[#181818]/20 to-transparent" />

      <button
        onClick={t.close}
        type="button"
        aria-label="Đóng"
        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 w-9 h-9 rounded-full bg-[#181818] hover:bg-[#282828] border border-white/20 hover:border-white/50 text-white flex items-center justify-center transition-colors shadow-lg cursor-pointer"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      <div className="relative z-20 flex items-end justify-between gap-4 px-4 pt-4 sm:absolute sm:bottom-8 sm:left-8 sm:right-8 sm:px-0 sm:pt-0">
        <div className="space-y-4 max-w-xl">
          <div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] leading-none line-clamp-2">
              {t.title}
            </h2>
            {t.subTitle && (
              <p className="text-xs sm:text-sm text-gray-300 font-medium drop-shadow-md mt-1.5 line-clamp-1">
                {t.subTitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <Button
              variant="unstyled"
              size="unstyled"
              onClick={() => t.play()}
              className="bg-white hover:bg-white/90 text-black font-extrabold px-6 h-10 rounded-[4px] shadow-lg flex items-center gap-2 text-sm sm:text-base cursor-pointer"
            >
              <Play className="fill-current w-4 h-4 text-black mr-1" />
              <span>Phát</span>
            </Button>

            <button
              onClick={t.toggleFavorite}
              type="button"
              title={
                t.isFavorite
                  ? "Xóa khỏi danh sách của tôi"
                  : "Thêm vào danh sách của tôi"
              }
              className={`${ROUND} ${t.isFavorite ? "bg-white/20 border-white text-white" : ROUND_IDLE}`}
            >
              {t.isFavorite ? (
                <Check className="w-4 h-4 text-white" />
              ) : (
                <Plus className="w-4 h-4 text-white" />
              )}
            </button>

            <button
              onClick={t.toggleLike}
              type="button"
              title={t.isLiked ? "Đã thích" : "Tôi thích phim này"}
              className={`${ROUND} ${t.isLiked ? "bg-primaryRed/40 border-primaryRed text-primaryRed" : ROUND_IDLE}`}
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        {t.trailerUrl && (
          <button
            onClick={t.toggleAudio}
            type="button"
            title={
              t.isMuted
                ? "Bật âm thanh (Đang tắt tiếng)"
                : "Tắt âm thanh (Đang phát tiếng)"
            }
            className="w-10 h-10 rounded-full bg-[#181818]/80 hover:bg-[#282828] border border-[#808080] hover:border-white text-white flex items-center justify-center transition-colors shadow-lg cursor-pointer flex-shrink-0"
          >
            {t.isMuted ? (
              <VolumeX className="w-4 h-4 text-gray-300" />
            ) : (
              <Volume2 className="w-4 h-4 text-white" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
