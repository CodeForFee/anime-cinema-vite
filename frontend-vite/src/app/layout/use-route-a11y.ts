import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { type RefObject, useEffect, useRef } from "react";

import { detailQuery } from "@/core/queries";

const APP = "Capynime";
const LABELS: Record<string, string> = {
  "/explore": "Khám phá",
  "/search": "Tìm kiếm",
  "/history": "Lịch sử xem",
  "/favorites": "Yêu thích",
  "/schedule": "Lịch chiếu",
  "/account": "Tài khoản",
  "/settings": "Cài đặt",
};

/** The tab title for a page; null keeps the one in index.html (the home page) */
export function pageTitle(
  pathname: string,
  search: Record<string, unknown>,
  animeTitle?: string,
) {
  if (pathname === "/watch")
    return animeTitle ? `${animeTitle} - ${APP}` : `Xem phim - ${APP}`;
  if (pathname === "/search" && typeof search.q === "string" && search.q)
    return `Tìm “${search.q}” - ${APP}`;
  const label = LABELS[pathname];
  return label ? `${label} - ${APP}` : null;
}

/**
 * Screen readers and keyboards follow a page change: the tab title names the new page, and focus moves to
 * the page's main region (it would otherwise stay on the link that was pressed, now gone). Not on the first
 * load, and not when only the search changes (another episode, another filter).
 */
export function useRouteA11y(main: RefObject<HTMLElement | null>) {
  const { pathname, search } = useRouterState({
    select: (state) => ({
      pathname: state.location.pathname,
      search: state.location.search as Record<string, unknown>,
    }),
  });
  const slug =
    pathname === "/watch" && typeof search.slug === "string" ? search.slug : "";
  // the watch page asks for the same query; this only reads it
  const { data } = useQuery({ ...detailQuery(slug), enabled: Boolean(slug) });
  const title = pageTitle(pathname, search, data?.data.title);

  const initial = useRef(document.title);
  useEffect(() => {
    document.title = title ?? initial.current;
  }, [title]);

  const previous = useRef(pathname);
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    main.current?.focus({ preventScroll: true });
  }, [pathname, main]);
}
