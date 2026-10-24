import { onlineManager } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
import { WifiOff } from "lucide-react";
import { useSyncExternalStore } from "react";

import { DesktopHeader } from "@/app/layout/desktop/DesktopHeader";
import { Footer } from "@/app/layout/desktop/Footer";
import { ExtensionGate } from "@/app/layout/ExtensionGate";
import { MobileHeader } from "@/app/layout/mobile/MobileHeader";
import { SidebarDock } from "@/app/layout/mobile/SidebarDock";
import { useFormFactor } from "@/shared/lib/form-factor";

// While the device is offline: one quiet line above the tab bar. Nothing to press: requests wait and the
// lists refetch by themselves when the connection is back (platform/network.ts).
function OfflineNotice() {
  const online = useSyncExternalStore(
    (listener) => onlineManager.subscribe(listener),
    () => onlineManager.isOnline(),
  );
  if (online) return null;
  return (
    <div role="status" className="app-toast flex items-center gap-2">
      <WifiOff aria-hidden className="h-4 w-4 text-amber-400" />
      Mất kết nối mạng
    </div>
  );
}

/** The frame around every page: on mobile a compact header and the tab bar, on desktop the menu header and a footer */
export function AppShell() {
  const mobile = useFormFactor() === "mobile";
  return (
    <ExtensionGate>
      {mobile ? <MobileHeader /> : <DesktopHeader />}
      <div
        className={`flex flex-col min-h-[calc(100vh-64px)] w-full overflow-x-hidden ${mobile ? "pb-24" : ""}`}
      >
        <main className="flex-1 w-full max-w-full">
          <Outlet />
        </main>
        {!mobile && <Footer />}
      </div>
      {mobile && <SidebarDock />}
      <OfflineNotice />
    </ExtensionGate>
  );
}
