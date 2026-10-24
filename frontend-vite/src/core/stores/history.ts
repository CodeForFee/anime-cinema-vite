import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { HistoryItem, FavoriteItem } from "@/core/types/history";

interface HistoryStoreState {
  history: HistoryItem[];
  favorites: FavoriteItem[];
  addToHistory: (item: Omit<HistoryItem, "updatedAt">) => void;
  removeFromHistory: (slug: string) => void;
  clearHistory: () => void;
  toggleFavorite: (item: Omit<FavoriteItem, "addedAt">) => void;
  isFavorite: (slug: string) => boolean;
  getAnimeHistory: (slug: string) => HistoryItem | undefined;
}

const safeStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(name, value);
    } catch {}
  },
  removeItem: (name: string): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(name);
    } catch {}
  },
};

export const useHistoryStore = create<HistoryStoreState>()(
  persist(
    (set, get) => ({
      history: [],
      favorites: [],

      addToHistory: (item) => {
        set((state) => {
          const filtered = state.history.filter((h) => h.slug !== item.slug);
          return {
            history: [{ ...item, updatedAt: Date.now() }, ...filtered].slice(
              0,
              60,
            ),
          };
        });
      },

      removeFromHistory: (slug) => {
        set((state) => ({
          history: state.history.filter((h) => h.slug !== slug),
        }));
      },

      clearHistory: () => {
        set({ history: [] });
      },

      toggleFavorite: (item) => {
        set((state) => {
          const exists = state.favorites.some((f) => f.slug === item.slug);
          if (exists) {
            return {
              favorites: state.favorites.filter((f) => f.slug !== item.slug),
            };
          }
          return {
            favorites: [{ ...item, addedAt: Date.now() }, ...state.favorites],
          };
        });
      },

      isFavorite: (slug) => {
        const favs = get().favorites || [];
        return favs.some((f) => f.slug === slug);
      },

      getAnimeHistory: (slug) => {
        const hist = get().history || [];
        return hist.find((h) => h.slug === slug);
      },
    }),
    {
      name: "movion-history-storage",
      storage: createJSONStorage(() => safeStorage),
    },
  ),
);
