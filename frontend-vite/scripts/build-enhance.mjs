// Builds public/player-enhance.js: the picture/sound enhancers (src/features/player/engines/enhance) as one
// classic script, injected next to public/player-bridge.js into the source's player page by the extension
// (manifest-v3/src/manifest.ts) and by the Android app (MainActivity.java). Run by `pnpm build`.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));

/** WGSL has no line-sensitive syntax: comments and runs of whitespace can go */
const compactWgsl = {
  name: "compact-wgsl",
  enforce: "pre",
  async load(id) {
    if (!id.endsWith(".wgsl?raw")) return null;
    const source = await readFile(id.slice(0, -"?raw".length), "utf8");
    const compact = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return `export default ${JSON.stringify(compact)};`;
  },
};

await build({
  root,
  configFile: false,
  logLevel: "warn",
  plugins: [compactWgsl],
  resolve: { alias: { "@": `${root}src` } },
  build: {
    outDir: "public",
    emptyOutDir: false,
    copyPublicDir: false,
    target: "es2020",
    minify: true,
    sourcemap: false,
    lib: {
      entry: "src/features/player/engines/enhance/frame-entry.ts",
      formats: ["iife"],
      name: "CapyEnhance",
      // one file: Anime4K's dynamic import is inlined (~36 KB gzipped in all, parsed lazily, run only when on)
      fileName: () => "player-enhance.js",
    },
  },
});
