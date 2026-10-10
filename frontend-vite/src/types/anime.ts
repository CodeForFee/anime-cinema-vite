export interface AnimeItem {
  id?: string;
  slug: string;
  title: string;
  subTitle?: string;
  originalTitle?: string;
  poster: string;
  image?: string;
  backdrop?: string;
  banner?: string;
  latestEpisode?: string;
  episode?: string;
  epNumber?: string;
  totalEpisodes?: string;
  quality?: string;
  views?: string;
  rating?: number | string;
  vote?: string;
  year?: string | number;
  duration?: string;
  genres?: string[];
  type?: string;
  synopsis?: string;
  highlight?: boolean;
  isUpcoming?: boolean;
  releaseDate?: string;
  rank?: number;
}

export interface Episode {
  id: string;
  title: string;
  name: string;
  hash: string;
  /** data-play of the episode link on the source; needed to ask the source for the stream */
  play?: string;
  index: number;
  slug?: string;
}

export interface ServerOption {
  id: string;
  name: string;
  type: string;
  play?: string;
  href?: string;
}

export interface CharacterItem {
  name: string;
  role: string;
  avatar: string;
}

export interface SeasonItem {
  title: string;
  subTitle?: string;
  slug: string;
  poster?: string;
  image?: string;
  episode?: string;
  partLabel?: string;
  isCurrent?: boolean;
}

export interface AnimeDetail {
  id?: string;
  slug: string;
  title: string;
  subTitle?: string;
  originalTitle?: string;
  poster: string;
  image?: string;
  backdrop?: string;
  banner?: string;
  synopsis?: string;
  genres?: string[];
  year?: string | number;
  status?: string;
  views?: string;
  rating?: string | number;
  ratingScore?: string;
  ratingPercent?: string;
  quality?: string;
  watchUrl?: string;
  episodes: Episode[];
  seasons?: SeasonItem[];
  related?: AnimeItem[];
  backupServers?: ServerOption[];
  trailerUrl?: string;
  characters?: CharacterItem[];
  gallery?: string[];
  metadata?: Record<string, string>;
  isUpcoming?: boolean;
}

export interface StreamSource {
  /** http(s) URL, or a data: URL holding the decrypted m3u8 */
  file: string;
  label: string;
  type: string;
}

export interface StreamData {
  playerUrl: string;
  sources?: StreamSource[];
  embedUrl?: string;
  directUrl?: string;
  backupServers?: ServerOption[];
}

export interface HomeDataResponse {
  success: boolean;
  featured: AnimeItem[];
  topSlider?: AnimeItem[];
  latest: AnimeItem[];
  sapChieu?: AnimeItem[];
  upcoming?: AnimeItem[];
  hotTuan?: AnimeItem[];
  series: AnimeItem[];
  movies: AnimeItem[];
  chinese: AnimeItem[];
}
