
import React from "react";
import { Link } from "@/lib/router";
import { Card, CardBody, Button, Chip, Image, Tooltip } from "@heroui/react";
import { useHistoryStore } from "../stores/useHistoryStore";
import { progressKey, useProgressStore } from "../components/player/player-logic";
import type { HistoryItem } from "../types/history";
import { InfoModal } from "../components/movie/InfoModal";
import { formatTimeAgo } from "../lib/utils";
import { Clock, History, Play, Trash2 } from "lucide-react";

export default function HistoryPage() {
  const history = useHistoryStore((state) => state.history);
  const removeFromHistory = useHistoryStore((state) => state.removeFromHistory);
  const clearHistory = useHistoryStore((state) => state.clearHistory);
  const progress = useProgressStore((state) => state.entries);
  const watchedPercent = (item: HistoryItem) => {
    const entry = item.episodeId && progress[progressKey(item.slug, item.episodeId)];
    return entry && entry.d > 0 ? Math.min(100, (entry.t / entry.d) * 100) : 0;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primaryRed text-sm font-semibold uppercase tracking-wider mb-1">
            <History className="w-3.5 h-3.5" />
            <span>Lịch Sử Phát Video</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Tiếp Tục Xem Phim</h1>
        </div>

        {history.length > 0 && (
          <Button
            size="sm"
            color="danger"
            variant="flat"
            radius="full"
            onPress={clearHistory}
            className="text-xs"
            startContent={<Trash2 className="w-3 h-3" />}
          >
            Xóa toàn bộ lịch sử
          </Button>
        )}
      </div>

      {/* History List */}
      {history.length === 0 ? (
        <div className="p-16 rounded-3xl bg-[#10121A] border border-white/10 text-center text-gray-400 space-y-4">
          <History className="w-14 h-14 text-gray-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Chưa có lịch sử xem phim</h3>
          <p className="text-xs max-w-sm mx-auto">
            Khi bạn xem bất kỳ tập anime nào, tiến trình phát và tập phim sẽ tự động được lưu tại đây.
          </p>
          <Link href="/">
            <Button color="danger" radius="full" className="bg-primaryRed text-white mt-2">
              Khám Phá Phim Ngay
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {history.map((item) => (
            <Card
              key={item.slug}
              className="bg-[#10121A] border border-white/10 hover:border-white/20 transition-all duration-300 rounded-2xl overflow-hidden"
            >
              <CardBody className="p-3 flex flex-row gap-4 items-center">
                {/* Poster */}
                <div className="relative w-20 h-28 rounded-xl overflow-hidden flex-shrink-0 bg-black">
                  <Image
                    removeWrapper
                    loading="lazy"
                    src={item.poster}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  {watchedPercent(item) > 0 && (
                    <div className="absolute inset-x-0 bottom-0 z-10 h-1 bg-white/25">
                      <div className="h-full bg-primaryRed" style={{ width: `${watchedPercent(item)}%` }} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>

                  <div className="flex items-center gap-2">
                    <Chip size="sm" color="danger" variant="solid" className="font-bold text-[11px] h-6">
                      {item.episodeName || item.episodeSlug}
                    </Chip>
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span>{formatTimeAgo(item.updatedAt)}</span>
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href={`/watch?slug=${item.slug}&ep=${encodeURIComponent(item.episodeSlug)}`}
                      className="flex-1"
                    >
                      <Button
                        size="sm"
                        color="danger"
                        radius="lg"
                        className="w-full bg-primaryRed text-white font-semibold text-xs h-8 shadow-md shadow-red-600/30"
                        startContent={<Play className="fill-current w-3 h-3 text-white mr-1" />}
                      >
                        Xem Tiếp
                      </Button>
                    </Link>

                    <Tooltip content="Xóa khỏi lịch sử" placement="top">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        radius="lg"
                        onPress={() => removeFromHistory(item.slug)}
                        className="bg-white/5 text-gray-400 hover:text-danger h-8 w-8 min-w-8"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Global Info Modal */}
      <InfoModal />
    </div>
  );
}
