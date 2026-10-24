import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Where "Xem tiếp" resumes, or null when the episode is barely started or practically finished */
export function resumePoint(entry: { t: number; d: number } | undefined) {
  if (!entry || entry.t < 15) return null;
  if (entry.d > 0 && entry.t > entry.d - 45) return null;
  return entry.t;
}

export const progressKey = (slug: string, episodeId: string) =>
  `${slug}:${episodeId}`;

interface ProgressEntry {
  /** position, s */
  t: number;
  /** duration, s */
  d: number;
  at: number;
}

const MAX_ENTRIES = 500;

interface ProgressState {
  entries: Record<string, ProgressEntry>;
  save: (key: string, t: number, d: number) => void;
}

/** Watch position of every episode, kept on the device; the app's own "Xem tiếp", not the CDN player's */
export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      entries: {},
      save: (key, t, d) =>
        set(({ entries }) => {
          const next = { ...entries, [key]: { t, d, at: Date.now() } };
          const keys = Object.keys(next);
          if (keys.length > MAX_ENTRIES) {
            keys.sort((a, b) => next[a].at - next[b].at);
            for (const old of keys.slice(0, keys.length - MAX_ENTRIES))
              delete next[old];
          }
          return { entries: next };
        }),
    }),
    {
      name: "capynime-progress",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
