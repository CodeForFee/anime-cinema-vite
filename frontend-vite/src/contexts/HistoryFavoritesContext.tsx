
import React, { createContext, useContext, useEffect, useState } from "react";
import { HistoryItem, FavoriteItem } from "../types/history";

interface HistoryFavoritesContextType {
  history: HistoryItem[];
  favorites: FavoriteItem[];
  addToHistory: (item: Omit<HistoryItem, "updatedAt">) => void;
  removeFromHistory: (slug: string) => void;
  clearHistory: () => void;
  toggleFavorite: (item: Omit<FavoriteItem, "addedAt">) => void;
  isFavorite: (slug: string) => boolean;
  getAnimeHistory: (slug: string) => HistoryItem | undefined;
}

const HistoryFavoritesContext = createContext<HistoryFavoritesContextType | null>(null);

const STORAGE_KEYS = {
  HISTORY: "movion_watch_history",
  FAVORITES: "movion_favorites",
};

export const HistoryFavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedHist = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (savedHist) setHistory(JSON.parse(savedHist));

      const savedFavs = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      if (savedFavs) setFavorites(JSON.parse(savedFavs));
    } catch (err) {
      console.warn("Failed to load history/favorites:", err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (e) {
      console.warn(e);
    }
  }, [history, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    } catch (e) {
      console.warn(e);
    }
  }, [favorites, isLoaded]);

  const addToHistory = (item: Omit<HistoryItem, "updatedAt">) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.slug !== item.slug);
      return [{ ...item, updatedAt: Date.now() }, ...filtered].slice(0, 50); // Keep last 50
    });
  };

  const removeFromHistory = (slug: string) => {
    setHistory((prev) => prev.filter((h) => h.slug !== slug));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const toggleFavorite = (item: Omit<FavoriteItem, "addedAt">) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.slug === item.slug);
      if (exists) {
        return prev.filter((f) => f.slug !== item.slug);
      } else {
        return [{ ...item, addedAt: Date.now() }, ...prev];
      }
    });
  };

  const isFavorite = (slug: string) => {
    return favorites.some((f) => f.slug === slug);
  };

  const getAnimeHistory = (slug: string) => {
    return history.find((h) => h.slug === slug);
  };

  return (
    <HistoryFavoritesContext.Provider
      value={{
        history,
        favorites,
        addToHistory,
        removeFromHistory,
        clearHistory,
        toggleFavorite,
        isFavorite,
        getAnimeHistory,
      }}
    >
      {children}
    </HistoryFavoritesContext.Provider>
  );
};

export const useHistoryFavorites = () => {
  const context = useContext(HistoryFavoritesContext);
  if (!context) {
    throw new Error("useHistoryFavorites must be used within HistoryFavoritesProvider");
  }
  return context;
};
