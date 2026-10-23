/** "Tập 05" from "5", "05" or "Tập 5"; "Full" and named episodes stay as they are */
export function formatEpisodeName(name: string | number): string {
  const str = String(name).trim()
  if (/^\d+$/.test(str)) return `Tập ${str.padStart(2, "0")}`
  if (!str.toLowerCase().startsWith("tập") && !str.toLowerCase().startsWith("full")) return `Tập ${str}`
  return str
}

/** "5 phút trước" */
export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return "Vừa xong"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  return `${Math.floor(hours / 24)} ngày trước`
}

/** A playback position: "4:05", or "1:02:03" past the hour */
export function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const pad = (n: number) => String(n).padStart(2, "0")
  const h = Math.floor(s / 3600)
  return h > 0 ? `${h}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${Math.floor(s / 60)}:${pad(s % 60)}`
}
