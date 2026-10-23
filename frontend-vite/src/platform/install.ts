// Plugs this platform (browser + extension, or the Capacitor app) into the core. src/main.tsx imports this module
// first, so the core is configured before any store or query module is evaluated.
import { configureCore } from "@/core/configure"
import { artCache } from "@/platform/art-cache"
import { parseInWorker } from "@/platform/parse"
import { transport } from "@/platform/transport"

configureCore({ transport, parse: parseInWorker, artCache: artCache() })
