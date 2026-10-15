import { afterEach, describe, expect, test, vi } from "vitest"

const get = vi.hoisted(() => vi.fn())
vi.mock("src/logic/bridge", () => ({ Http: { get }, isNativeApp: true }))

import { HOST_CURL, setSourceHost } from "src/constants"
import { resolveSourceHost } from "src/logic/source-host"

const answer = (url: string, status = 200) => ({ url, status, data: "", headers: {} })

describe("resolveSourceHost", () => {
  afterEach(() => {
    get.mockReset()
    sessionStorage.clear()
    localStorage.clear()
    setSourceHost("animevietsub.sale")
  })

  test("keeps the current host while it answers", async () => {
    get.mockResolvedValue(answer("https://animevietsub.sale/"))
    expect(await resolveSourceHost()).toBe("animevietsub.sale")
    expect(get).toHaveBeenCalledTimes(1)
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
})
