import { beforeEach, expect, test, vi } from "vitest";

import { animeApi } from "@/core/anime-api";
import { recheckSourceUser, setSourceUser, syncSourceUser } from "@/features/account/store";

vi.mock("@/core/anime-api", () => ({ account: {}, animeApi: { account: { me: vi.fn() } } }));
const viewer = { id: 12, name: "Viewer", avatar: "avatar" };
const storedUser = () => JSON.parse(localStorage.getItem("source-user") ?? "null")?.state.user;

beforeEach(() => { vi.resetAllMocks(); setSourceUser(null); });

test("returning from the source refreshes an already remembered identity", async () => {
  setSourceUser(viewer);
  vi.mocked(animeApi.account.me).mockResolvedValue({ ...viewer, id: 13, name: "Other" });
  expect((await syncSourceUser(true))?.id).toBe(13);
  expect(storedUser().id).toBe(13);
});

test("network failures preserve the existing identity, confirmed logout clears it", async () => {
  setSourceUser(viewer);
  vi.mocked(animeApi.account.me).mockRejectedValueOnce(new Error("Network"));
  await recheckSourceUser();
  expect(storedUser()).toEqual(viewer);
  vi.mocked(animeApi.account.me).mockResolvedValue(null);
  await recheckSourceUser();
  expect(storedUser()).toBeNull();
});

test("concurrent return events share one source request", async () => {
  let finish!: (user: typeof viewer) => void;
  vi.mocked(animeApi.account.me).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const one = syncSourceUser(true);
  const two = syncSourceUser(true);
  expect(animeApi.account.me).toHaveBeenCalledTimes(1);
  finish(viewer);
  expect(await one).toEqual(viewer);
  expect(await two).toEqual(viewer);
});

test("a late discovery request cannot restore a user after a newer logout", async () => {
  let finish!: (user: typeof viewer) => void;
  vi.mocked(animeApi.account.me).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const discovery = syncSourceUser(true);
  setSourceUser(null);
  finish(viewer);
  expect(await discovery).toBeNull();
  expect(storedUser()).toBeNull();
});

test("only identity is persisted", () => {
  setSourceUser(viewer);
  expect(Object.keys(JSON.parse(localStorage.getItem("source-user") ?? "null").state)).toEqual(["user"]);
});
