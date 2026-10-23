import { get } from "@/core/source/transport"

const TTL_MS = 60_000

// key -> the answer, or the request still on its way, so two callers of one page share a single request
const store = new Map<string, { at: number; value: Promise<unknown> }>()

/** `fn()` once per key for a minute; a failed call is forgotten at once so the next one tries again */
export function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const hit = store.get(key)
  if (hit && now - hit.at < TTL_MS) return hit.value as Promise<T>

  const value = fn()
  store.set(key, { at: now, value })
  value.catch(() => {
    if (store.get(key)?.value === value) store.delete(key)
  })
  return value
}

/** The HTML of a page of the source; pages parsed in more than one way (home + menu) are fetched once */
export const page = (path: string) => cached(`GET ${path}`, async () => (await get(path)).data)
