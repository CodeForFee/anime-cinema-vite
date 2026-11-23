// History, favorites and watch positions live only on this device: a JSON file moves them to another one
// (no account or server needed). Importing merges with what is here, it never wipes it.
import { MAX_ENTRIES, useProgressStore } from "@/core/player/progress";
import { HISTORY_LIMIT, useHistoryStore } from "@/core/stores/history";
import type { FavoriteItem, HistoryItem } from "@/core/types/history";

const KIND = "capynime-backup";

export interface Backup {
  kind: typeof KIND;
  version: 1;
  exportedAt: string;
  history: HistoryItem[];
  favorites: FavoriteItem[];
  progress: Record<string, { t: number; d: number; at: number }>;
}

export function makeBackup(): Backup {
  const { history, favorites } = useHistoryStore.getState();
  return {
    kind: KIND,
    version: 1,
    exportedAt: new Date().toISOString(),
    history,
    favorites,
    progress: useProgressStore.getState().entries,
  };
}

const str = (value: unknown, max = 500) =>
  typeof value === "string" ? value.slice(0, max) : "";
const num = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
const list = (value: unknown) => (Array.isArray(value) ? value : []);
const obj = (value: unknown) =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

/**
 * A file the viewer picked: anything in it is untrusted. Only known fields with the right types are kept;
 * entries without a slug are dropped. Throws on a file that is not a backup at all.
 */
export function parseBackup(text: string): Omit<Backup, "exportedAt"> {
  let data: Record<string, unknown>;
  try {
    data = obj(JSON.parse(text));
  } catch {
    throw new Error("File không phải JSON hợp lệ");
  }
  if (data.kind !== KIND)
    throw new Error("Đây không phải file sao lưu Capynime");

  const history: HistoryItem[] = list(data.history)
    .map(obj)
    .filter((item) => str(item.slug))
    .map((item) => ({
      slug: str(item.slug),
      title: str(item.title),
      poster: str(item.poster, 2000),
      episodeSlug: str(item.episodeSlug),
      episodeName: str(item.episodeName),
      episodeId: str(item.episodeId) || undefined,
      timestamp: num(item.timestamp),
      updatedAt: num(item.updatedAt),
    }));
  const favorites: FavoriteItem[] = list(data.favorites)
    .map(obj)
    .filter((item) => str(item.slug))
    .map((item) => ({
      slug: str(item.slug),
      title: str(item.title),
      poster: str(item.poster, 2000),
      addedAt: num(item.addedAt),
    }));
  const progress: Backup["progress"] = {};
  for (const [key, value] of Object.entries(obj(data.progress))) {
    const entry = obj(value);
    if (key.length <= 300 && num(entry.d) > 0)
      progress[key] = { t: num(entry.t), d: num(entry.d), at: num(entry.at) };
  }
  return { kind: KIND, version: 1, history, favorites, progress };
}

/** Newest wins per title / episode; the lists keep their usual caps */
export function mergeBackup(backup: Omit<Backup, "exportedAt">) {
  const here = useHistoryStore.getState();
  const bySlug = new Map<string, HistoryItem>();
  for (const item of [...here.history, ...backup.history]) {
    const known = bySlug.get(item.slug);
    if (!known || item.updatedAt > known.updatedAt) bySlug.set(item.slug, item);
  }
  const history = [...bySlug.values()]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, HISTORY_LIMIT);

  const favs = new Map(here.favorites.map((item) => [item.slug, item]));
  for (const item of backup.favorites)
    if (!favs.has(item.slug)) favs.set(item.slug, item);
  const favorites = [...favs.values()].sort((a, b) => b.addedAt - a.addedAt);

  const entries = { ...useProgressStore.getState().entries };
  for (const [key, entry] of Object.entries(backup.progress))
    if (!entries[key] || entry.at > entries[key].at) entries[key] = entry;
  const kept = Object.entries(entries)
    .sort(([, a], [, b]) => b.at - a.at)
    .slice(0, MAX_ENTRIES);

  useHistoryStore.setState({ history, favorites });
  useProgressStore.setState({ entries: Object.fromEntries(kept) });
  return {
    history: backup.history.length,
    favorites: backup.favorites.length,
    progress: Object.keys(backup.progress).length,
  };
}
