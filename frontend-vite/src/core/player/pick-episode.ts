import type { Episode } from "@/core/types/anime"

/** Whether `episode` is the one a link or the history names: by name, id, position or number ("Tập 05" = "5") */
export function matchEpisode(episode: Episode, target: string) {
  if (!target) return false
  const t = target.trim().toLowerCase()
  const name = (episode.name || "").trim().toLowerCase()
  const title = (episode.title || "").trim().toLowerCase()

  if (name === t || (episode.id || "").trim() === t || String(episode.index || "") === t || title === t) return true
  const number = (text: string) => text.replace(/^tập\s*/i, "").replace(/^0+/, "")
  return Boolean(number(t) && number(name) && number(t) === number(name))
}

/** The episode to play: the one the link names, else where the viewer left off, else the first */
export function pickEpisode(episodes: Episode[], requested?: string, lastWatched?: string): Episode | undefined {
  if (requested) {
    const asked = episodes.find((e) => matchEpisode(e, requested))
    if (asked) return asked
  }
  if (lastWatched) {
    const resumed = episodes.find((e) => matchEpisode(e, lastWatched))
    if (resumed) return resumed
  }
  return episodes[0]
}
