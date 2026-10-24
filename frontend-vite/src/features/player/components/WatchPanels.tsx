import { Link } from "@tanstack/react-router";
import { ArrowLeft, CircleAlert, Heart, SkipForward } from "lucide-react";

import type { WatchSession } from "@/features/player/hooks/use-watch-session";
import { PosterImg } from "@/features/title";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";

/** Placeholder with the same layout as the loaded page: player box, server row, episode card */
export function WatchSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <Skeleton className="h-5 w-24 bg-white/10" />
      <Skeleton variant="rounded" className="aspect-video w-full bg-white/10" />
      <Skeleton variant="rounded" className="h-16 w-full bg-white/10" />
      <Skeleton variant="rounded" className="h-40 w-full bg-white/10" />
    </div>
  );
}

export function WatchError() {
  return (
    <div className="max-w-xl mx-auto my-20 p-8 rounded-3xl bg-[#10121A] border border-white/10 text-center space-y-4">
      <CircleAlert className="w-14 h-14 text-primaryRed mx-auto" />
      <h2 className="text-xl font-bold text-white">
        Không thể tải thông tin phim
      </h2>
      <p className="text-sm text-gray-400">
        Vui lòng kiểm tra kết nối hoặc quay lại trang chủ.
      </p>
      <Link
        to="/"
        className={buttonVariants({
          variant: "unstyled",
          size: "unstyled",
          className:
            "mt-4 h-10 rounded-full bg-primaryRed px-6 font-semibold text-white hover:bg-red-600",
        })}
      >
        Quay lại Trang Chủ
      </Link>
    </div>
  );
}

/** Back, and the favourite button */
export function WatchTopBar({ watch }: { watch: WatchSession }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Link
        to="/"
        className="glass-pill inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium text-gray-200 transition-colors hover:text-white"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Quay lại</span>
      </Link>
      <Button
        variant="unstyled"
        size="unstyled"
        onClick={watch.toggleFavorite}
        className={`h-9 rounded-full px-4 text-sm font-semibold transition-colors flex items-center gap-2 ${
          watch.isFavorite
            ? "border border-primaryRed/50 bg-primaryRed/20 text-white shadow-[0_0_18px_rgba(229,9,20,0.35)]"
            : "glass-pill text-gray-200 hover:text-white"
        }`}
      >
        <Heart
          className={`w-3.5 h-3.5 ${watch.isFavorite ? "fill-current" : ""}`}
        />
        <span>{watch.isFavorite ? "Đã yêu thích" : "Yêu thích"}</span>
      </Button>
    </div>
  );
}

/** What is playing, with the next-episode button */
export function NowPlaying({ watch }: { watch: WatchSession }) {
  const { anime } = watch;
  if (!anime) return null;
  return (
    <div className="glass-card flex items-center gap-3 rounded-3xl p-3 pr-4 md:p-4">
      <PosterImg
        art={anime}
        src={anime.poster || anime.image}
        alt=""
        decoding="async"
        className="h-16 w-12 shrink-0 rounded-xl object-cover shadow-lg md:h-20 md:w-14"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primaryRed">
          Đang xem
        </p>
        <h1 className="truncate font-display text-base font-bold text-white md:text-xl">
          {anime.title}
        </h1>
        <p className="truncate text-xs text-gray-400 md:text-sm">
          {watch.episodeName}
          {watch.episodes.length > 0 && ` · ${watch.episodes.length} tập`}
        </p>
      </div>
      {watch.hasNext && (
        <Button
          variant="unstyled"
          size="unstyled"
          onClick={watch.playNext}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-bold text-black transition active:scale-95"
        >
          <SkipForward className="h-4 w-4 fill-current" />
          <span className="hidden sm:inline">Tập tiếp</span>
        </Button>
      )}
    </div>
  );
}
