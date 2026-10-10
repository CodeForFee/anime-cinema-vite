
import React, { createContext, useContext, useState } from "react";

interface PlayerContextType {
  isTheaterMode: boolean;
  setTheaterMode: (val: boolean) => void;
  toggleTheaterMode: () => void;
  isLightsOff: boolean;
  setLightsOff: (val: boolean) => void;
  toggleLightsOff: () => void;
  autoPlayNext: boolean;
  setAutoPlayNext: (val: boolean) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTheaterMode, setTheaterMode] = useState(false);
  const [isLightsOff, setLightsOff] = useState(false);
  const [autoPlayNext, setAutoPlayNext] = useState(true);

  const toggleTheaterMode = () => setTheaterMode((prev) => !prev);
  const toggleLightsOff = () => setLightsOff((prev) => !prev);

  return (
    <PlayerContext.Provider
      value={{
        isTheaterMode,
        setTheaterMode,
        toggleTheaterMode,
        isLightsOff,
        setLightsOff,
        toggleLightsOff,
        autoPlayNext,
        setAutoPlayNext,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }
  return context;
};
