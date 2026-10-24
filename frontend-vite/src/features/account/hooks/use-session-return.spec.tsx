import { App } from "@capacitor/app";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { animeApi } from "@/core/anime-api";
import { useSessionReturn } from "@/features/account/hooks/use-session-return";
import { setSourceUser } from "@/features/account/store";

const native = vi.hoisted(() => ({ enabled: false }));
vi.mock("@/platform/transport", () => ({ get isNativeApp() { return native.enabled; } }));
vi.mock("@capacitor/app", () => ({ App: { addListener: vi.fn() } }));
vi.mock("@/core/anime-api", () => ({ animeApi: { account: { me: vi.fn() } } }));
let client: QueryClient;
let root: Root;
const viewer = { id: 2, name: "Viewer", avatar: "avatar" };
function Session() { useSessionReturn(); return null; }
const mount = async () => {
  await act(async () => root.render(<QueryClientProvider client={client}><Session /></QueryClientProvider>));
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  native.enabled = false;
  setSourceUser(null);
  vi.mocked(animeApi.account.me).mockReset().mockResolvedValue(null);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  root = createRoot(document.createElement("div"));
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test("return from another tab rechecks the source and cleans up its listeners", async () => {
  await mount();
  await act(async () => window.dispatchEvent(new Event("focus")));
  expect(animeApi.account.me).toHaveBeenCalledTimes(1);
  vi.mocked(animeApi.account.me).mockResolvedValue(viewer);
  await act(async () => document.dispatchEvent(new Event("visibilitychange")));
  expect(animeApi.account.me).toHaveBeenCalledTimes(2);
  expect(JSON.parse(localStorage.getItem("source-user") ?? "null").state.user.id).toBe(2);
  await act(async () => root.unmount());
  window.dispatchEvent(new Event("focus"));
  expect(animeApi.account.me).toHaveBeenCalledTimes(2);
});

test("changing identity discards another account's private cache and retains public data", async () => {
  client.setQueryData(["source", "account", 1], { name: "Previous" });
  client.setQueryData(["source", "notifications", 1], [{ secret: "previous" }]);
  client.setQueryData(["source", "notifications", 2], [{ message: "current" }]);
  client.setQueryData(["source", "comments", 1], [{ content: "public" }]);
  setSourceUser(viewer);
  await mount();
  expect(client.getQueryData(["source", "account", 1])).toBeUndefined();
  expect(client.getQueryData(["source", "notifications", 1])).toBeUndefined();
  expect(client.getQueryData(["source", "notifications", 2])).toEqual([{ message: "current" }]);
  expect(client.getQueryData(["source", "comments", 1])).toEqual([{ content: "public" }]);
  await act(async () => setSourceUser(null));
  expect(client.getQueryData(["source", "notifications", 2])).toBeUndefined();
});

test("native resume rechecks the app cookie jar, not Chrome, and removes the native listener", async () => {
  native.enabled = true;
  let resume!: (state: { isActive: boolean }) => void;
  const remove = vi.fn().mockResolvedValue(undefined);
  vi.mocked(App.addListener).mockImplementation(((_event: string, listener: typeof resume) => {
    resume = listener;
    return Promise.resolve({ remove });
  }) as unknown as typeof App.addListener);
  await mount();
  await act(async () => resume({ isActive: false }));
  expect(animeApi.account.me).not.toHaveBeenCalled();
  await act(async () => resume({ isActive: true }));
  expect(animeApi.account.me).toHaveBeenCalledTimes(1);
  await act(async () => root.unmount());
  expect(remove).toHaveBeenCalledOnce();
});
