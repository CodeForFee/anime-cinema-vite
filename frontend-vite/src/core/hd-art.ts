// The source only carries ~283x400 posters: drawn into a 176-255 px card at a phone's 2.6x density they are
// blown up two to three times and look soft. AniList has the same covers at 460x650 (and 1900x400 banners).
// Each title is looked up there once, by its names and year, in batches; the answer, hit or miss, is kept on
// the device. Only an exact title match is taken: a wrong poster is worse than a soft one.
import pLimit from "p-limit"

import { core } from "@/core/configure"

export type Art = { cover?: string; banner?: string; at: number }

export interface ArtQuery {
  key: string
  names: string[]
  year?: number
  /** fetches more names (the original title) when the shown one is Vietnamese and finds nothing */
  moreNames?: () => Promise<string[]>
}

type Media = {
  title: { romaji?: string | null; english?: string | null; native?: string | null }
  synonyms?: string[] | null
  seasonYear?: number | null
  startDate?: { year?: number | null } | null
  coverImage?: { extraLarge?: string | null } | null
  bannerImage?: string | null
}

const RETRY_MISS_MS = 7 * 24 * 60 * 60 * 1000

/** Lowercase latin letters and digits only; "2nd Season" and "Season 2" read the same */
export function normalizeTitle(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/(\d+)(?:st|nd|rd|th)\s+season/g, "season $1")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/** The first result whose title is one of the names, from the same year (±1) when both years are known */
export function pickMatch(names: string[], year: number | undefined, media: Media[]): Media | undefined {
  const wanted = new Set(names.map(normalizeTitle).filter(Boolean))
  return media.find((m) => {
    const titles = [m.title.romaji, m.title.english, m.title.native, ...(m.synonyms ?? [])]
    if (!titles.some((t) => t && wanted.has(normalizeTitle(t)))) return false
    const mediaYear = m.seasonYear ?? m.startDate?.year
    return !year || !mediaYear || Math.abs(mediaYear - year) <= 1
  })
}

/** Names the source lists under one title: "Hotaru no Yomeiri, Firefly Wedding" */
export const splitNames = (text?: string) =>
  (text ?? "")
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)

// ---- device cache -------------------------------------------------------------------------------------

const known = new Map<string, Art>()
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

let ready: Promise<void> | undefined
/** What this device already found, read once when the first card asks; cards drawn before then update */
const loaded = () =>
  (ready ??= Promise.resolve(core().artCache?.entries())
    .then((all) => {
      if (!all?.length) return
      for (const [key, art] of all) known.set(key, art)
      notify()
    })
    .catch(() => {}))

export function subscribeArt(listener: () => void) {
  listeners.add(listener)
  void loaded()
  return () => listeners.delete(listener)
}

export const artFor = (key: string) => known.get(key)

function remember(key: string, art: Art) {
  known.set(key, art)
  void core().artCache?.set(key, art).catch(() => {})
  notify()
}

// ---- AniList, batched ---------------------------------------------------------------------------------

const FIELDS =
  "title{romaji english native} synonyms seasonYear startDate{year} coverImage{extraLarge} bannerImage"
// AniList allows 30 requests a minute: one request at a time, each a batch of up to 16 searches
const BATCH = 16
const GAP_MS = 2100

type Search = { name: string; resolve: (media: Media[] | undefined) => void }

let held: Promise<void> | undefined
let release: (() => void) | undefined
/** While a video fills its buffer, lookups wait: covers must not take its bandwidth */
export function holdArt(on: boolean) {
  if (on && !held) held = new Promise((resolve) => (release = resolve))
  else if (!on && held) {
    held = undefined
    release?.()
  }
}
const queue: Search[] = []
let draining = false

async function drain() {
  if (draining) return
  draining = true
  while (queue.length > 0) {
    // let the rest of a screenful of cards join this batch
    await new Promise((r) => setTimeout(r, 150))
    while (held) await held
    const batch = queue.splice(0, BATCH)
    const vars = batch.map((_, i) => `$s${i}:String`).join(",")
    const body = batch
      .map((_, i) => `m${i}:Page(perPage:6){media(search:$s${i},type:ANIME,sort:SEARCH_MATCH){${FIELDS}}}`)
      .join(" ")
    let result: Record<string, { media: Media[] }> | undefined
    try {
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          query: `query(${vars}){${body}}`,
          variables: Object.fromEntries(batch.map((s, i) => [`s${i}`, s.name]))
        })
      })
      if (res.status === 429) {
        // over the limit: put the batch back and wait as told
        queue.unshift(...batch)
        await new Promise((r) => setTimeout(r, (Number(res.headers.get("Retry-After")) || 60) * 1000))
        continue
      }
      if (res.ok) result = (await res.json()).data
    } catch {
      // offline or blocked: these titles keep the source image this time and are asked again later
    }
    batch.forEach((s, i) => s.resolve(result ? (result[`m${i}`]?.media ?? []) : undefined))
    await new Promise((r) => setTimeout(r, GAP_MS))
  }
  draining = false
}

const search = (name: string) =>
  new Promise<Media[] | undefined>((resolve) => {
    queue.push({ name, resolve })
    void drain()
  })

/** Best match among the names; undefined when AniList could not be asked */
async function lookup(names: string[], year?: number): Promise<Media | null | undefined> {
  const results = await Promise.all(names.slice(0, 3).map(search))
  if (results.every((r) => r === undefined)) return undefined
  return pickMatch(names, year, results.flatMap((r) => r ?? [])) ?? null
}

// the source's detail page, for titles shown under their Vietnamese name: two at a time
const detailLimit = pLimit(2)
const inFlight = new Map<string, Promise<void>>()
/** Vietnamese is never an AniList title; romaji's macrons (ō) are not in this set */
export const isVietnamese = (name: string) =>
  /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹàáãèéìíòóõùúý]/i.test(name)

/** Looks a title up unless the device already has an answer for it; known answers reach subscribers */
export function requestArt(query: ArtQuery) {
  if (!query.key || inFlight.has(query.key)) return
  const job = loaded().then(async () => {
    const cached = known.get(query.key)
    if (cached && (cached.cover || Date.now() - cached.at < RETRY_MISS_MS)) return

    let names = query.names.filter((n) => n && !isVietnamese(n))
    let match = names.length > 0 ? await lookup(names, query.year) : null
    if (match === null && query.moreNames) {
      const more = await detailLimit(query.moreNames).catch(() => [] as string[])
      names = more.filter((n) => !names.includes(n) && !isVietnamese(n))
      if (names.length > 0) match = await lookup(names, query.year)
    }
    if (match === undefined) return

    const cover = match?.coverImage?.extraLarge ?? undefined
    // the browser has it before anyone swaps to it, so the card never blanks
    if (cover && typeof Image !== "undefined") {
      const img = new Image()
      img.src = cover
      await img.decode().catch(() => {})
    }
    remember(query.key, { cover, banner: match?.bannerImage ?? undefined, at: Date.now() })
  })
  inFlight.set(query.key, job)
  void job.finally(() => inFlight.delete(query.key))
}
