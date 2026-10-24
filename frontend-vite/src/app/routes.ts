// How a page change animates on mobile (app/globals.css, :active-view-transition-type): tab to tab cross-fades,
// the player comes up from the bottom like an iOS modal and goes back down, anything else slides in from the side
// and back out.
export type NavKind = "tab" | "push" | "pop" | "up" | "down";

// The tab bar's pages (app/layout/mobile/SidebarDock.tsx)
const TAB_PATHS = new Set([
  "/",
  "/explore",
  "/search",
  "/favorites",
  "/history",
]);

export function navKind(from: string, to: string, back = false): NavKind {
  if (TAB_PATHS.has(from) && TAB_PATHS.has(to)) return "tab";
  if (back) return from === "/watch" ? "down" : "pop";
  return to === "/watch" ? "up" : "push";
}
