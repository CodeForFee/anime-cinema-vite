import { AmbientBackdrop, EmptyShelf } from "../components/layout/AmbientBackdrop";
import { InfoModal } from "../components/movie/InfoModal";
import { PosterTile } from "../components/movie/PosterTile";
import { useHistoryStore } from "../stores/useHistoryStore";

export default function FavoritesPage() {
  const favorites = useHistoryStore((state) => state.favorites);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-4 pb-6 md:space-y-8 md:px-8 md:py-10">
      <AmbientBackdrop src={favorites[0]?.poster} />

      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">Danh sách của tôi</h1>
        {favorites.length > 0 && <p className="mt-1 text-sm text-gray-400">{favorites.length} phim đã lưu</p>}
      </header>

      {favorites.length === 0 ? (
        <EmptyShelf line="Danh sách còn trống." hint="Nhấn trái tim trên poster để để dành phim xem sau." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5 xl:grid-cols-6">
          {favorites.map((fav) => (
            <PosterTile key={fav.slug} anime={fav} />
          ))}
        </div>
      )}

      <InfoModal />
    </div>
  );
}
