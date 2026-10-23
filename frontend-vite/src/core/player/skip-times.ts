// Opening / ending times of an episode, so "Bỏ qua giới thiệu" jumps to where this episode's opening really
// ends. Times come from AniSkip (community database keyed by MyAnimeList id), the MyAnimeList id from an
// AniList title search. Both APIs answer browsers directly (CORS *). No data -> no skip button.

export interface SkipTimes {
  /** opening, seconds [start, end) */
  op?: [number, number]
  /** ending (credits), seconds [start, end) */
  ed?: [number, number]
}

const ANILIST = "https://graphql.anilist.co"
const ANISKIP = "https://api.aniskip.com/v2/skip-times"

/** Names worth searching: the romaji/English other names first (AniList does not know Vietnamese titles) */
export function searchNames(title: string, otherNames?: string) {
  const names = (otherNames || "")
    .split(/[,;|]/)
    .map((name) => name.trim())
    .filter((name) => name.length > 1)
  return [...new Set([...names, title.trim()])]
}

/** MyAnimeList id of the first name AniList recognises, preferring the given year */
export async function findMalId(names: string[], year?: number): Promise<number | null> {
  const query =
    "query($q:String){Page(perPage:5){media(search:$q,type:ANIME){idMal seasonYear}}}"
  for (const q of names) {
    const response = await fetch(ANILIST, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { q } })
    })
    if (!response.ok) continue
    const media: { idMal: number | null; seasonYear: number | null }[] =
      (await response.json()).data?.Page?.media ?? []
    const withId = media.filter((m) => m.idMal)
    const pick = withId.find((m) => year && m.seasonYear === year) ?? withId[0]
    if (pick?.idMal) return pick.idMal
  }
  return null
}

interface AniSkipResult {
  interval: { startTime: number; endTime: number }
  skipType: "op" | "ed" | "mixed-op" | "mixed-ed" | "recap"
}

/** Turns an AniSkip answer into op/ed intervals (the "mixed" kinds count as the same part) */
export function toSkipTimes(results: AniSkipResult[]): SkipTimes {
  const times: SkipTimes = {}
  for (const { interval, skipType } of results) {
    const range: [number, number] = [interval.startTime, interval.endTime]
    if ((skipType === "op" || skipType === "mixed-op") && !times.op) times.op = range
    if ((skipType === "ed" || skipType === "mixed-ed") && !times.ed) times.ed = range
  }
  return times
}

/** Skip times of one episode; `length` (s) lets AniSkip pick the right cut of the episode */
export async function getSkipTimes(malId: number, episode: number, length: number): Promise<SkipTimes> {
  const params = new URLSearchParams()
  for (const type of ["op", "ed", "mixed-op", "mixed-ed"]) params.append("types[]", type)
  params.set("episodeLength", String(Math.round(length)))
  const response = await fetch(`${ANISKIP}/${malId}/${episode}?${params}`)
  if (!response.ok) return {}
  const body = await response.json()
  return body.found ? toSkipTimes(body.results) : {}
}

/** Episode number for AniSkip: "01" -> 1, "13.5" -> 13.5; "Full" and other names have none */
export function episodeNumberOf(name: string) {
  const n = Number.parseFloat(name.replace(/^tập\s*/i, ""))
  return Number.isFinite(n) && n > 0 ? n : null
}
