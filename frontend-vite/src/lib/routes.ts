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

export function preloadRoute(href: string) {
  const { pathname } = new URL(href, location.href)
  loaders[pathname as keyof typeof loaders]?.().catch(() => {})
}
