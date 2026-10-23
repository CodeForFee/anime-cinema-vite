import { onlineManager } from "@tanstack/react-query"
import { Outlet } from "@tanstack/react-router"
import { WifiOff } from "lucide-react"
import { useSyncExternalStore } from "react"

import { Footer } from "@/app/layout/desktop/Footer"
import { ExtensionGate } from "@/app/layout/ExtensionGate"
import { HeaderNav } from "@/app/layout/HeaderNav"
import { SidebarDock } from "@/app/layout/mobile/SidebarDock"

// While the device is offline: one quiet line above the tab bar. Nothing to press: requests wait and the
// lists refetch by themselves when the connection is back (platform/network.ts).
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

/** The frame around every page: header, the page (Outlet), footer on desktop, tab bar on mobile */
export function AppShell() {
  return (
    <ExtensionGate>
      <HeaderNav />
      <div className="flex flex-col min-h-[calc(100vh-64px)] pb-24 lg:pb-0 w-full overflow-x-hidden">
        <main className="flex-1 w-full max-w-full">
          <Outlet />
        </main>
        <Footer />
      </div>
      <SidebarDock />
      <OfflineNotice />
    </ExtensionGate>
  )
}
