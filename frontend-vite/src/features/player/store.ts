import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { QualityPref } from "@/core/player/pick-quality";

interface PlayerStoreState {
  isTheaterMode: boolean;
  isLightsOff: boolean;
  autoPlayNext: boolean;
  showShortcuts: boolean;
  /** The viewer's quality choice, kept on the device and applied to every episode (core/player/pick-quality.ts) */
  quality: QualityPref;
  setTheaterMode: (val: boolean) => void;
  toggleTheaterMode: () => void;
  setLightsOff: (val: boolean) => void;
  toggleLightsOff: () => void;
  setAutoPlayNext: (val: boolean) => void;
  setShowShortcuts: (val: boolean) => void;
  setQuality: (quality: QualityPref) => void;
}

export const usePlayerStore = create<PlayerStoreState>()(
  persist(
    (set) => ({
      isTheaterMode: false,
      isLightsOff: false,
      autoPlayNext: true,
      showShortcuts: false,
      quality: "auto",

      setTheaterMode: (val) => set({ isTheaterMode: val }),
      toggleTheaterMode: () =>
        set((state) => ({ isTheaterMode: !state.isTheaterMode })),
      setLightsOff: (val) => set({ isLightsOff: val }),
      toggleLightsOff: () =>
        set((state) => ({ isLightsOff: !state.isLightsOff })),
      setAutoPlayNext: (val) => set({ autoPlayNext: val }),
      setShowShortcuts: (val) => set({ showShortcuts: val }),
      setQuality: (quality) => set({ quality }),
    }),
    // only the quality choice outlives the page
    {
      name: "capynime-player",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ quality }) => ({ quality }),
    },
  ),
);
