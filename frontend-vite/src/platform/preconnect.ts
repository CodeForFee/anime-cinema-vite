// The player frame's host (the CDN) is known only once /ajax/player answers. Remembering it lets the next episode
// open its connection (DNS, TCP, TLS: several round trips on a weak network) while that answer is still on its way.
const KEY = "capynime-player-origin";

export function rememberPlayerOrigin(url: string) {
  try {
    localStorage.setItem(KEY, new URL(url).origin);
  } catch {
    // not a URL, or no storage: the next episode just connects later
  }
}

/** Opens a connection to the player host seen last, if any */
export function preconnectPlayer() {
  let origin: string | null = null;
  try {
    origin = localStorage.getItem(KEY);
  } catch {
    return;
  }
  if (
    !origin?.startsWith("https://") ||
    document.head.querySelector(`link[rel="preconnect"][href="${origin}"]`)
  )
    return;
  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = origin;
  document.head.appendChild(link);
}
