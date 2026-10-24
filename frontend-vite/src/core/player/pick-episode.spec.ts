import { pickEpisode } from "@/core/player/pick-episode";
import type { Episode } from "@/core/types/anime";

const ep = (name: string, id: string, index: number) =>
  ({
    name,
    id,
    index,
    title: `Tập ${name}`,
    hash: id,
    play: "api",
    slug: name,
  }) as Episode;
const list = [ep("01", "a", 1), ep("02", "b", 2), ep("12", "c", 3)];

test("the linked episode, else the one watched last, else the first", () => {
  expect(pickEpisode(list, "02")?.id).toBe("b");
  expect(pickEpisode(list, "Tập 2")?.id).toBe("b");
  expect(pickEpisode(list, "12")?.id).toBe("c");
  expect(pickEpisode(list, "c")?.id).toBe("c");
  expect(pickEpisode(list, "99", "12")?.id).toBe("c");
  expect(pickEpisode(list, undefined, "02")?.id).toBe("b");
  expect(pickEpisode(list)?.id).toBe("a");
  expect(pickEpisode([], "01")).toBeUndefined();
});
