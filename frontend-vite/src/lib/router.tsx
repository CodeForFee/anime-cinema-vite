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

type ViewTransitionDocument = Document & { startViewTransition?: (update: () => void) => unknown }

/**
 * Navigates, and on touch devices animates the page change (keyframes in globals.css).
 * Only when the path itself changes: switching episode or filter on the same page should not slide.
 */
function go(navigate: NavigateFunction, url: string, replace = false) {
  const doc = document as ViewTransitionDocument
  const samePage = new URL(url, location.href).pathname === location.pathname
  if (samePage || !doc.startViewTransition || !window.matchMedia("(pointer: coarse)").matches)
    return navigate(url, { replace })

  doc.startViewTransition(() => flushSync(() => navigate(url, { replace })))
}

type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string
  prefetch?: boolean
  scroll?: boolean
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, prefetch: _prefetch, scroll: _scroll, onClick, ...props },
  ref
) {
  const navigate = useNavigate()
  if (/^[a-z][a-z\d+.-]*:/i.test(href)) return <a ref={ref} href={href} onClick={onClick} {...props} />

  return (
    <RouterLink
      ref={ref}
      to={href}
      {...props}
      onClick={(event) => {
        onClick?.(event)
        // leave new-tab clicks and handled events to the browser / the caller
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target)
          return
        event.preventDefault()
        go(navigate, href)
      }}
    />
  )
})

export function useRouter() {
  const navigate = useNavigate()
  return useMemo(
    () => ({
      push: (url: string, _options?: { scroll?: boolean }) => go(navigate, url),
      replace: (url: string, _options?: { scroll?: boolean }) => go(navigate, url, true),
      back: () => navigate(-1)
    }),
    [navigate]
  )
}

export const usePathname = () => useLocation().pathname
export const useSearchParams = () => useRouterSearchParams()[0]
