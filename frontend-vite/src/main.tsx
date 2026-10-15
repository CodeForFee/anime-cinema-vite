// One typeface for the whole app, drawn for Vietnamese. Each weight downloads only the subsets a page uses
import "@fontsource/be-vietnam-pro/400.css"
import "@fontsource/be-vietnam-pro/500.css"
import "@fontsource/be-vietnam-pro/600.css"
import "@fontsource/be-vietnam-pro/700.css"
import "@fontsource/be-vietnam-pro/800.css"
import "@fontsource/be-vietnam-pro/900.css"
import "./globals.css"

import React from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import App from "./App"
import { installBackButton } from "./logic/back"
import { isNativeApp } from "./logic/bridge"
import { watchNetwork } from "./logic/network"

// Only Chromium renders an SVG filter as backdrop-filter; elsewhere .glass stays a plain blur
if ("userAgentData" in navigator) document.documentElement.dataset.liquid = ""

// After a deploy an open tab still asks for the old hashed chunks, which are gone: reload once into the new build
window.addEventListener("vite:preloadError", (event) => {
  if (sessionStorage.getItem("capynime-reloaded")) return
  sessionStorage.setItem("capynime-reloaded", "1")
  event.preventDefault()
  location.reload()
})
window.addEventListener("load", () => setTimeout(() => sessionStorage.removeItem("capynime-reloaded"), 10_000))

// Offline shell for the web; the Android app has its files locally (and drops a worker an older build left)
// (sw.js is generated with skipWaiting + clientsClaim, registerType "autoUpdate" in vite.config.ts)
if (!isNativeApp) {
  if (import.meta.env.PROD) void navigator.serviceWorker?.register("/sw.js").catch(() => {})
}
else void navigator.serviceWorker?.getRegistrations().then((all) => all.forEach((worker) => worker.unregister()))

installBackButton()
watchNetwork()
// The Android splash is held until the launch intro has painted (index.html asks first; this is the backstop
// in case that inline call ran before the bridge was ready)
if (isNativeApp) void import("@capacitor/splash-screen").then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 200 })).catch(() => {})

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
