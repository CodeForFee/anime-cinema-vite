import { HeroUIProvider } from "@heroui/react"
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"
import { onlineManager, QueryClient } from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { del, get, set } from "idb-keyval"
import { WifiOff } from "lucide-react"
import { Suspense, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react"
import { Route, Routes, useLocation, useNavigationType } from "react-router-dom"

import { ExtensionGate } from "@/app/layout/ExtensionGate"
import { Footer } from "@/app/layout/desktop/Footer"
import { HeaderNav } from "@/app/layout/HeaderNav"
import { SidebarDock } from "@/app/layout/mobile/SidebarDock"
import { pages } from "@/app/routes"

const DAY = 24 * 60 * 60 * 1000

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, gcTime: DAY, refetchOnWindowFocus: false, retry: 1 }
  }
})

// Catalog answers survive a reload in IndexedDB, so a returning viewer sees pages at once while they refresh.
const persister = createAsyncStoragePersister({
  storage: { getItem: get, setItem: set, removeItem: del },
  key: "capynime-query-cache"
})
const persistOptions = {
  persister,
  maxAge: DAY,
  // bump to drop every persisted cache (v2.1: empty home pages persisted by v2.0; v2.2: details gained metadata/gallery)
  buster: "v2.2",
  dehydrateOptions: {
    // stream links are tied to a session and expire: never replay them
    shouldDehydrateQuery: (query: { queryKey: readonly unknown[]; state: { status: string } }) =>
      query.state.status === "success" && query.queryKey[1] !== "stream"
  }
}

const scrollByKey = new Map<string, number>()

// A new page starts at the top; back returns to where that page was left, as native apps do. Layout effect:
// the position is in place before the back slide captures the page (lib/router.tsx goBack).
function ScrollMemory() {
  const { key, pathname } = useLocation()
  const type = useNavigationType()
  const last = useRef({ key, pathname: "" })

  useEffect(() => {
    history.scrollRestoration = "manual"
    const save = () => scrollByKey.set(last.current.key, scrollY)
    addEventListener("scroll", save, { passive: true })
    return () => removeEventListener("scroll", save)
  }, [])

  useLayoutEffect(() => {
    const samePage = last.current.pathname === pathname
    last.current = { key, pathname }
    // switching episode or filter on the same page keeps the position
    if (type !== "POP" && samePage) return
    const target = type === "POP" ? (scrollByKey.get(key) ?? 0) : 0
    let tries = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const restore = () => {
      scrollTo(0, target)
      // the page may still be filling in: retry until it is tall enough
      if (Math.abs(scrollY - target) > 1 && ++tries < 30) timer = setTimeout(restore, 16)
    }
    restore()
    return () => clearTimeout(timer)
  }, [key, pathname, type])

  return null
}

// While the device is offline: one quiet line above the tab bar. Nothing to press: requests wait and the
// lists refetch by themselves when the connection is back (logic/network.ts).
function OfflineNotice() {
  const online = useSyncExternalStore(
    (listener) => onlineManager.subscribe(listener),
    () => onlineManager.isOnline()
  )
  if (online) return null
  return (
    <div role="status" className="app-toast flex items-center gap-2">
      <WifiOff aria-hidden className="h-4 w-4 text-amber-400" />
      Mất kết nối mạng
    </div>
  )
}

export default function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <HeroUIProvider>
        <ExtensionGate>
          <ScrollMemory />
          <HeaderNav />
          <div className="flex flex-col min-h-[calc(100vh-64px)] pb-24 lg:pb-0 w-full overflow-x-hidden">
            <main className="flex-1 w-full max-w-full">
              <Suspense fallback={<div className="min-h-[60vh]" data-route-fallback />}>
                <Routes>
                  <Route path="/" element={<pages.home />} />
                  <Route path="/explore" element={<pages.explore />} />
                  <Route path="/search" element={<pages.search />} />
                  <Route path="/watch" element={<pages.watch />} />
                  <Route path="/history" element={<pages.history />} />
                  <Route path="/favorites" element={<pages.favorites />} />
                  <Route path="*" element={<pages.notFound />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
          </div>
          <SidebarDock />
          <OfflineNotice />
        </ExtensionGate>
      </HeroUIProvider>
    </PersistQueryClientProvider>
  )
}
