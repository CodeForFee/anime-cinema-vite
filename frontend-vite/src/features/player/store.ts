import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { QualityPref } from "@/core/player/pick-quality";
import type { SurroundMode, UpscaleMode } from "@/features/player/engines/enhance/model";

interface PlayerStoreState {
  isTheaterMode: boolean;
  isLightsOff: boolean;
  autoPlayNext: boolean;
  showShortcuts: boolean;
  /** The viewer's quality choice, kept on the device and applied to every episode (core/player/pick-quality.ts) */
  quality: QualityPref;
  /** Virtual surround and the upscaler (engines/enhance), kept for every episode */
  surround: boolean;
  surroundMode: SurroundMode;
  upscale: UpscaleMode;
  /** The colour grade ("Màu sắc sống động") */
  color: boolean;
  setTheaterMode: (val: boolean) => void;
  toggleTheaterMode: () => void;
  setLightsOff: (val: boolean) => void;
  toggleLightsOff: () => void;
  setAutoPlayNext: (val: boolean) => void;
  setShowShortcuts: (val: boolean) => void;
  setQuality: (quality: QualityPref) => void;
  setSurround: (on: boolean) => void;
  setSurroundMode: (mode: SurroundMode) => void;
  setUpscale: (mode: UpscaleMode) => void;
  setColor: (on: boolean) => void;
}

export const usePlayerStore = create<PlayerStoreState>()(
  persist(
    (set) => ({
      isTheaterMode: false,
      isLightsOff: false,
      autoPlayNext: true,
      showShortcuts: false,
      quality: "auto",
      surround: false,
      surroundMode: "headphones",
      upscale: "off",
      color: false,

      setTheaterMode: (val) => set({ isTheaterMode: val }),
      toggleTheaterMode: () =>
        set((state) => ({ isTheaterMode: !state.isTheaterMode })),
      setLightsOff: (val) => set({ isLightsOff: val }),
      toggleLightsOff: () =>
        set((state) => ({ isLightsOff: !state.isLightsOff })),
      setAutoPlayNext: (val) => set({ autoPlayNext: val }),
      setShowShortcuts: (val) => set({ showShortcuts: val }),
      setQuality: (quality) => set({ quality }),
      setSurround: (surround) => set({ surround }),
      setSurroundMode: (surroundMode) => set({ surroundMode }),
      setUpscale: (upscale) => set({ upscale }),
      setColor: (color) => set({ color }),
    }),
    // the quality and enhancement choices outlive the page
    {
      name: "capynime-player",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ quality, surround, surroundMode, upscale, color }) => ({
        quality,
        surround,
        surroundMode,
        upscale,
        color,
      }),
    },
  ),
);
