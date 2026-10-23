/* eslint-disable camelcase */
import { decryptM3u8, init } from "src/logic/decrypt-hls-animevsub"
import { getQualityByLabel } from "src/logic/get-quality-by-label"

const addProtocolUrl = (file: string) => (file.startsWith("http") ? file : `https:${file}`)

export type PlayerLabel = "FHD|HD" | "HD" | "FHD" | `${720 | 360 | 340}p`

export interface PlayerSource {
  file: string
  label: PlayerLabel
  qualityCode: ReturnType<typeof getQualityByLabel>
  preload?: string
  type:
    | "hls"
    | "aac"
    | "f4a"
    | "mp4"
    | "f4v"
    | "m3u"
    | "m3u8"
    | "m4v"
    | "mov"
    | "mp3"
    | "mpeg"
    | "oga"
    | "ogg"
    | "ogv"
    | "vorbis"
    | "webm"
    | "youtube"
}

/** What POST /ajax/player answers */
export interface PlayerAnswer {
  link?: PlayerSource[] | string
  playTech?: "api" | "trailer" | "iframe"
}

/**
 * The streams of a non-iframe answer of /ajax/player. Entries without a URL are encrypted playlists: they are
 * decrypted into data: playlists here.
 */
export async function decodePlayerLink(answer: PlayerAnswer): Promise<PlayerSource[]> {
  const { link } = answer
  if (!link) throw Object.assign(new Error("This server not found."), { not_found: true })
  if (typeof link === "string") throw new Error("Can't decryption this format")

  await Promise.all(
    link.map(async (item) => {
      if (item.file.includes("://")) {
        item.file = addProtocolUrl(item.file)
      } else {
        await init()
        item.file = `data:application/vnd.apple.mpegurl;base64,${btoa(await decryptM3u8(item.file))}`
        item.label = "HD"
        item.preload = "auto"
        item.type = "hls"
      }

      const label = (item.label as PlayerLabel | undefined)?.toUpperCase()
      if (label === undefined) item.label = "HD"
      else if (label === "HD" && item.preload) item.label = "FHD|HD"
      item.qualityCode = getQualityByLabel(item.label)
      item.type ??= "mp4"
    })
  )

  return link
}
