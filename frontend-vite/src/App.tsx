import { HeroUIProvider } from "@heroui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect } from "react"
import { Route, Routes, useLocation } from "react-router-dom"

import { ExtensionGate } from "./components/layout/ExtensionGate"
import { Footer } from "./components/layout/Footer"
import { HeaderNav } from "./components/layout/HeaderNav"
import { SidebarDock } from "./components/layout/SidebarDock"
import ExplorePage from "./pages/explore"
import FavoritesPage from "./pages/favorites"
import HistoryPage from "./pages/history"
import HomePage from "./pages/home"
import NotFound from "./pages/not-found"
import SearchPage from "./pages/search"
import WatchPage from "./pages/watch"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, refetchOnWindowFocus: false, retry: 1 }
  }
})

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
    <QueryClientProvider client={queryClient}>
      <HeroUIProvider>
        <ExtensionGate>
          <ScrollToTop />
          <HeaderNav />
          <div className="flex flex-col min-h-[calc(100vh-64px)] pb-16 lg:pb-0 w-full overflow-x-hidden">
            <main className="flex-1 w-full max-w-full">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/watch" element={<WatchPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
          <SidebarDock />
        </ExtensionGate>
      </HeroUIProvider>
    </QueryClientProvider>
  )
}
