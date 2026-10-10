import { HeroUIProvider } from "@heroui/react"
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"
import { QueryClient } from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { del, get, set } from "idb-keyval"
import { Suspense, useEffect } from "react"
import { Route, Routes, useLocation } from "react-router-dom"

import { ExtensionGate } from "./components/layout/ExtensionGate"
import { Footer } from "./components/layout/Footer"
import { HeaderNav } from "./components/layout/HeaderNav"
import { SidebarDock } from "./components/layout/SidebarDock"
import { pages } from "./lib/routes"

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

// Next.js scrolled to the top on every page change; react-router leaves that to us
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <HeroUIProvider>
        <ExtensionGate>
          <ScrollToTop />
          <HeaderNav />
          <div className="flex flex-col min-h-[calc(100vh-64px)] pb-24 lg:pb-0 w-full overflow-x-hidden">
            <main className="flex-1 w-full max-w-full">
              <Suspense fallback={<div className="min-h-[60vh]" />}>
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
        </ExtensionGate>
      </HeroUIProvider>
    </PersistQueryClientProvider>
  )
}
