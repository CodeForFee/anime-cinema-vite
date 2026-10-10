import { create } from "zustand";
import { AnimeItem } from "../types/anime";

interface UIStoreState {
  selectedAnime: AnimeItem | null;
  isInfoModalOpen: boolean;
  openInfoModal: (anime: AnimeItem) => void;
  closeInfoModal: () => void;
}

export const useUIStore = create<UIStoreState>((set) => ({
  selectedAnime: null,
  isInfoModalOpen: false,

  openInfoModal: (anime) =>
    set({ selectedAnime: anime, isInfoModalOpen: true }),
  // selectedAnime is kept: the modal still shows it while it animates out
  closeInfoModal: () => set({ isInfoModalOpen: false }),
}));
