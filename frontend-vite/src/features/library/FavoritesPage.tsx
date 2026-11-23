import { EmptyShelf } from "@/features/library/components/EmptyShelf";
import { AmbientBackdrop } from "@/shared/ui/AmbientBackdrop";
import { InfoModal } from "@/features/title";
import { PosterTile } from "@/features/browse";
import { useHistoryStore } from "@/core/stores/history";
import { useHomeQuery } from "@/core/queries";
import { Link } from "@tanstack/react-router";

export default function FavoritesPage() {
  const favorites = useHistoryStore((state) => state.favorites);
  const history = useHistoryStore((state) => state.history);
  // "Tập mới": a saved title in today's "Mới cập nhật" that was not watched since that list was loaded
  const { data: home, dataUpdatedAt } = useHomeQuery();
  const fresh = new Map(
    (home?.latest ?? [])
      .filter((item) => {
        const seen = history.find((h) => h.slug === item.slug);
        return !seen || seen.updatedAt < dataUpdatedAt;
      })
      .map((item) => [item.slug, item.latestEpisode || item.episode || ""]),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-4 pb-6 md:space-y-8 md:px-8 md:py-10">
      <AmbientBackdrop src={favorites[0]?.poster} />

      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
            Danh sách của tôi
          </h1>
          {favorites.length > 0 && (
            <p className="mt-1 text-sm text-gray-400">
              {favorites.length} phim đã lưu
            </p>
          )}
        </div>
        <Link
          to="/settings"
          className="glass-pill h-9 shrink-0 rounded-full px-4 text-sm font-medium leading-9 text-gray-300 hover:text-white"
        >
          Sao lưu
        </Link>
      </header>

      {favorites.length === 0 ? (
        <EmptyShelf
          line="Danh sách còn trống."
          hint="Nhấn trái tim trên poster để để dành phim xem sau."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5 xl:grid-cols-6">
          {favorites.map((fav) => (
            <PosterTile
              key={fav.slug}
              anime={
                fresh.has(fav.slug)
                  ? {
                      ...fav,
                      latestEpisode: fresh.get(fav.slug)
                        ? `Mới: ${fresh.get(fav.slug)}`
                        : "Tập mới",
                    }
                  : fav
              }
            />
          ))}
        </div>
      )}

      <InfoModal />
    </div>
  );
}
