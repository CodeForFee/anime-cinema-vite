
import React, { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { PickerDropdown } from "@/shared/ui/PickerDropdown";
import { Episode, SeasonItem } from "@/core/types/anime";
import { formatEpisodeName } from "@/core/format";
import { cn } from "@/shared/lib/utils";
import { Search } from "lucide-react";

interface EpisodeGridProps {
  episodes: Episode[];
  currentEpisodeSlug: string;
  onSelectEpisode: (ep: Episode) => void;
  seasons?: SeasonItem[];
  currentSlug?: string;
}

const EPISODES_PER_GROUP = 50;

export const EpisodeGrid: React.FC<EpisodeGridProps> = ({
  episodes,
  currentEpisodeSlug,
  onSelectEpisode,
  seasons = [],
  currentSlug = "",
}) => {
  const navigate = useNavigate();
  const [filterText, setFilterText] = useState("");
  // null = follow the group that contains the episode being watched
  const [pickedGroup, setPickedGroup] = useState<string | null>(null);

  const isCurrentEpisode = (ep: Episode) => {
    if (!currentEpisodeSlug) return false;
    const cur = currentEpisodeSlug.trim().toLowerCase();
    const name = (ep.name || "").trim().toLowerCase();
    const id = (ep.id || "").trim();
    const slug = (ep.slug || "").trim().toLowerCase();
    const index = String(ep.index || "");

    if (name === cur || id === cur || slug === cur || index === cur) return true;
    const numCur = cur.replace(/^tập\s*/i, "").replace(/^0+/, "");
    const numName = name.replace(/^tập\s*/i, "").replace(/^0+/, "");
    if (numCur && numName && numCur === numName) return true;
    return false;
  };

  // Group episodes into chunks of 50
  const groups = useMemo(() => {
    const chunks: { key: string; label: string; items: Episode[] }[] = [];
    for (let i = 0; i < episodes.length; i += EPISODES_PER_GROUP) {
      chunks.push({
        key: String(i / EPISODES_PER_GROUP),
        label: `Tập ${i + 1} - ${Math.min(i + EPISODES_PER_GROUP, episodes.length)}`,
        items: episodes.slice(i, i + EPISODES_PER_GROUP),
      });
    }
    return chunks;
  }, [episodes]);

  const watchingGroup = groups.find((g) => g.items.some(isCurrentEpisode));
  const activeGroup = groups.find((g) => g.key === pickedGroup) || watchingGroup || groups[0];

  // Filtered episodes if searching
  const filteredEpisodes = useMemo(() => {
    const query = filterText.toLowerCase().trim();
    if (!query) return null;
    return episodes.filter(
      (ep) =>
        ep.name.toLowerCase().includes(query) ||
        (ep.title && ep.title.toLowerCase().includes(query)) ||
        String(ep.index).includes(query)
    );
  }, [episodes, filterText]);

  const displayEpisodes = filteredEpisodes || activeGroup?.items || [];
  const activeSeason = seasons.find((s) => s.slug === currentSlug) || seasons.find((s) => s.isCurrent);

  return (
    <Card className="glass-card space-y-4 rounded-3xl p-5">
      {/* Header: title, search, range + season pickers */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-2xl font-bold text-white">Tập</h3>
          <Badge variant="unstyled" className="border-white/15 bg-white/5 font-medium text-gray-300">
            {episodes.length} tập
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {episodes.length > 12 && (
            <div className="relative w-44">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Tìm số tập..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="h-[42px] rounded-[4px] border-[#4d4d4d] bg-[#242424] pl-9 text-sm text-white focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          )}

          {/* Episode Range Picker for long series (> 50 eps) */}
          {groups.length > 1 && activeGroup && (
            <PickerDropdown
              label={activeGroup.label}
              selectedKey={activeGroup.key}
              onSelect={setPickedGroup}
              options={groups.map((g) => ({ key: g.key, label: g.label }))}
            />
          )}

          {/* Season / Part Picker: each part is its own title, so picking one opens its watch page */}
          {seasons.length > 1 && (
            <PickerDropdown
              label={activeSeason?.partLabel || "Chọn phần"}
              selectedKey={currentSlug}
              onSelect={(slug) => {
                if (slug !== currentSlug) void navigate({ to: "/watch", search: { slug }, resetScroll: false });
              }}
              options={seasons.map((s) => ({ key: s.slug, label: s.partLabel || s.title, hint: s.title }))}
            />
          )}
        </div>
      </div>

      {/* Episode Buttons */}
      {displayEpisodes.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          {episodes.length === 0 ? "Chưa có danh sách tập phim cho nội dung này." : "Không tìm thấy tập phù hợp."}
        </p>
      ) : (
        <div className="grid max-h-80 grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
          {displayEpisodes.map((ep) => {
            const isActive = isCurrentEpisode(ep);
            return (
              <Button
                key={ep.id || ep.name}
                variant="unstyled"
                size="unstyled"
                aria-current={isActive ? "true" : undefined}
                onClick={() => onSelectEpisode(ep)}
                className={cn(
                  "h-10 min-w-0 rounded-xl px-1 text-sm font-semibold transition active:scale-95",
                  isActive
                    ? "bg-primaryRed text-white shadow-[0_0_18px_rgba(229,9,20,0.5)]"
                    : "glass-pill text-gray-200 hover:text-white"
                )}
              >
                <span className="truncate">{formatEpisodeName(ep.name)}</span>
              </Button>
            );
          })}
        </div>
      )}
    </Card>
  );
};
