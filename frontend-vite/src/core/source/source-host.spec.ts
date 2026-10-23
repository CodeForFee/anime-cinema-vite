import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { configureCore } from "@/core/configure"
import { HOST_CURL, OFFICIAL_LINK, setSourceHost } from "@/core/source/hosts"
import { checkOfficialSource, resolveSourceHost } from "@/core/source/source-host"
import { get as fetchPage, post as postForm } from "@/core/source/transport"

const HTML = '<div class="MovieListSldCn"><article class="TPostMv"></article></div>'
const answer = (url: string, status = 200, data = HTML) => ({ url, status, data, headers: {} })

const get = vi.fn()
const post = vi.fn()
const hostChanged = vi.fn()
beforeEach(() => {
  configureCore({ transport: { version: "test", get, post, hostChanged }, parse: vi.fn() })
  get.mockRejectedValue(new Error("down"))
  hostChanged.mockResolvedValue(undefined)
  setSourceHost("animevietsub.sale")
})

describe("resolveSourceHost", () => {
  afterEach(() => {
    get.mockReset()
    post.mockReset()
    hostChanged.mockReset()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    sessionStorage.clear()
    localStorage.clear()
    setSourceHost("animevietsub.sale")
  })

  test("probes in parallel while keeping a current host that answers", async () => {
    get.mockResolvedValue(answer("https://animevietsub.sale/"))
    expect(await resolveSourceHost()).toBe("animevietsub.sale")
    expect(hostChanged).not.toHaveBeenCalled()
  })

  test("moves to the first alternate that answers, and remembers it", async () => {
    vi.stubGlobal("location", { ...location, reload: vi.fn() })
    get.mockImplementation(async ({ url }: { url: string }) => {
      if (url.includes("animevietsub.link")) return answer("https://animevietsub.fan/")
      throw new Error("down")
    })
    expect(await resolveSourceHost(["animevietsub.link"])).toBe("animevietsub.fan")
    expect(HOST_CURL).toBe("animevietsub.fan")
    expect(localStorage.getItem("capynime-source-host")).toBe("animevietsub.fan")
  })

  test("returns null when nothing answers", async () => {
    get.mockRejectedValue(new Error("down"))
    expect(await resolveSourceHost(["animevietsub.link"])).toBeNull()
  })

  test("learns a new host from the official link and persists it", async () => {
    get.mockImplementation(async ({ url }: { url: string }) => {
      if (url === OFFICIAL_LINK) return answer("https://animevietsub.new/")
      throw new Error("down")
    })
    expect(await resolveSourceHost([], "animevietsub.sale")).toBe("animevietsub.new")
    expect(hostChanged).toHaveBeenCalledWith("https://animevietsub.new")
    expect(localStorage.getItem("capynime-source-host")).toBe("animevietsub.new")
  })

  test.each(["https://animevietsub.global/", "http://animevietsub.new/", "https://evil.test/"])("rejects target %s", async (url) => {
    get.mockResolvedValue(answer(url))
    expect(await resolveSourceHost([], "animevietsub.sale")).toBeNull()
    expect(HOST_CURL).toBe("animevietsub.sale")
  })

  test("rejects a similar hostname without home markers", async () => {
    get.mockResolvedValue(answer("https://animevietsub.new/", 200, "parking page"))
    expect(await resolveSourceHost([], "animevietsub.sale")).toBeNull()
  })

  test("ten failed requests share discovery and each retries its original path", async () => {
    let complete!: (value: ReturnType<typeof answer>) => void
    const discovery = new Promise<ReturnType<typeof answer>>((resolve) => { complete = resolve })
    get.mockImplementation(async ({ url }: { url: string }) => {
      if (url === OFFICIAL_LINK) return discovery
      if (url.includes("animevietsub.new")) return answer(url, 200, new URL(url).pathname)
      throw new Error("down")
    })
    const pending = Promise.all(Array.from({ length: 10 }, (_, i) => fetchPage(`/page-${i}?q=ok`)))
    await vi.waitFor(() => expect(get.mock.calls.filter(([arg]) => arg.url === OFFICIAL_LINK)).toHaveLength(1))
    complete(answer("https://animevietsub.new/"))
    expect((await pending).map((r) => r.data)).toEqual(Array.from({ length: 10 }, (_, i) => `/page-${i}`))
    expect(hostChanged).toHaveBeenCalledTimes(1)
  })

  test("POST retry preserves its body and headers", async () => {
    get.mockResolvedValue(answer("https://animevietsub.new/"))
    post.mockImplementation(async ({ url }: { url: string }) => answer(url, url.includes(".sale") ? 503 : 200, "stream"))
    expect((await postForm("/ajax/player", { id: 42 }, { token: "same" })).data).toBe("stream")
    expect(post.mock.calls[1][0]).toMatchObject({ url: "https://animevietsub.new/ajax/player#animevsub-vsub", data: { id: 42 }, headers: { token: "same" } })
  })

  test("adopts valid redirects and subsequent requests use the final host", async () => {
    get.mockImplementation(async ({ url }: { url: string }) => answer(url.includes(".sale") ? "https://animevietsub.new/" : url))
    await fetchPage("/")
    await fetchPage("/next")
    expect(get.mock.calls[1][0].url).toBe("https://animevietsub.new/next#animevsub-vsub")
  })

  test("404 and offline errors do not trigger discovery", async () => {
    get.mockResolvedValue(answer("https://animevietsub.sale/missing", 404))
    await expect(fetchPage("/missing")).rejects.toMatchObject({ status: 404 })
    get.mockReset().mockRejectedValue(new Error("offline"))
    vi.stubGlobal("navigator", { onLine: false })
    await expect(fetchPage("/")).rejects.toThrow("offline")
    expect(get).toHaveBeenCalledTimes(1)
  })

  test("a stuck source times out, discovers and retries", async () => {
    vi.useFakeTimers()
    get.mockImplementation(({ url }: { url: string }) => {
      if (url.includes(".sale")) return new Promise(() => {})
      return Promise.resolve(answer("https://animevietsub.new/"))
    })
    const pending = fetchPage("/")
    await vi.advanceTimersByTimeAsync(12_000)
    expect((await pending).status).toBe(200)
    await vi.advanceTimersByTimeAsync(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  test("idle discovery checks the official link once daily", async () => {
    get.mockResolvedValue(answer("https://animevietsub.sale/"))
    await checkOfficialSource()
    await checkOfficialSource()
    expect(get).toHaveBeenCalledTimes(1)
  })
})
