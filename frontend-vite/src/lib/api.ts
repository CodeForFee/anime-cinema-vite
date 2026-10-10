// Same surface the UI used against backend-hono, now served by the client-side
// scraping layer ported from anime-vsub/desktop-web (src/apis/runs/*), which
// sends every request through the AVS Helper extension.
import type { TPost } from "src/apis/parser/__helpers__/getInfoTPost"
import { PlayerLink } from "src/apis/runs/ajax/player-link"
import { Browse } from "src/apis/runs/browse"
import { Index } from "src/apis/runs/index"
import { Menu } from "src/apis/runs/menu"
import { PhimDetail } from "src/apis/runs/phim/detail"
import { PhimIdChap } from "src/apis/runs/phim/[id]/[chap]"
import { TypeNormalValue } from "src/apis/runs/[type_normal]/[value]"
import { forceHttp2 } from "src/logic/forceHttp2"
import { post } from "src/logic/http"

import type { AnimeDetail, AnimeItem, HomeDataResponse, StreamData } from "../types/anime"

export interface MenuGroup {
  label: string
  items: { label: string; path: string }[]
}

export interface BrowseResult {
  items: AnimeItem[]
  page: number
  totalPages: number
}

// "/phim/ten-phim-a1234/" -> "ten-phim-a1234"
const slugOf = (path: string) => path.replace(/^.*\/phim\//, "").replace(/\/.*$/, "")

// The "#animevsub-vsub_extra" tag is what makes the extension send the source Referer for this image
const image = (url?: string) => (url ? `${forceHttp2(url).split("#")[0]}#animevsub-vsub_extra` : "")

const finite = (n?: number) => (typeof n === "number" && Number.isFinite(n) ? n : undefined)

function toItem(post: TPost): AnimeItem {
  const poster = image(post.image)
  const episode = post.chap === "Full_Season" ? "Trọn bộ" : post.chap || post.process || ""

  return {
    slug: slugOf(post.path),
    title: post.name,
    poster,
    image: poster,
    backdrop: poster,
    banner: poster,
    latestEpisode: episode,
    episode,
    quality: post.quality || undefined,
    views: finite(post.views)?.toLocaleString("vi-VN"),
    rating: finite(post.rate),
    year: finite(post.year),
    genres: post.genre.map((g) => g.name),
    synopsis: post.description,
    isUpcoming: post.time_release !== undefined
  }
}

async function browse(path: string, page: number = 1): Promise<BrowseResult> {
  const res = await Browse(path, page)

  if (res.kind === "ranking")
    return {
      items: res.items.map((item, index) => {
        const poster = image(item.image)
        return {
          slug: slugOf(item.path),
          title: item.name,
          subTitle: item.othername,
          poster,
          image: poster,
          latestEpisode: item.process,
          episode: item.process,
          rank: index + 1
        }
      }),
      page: 1,
      totalPages: 1
    }

  return {
    items: res.items.map(toItem),
    page: res.curPage || page,
    totalPages: Math.max(res.maxPage || 1, page)
  }
}

// The lists only carry thumbnails; the poster, wide banner and synopsis of a title live on its detail
// page (same source as getHomePage() in backend-hono). One title per call: the hero asks for the slide
// on screen instead of the home page waiting for all of them.
const enrich = async (item: AnimeItem): Promise<AnimeItem> => {
    try {
      const info = await PhimDetail(item.slug)
      const poster = image(info.image) || item.poster
      const backdrop = image(info.banner || info.poster) || poster

      return {
        ...item,
        poster,
        image: poster,
        backdrop,
        banner: backdrop,
        subTitle: info.othername || item.subTitle,
        synopsis: info.description || item.synopsis,
        genres: info.genre.length > 0 ? info.genre.map((g) => g.name) : item.genres,
        year: finite(info.yearOf) ?? item.year,
        views: finite(info.views)?.toLocaleString("vi-VN") ?? item.views
      }
    } catch {
      return item
    }
}

export const animeApi = {
  // Navigation menu exactly as the source lists it (types, rankings, every genre and season)
  getMenu: (): Promise<MenuGroup[]> => Menu(),

  // One page of any list from that menu
  browse,

  enrich,

  getHomeData: async (): Promise<HomeDataResponse> => {
    try {
      // One request. The series / movies / chinese shelves fetch their own list when scrolled to
      // (pages/home.tsx), and banners are fetched per slide (useEnrichedItem).
      const home = await Index()

      const latest = home.lastUpdate.map(toItem)
      const sapChieu = home.preRelease.map(toItem)
      const carousel = home.carousel.map(toItem)

      return {
        success: true,
        featured: (carousel.length > 0 ? carousel : home.nominate.map(toItem)).slice(0, 6),
        topSlider: home.thisSeason.filter((post) => !post.image?.includes("big_banner")).map(toItem),
        latest,
        sapChieu,
        upcoming: sapChieu,
        hotTuan: home.hotUpdate.map(toItem),
        series: [],
        movies: [],
        chinese: []
      }
    } catch (err) {
      console.error("API getHomeData error:", err)
      return { success: false, featured: [], latest: [], series: [], movies: [], chinese: [] }
    }
  },

  getAnimeDetails: async (slug: string): Promise<{ success: boolean; data: AnimeDetail }> => {
    const [info, chapters] = await Promise.all([
      PhimDetail(slug),
      // An upcoming title has no watch page yet
      PhimIdChap(slug).catch(() => null)
    ])
    const poster = image(info.image)
    const backdrop = image(info.banner || info.poster) || poster

    return {
      success: true,
      data: {
        slug,
        title: info.name,
        subTitle: info.othername,
        originalTitle: info.othername,
        poster,
        image: poster,
        backdrop,
        banner: backdrop,
        synopsis: info.description,
        genres: info.genre.map((g) => g.name),
        year: finite(info.yearOf),
        status: info.status,
        views: finite(info.views)?.toLocaleString("vi-VN"),
        rating: finite(info.rate),
        ratingScore: finite(info.rate)?.toString(),
        quality: info.quality || undefined,
        watchUrl: info.pathToView ?? "",
        trailerUrl: info.trailer,
        episodes: (chapters?.chaps ?? []).map((chap, index) => ({
          id: chap.id,
          title: `Tập ${chap.name}`,
          name: chap.name,
          hash: chap.hash,
          play: chap.play,
          index: index + 1,
          slug: chap.name
        })),
        seasons: info.season.map((season) => ({
          title: season.name,
          slug: slugOf(season.path),
          isCurrent: slugOf(season.path) === slug
        })),
        related: info.toPut.map(toItem),
        // keys are the labels AnimeDetailTabs.tsx (INFO_FIELDS) looks up; empty ones are left out there
        metadata: {
          "Trạng thái": info.status ?? "",
          "Thời lượng": info.duration,
          Season: info.seasonOf?.name ?? "",
          "Đạo diễn": info.authors.map((a) => a.name).join(", "),
          Studio: info.studio ?? "",
          "Quốc gia": info.contries.map((c) => c.name).join(", "),
          "Ngôn ngữ": info.language ?? "",
          "Chất lượng": info.quality,
          "Số người theo dõi": finite(info.follows)?.toLocaleString("vi-VN") ?? ""
        },
        // the source has no character list; the pictures it has are the banner and the poster
        gallery: [...new Set([image(info.banner), image(info.poster), poster].filter((src): src is string => Boolean(src)))],
        isUpcoming: !chapters || chapters.chaps.length === 0
      }
    }
  },

  // id / play / hash are the data-* attributes of the episode link on the source watch page
  getStreamUrl: async (hash: string, id: string, play: string): Promise<{ success: boolean; data: StreamData }> => {
    // Asked from the viewer's own browser (through the extension), so the answer is issued to the viewer's IP
    const { data } = await post("/ajax/player", { id, play, link: hash, backuplinks: "1" })
    const answer = JSON.parse(data) as { link?: unknown; playTech?: string }

    // "iframe" is the CDN's own player page: embed it the way the source site does. The tag makes
    // the extension send the source Referer with the frame request (create-rule.ts, SUB_FRAME).
    if (answer.playTech === "iframe" && typeof answer.link === "string")
      return {
        success: true,
        data: { playerUrl: answer.link, embedUrl: `${answer.link.split("#")[0]}#animevsub-vsub_extra` }
      }

    const { link } = await PlayerLink({ id, play, hash })
    const sources = typeof link === "string" ? [] : link.map(({ file, label, type }) => ({ file, label, type }))

    return {
      success: true,
      data: { playerUrl: sources[0]?.file ?? "", sources }
    }
  },

  search: async (query: string): Promise<{ success: boolean; items: AnimeItem[] }> => {
    if (!query || !query.trim()) return { success: true, items: [] }

    const res = await TypeNormalValue("tim-kiem", encodeURIComponent(query.trim()).replace(/%20/g, "+"), 1, true)
    return { success: true, items: res.items.map(toItem) }
  }
}
