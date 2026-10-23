import { useCallback, useEffect, useState } from "react"

const AUTO_HIDE_MS = 3500

/**
 * The player controls show, then hide after a few quiet seconds of playback. Never while paused or while `hold`
 * (scrubbing, a level being swiped). `touch()` restarts the wait, `show()` also brings them back.
 */
export function useAutoHide({ paused, hold }: { paused: boolean; hold: boolean }) {
  const [visible, setVisible] = useState(true)
  const [activity, setActivity] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: activity is the restart trigger
  useEffect(() => {
    if (!visible || paused || hold) return
    const timer = setTimeout(() => setVisible(false), AUTO_HIDE_MS)
    return () => clearTimeout(timer)
  }, [visible, paused, hold, activity])

  const touch = useCallback(() => setActivity((n) => n + 1), [])
  const show = useCallback(() => {
    setVisible(true)
    setActivity((n) => n + 1)
  }, [])

  return { visible, setVisible, touch, show }
}
