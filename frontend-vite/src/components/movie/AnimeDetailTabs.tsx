
import React, { useState } from "react";
import { Card } from "../lightswind/card";
import { Badge } from "../lightswind/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../lightswind/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "../lightswind/avatar";
import { AnimeDetail } from "../../types/anime";
import { CalendarDays, Clock, Eye, ImageIcon, Star, Users, Video } from "lucide-react";
import { PosterImg } from "@/components/movie/LazyImage";

interface AnimeDetailTabsProps {
  anime: AnimeDetail;
}

// [metadata key from the source site, label shown]; a row only renders when the source has the value
const INFO_FIELDS: [string, string][] = [
  ["Trạng thái", "Trạng thái"],
  ["Lịch chiếu", "Lịch chiếu"],
  ["Thời lượng", "Số tập"],
  ["Season", "Mùa phát hành"],
  ["Đạo diễn", "Đạo diễn"],
  ["Studio", "Studio sản xuất"],
  ["Quốc gia", "Quốc gia"],
  ["Rating", "Độ tuổi khuyến nghị"],
  ["Ngôn ngữ", "Ngôn ngữ"],
  ["Chất lượng", "Chất lượng"],
  ["Số người theo dõi", "Người theo dõi"],
];

const META_BADGE = "gap-1.5 border-white/15 bg-white/5 px-3 py-1 font-medium text-gray-200";
const TAB_TRIGGER = "flex-1 gap-1.5 px-1 py-1.5 text-xs sm:flex-none sm:gap-2 sm:px-4 sm:text-sm lg:text-sm";
const TAB_ICON = "hidden h-4 w-4 sm:block";
const EMPTY_STATE = "rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-14 text-center text-sm text-gray-400";

// Source values often end with a dangling separator ("Nhật Bản ,")
const cleanValue = (value: string) => String(value).replace(/[\s,]+$/, "").trim();

export function AnimeDetailTabs({ anime }: AnimeDetailTabsProps) {
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  const meta = anime.metadata || {};
  const trailerUrl = anime.trailerUrl;
  const characters = anime.characters || [];
  const gallery = (anime.gallery && anime.gallery.length > 0 ? anime.gallery : [anime.backdrop]).filter(
    (src): src is string => Boolean(src)
  );
  const genres = (anime.genres || [])
    .map((g: any) => (typeof g === "object" ? g.name || g.slug : String(g)))
    .filter(Boolean);
  const infoRows = INFO_FIELDS.filter(([key]) => meta[key] && cleanValue(meta[key]));

  return (
    <Card className="glass-card space-y-6 rounded-3xl p-5 md:p-8">
      {/* Overview: poster, title, key facts, synopsis */}
      {/* Phones: small poster beside the title, synopsis full width below. Desktop: poster column + one text column. */}
      <div className="grid grid-cols-[6rem_1fr] items-start gap-x-4 gap-y-4 md:grid-cols-[11rem_1fr] md:gap-x-6">
        <PosterImg
          art={anime}
          src={anime.poster || anime.image}
          alt={anime.title}
          loading="lazy"
          decoding="async"
          className="w-full rounded-xl border border-white/10 object-cover aspect-[283/400] md:row-span-2"
        />

        <div className="min-w-0 space-y-3 md:space-y-4">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-white leading-tight">{anime.title}</h1>
            {anime.subTitle && (
              <p className="mt-1 text-sm md:text-base text-gray-400 line-clamp-2">{anime.subTitle}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {anime.ratingScore && (
              <Badge variant="unstyled" className={`${META_BADGE} border-amber-400/30 bg-amber-400/10 text-amber-300`}>
                <Star className="fill-current h-3.5 w-3.5" />
                {anime.ratingScore}/10
              </Badge>
            )}
            {anime.views && (
              <Badge variant="unstyled" className={META_BADGE}>
                <Eye className="h-3.5 w-3.5 text-gray-400" />
                {anime.views}
              </Badge>
            )}
            {meta["Season"] && (
              <Badge variant="unstyled" className={META_BADGE}>
                <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                {meta["Season"]}
              </Badge>
            )}
            {anime.episodes?.length > 0 && (
              <Badge variant="unstyled" className={META_BADGE}>
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                {anime.episodes.length} tập
              </Badge>
            )}
          </div>
        </div>

        <div className="col-span-2 min-w-0 space-y-4 md:col-span-1 md:col-start-2">
          {anime.synopsis && (
            <div>
              <p className={`text-sm md:text-[15px] text-gray-200 leading-relaxed ${isDescExpanded ? "" : "line-clamp-3"}`}>
                {anime.synopsis}
              </p>
              {anime.synopsis.length > 220 && (
                <button
                  type="button"
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className="mt-1 text-sm font-semibold text-white underline-offset-4 hover:underline"
                >
                  {isDescExpanded ? "Thu gọn" : "Xem thêm"}
                </button>
              )}
            </div>
          )}

          {genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {genres.map((genre: string) => (
                <Badge key={genre} variant="unstyled" shape="rounded" className="border-transparent bg-white/10 font-medium text-white">
                  {genre}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Tabs */}
      <Tabs defaultValue="info">
        {/* Phones: four equal tabs across the full width, short labels. From sm up: auto-width with icons and counts. */}
        <TabsList className="flex h-10 w-full p-1 sm:inline-flex sm:w-auto">
          <TabsTrigger value="info" className={TAB_TRIGGER}>
            Thông tin
          </TabsTrigger>
          <TabsTrigger value="trailer" className={TAB_TRIGGER}>
            <Video className={TAB_ICON} />
            Trailer
          </TabsTrigger>
          {/* the source rarely lists characters: no empty tab */}
          {characters.length > 0 && (
            <TabsTrigger value="cast" className={TAB_TRIGGER}>
              <Users className={TAB_ICON} />
              Nhân vật
              <span className="hidden sm:inline">({characters.length})</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="gallery" className={TAB_TRIGGER}>
            <ImageIcon className={TAB_ICON} />
            Hình ảnh
            <span className="hidden sm:inline">({gallery.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Thông tin phim */}
        <TabsContent value="info" className="mt-6">
          {infoRows.length > 0 ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-10 lg:grid-cols-3">
              {infoRows.map(([key, label]) => (
                <div key={key} className="min-w-0 border-l-2 border-white/10 pl-3 sm:pl-4">
                  <dt className="text-xs text-gray-500">{label}</dt>
                  <dd className="mt-1 text-sm font-medium text-white">{cleanValue(meta[key])}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className={EMPTY_STATE}>Thông tin chi tiết đang được cập nhật.</p>
          )}
        </TabsContent>

        {/* TAB 2: Trailer */}
        <TabsContent value="trailer" className="mt-6">
          {trailerUrl ? (
            <div className="relative mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black">
              <iframe
                src={trailerUrl}
                title={`Trailer ${anime.title}`}
                className="h-full w-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : (
            <p className={EMPTY_STATE}>Phim hiện chưa có trailer chính thức.</p>
          )}
        </TabsContent>

        {/* TAB 3: Nhân vật */}
        <TabsContent value="cast" className="mt-6">
          {characters.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {characters.map((c, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-white/10 hover:scale-100">
                    <AvatarImage src={c.avatar} alt={c.name} className="opacity-100" />
                    <AvatarFallback className="text-white">{c.name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{c.name}</p>
                    {c.role && <p className="truncate text-xs text-gray-400">{c.role}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={EMPTY_STATE}>Thông tin nhân vật đang được cập nhật.</p>
          )}
        </TabsContent>

        {/* TAB 4: Hình ảnh */}
        <TabsContent value="gallery" className="mt-6">
          {gallery.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gallery.map((imgSrc, idx) => (
                <img
                  key={idx}
                  src={imgSrc}
                  alt={`${anime.title} - ảnh ${idx + 1}`}
                  loading="lazy"
                  className="aspect-video w-full rounded-xl border border-white/10 object-cover"
                />
              ))}
            </div>
          ) : (
            <p className={EMPTY_STATE}>Chưa có hình ảnh cho anime này.</p>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
