import { safePlayerUrl } from "@/core/source/endpoints/player/fetch"
import { decryptM3u8, init } from "@/features/player/engines/hls/decrypt-hls-animevsub"

/** An encrypted playlist of /ajax/player (a `file` without "://") as a data: playlist hls.js can load */
export async function decryptSource(file: string): Promise<string> {
  await init()
  return safePlayerUrl(`data:application/vnd.apple.mpegurl;base64,${btoa(await decryptM3u8(file))}`)
}
