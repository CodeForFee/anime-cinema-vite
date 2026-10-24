import { createStore, entries, set } from "idb-keyval";

import type { Cache } from "@/core/configure";

/** AniList covers found on this device, in IndexedDB; nothing is kept where IndexedDB is missing */
export function artCache<T>(): Cache<T> | undefined {
  if (typeof indexedDB === "undefined") return undefined;
  const store = createStore("capynime-hd-art", "art");
  return {
    entries: () => entries<string, T>(store),
    set: (key, value) => set(key, value, store),
  };
}
