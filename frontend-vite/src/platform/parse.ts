import type { Parse } from "@/core/configure"
import ParseWorker from "@/platform/parse.worker?worker"

/** A page that takes longer than this to parse fails, so its query errors instead of spinning */
const TIMEOUT_MS = 15_000

type Pending = { resolve: (value: never) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }

// ponytail: one worker parses one page at a time; a pool of two if traces show pages queueing behind each other
let worker: Worker | undefined
const pending = new Map<string, Pending>()

/** Fails every job in flight and drops the worker; the next parse starts a fresh one */
function reset(message: string) {
  worker?.terminate()
  worker = undefined
  for (const [id, job] of pending) {
    clearTimeout(job.timer)
    job.reject(new Error(message))
    pending.delete(id)
  }
}

function start() {
  const next = new ParseWorker()
  next.addEventListener("message", (event: MessageEvent<{ id: string; result?: unknown; error?: string }>) => {
    const job = pending.get(event.data.id)
    if (!job) return
    pending.delete(event.data.id)
    clearTimeout(job.timer)
    if (event.data.error !== undefined) job.reject(new Error(event.data.error))
    else job.resolve(event.data.result as never)
  })
  next.addEventListener("error", (event) => reset(event.message || "The parser worker failed"))
  next.addEventListener("messageerror", () => reset("A parser result could not be read"))
  return next
}

/** Parses in the shared worker; rejects when the parser throws, the worker dies or the page takes too long */
export const parseInWorker: Parse = (name, ...args) =>
  new Promise((resolve, reject) => {
    worker ??= start()
    const id = crypto.randomUUID()
    // a parser stuck in a loop would hold every page after it: restart the worker
    const timer = setTimeout(() => reset("Parsing the page timed out"), TIMEOUT_MS)
    pending.set(id, { resolve: resolve as (value: never) => void, reject, timer })
    worker.postMessage({ id, name, args })
  })
