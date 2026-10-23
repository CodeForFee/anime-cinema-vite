// Keeps the layering of src/ honest (README "Structure"):
//   core     the app's own logic and the source; no DOM, react-dom, Capacitor, extension or IndexedDB
//   platform adapters for the browser and the Capacitor app; may use core
//   shared   UI primitives and helpers; may use core and platform
//   features one feature each; may use core, platform, shared, and other features through their index.ts
//   app      the shell, router and layout; may use anything
// and inside a feature, mobile/ and desktop/ never import each other.
import { expect, test } from "vitest"

const sources = import.meta.glob(["./**/*.{ts,tsx}", "!./**/*.spec.{ts,tsx}", "!./**/engines/hls/{dha,new-dha}/**"], {
  query: "?raw",
  import: "default",
  eager: true
}) as Record<string, string>

const files = Object.entries(sources).map(([path, text]) => ({ path: path.slice(2), text }))
const layer = (path: string) => path.split("/")[0]
// static imports / re-exports at the start of a line, and dynamic import("…")
const STATIC = /^\s*(?:(?:import|export)\s[^;"'`]*?\bfrom\s*|import\s*)["']([^"']+)["']/gm
const DYNAMIC = /\bimport\(\s*["']([^"']+)["']/g
const imports = (text: string) => [...text.matchAll(STATIC), ...text.matchAll(DYNAMIC)].map((m) => m[1])

const ALLOWED: Record<string, string[]> = {
  core: ["core"],
  platform: ["core", "platform"],
  shared: ["core", "platform", "shared"],
  features: ["core", "platform", "shared", "features"]
}
// packages the core may use: plain logic that runs on any platform (web, React Native)
const CORE_PACKAGES = new Set(["react", "@tanstack/react-query", "zustand", "zustand/middleware", "cheerio", "cheerio/slim", "domhandler", "p-limit"])

test("every layer imports only the layers under it", () => {
  const wrong: string[] = []
  for (const { path, text } of files) {
    const own = layer(path)
    const allowed = ALLOWED[own]
    if (!allowed) continue // app/ and main.tsx put everything together
    for (const spec of imports(text)) {
      if (spec.startsWith("@/")) {
        if (!allowed.includes(layer(spec.slice(2)))) wrong.push(`${path} -> ${spec}`)
      } else if (own === "core" && !spec.startsWith(".") && !CORE_PACKAGES.has(spec) && !spec.endsWith("?raw")) {
        wrong.push(`${path} -> package ${spec}`)
      }
    }
  }
  expect(wrong).toEqual([])
})

test("a feature reaches into another feature only through its index.ts", () => {
  const wrong: string[] = []
  for (const { path, text } of files) {
    const [top, feature] = path.split("/")
    if (top !== "features" && top !== "app") continue
    for (const spec of imports(text)) {
      const match = spec.match(/^@\/features\/([^/]+)\/(.+)$/)
      // the router loads each page module of a feature on its own (code splitting): that is its other public entry
      const pageForRouter = top === "app" && /Page$/.test(match?.[2] ?? "")
      if (match && !pageForRouter && (top === "app" || match[1] !== feature)) wrong.push(`${path} -> ${spec}`)
    }
  }
  expect(wrong).toEqual([])
})

test("mobile/ and desktop/ code never import each other", () => {
  const wrong: string[] = []
  for (const { path, text } of files) {
    const form = path.includes("/mobile/") ? "mobile" : path.includes("/desktop/") ? "desktop" : null
    if (!form) continue
    const other = form === "mobile" ? "/desktop/" : "/mobile/"
    for (const spec of imports(text)) if (spec.includes(other)) wrong.push(`${path} -> ${spec}`)
  }
  expect(wrong).toEqual([])
})

test("component files stay small: logic lives in hooks and model/", () => {
  const limit = (path: string) => (path.startsWith("shared/ui/") ? 300 : 250)
  const long = files
    .filter(({ path }) => path.endsWith(".tsx"))
    .map(({ path, text }) => ({ path, lines: text.split("\n").length }))
    .filter(({ path, lines }) => lines > limit(path))
    .map(({ path, lines }) => `${path}: ${lines}`)
  expect(long).toEqual([])
})
