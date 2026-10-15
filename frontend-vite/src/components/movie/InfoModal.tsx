
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "@/lib/router";
import { Dialog, DialogContent, isPhoneWidth, SHEET_EXIT_MS } from "../lightswind/dialog";
import { preloadRoute } from "@/lib/routes";
import { Button } from "../lightswind/button";
import { PickerDropdown } from "./PickerDropdown";
import { LazyImage } from "./LazyImage";
import { EpisodeRowsSkeleton } from "./Skeletons";
import { useHistoryStore } from "../../stores/useHistoryStore";
import { useUIStore } from "../../stores/useUIStore";
import { onBack } from "../../logic/back";
import { useAnimeDetailQuery } from "../../hooks/useAnimeQuery";
import { cn, formatEpisodeName, haptic } from "../../lib/utils";
import { Check, Play, Plus, ThumbsUp, Volume2, VolumeX, X } from "lucide-react";

export const InfoModal: React.FC = () => {
  const router = useRouter();
  const selectedAnime = useUIStore((state) => state.selectedAnime);
  const isOpen = useUIStore((state) => state.isInfoModalOpen);
  const onClose = useUIStore((state) => state.closeInfoModal);
  const openInfoModal = useUIStore((state) => state.openInfoModal);
  // Android back closes the preview instead of leaving the page
  useEffect(() => (isOpen ? onBack(onClose) : undefined), [isOpen, onClose]);

  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  // Phones show a short synopsis until it is expanded
  const [isSynopsisOpen, setIsSynopsisOpen] = useState(false);
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const favorites = useHistoryStore((state) => state.favorites);
  const toggleFavorite = useHistoryStore((state) => state.toggleFavorite);

  // Fetch full rich details dynamically for selected anime
  const { data: detailRes, isLoading: isDetailLoading } = useAnimeDetailQuery(selectedAnime?.slug || "");
  const detail = detailRes?.data;

  // Season picked in the episode list (null = the anime the modal was opened for)
  const [seasonSlug, setSeasonSlug] = useState<string | null>(null);
  const { data: seasonRes, isLoading: isSeasonLoading } = useAnimeDetailQuery(seasonSlug || "");
  const episodeSource = seasonSlug ? seasonRes?.data : detail;

  // Reset state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      if (modalBodyRef.current) {
        modalBodyRef.current.scrollTop = 0;
      }
      setIsMuted(true);
      setSeasonSlug(null);
      setIsSynopsisOpen(false);
    }
  }, [isOpen, selectedAnime?.slug]);

  // Close on Escape (the Lightswind dialog itself only closes on a backdrop click)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const anime = detail || selectedAnime;
  const isFavorite = Boolean(anime?.slug && favorites.some((f) => f.slug === anime.slug));

  const title = anime?.title || selectedAnime?.title || "Anime";
  const subTitle = anime?.subTitle || selectedAnime?.subTitle || anime?.originalTitle || "";
  const synopsis =
    anime?.synopsis || selectedAnime?.synopsis || "Đang cập nhật nội dung chi tiết cho bộ anime này...";
  const poster =
    anime?.poster ||
    anime?.image ||
    selectedAnime?.poster ||
    selectedAnime?.image ||
    "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=60";
  const backdrop =
    detail?.banner ||
    anime?.backdrop ||
    anime?.banner ||
    (Array.isArray(detail?.gallery) && detail.gallery.length > 0 ? detail.gallery[0] : null) ||
    poster;

  const meta = detail?.metadata && typeof detail.metadata === "object" ? detail.metadata : {};
  const trailerUrl = typeof detail?.trailerUrl === "string" ? detail.trailerUrl : "";
  const episodes = Array.isArray(episodeSource?.episodes) ? episodeSource.episodes : [];
  const seasons = Array.isArray(detail?.seasons) ? detail.seasons : [];
  const activeSlug = seasonSlug || anime?.slug || selectedAnime?.slug || "";
  const activeSeason = seasons.find((s) => s.slug === activeSlug) || seasons.find((s) => s.isCurrent);
  const characters = Array.isArray(detail?.characters) ? detail.characters : [];
  const related = Array.isArray(detail?.related) ? detail.related : [];
  const rawGenres = Array.isArray(anime?.genres) ? anime.genres : Array.isArray(selectedAnime?.genres) ? selectedAnime.genres : [];

  // Match score & metadata
  const ratingPercent = detail?.ratingPercent
    ? `${detail.ratingPercent} Phù hợp`
    : anime?.rating
    ? `${Math.round(Number(anime.rating) * 10)}% Phù hợp`
    : "98% Phù hợp";
  const releaseYear = meta["Season"] || (anime?.year ? String(anime.year) : "2025");
  const totalEpisodes = detail?.episodes?.length || 0;
  const duration =
    seasons.length > 1
      ? `${seasons.length} phần`
      : meta["Thời lượng"] || (totalEpisodes > 0 ? `${totalEpisodes} tập` : selectedAnime?.latestEpisode || detail?.status || "HD Vietsub");
  const ageRating = meta["Rating"] || "T16";
  // "PG-13 - Teens 13 tuổi trở lên" -> boxed code + plain description, like Netflix
  const [ageCode, ...ageNoteParts] = String(ageRating).split(" - ");
  const ageNote = ageNoteParts.join(" - ");
  const episodeThumb = (seasonSlug && (seasonRes?.data?.banner || seasonRes?.data?.backdrop)) || backdrop;
  const quality = anime?.quality || "HD";

  // Episode chunk ranges for large series (like One Piece, Conan)
  const CHUNK_SIZE = 50;
  const episodeChunks = useMemo(() => {
    if (episodes.length <= CHUNK_SIZE) return [];
    const chunks = [];
    for (let i = 0; i < episodes.length; i += CHUNK_SIZE) {
      const end = Math.min(i + CHUNK_SIZE, episodes.length);
      chunks.push({
        rangeLabel: `Tập ${i + 1} - ${end}`,
        startIndex: i,
        endIndex: end,
      });
    }
    return chunks;
  }, [episodes]);

  const [selectedChunkIndex, setSelectedChunkIndex] = useState<number>(0);

  useEffect(() => {
    if (episodeChunks.length > 0) {
      setSelectedChunkIndex(episodeChunks.length - 1);
    } else {
      setSelectedChunkIndex(0);
    }
  }, [episodeChunks.length, activeSlug]);

  const displayedEpisodes = useMemo(() => {
    if (episodeChunks.length === 0) return episodes;
    const chunk = episodeChunks[selectedChunkIndex] || episodeChunks[episodeChunks.length - 1];
    return episodes.slice(chunk.startIndex, chunk.endIndex);
  }, [episodes, episodeChunks, selectedChunkIndex]);

  // Audio mute toggle handler via YouTube postMessage API
  const handleToggleAudio = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: "command",
            func: nextMuted ? "mute" : "unMute",
            args: [],
          }),
          "*"
        );
      } catch (e) {}
    }
  };

  const handlePlay = (epSlug?: string) => {
    haptic();
    onClose();
    // Episodes belong to whichever season is picked in the list
    const url = epSlug
      ? `/watch?slug=${encodeURIComponent(activeSlug)}&ep=${encodeURIComponent(epSlug)}`
      : `/watch?slug=${encodeURIComponent(anime?.slug || selectedAnime?.slug || "")}`;
    preloadRoute(url);
    // On a phone the sheet first drops away completely, then the player rises (lib/router.tsx "up"):
    // starting both at once froze a half-closed sheet into the page change
    if (isPhoneWidth()) setTimeout(() => router.push(url), SHEET_EXIT_MS);
    else router.push(url);
  };

  // Stays mounted while closed, so the dialog can play its closing animation
  if (!selectedAnime && !detail) return null;

  const ytEmbedUrl = trailerUrl
    ? `${trailerUrl}${trailerUrl.includes("?") ? "&" : "?"}autoplay=1&mute=1&controls=0&loop=1&enablejsapi=1&playsinline=1&modestbranding=1&rel=0`
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        ref={modalBodyRef}
        hideCloseButton
        sheetOnMobile
        className="max-w-[1040px] max-h-[92vh] rounded-[8px] border-[#333] bg-[#181818] p-0 text-white shadow-[0_0_80px_rgba(0,0,0,0.95)] max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:w-screen max-sm:max-w-[100vw] max-sm:flex-shrink-0 max-sm:rounded-none max-sm:border-0 max-sm:pt-[var(--inset-top)] max-sm:pb-[var(--inset-bottom)]"
      >
            <div className="w-full bg-[#181818] text-white">
              {/* =========================================================================
                  1. CINEMATIC HERO BANNER (16:9 Live Video Trailer + Action Buttons)
                 ========================================================================= */}
              {/* on phones, dragging the hero pulls the sheet down to close (lightswind/dialog.tsx) */}
              <div data-sheet-handle className="relative w-full sm:aspect-video bg-[#181818] sm:bg-black overflow-hidden select-none">
                {/* Live YouTube Trailer Playing in Background (Muted by default) */}
                {ytEmbedUrl ? (
                  <iframe
                    ref={iframeRef}
                    src={ytEmbedUrl}
                    title={`Trailer ${title}`}
                    className="w-full aspect-video bg-black sm:aspect-auto sm:h-full pointer-events-none"
                    allow="autoplay; encrypted-media"
                  />
                ) : (
                  <img
                    src={backdrop}
                    alt={title}
                    className="w-full aspect-video sm:aspect-auto sm:h-full object-cover object-top"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = poster;
                    }}
                  />
                )}

                {/* Netflix Standard Vignette / Dark Gradients (only where the title overlays the video) */}
                <div className="absolute inset-0 hidden sm:block bg-gradient-to-t from-[#181818] via-[#181818]/30 to-transparent" />
                <div className="absolute inset-0 hidden sm:block bg-gradient-to-r from-[#181818]/70 via-[#181818]/20 to-transparent" />

                {/* Close Button (✕) Top-Right */}
                <button
                  onClick={onClose}
                  type="button"
                  aria-label="Đóng"
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 w-9 h-9 rounded-full bg-[#181818] hover:bg-[#282828] border border-white/20 hover:border-white/50 text-white flex items-center justify-center transition-colors shadow-lg cursor-pointer"
                >
                  <X className="w-5 h-5 text-white" />
                </button>

                {/* Bottom Left Hero Content */}
                <div className="relative z-20 flex items-end justify-between gap-4 px-4 pt-4 sm:absolute sm:bottom-8 sm:left-8 sm:right-8 sm:px-0 sm:pt-0">
                  <div className="space-y-4 max-w-xl">
                    {/* Netflix Stylized Title */}
                    <div>
                      <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] leading-none line-clamp-2">
                        {title}
                      </h2>
                      {subTitle && (
                        <p className="text-xs sm:text-sm text-gray-300 font-medium drop-shadow-md mt-1.5 line-clamp-1">
                          {subTitle}
                        </p>
                      )}
                    </div>

                    {/* Netflix Action Buttons Row */}
                    <div className="flex items-center gap-2.5 pt-1">
                      {/* White "Phát" Play Button (Rectangular with 4px radius) */}
                      <Button
                        variant="unstyled"
                        size="unstyled"
                        onClick={() => handlePlay()}
                        className="bg-white hover:bg-white/90 text-black font-extrabold px-6 h-10 rounded-[4px] shadow-lg flex items-center gap-2 text-sm sm:text-base cursor-pointer"
                      >
                        <Play className="fill-current w-4 h-4 text-black mr-1" />
                        <span>Phát</span>
                      </Button>

                      {/* Add to List / Favorite Circle Button */}
                      <button
                        onClick={() => {
                          haptic();
                          toggleFavorite({
                            slug: anime?.slug || selectedAnime?.slug || "",
                            title,
                            poster,
                            genres: rawGenres,
                            year: anime?.year,
                            rating: anime?.rating,
                          });
                        }}
                        type="button"
                        title={isFavorite ? "Xóa khỏi danh sách của tôi" : "Thêm vào danh sách của tôi"}
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
                          isFavorite
                            ? "bg-white/20 border-white text-white"
                            : "bg-[#2a2a2a]/60 border-[#808080] hover:border-white text-white hover:bg-[#2a2a2a]/90"
                        }`}
                      >
                        {isFavorite ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : (
                          <Plus className="w-4 h-4 text-white" />
                        )}
                      </button>

                      {/* Like / Thích Button */}
                      <button
                        onClick={() => setIsLiked(!isLiked)}
                        type="button"
                        title={isLiked ? "Đã thích" : "Tôi thích phim này"}
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
                          isLiked
                            ? "bg-primaryRed/40 border-primaryRed text-primaryRed"
                            : "bg-[#2a2a2a]/60 border-[#808080] hover:border-white text-white hover:bg-[#2a2a2a]/90"
                        }`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Sound Mute / Unmute Button (Bottom Right) */}
                  {trailerUrl && (
                    <button
                      onClick={handleToggleAudio}
                      type="button"
                      title={isMuted ? "Bật âm thanh (Đang tắt tiếng)" : "Tắt âm thanh (Đang phát tiếng)"}
                      className="w-10 h-10 rounded-full bg-[#181818]/80 hover:bg-[#282828] border border-[#808080] hover:border-white text-white flex items-center justify-center transition-colors shadow-lg cursor-pointer flex-shrink-0"
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4 text-gray-300" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-white" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* =========================================================================
                  2. TWO-COLUMN DETAILS & SYNOPSIS (NETFLIX GRID)
                 ========================================================================= */}
              <div className="px-4 py-5 space-y-6 sm:px-8 sm:py-6 sm:space-y-8 bg-[#181818]">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-8 items-start">
                  {/* Left Column (~65% width) */}
                  <div className="md:col-span-8 space-y-3">
                    {/* Meta row: Match score, Year, Seasons / Duration, HD */}
                    <div className="flex flex-wrap items-center gap-2.5 text-base">
                      {/* Green Match text */}
                      <span className="text-[#46d369] font-bold">
                        {ratingPercent}
                      </span>

                      <span className="text-[#bcbcbc]">{releaseYear}</span>

                      <span className="text-[#bcbcbc]">{duration}</span>

                      {/* HD Box Badge */}
                      <span className="px-1.5 rounded-[3px] text-[11px] leading-[18px] font-medium uppercase border border-[#808080] text-[#e5e5e5]">
                        {quality}
                      </span>
                    </div>

                    {/* Age Rating Box Badge */}
                    <div className="flex flex-wrap items-center gap-2.5 text-sm text-white">
                      <span className="px-2 leading-6 border border-[#808080]">{ageCode}</span>
                      {ageNote && <span>{ageNote}</span>}
                    </div>

                    {/* Release schedule (only when the source provides one) */}
                    {meta["Lịch chiếu"] && (
                      <p className="text-lg font-bold text-white pt-2">
                        Tập mới ra mắt: {String(meta["Lịch chiếu"])}
                      </p>
                    )}

                    {/* Synopsis Body */}
                    <p className={cn("text-[15px] text-white leading-relaxed font-normal pt-1", !isSynopsisOpen && "max-sm:line-clamp-4")}>
                      {synopsis}
                    </p>
                    {synopsis.length > 180 && (
                      <button
                        type="button"
                        onClick={() => setIsSynopsisOpen(!isSynopsisOpen)}
                        className="text-sm font-semibold text-white underline-offset-4 hover:underline sm:hidden"
                      >
                        {isSynopsisOpen ? "Thu gọn" : "Xem thêm"}
                      </button>
                    )}
                  </div>

                  {/* Right Column (~35% width) */}
                  <div className="md:col-span-4 space-y-3 text-sm leading-relaxed">
                    {/* Diễn viên / Nhân vật */}
                    {characters.length > 0 && (
                      <div>
                        <span className="text-[#777]">Diễn viên: </span>
                        <span className="text-white">
                          {characters
                            .slice(0, 4)
                            .map((c) => (typeof c === "object" ? c.name : String(c)))
                            .filter(Boolean)
                            .join(", ")}
                          {characters.length > 4 ? ", thêm" : ""}
                        </span>
                      </div>
                    )}

                    {/* Thể loại */}
                    {rawGenres.length > 0 && (
                      <div>
                        <span className="text-[#777]">Thể loại: </span>
                        <span className="text-white">
                          {rawGenres
                            .map((g: any) => (typeof g === "object" ? g.name || g.slug : String(g)))
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    )}

                    {/* Đạo diễn */}
                    {meta["Đạo diễn"] && (
                      <div>
                        <span className="text-[#777]">Đạo diễn: </span>
                        <span className="text-white">{String(meta["Đạo diễn"])}</span>
                      </div>
                    )}

                    {/* Studio sản xuất */}
                    {meta["Studio"] && (
                      <div>
                        <span className="text-[#777]">Studio: </span>
                        <span className="text-white">{String(meta["Studio"])}</span>
                      </div>
                    )}

                    {/* Quốc gia */}
                    {meta["Quốc gia"] && (
                      <div>
                        <span className="text-[#777]">Quốc gia: </span>
                        <span className="text-white">{String(meta["Quốc gia"])}</span>
                      </div>
                    )}

                    {/* Bộ phim này */}
                    <div>
                      <span className="text-[#777]">Bộ phim này: </span>
                      <span className="text-white">Hóm hỉnh, Hồi hộp, Đầy cảm xúc</span>
                    </div>
                  </div>
                </div>

                {/* =========================================================================
                    3. TẬP PHIM (NETFLIX EPISODE LIST + SEASON / RANGE PICKERS)
                   ========================================================================= */}
                {/* Details still loading: hold the episode list's place */}
                {isDetailLoading && (
                  <div className="pt-6">
                    <h3 className="text-2xl font-bold text-white">Tập</h3>
                    <EpisodeRowsSkeleton count={3} />
                  </div>
                )}

                {(episodes.length > 0 || seasons.length > 1) && (
                  <div className="pt-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-2xl font-bold text-white">Tập</h3>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Episode Range Picker for long series (> 50 eps) */}
                        {episodeChunks.length > 1 && (
                          <PickerDropdown
                            label={episodeChunks[selectedChunkIndex]?.rangeLabel || "Chọn tập"}
                            selectedKey={String(selectedChunkIndex)}
                            onSelect={(key) => setSelectedChunkIndex(Number(key) || 0)}
                            options={episodeChunks.map((chunk, cIdx) => ({
                              key: String(cIdx),
                              label: chunk.rangeLabel,
                            }))}
                          />
                        )}

                        {/* Season / Part Picker */}
                        {seasons.length > 1 && (
                          <PickerDropdown
                            label={activeSeason?.partLabel || "Chọn phần"}
                            selectedKey={activeSlug}
                            onSelect={(slug) => setSeasonSlug(slug === detail?.slug ? null : slug)}
                            options={seasons.map((s) => ({
                              key: s.slug,
                              label: s.partLabel || s.title,
                              hint: s.title,
                            }))}
                          />
                        )}
                      </div>
                    </div>

                    {/* Season label, age rating and airing status */}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white">
                      {activeSeason && <span className="font-bold">{activeSeason.partLabel}:</span>}
                      <span className="px-1.5 leading-5 border border-[#808080]">{ageCode}</span>
                      <span className="text-[#bcbcbc]">
                        {episodeSource?.metadata?.["Trạng thái"] || `${episodes.length} tập`}
                      </span>
                    </div>

                    {seasonSlug && isSeasonLoading ? (
                      <EpisodeRowsSkeleton />
                    ) : episodes.length === 0 ? (
                      <p className="py-12 text-center text-sm text-[#a3a3a3]">Phần này chưa có tập nào.</p>
                    ) : (
                      <div className="mt-3">
                        {displayedEpisodes.map((ep, idx) => {
                          const globalIndex = (episodeChunks[selectedChunkIndex]?.startIndex || 0) + idx + 1;
                          const formattedName = formatEpisodeName(ep.name);

                          // Clean title logic to avoid "Tập 1177: Tập 1177" duplication
                          const cleanEpTitle = (() => {
                            if (!ep.title || ep.title.trim() === ep.name.trim() || ep.title.toLowerCase() === formattedName.toLowerCase()) {
                              return formattedName;
                            }
                            const titleStr = ep.title
                              .replace(/^xem phim\s+/i, "")
                              .replace(/^tập\s+\d+[:\s-]*/i, "")
                              .trim();
                            return titleStr && titleStr !== ep.name ? `${formattedName}: ${titleStr}` : formattedName;
                          })();

                          return (
                            <div
                              key={ep.id || globalIndex}
                              onClick={() => handlePlay(ep.name)}
                              className="group flex items-center gap-3 sm:gap-5 px-0 sm:px-6 py-3.5 sm:py-5 border-b border-[#404040] rounded-[4px] hover:bg-[#333] transition-colors cursor-pointer"
                            >
                              {/* Episode Index */}
                              <span className="w-8 flex-shrink-0 text-center text-xl sm:text-2xl text-[#d2d2d2] max-sm:hidden">
                                {globalIndex}
                              </span>

                              {/* 16:9 Thumbnail, play button appears on hover */}
                              <div className="relative w-28 sm:w-36 aspect-video rounded-[4px] overflow-hidden flex-shrink-0 bg-black/60">
                                <img
                                  src={episodeThumb}
                                  alt={cleanEpTitle}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = poster;
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="w-10 h-10 rounded-full bg-black/60 border border-white flex items-center justify-center">
                                    <Play className="fill-current w-4 h-4 text-white ml-0.5" />
                                  </div>
                                </div>
                              </div>

                              {/* Episode Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-3">
                                  <h4 className="text-base font-bold text-white truncate">{cleanEpTitle}</h4>
                                  <span className="text-base text-white flex-shrink-0">24 ph</span>
                                </div>
                                <p className="text-sm text-[#d2d2d2] leading-snug line-clamp-3 mt-1.5 max-sm:hidden">
                                  Xem tập {ep.name} phụ đề VietSub chất lượng cao Full HD.
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* =========================================================================
                    4. NỘI DUNG TƯƠNG TỰ (MORE LIKE THIS - NETFLIX 3-COL GRID)
                   ========================================================================= */}
                {related.length > 0 && (
                  <div className="space-y-4 pt-6">
                    <h3 className="text-2xl font-bold text-white">Nội dung tương tự</h3>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                      {related.slice(0, 6).map((item, idx) => (
                        <div
                          key={item.slug || idx}
                          onClick={() => openInfoModal(item)}
                          className="group rounded-[4px] overflow-hidden bg-[#2f2f2f] hover:bg-[#383838] transition-colors cursor-pointer flex flex-col"
                        >
                          {/* Thumbnail Container with Duration Badge */}
                          <div className="relative aspect-video w-full bg-black/40 overflow-hidden">
                            <LazyImage
                              art={item}
                              src={item.image || item.poster || poster}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              fallbackSrc={poster}
                            />
                            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-[2px] bg-black/75 text-white text-[10px] font-bold">
                              {item.latestEpisode || item.episode || "HD"}
                            </div>
                          </div>

                          {/* Card Body */}
                          <div className="p-2.5 sm:p-4 space-y-2 sm:space-y-3 flex-1 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-[#46d369]">
                                  97% Phù hợp
                                </span>
                                <span className="px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold border border-gray-500 text-gray-300">
                                  {item.quality || "HD"}
                                </span>
                              </div>

                              <h4 className="text-sm font-bold text-white group-hover:text-primaryRed transition-colors line-clamp-1">
                                {item.title}
                              </h4>
                            </div>

                            <p className="text-xs text-[#d2d2d2] line-clamp-3 leading-relaxed max-sm:hidden">
                              {item.synopsis || "Khám phá bộ anime hấp dẫn với chất lượng hình ảnh sắc nét và nội dung lôi cuốn."}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* =========================================================================
                    5. GIỚI THIỆU VỀ PHIM (ABOUT THIS MOVIE)
                   ========================================================================= */}
                <div className="space-y-4 pt-6 text-sm text-[#777]">
                  <h3 className="text-2xl font-normal text-white">
                    Giới thiệu về <span className="font-bold">{title}</span>
                  </h3>

                  <div className="space-y-2 leading-relaxed">
                    {meta["Đạo diễn"] && (
                      <div>
                        <span>Đạo diễn: </span>
                        <span className="text-[#a3a3a3]">{String(meta["Đạo diễn"])}</span>
                      </div>
                    )}
                    {characters.length > 0 && (
                      <div>
                        <span>Diễn viên: </span>
                        <span className="text-[#a3a3a3]">
                          {characters
                            .map((c) => (typeof c === "object" ? c.name : String(c)))
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                    {meta["Studio"] && (
                      <div>
                        <span>Studio sản xuất: </span>
                        <span className="text-[#a3a3a3]">{String(meta["Studio"])}</span>
                      </div>
                    )}
                    {rawGenres.length > 0 && (
                      <div>
                        <span>Thể loại: </span>
                        <span className="text-[#a3a3a3]">
                          {rawGenres
                            .map((g: any) => (typeof g === "object" ? g.name || g.slug : String(g)))
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                    <div>
                      <span>Xếp hạng độ tuổi: </span>
                      <span className="text-[#a3a3a3]">
                        {ageRating} - Thích hợp cho khán giả từ 13 tuổi trở lên. Có chứa các yếu tố tình cảm, tâm lý học đường.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
      </DialogContent>
    </Dialog>
  );
};
