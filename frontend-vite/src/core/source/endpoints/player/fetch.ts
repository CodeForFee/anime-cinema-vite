import { post } from "@/core/source/transport"

/** One stream of an answer of /ajax/player; a `file` without "://" is an encrypted playlist */
export interface PlayerSource {
  file: string
  label?: string
  type?: string
  preload?: string
}

/** What POST /ajax/player answers */
export interface PlayerAnswer {
  link?: PlayerSource[] | string
  playTech?: "api" | "trailer" | "iframe"
}

/**
 * The player of an episode; id / play / hash are the data-* attributes of its link on the watch page. Asked from
 * the viewer's own device (extension or native HTTP), so the answer is issued to the viewer's IP.
 */
export async function PlayerLink(id: string, play: string, hash: string): Promise<PlayerAnswer> {
  const { data } = await post("/ajax/player", { id, play, link: hash, backuplinks: "1" })
  return JSON.parse(data) as PlayerAnswer
}

/**
 * The source's answer decides what the player frame or <video> loads, so only https pages and streams (and the
 * data: playlists the decryptor builds) get through. Anything else, javascript: above all, would run in the app's
 * own origin, which in the Android app can reach the native bridge.
 */
export function safePlayerUrl(url: string): string {
  if (url.startsWith("data:application/vnd.apple.mpegurl")) return url
  const parsed = new URL(url.startsWith("//") ? `https:${url}` : url)
  if (parsed.protocol !== "https:") throw new Error(`Refused a ${parsed.protocol} player link`)
  return parsed.href
}
