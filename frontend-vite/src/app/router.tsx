// The UI was written against next/link and next/navigation; these keep its call sites unchanged on react-router.
import { forwardRef, useMemo } from "react"
import { flushSync } from "react-dom"
import {
  Link as RouterLink,
  type NavigateFunction,
  useLocation,
  useNavigate,
  useSearchParams as useRouterSearchParams
} from "react-router-dom"

import { navKind, preloadRoute } from "@/app/routes"

type ViewTransition = { finished: Promise<void>; skipTransition: () => void }
type ViewTransitionDocument = Document & { startViewTransition?: (update: () => void | Promise<void>) => ViewTransition }

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Resolves once the route left its Suspense fallback (App.tsx), so the new snapshot is the page, not a blank
 * frame. Polls with timers: animation frames are paused while a view transition waits for its update.
 */
async function settled(limit = 600) {
  for (let t = 0; t < limit && document.querySelector("[data-route-fallback]"); t += 16) await wait(16)
  await wait(16)
}

let running: ViewTransition | undefined

/** Runs a page change as a view transition styled by html[data-nav] (globals.css); touch devices only */
function transition(kind: "push" | "pop" | "tab" | "up" | "down", update: () => void | Promise<void>) {
  const doc = document as ViewTransitionDocument
  if (!doc.startViewTransition || !matchMedia("(pointer: coarse)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches)
    return void update()

  // a second tap mid-slide jumps the first one to its end instead of stacking two animations
  running?.skipTransition()
  const root = document.documentElement
  root.dataset.nav = kind
  const current = doc.startViewTransition(update)
  running = current
  current.finished.finally(() => {
    if (running !== current) return
    running = undefined
    delete root.dataset.nav
  })
}

/**
 * Navigates, and on touch devices animates the page change like iOS.
 * Only when the path itself changes: switching episode or filter on the same page should not slide.
 */
async function go(navigate: NavigateFunction, url: string, replace = false) {
  const from = location.pathname
  const to = new URL(url, location.href).pathname
  if (to === from) return navigate(url, { replace })

  // the page chunk is in before the old page is captured (capped: a slow network still navigates)
  await Promise.race([preloadRoute(url), wait(300)])
  transition(navKind(from, to), async () => {
    flushSync(() => navigate(url, { replace }))
    await settled()
  })
}

/**
 * history.back() with the iOS pop slide (the player, which came up from the bottom, goes back down);
 * the Android back button and gesture come through here too (logic/back.ts)
 */
export function goBack() {
  transition(
    location.pathname === "/watch" ? "down" : "pop",
    () =>
      new Promise<void>((resolve) => {
        addEventListener("popstate", () => void settled().then(resolve), { once: true })
        // nothing to go back to: no popstate ever comes
        setTimeout(resolve, 1000)
        history.back()
      })
  )
}

type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string
  prefetch?: boolean
  scroll?: boolean
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, prefetch: _prefetch, scroll: _scroll, onClick, onPointerEnter, onTouchStart, ...props },
  ref
) {
  const navigate = useNavigate()
  if (/^[a-z][a-z\d+.-]*:/i.test(href)) return <a ref={ref} href={href} onClick={onClick} {...props} />

  return (
    <RouterLink
      ref={ref}
      to={href}
      {...props}
      onPointerEnter={(event) => {
        onPointerEnter?.(event)
        preloadRoute(href)
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event)
        preloadRoute(href)
      }}
      onClick={(event) => {
        onClick?.(event)
        // leave new-tab clicks and handled events to the browser / the caller
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target)
          return
        event.preventDefault()
        void go(navigate, href)
      }}
    />
  )
})

export function useRouter() {
  const navigate = useNavigate()
  return useMemo(
    () => ({
      push: (url: string, _options?: { scroll?: boolean }) => void go(navigate, url),
      replace: (url: string, _options?: { scroll?: boolean }) => void go(navigate, url, true),
      back: goBack
    }),
    [navigate]
  )
}

export const usePathname = () => useLocation().pathname
export const useSearchParams = () => useRouterSearchParams()[0]
