// The phone's real connectivity, fed to TanStack Query: while offline it pauses requests instead of failing
// them, and on reconnect it refetches what is on screen (refetchOnReconnect). Browsers already do this from
// the window's online/offline events; inside the Android WebView those are unreliable, so the app asks the
// system (@capacitor/network).
import { onlineManager } from "@tanstack/react-query"

import { isNativeApp } from "./bridge"

export function watchNetwork() {
  if (!isNativeApp) return
  void import("@capacitor/network")
    .then(async ({ Network }) => {
      onlineManager.setOnline((await Network.getStatus()).connected)
      await Network.addListener("networkStatusChange", (status) => onlineManager.setOnline(status.connected))
    })
    .catch(() => {})
}
