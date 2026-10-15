import { lazy } from "react"

// One chunk per page. Link calls preloadRoute on hover/touch, so the chunk is usually in before the tap ends.
const loaders = {
  "/": () => import("../pages/home"),
  "/explore": () => import("../pages/explore"),
  "/search": () => import("../pages/search"),
  "/watch": () => import("../pages/watch"),
  "/history": () => import("../pages/history"),
  "/favorites": () => import("../pages/favorites")
} as const

export const pages = {
  home: lazy(loaders["/"]),
  explore: lazy(loaders["/explore"]),
  search: lazy(loaders["/search"]),
  watch: lazy(loaders["/watch"]),
  history: lazy(loaders["/history"]),
  favorites: lazy(loaders["/favorites"]),
  notFound: lazy(() => import("../pages/not-found"))
}

export function preloadRoute(href: string): Promise<unknown> {
  const { pathname } = new URL(href, location.href)
  return loaders[pathname as keyof typeof loaders]?.().catch(() => {}) ?? Promise.resolve()
}

// The dock's tabs (components/layout/SidebarDock.tsx)
const TAB_PATHS = new Set(["/", "/explore", "/search", "/favorites", "/history"])

/**
 * How a page change animates (globals.css, html[data-nav]): tab to tab cross-fades, the player comes up
 * from the bottom like an iOS modal, anything else slides in from the side
 */
export function navKind(from: string, to: string): "tab" | "push" | "up" {
  if (to === "/watch" && from !== "/watch") return "up"
  return TAB_PATHS.has(from) && TAB_PATHS.has(to) ? "tab" : "push"
}
