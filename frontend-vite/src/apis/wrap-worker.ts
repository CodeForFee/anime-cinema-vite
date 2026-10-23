/* eslint-disable @typescript-eslint/no-explicit-any */

/** A page that takes longer than this to parse is treated as failed, so the query errors instead of spinning */
const PARSE_TIMEOUT_MS = 15_000

type Reply = { id: string; result?: unknown; error?: string }

/** Worker side: answers each request with the parser's result, or with the error it threw */
export function WrapWorker<Fn extends (...args: any) => any>(fn: Fn) {
  addEventListener("message", (event: MessageEvent<{ id: string; args: unknown[] }>) => {
    const { id, args } = event.data
    try {
      postMessage({ id, result: fn(...args) } satisfies Reply)
    } catch (error) {
      postMessage({ id, error: error instanceof Error ? error.message : String(error) } satisfies Reply)
    }
  })
}

/** Runs `fn` of the worker built by `createWorker`; rejects when the parser throws, the worker dies or it times out */
export function PostWorker<Fn extends (...args: any) => any>(
  createWorker: new () => Worker,
  ...args: Parameters<Fn>
) {
  return new Promise<ReturnType<Fn>>((resolve, reject) => {
    const id = crypto.randomUUID()
    const worker = new createWorker()
    const finish = () => {
      clearTimeout(timer)
      worker.terminate()
    }
    const fail = (message: string) => {
      finish()
      reject(new Error(message))
    }
    const timer = setTimeout(() => fail("Parsing the page timed out"), PARSE_TIMEOUT_MS)

    worker.addEventListener("message", (event: MessageEvent<Reply>) => {
      if (event.data?.id !== id) return
      if (event.data.error !== undefined) return fail(event.data.error)
      finish()
      resolve(event.data.result as ReturnType<Fn>)
    })
    worker.addEventListener("error", (event) => fail(event.message || "The parser worker failed"))
    worker.addEventListener("messageerror", () => fail("The parser result could not be read"))

    worker.postMessage({ id, args })
  })
}
