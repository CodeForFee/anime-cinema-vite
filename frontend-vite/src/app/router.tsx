import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  type ErrorComponentProps,
  lazyRouteComponent,
  useRouter,
} from "@tanstack/react-router";
import { CircleAlert, RotateCw } from "lucide-react";

import { AppShell } from "@/app/AppShell";
import { NotFoundPage } from "@/app/NotFoundPage";
import { queryClient } from "@/app/query-client";
import { navKind } from "@/app/routes";
import { pickEpisode } from "@/core/player/pick-episode";
import {
  detailQuery,
  scheduleQuery,
  searchQuery,
  streamQuery,
} from "@/core/queries";
import { useHistoryStore } from "@/core/stores/history";
import { preconnectPlayer } from "@/platform/preconnect";
import { isMobile } from "@/shared/lib/form-factor";
import { HomeSkeleton, PosterGridSkeleton } from "@/shared/ui/skeletons";

// ---- search params: plain ?key=value, so old links and history entries keep working ------------------------

const text = (value: unknown) =>
  typeof value === "string" && value !== ""
    ? value
    : typeof value === "number"
      ? String(value)
      : undefined;

const parseSearch = (search: string) =>
  Object.fromEntries(new URLSearchParams(search));
const stringifySearch = (search: Record<string, unknown>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search))
    if (value !== undefined && value !== "") params.set(key, String(value));
  const query = params.toString();
  return query ? `?${query}` : "";
};

// ---- data first: a page's data starts loading on the tap, alongside its chunk --------------------------------

/**
 * The title, then the stream of the episode that will play. Not awaited: the page slides in at once with its
 * skeleton. Never on a preload: touching a card while scrolling a list must not start requests to the source.
 */
async function prefetchWatch(client: QueryClient, slug: string, ep?: string) {
  preconnectPlayer();
  const detail = await client
    .fetchQuery(detailQuery(slug))
    .catch(() => undefined);
  const episode = pickEpisode(
    detail?.data.episodes ?? [],
    ep,
    useHistoryStore.getState().getAnimeHistory(slug)?.episodeSlug,
  );
  if (episode?.hash && episode.id)
    void client.prefetchQuery(
      streamQuery(episode.hash, episode.id, episode.play || "api"),
    );
}

function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <div className="mx-auto my-20 max-w-xl space-y-4 rounded-3xl border border-white/10 bg-[#10121A] p-8 text-center">
      <CircleAlert className="mx-auto h-14 w-14 text-primaryRed" aria-hidden />
      <h2 className="text-xl font-bold text-white">Trang này chưa tải được</h2>
      <p className="text-sm text-gray-400">
        {error instanceof Error
          ? error.message
          : "Kiểm tra kết nối rồi thử lại."}
      </p>
      <button
        type="button"
        onClick={() => {
          reset();
          void router.invalidate();
        }}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-6 font-semibold text-black"
      >
        <RotateCw className="h-4 w-4" aria-hidden />
        Thử lại
      </button>
    </div>
  );
}

// ---- routes ----------------------------------------------------------------------------------------------------

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: AppShell,
  notFoundComponent: NotFoundPage,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: lazyRouteComponent(() => import("@/features/home/HomePage")),
  pendingComponent: HomeSkeleton,
});

const exploreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/explore",
  validateSearch: (
    search: Record<string, unknown>,
  ): { path?: string; type?: string } => ({
    path: text(search.path),
    type: text(search.type),
  }),
  component: lazyRouteComponent(() => import("@/features/browse/ExplorePage")),
  pendingComponent: () => <PosterGridSkeleton />,
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: text(search.q),
  }),
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ context, deps, preload }) => {
    if (!preload && deps.q)
      void context.queryClient.prefetchQuery(searchQuery(deps.q));
  },
  component: lazyRouteComponent(() => import("@/features/browse/SearchPage")),
  pendingComponent: () => <PosterGridSkeleton />,
});

const watchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/watch",
  validateSearch: (
    search: Record<string, unknown>,
  ): { slug: string; ep?: string } => ({
    slug: text(search.slug) ?? "",
    ep: text(search.ep),
  }),
  loaderDeps: ({ search }) => ({ slug: search.slug, ep: search.ep }),
  loader: ({ context, deps, preload }) => {
    if (!preload && deps.slug)
      void prefetchWatch(context.queryClient, deps.slug, deps.ep);
  },
  component: lazyRouteComponent(() => import("@/features/player/WatchPage")),
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  component: lazyRouteComponent(() => import("@/features/library/HistoryPage")),
});

const favoritesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/favorites",
  component: lazyRouteComponent(
    () => import("@/features/library/FavoritesPage"),
  ),
});

const scheduleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/schedule",
  loader: ({ context, preload }) => {
    if (!preload) void context.queryClient.prefetchQuery(scheduleQuery);
  },
  component: lazyRouteComponent(
    () => import("@/features/schedule/SchedulePage"),
  ),
  pendingComponent: () => <PosterGridSkeleton />,
});

const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account",
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: "hoso" | "taikhoan" | "binhluan" | "thongbao" } => {
    const tab = text(search.tab);
    return {
      tab:
        tab === "taikhoan" || tab === "binhluan" || tab === "thongbao"
          ? tab
          : undefined,
    };
  },
  component: lazyRouteComponent(() => import("@/features/account/AccountPage")),
});

const routeTree = rootRoute.addChildren([
  accountRoute,
  homeRoute,
  exploreRoute,
  scheduleRoute,
  searchRoute,
  watchRoute,
  historyRoute,
  favoritesRoute,
]);

export const router = createRouter({
  routeTree,
  context: { queryClient },
  parseSearch,
  stringifySearch,
  // a hovered or touched link loads its page chunk ahead of the tap (data waits for the tap, see the loaders)
  defaultPreload: "intent",
  // TanStack Query keeps the data; the router must not cache loader results on top of it
  defaultPreloadStaleTime: 0,
  // a page reached by back is where it was left; a new page starts at the top
  scrollRestoration: true,
  // a skeleton only when the chunk is slow, and then long enough not to flash
  defaultPendingMs: 150,
  defaultPendingMinMs: 250,
  defaultErrorComponent: RouteError,
  defaultViewTransition: {
    // mobile: iOS-like slides by direction (app/routes.ts); desktop: a short cross-fade. Same page (another
    // episode, another filter): none
    types: ({ fromLocation, toLocation, pathChanged }) => {
      if (
        !fromLocation ||
        !pathChanged ||
        matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return false;
      if (!isMobile()) return ["fade"];
      const back =
        (toLocation.state.__TSR_index ?? 0) <
        (fromLocation.state.__TSR_index ?? 0);
      return [navKind(fromLocation.pathname, toLocation.pathname, back)];
    },
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

/** history.back() with the slide back; the Android back button comes through here too (platform/back.ts) */
export const goBack = () => router.history.back();
