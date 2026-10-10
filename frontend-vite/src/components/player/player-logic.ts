import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const pad = (n: number) => String(n).padStart(2, "0")
  const h = Math.floor(s / 3600)
  return h > 0 ? `${h}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${Math.floor(s / 60)}:${pad(s % 60)}`
}

/** Left 35 % / centre / right 35 % of the player, the zones for double tap */
export const tapZone = (x: number, width: number): -1 | 0 | 1 => {
  const ratio = x / width
  return ratio < 0.35 ? -1 : ratio > 0.65 ? 1 : 0
}

export const BRIGHTNESS_MIN = 0.3
export const BRIGHTNESS_MAX = 1.5

/**
 * Level after a vertical swipe: a swipe over the full player height moves across the whole range.
 * `dy` is the finger movement in px (negative = up = more).
 */
export function swipeLevel(start: number, dy: number, height: number, min: number, max: number) {
  return clamp(start - (dy / height) * (max - min), min, max)
}

/** Seek target of a horizontal swipe: the full player width is 90 s */
export const swipeSeek = (start: number, dx: number, width: number, duration: number) =>
  clamp(start + (dx / width) * 90, 0, duration || start + Math.abs(dx))

/** Where "Xem tiếp" resumes, or null when the episode is barely started or practically finished */
export function resumePoint(entry: { t: number; d: number } | undefined) {
  if (!entry || entry.t < 15) return null
  if (entry.d > 0 && entry.t > entry.d - 45) return null
  return entry.t
}

export const progressKey = (slug: string, episodeId: string) => `${slug}:${episodeId}`

interface ProgressEntry {
  /** position, s */
  t: number
  /** duration, s */
  d: number
  at: number
}

const MAX_ENTRIES = 500

interface ProgressState {
  entries: Record<string, ProgressEntry>
  save: (key: string, t: number, d: number) => void
}

/** Watch position of every episode, kept on the device; the app's own "Xem tiếp", not the CDN player's */
export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      entries: {},
      save: (key, t, d) =>
        set(({ entries }) => {
          const next = { ...entries, [key]: { t, d, at: Date.now() } }
          const keys = Object.keys(next)
          if (keys.length > MAX_ENTRIES) {
            keys.sort((a, b) => next[a].at - next[b].at)
            for (const old of keys.slice(0, keys.length - MAX_ENTRIES)) delete next[old]
          }
          return { entries: next }
        })
    }),
    { name: "capynime-progress", storage: createJSONStorage(() => localStorage) }
  )
)
