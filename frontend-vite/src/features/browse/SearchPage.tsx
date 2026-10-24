import React, { useState, useEffect, Suspense } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { PosterGridSkeleton } from "@/shared/ui/skeletons";
import { MovieCard } from "@/features/browse/components/MovieCard";
import { InfoModal } from "@/features/title";
import { useSearchQuery } from "@/core/queries";
import { useDebounce } from "@/shared/lib/useDebounce";
import { CircleAlert, Search, X } from "lucide-react";

function SearchContent() {
  const navigate = useNavigate();
  const queryParam = useSearch({
    from: "/search",
    select: (search) => search.q ?? "",
  });
  const [searchTerm, setSearchTerm] = useState(queryParam);
  const debouncedSearch = useDebounce(searchTerm, 350);

  // TanStack Query for Search
  const { data: searchRes, isLoading } = useSearchQuery(debouncedSearch);
  const results = searchRes?.items || [];

  useEffect(() => {
    if (queryParam) {
      setSearchTerm(queryParam);
    }
  }, [queryParam]);

  const handleClear = () => {
    setSearchTerm("");
    void navigate({ to: "/search", search: {}, resetScroll: false });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Search Header */}
      <div className="max-w-2xl">
        <div className="flex items-center gap-2 text-primaryRed text-sm font-semibold uppercase tracking-wider mb-2">
          <Search className="w-3.5 h-3.5" />
          <span>Tìm Kiếm Trực Tuyến</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-6">
          Tìm Kiếm Anime Yêu Thích
        </h1>

        {/* Big Search Input */}
        <div className="glass-field flex h-14 items-center gap-3 rounded-full px-5 focus-within:!border-primaryRed">
          <Search aria-hidden className="w-4 h-4 shrink-0 text-primaryRed" />
          <input
            type="search"
            aria-label="Tên anime"
            placeholder="Nhập tên anime (Ví dụ: One Piece, Jujutsu Kaisen, Conan...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-gray-400 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {searchTerm && (
            <button
              type="button"
              aria-label="Xoá"
              onClick={handleClear}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-300 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Suggested Keywords */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-gray-400">Gợi ý tìm kiếm:</span>
        {[
          "One Piece",
          "Chú Thuật Hồi Chiến",
          "Thám Tử Conan",
          "Solo Leveling",
          "Bleach",
          "Naruto",
        ].map((kw) => (
          <button
            type="button"
            key={kw}
            onClick={() => setSearchTerm(kw)}
            className="glass-chip h-7 rounded-full px-3 text-gray-200 hover:text-white cursor-pointer transition-colors"
          >
            {kw}
          </button>
        ))}
      </div>

      {/* Search Results Display */}
      {isLoading ? (
        <PosterGridSkeleton />
      ) : results.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              Kết quả tìm kiếm cho &ldquo;{debouncedSearch}&rdquo; (
              {results.length} anime)
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-8 sm:gap-x-6 sm:gap-y-9">
            {results.map((anime) => (
              <MovieCard
                key={anime.slug || anime.title}
                anime={anime}
                className="w-full"
              />
            ))}
          </div>
        </div>
      ) : debouncedSearch.trim() ? (
        <div className="p-16 rounded-3xl bg-[#10121A] border border-white/10 text-center text-gray-400 space-y-3">
          <CircleAlert className="w-10 h-10 text-gray-400 mx-auto" />
          <p className="text-base font-semibold text-white">
            Không tìm thấy kết quả nào cho &ldquo;{debouncedSearch}&rdquo;
          </p>
          <p className="text-xs max-w-sm mx-auto">
            Vui lòng kiểm tra lại chính tả hoặc thử tìm kiếm bằng từ khóa tiếng
            Việt / tiếng Anh khác.
          </p>
        </div>
      ) : null}

      {/* Global Info Modal */}
      <InfoModal />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <SearchContent />
    </Suspense>
  );
}
