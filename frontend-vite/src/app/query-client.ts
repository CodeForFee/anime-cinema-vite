import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { del, get, set } from "idb-keyval";

const DAY = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: DAY,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Catalog answers survive a reload in IndexedDB, so a returning viewer sees pages at once while they refresh.
export const persistOptions = {
  persister: createAsyncStoragePersister({
    storage: { getItem: get, setItem: set, removeItem: del },
    key: "capynime-query-cache",
  }),
  maxAge: DAY,
  // bump to drop every persisted cache (v2.1: empty home pages persisted by v2.0; v2.2: details gained metadata/gallery)
  buster: "v2.2",
  dehydrateOptions: {
    // stream links are tied to a session and expire: never replay them
    shouldDehydrateQuery: (query: {
      queryKey: readonly unknown[];
      state: { status: string };
    }) => query.state.status === "success" && query.queryKey[1] !== "stream",
  },
};
