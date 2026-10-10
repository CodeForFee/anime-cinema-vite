
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "@/lib/router";
import { Input, Chip } from "@heroui/react";
import { PosterGridSkeleton } from "../components/movie/Skeletons";
import { MovieCard } from "../components/movie/MovieCard";
import { InfoModal } from "../components/movie/InfoModal";
import { useSearchQuery } from "../hooks/useAnimeQuery";
import { useDebounce } from "../hooks/useDebounce";
import { CircleAlert, Search } from "lucide-react";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryParam = searchParams.get("q") || "";
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
    router.push("/search");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Search Header */}
      <div className="max-w-2xl">
        <div className="flex items-center gap-2 text-primaryRed text-sm font-semibold uppercase tracking-wider mb-2">
          <Search className="w-3.5 h-3.5" />
          <span>Tìm Kiếm Trực Tuyến</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-6">Tìm Kiếm Anime Yêu Thích</h1>

        {/* Big Search Input */}
        <Input
          size="lg"
          variant="bordered"
          radius="full"
          isClearable
          onClear={handleClear}
          placeholder="Nhập tên anime (Ví dụ: One Piece, Jujutsu Kaisen, Conan...)"
          value={searchTerm}
          onValueChange={setSearchTerm}
          startContent={<Search className="w-4 h-4 text-primaryRed mr-2" />}
          classNames={{
            inputWrapper: "glass-field h-14 focus-within:!border-primaryRed",
            input: "text-base text-white placeholder:text-gray-400",
          }}
        />
      </div>

      {/* Suggested Keywords */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-gray-400">Gợi ý tìm kiếm:</span>
        {["One Piece", "Chú Thuật Hồi Chiến", "Thám Tử Conan", "Solo Leveling", "Bleach", "Naruto"].map(
          (kw) => (
            <Chip
              key={kw}
              size="sm"
              variant="flat"
              as="button"
              onClick={() => setSearchTerm(kw)}
              className="glass-chip text-gray-200 hover:text-white cursor-pointer transition-colors"
            >
              {kw}
            </Chip>
          )
        )}
      </div>

      {/* Search Results Display */}
      {isLoading ? (
        <PosterGridSkeleton />
      ) : results.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              Kết quả tìm kiếm cho &ldquo;{debouncedSearch}&rdquo; ({results.length} anime)
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
            Vui lòng kiểm tra lại chính tả hoặc thử tìm kiếm bằng từ khóa tiếng Việt / tiếng Anh khác.
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
    <Suspense
      fallback={
        <div className="min-h-[70vh]" />
      }
    >
      <SearchContent />
    </Suspense>
  );
}
