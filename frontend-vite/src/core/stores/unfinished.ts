import {
  progressKey,
  resumePoint,
  useProgressStore,
} from "@/core/player/progress";
import { useHistoryStore } from "@/core/stores/history";

/**
 * Titles in "Lịch sử" whose last episode was left part way (where "Xem tiếp" would resume): the number on
 * the history tab and page.
 */
export function useUnfinishedCount() {
  const history = useHistoryStore((s) => s.history);
  const entries = useProgressStore((s) => s.entries);
  return history.filter(
    (item) =>
      item.episodeId &&
      resumePoint(entries[progressKey(item.slug, item.episodeId)]) !== null,
  ).length;
}
