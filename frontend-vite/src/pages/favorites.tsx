
import React from "react";
import { Link } from "@/lib/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBookmark } from "@fortawesome/free-solid-svg-icons";
import { Button, Chip } from "@heroui/react";
import { useHistoryStore } from "../stores/useHistoryStore";
import { MovieCard } from "../components/movie/MovieCard";
import { InfoModal } from "../components/movie/InfoModal";

export default function FavoritesPage() {
  const favorites = useHistoryStore((state) => state.favorites);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primaryRed text-sm font-semibold uppercase tracking-wider mb-1">
            <FontAwesomeIcon icon={faBookmark} className="w-3.5 h-3.5" />
            <span>Bộ Sưu Tập Cá Nhân</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Danh Sách Yêu Thích & Xem Sau</h1>
        </div>

        {favorites.length > 0 && (
          <Chip size="md" color="danger" variant="flat" className="font-bold">
            {favorites.length} bộ phim đã lưu
          </Chip>
        )}
      </div>

      {/* Favorites Grid */}
      {favorites.length === 0 ? (
        <div className="p-16 rounded-3xl bg-[#10121A] border border-white/10 text-center text-gray-400 space-y-4">
          <FontAwesomeIcon icon={faBookmark} className="w-14 h-14 text-gray-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Chưa có phim nào trong danh sách yêu thích</h3>
          <p className="text-xs max-w-sm mx-auto">
            Bấm vào biểu tượng trái tim ❤️ ở bất kỳ poster phim nào để lưu lại danh sách theo dõi của bạn.
          </p>
          <Link href="/">
            <Button color="danger" radius="full" className="bg-primaryRed text-white mt-2">
              Khám Phá Phim Ngay
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-8 sm:gap-x-6 sm:gap-y-9">
          {favorites.map((fav) => (
            <MovieCard
              key={fav.slug}
              anime={{
                slug: fav.slug,
                title: fav.title,
                poster: fav.poster,
                genres: fav.genres,
                year: fav.year,
                rating: fav.rating,
              }}
              className="w-full"
            />
          ))}
        </div>
      )}

      {/* Global Info Modal */}
      <InfoModal />
    </div>
  );
}
