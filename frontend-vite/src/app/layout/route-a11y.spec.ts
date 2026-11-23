import { pageTitle } from "@/app/layout/use-route-a11y";

describe("page titles", () => {
  test("each page names itself, the home page keeps index.html's", () => {
    expect(pageTitle("/", {})).toBeNull();
    expect(pageTitle("/schedule", {})).toBe("Lịch chiếu - Capynime");
    expect(pageTitle("/search", { q: "naruto" })).toBe("Tìm “naruto” - Capynime");
    expect(pageTitle("/search", {})).toBe("Tìm kiếm - Capynime");
    expect(pageTitle("/watch", { slug: "x" }, "Frieren")).toBe("Frieren - Capynime");
    expect(pageTitle("/watch", { slug: "x" })).toBe("Xem phim - Capynime");
    expect(pageTitle("/nope", {})).toBeNull();
  });
});
