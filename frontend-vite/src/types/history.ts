export interface PlayerState {
  currentSlug: string;
  currentEpisodeSlug: string;
  currentServer: string;
  isPlaying: boolean;
  isTheaterMode: boolean;
  isLightsOff: boolean;
  autoPlayNext: boolean;
  currentTime: number;
  duration: number;
  quality: string;
}

export interface HistoryItem {
  slug: string;
  title: string;
  poster: string;
  episodeSlug: string;
  episodeName: string;
  /** key of the watch position in useProgressStore (components/player/player-logic.ts) */
  episodeId?: string;
  timestamp: number;
  progressPercent?: number;
  updatedAt: number;
}

export interface FavoriteItem {
  slug: string;
  title: string;
  poster: string;
  genres?: string[];
  year?: string | number;
  rating?: string | number;
  addedAt: number;
}
