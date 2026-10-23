// The phone's real connectivity, fed to TanStack Query: while offline it pauses requests instead of failing
// them, and on reconnect it refetches what is on screen (refetchOnReconnect). Browsers already do this from
// the window's online/offline events; inside the Android WebView those are unreliable, so the app asks the
// system (@capacitor/network).
import { onlineManager } from "@tanstack/react-query"

import { isNativeApp } from "@/platform/transport"

export function watchNetwork() {
  if (!isNativeApp) return
  void import("@capacitor/network")
    .then(async ({ Network }) => {
      onlineManager.setOnline((await Network.getStatus()).connected)
      await Network.addListener("networkStatusChange", (status) => onlineManager.setOnline(status.connected))
    })
    .catch(() => {})
}

/** Whether the device can reach the internet at all, to tell a dead host from a dead connection */
export async function isConnectedToNetwork(): Promise<boolean> {
  if (!navigator.onLine) return false

  try {
    const response = await fetch("https://1.1.1.1/cdn-cgi/trace")
    return response.ok
  } catch {
    return false
  }
}
