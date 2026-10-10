import { create } from "zustand";

interface PlayerStoreState {
  isTheaterMode: boolean;
  isLightsOff: boolean;
  autoPlayNext: boolean;
  showShortcuts: boolean;
  setTheaterMode: (val: boolean) => void;
  toggleTheaterMode: () => void;
  setLightsOff: (val: boolean) => void;
  toggleLightsOff: () => void;
  setAutoPlayNext: (val: boolean) => void;
  setShowShortcuts: (val: boolean) => void;
}

export const usePlayerStore = create<PlayerStoreState>((set) => ({
  isTheaterMode: false,
  isLightsOff: false,
  autoPlayNext: true,
  showShortcuts: false,

  setTheaterMode: (val) => set({ isTheaterMode: val }),
  toggleTheaterMode: () =>
    set((state) => ({ isTheaterMode: !state.isTheaterMode })),

  setLightsOff: (val) => set({ isLightsOff: val }),
  toggleLightsOff: () => set((state) => ({ isLightsOff: !state.isLightsOff })),

  setAutoPlayNext: (val) => set({ autoPlayNext: val }),

  setShowShortcuts: (val) => set({ showShortcuts: val }),
}));
