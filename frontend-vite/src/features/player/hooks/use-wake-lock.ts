import { useEffect } from "react";

/**
 * Keeps the screen on while `active` (a video playing). The browser drops the lock when the tab is hidden,
 * so it is asked for again on return. No Wake Lock API (older browsers, some WebViews): nothing happens.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    const wakeLock = (
      navigator as Navigator & {
        wakeLock?: {
          request: (
            type: "screen",
          ) => Promise<{ release: () => Promise<void> }>;
        };
      }
    ).wakeLock;
    if (!active || !wakeLock) return;
    let lock: { release: () => Promise<void> } | undefined;
    let gone = false;
    const take = () => {
      if (document.visibilityState !== "visible") return;
      wakeLock
        .request("screen")
        .then((taken) => {
          if (gone) void taken.release();
          else {
            void lock?.release().catch(() => undefined);
            lock = taken;
          }
        })
        .catch(() => undefined);
    };
    take();
    document.addEventListener("visibilitychange", take);
    return () => {
      gone = true;
      document.removeEventListener("visibilitychange", take);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
}
