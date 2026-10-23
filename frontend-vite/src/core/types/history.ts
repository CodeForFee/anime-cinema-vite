export interface HistoryItem {
  slug: string;
  title: string;
  poster: string;
  episodeSlug: string;
  episodeName: string;
  /** key of the watch position in useProgressStore (core/player/progress.ts) */
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
