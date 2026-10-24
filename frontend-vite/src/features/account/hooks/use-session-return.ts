import { App } from "@capacitor/app";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { syncSourceUser, useSourceUser } from "@/features/account/store";
import { isNativeApp } from "@/platform/transport";

const PRIVATE = new Set(["account", "notifications", "my-comments"]);

export function useSessionReturn() {
  const client = useQueryClient();
  const { user } = useSourceUser();
  useEffect(() => {
    const filters = { predicate: (q: { queryKey: readonly unknown[] }) =>
      q.queryKey[0] === "source" && PRIVATE.has(String(q.queryKey[1])) && q.queryKey[2] !== user?.id };
    void client.cancelQueries(filters);
    client.removeQueries(filters);
  }, [client, user?.id]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void syncSourceUser(true).catch(() => undefined);
    };
    const id = setTimeout(() => void syncSourceUser().catch(() => undefined), 1500);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const listener = isNativeApp
      ? App.addListener("appStateChange", ({ isActive }) => { if (isActive) refresh(); })
      : undefined;
    return () => {
      clearTimeout(id);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      void listener?.then((handle) => handle.remove()).catch(() => undefined);
    };
  }, []);
}
