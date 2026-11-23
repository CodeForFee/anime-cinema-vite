import { useProgressStore } from "@/core/player/progress";
import { makeBackup, mergeBackup, parseBackup } from "@/core/stores/backup";
import { useHistoryStore } from "@/core/stores/history";

const item = (slug: string, updatedAt: number) => ({
  slug,
  title: slug,
  poster: "",
  episodeSlug: "1",
  episodeName: "Tập 1",
  timestamp: 0,
  updatedAt,
});

describe("backup", () => {
  beforeEach(() => {
    useHistoryStore.setState({ history: [], favorites: [] });
    useProgressStore.setState({ entries: {} });
  });

  test("a file that is not a backup is refused", () => {
    expect(() => parseBackup("not json")).toThrow("JSON");
    expect(() => parseBackup('{"kind":"other"}')).toThrow("Capynime");
  });

  test("unknown fields and entries without a slug are dropped", () => {
    const parsed = parseBackup(
      JSON.stringify({
        kind: "capynime-backup",
        history: [{ ...item("a", 1), evil: "<script>" }, { title: "no slug" }],
        favorites: [{ slug: "f", title: 5 }],
        progress: { "a:1": { t: 10, d: 100, at: 1 }, bad: { t: 1, d: "x" } },
      }),
    );
    expect(parsed.history).toHaveLength(1);
    expect(parsed.history[0]).not.toHaveProperty("evil");
    expect(parsed.favorites[0].title).toBe("");
    expect(Object.keys(parsed.progress)).toEqual(["a:1"]);
  });

  test("merging keeps the newer of each and never drops what is here", () => {
    useHistoryStore.setState({
      history: [item("a", 5), item("b", 1)],
      favorites: [],
    });
    useProgressStore.setState({ entries: { "a:1": { t: 50, d: 100, at: 9 } } });
    const file = JSON.stringify({
      ...makeBackup(),
      history: [item("a", 2), item("b", 7), item("c", 3)],
      progress: {
        "a:1": { t: 5, d: 100, at: 1 },
        "c:1": { t: 3, d: 100, at: 3 },
      },
    });
    mergeBackup(parseBackup(file));
    expect(
      useHistoryStore.getState().history.map((h) => [h.slug, h.updatedAt]),
    ).toEqual([
      ["b", 7],
      ["a", 5],
      ["c", 3],
    ]);
    expect(useProgressStore.getState().entries["a:1"].t).toBe(50);
    expect(useProgressStore.getState().entries["c:1"].t).toBe(3);
  });
});
