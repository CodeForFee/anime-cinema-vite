// The UI was written against next/link and next/navigation; these keep its call sites unchanged on react-router.
import { forwardRef, useMemo } from "react"
import {
  Link as RouterLink,
  useLocation,
  useNavigate,
  useSearchParams as useRouterSearchParams
} from "react-router-dom"

type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string
  prefetch?: boolean
  scroll?: boolean
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, prefetch: _prefetch, scroll: _scroll, ...props },
  ref
) {
  if (/^[a-z][a-z\d+.-]*:/i.test(href)) return <a ref={ref} href={href} {...props} />
  return <RouterLink ref={ref} to={href} {...props} />
})

export function useRouter() {
  const navigate = useNavigate()
  return useMemo(
    () => ({
      push: (url: string, _options?: { scroll?: boolean }) => navigate(url),
      replace: (url: string, _options?: { scroll?: boolean }) => navigate(url, { replace: true }),
      back: () => navigate(-1)
    }),
    [navigate]
  )
}

export const usePathname = () => useLocation().pathname
export const useSearchParams = () => useRouterSearchParams()[0]
