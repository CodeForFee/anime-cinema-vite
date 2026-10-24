import { useMutation } from "@tanstack/react-query";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { animeApi } from "@/core/anime-api";
import type { SourceUser } from "@/core/source/endpoints/comments/fetch";

/**
 * Who signed in to AnimeVietsub from here. Remembered on the device instead of asked of the source on every
 * screen: checking requires a source page. A failed write re-checks it (recheckSourceUser).
 */
const useUserStore = create<{
  user: SourceUser | null;
  loginOpen: boolean;
  set: (user: SourceUser | null) => void;
  openLogin: (open: boolean) => void;
}>()(
  persist(
    (set) => ({
      user: null,
      loginOpen: false,
      set: (user) => set({ user }),
      openLogin: (loginOpen) => set({ loginOpen }),
    }),
    {
      name: "source-user",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ user }) => ({ user }),
    },
  ),
);

export const useLoginDialog = () => ({
  open: useUserStore((s) => s.loginOpen),
  setOpen: useUserStore((s) => s.openLogin),
});

/** Name and avatar changed on the account page: the header and comment box follow */
export const patchSourceUser = (patch: Partial<SourceUser>) => {
  const { user, set } = useUserStore.getState();
  if (user) set({ ...user, ...patch });
};
let sessionRevision = 0;
export const setSourceUser = (user: SourceUser | null) => {
  sessionRevision++;
  useUserStore.getState().set(user);
};

let synced = false;
let checking: Promise<SourceUser | null> | undefined;
/** Re-read identity on return from the source; overlapping header/focus checks share one request. */
export async function syncSourceUser(force = false): Promise<SourceUser | null> {
  if (checking) return checking;
  if (synced && !force) return useUserStore.getState().user;
  const revision = sessionRevision;
  checking = (async () => {
    const next = await animeApi.account.me();
    // An older request must not undo a more recent password login/logout.
    if (revision === sessionRevision) {
      setSourceUser(next);
      if (next) useUserStore.getState().openLogin(false);
    }
    synced = true;
    return useUserStore.getState().user;
  })();
  try {
    return await checking;
  } finally {
    checking = undefined;
  }
}

/** The source may have ended the session (expired, signed out elsewhere): ask it who we are */
export async function recheckSourceUser() {
  // Network/challenge errors do not prove logout.
  await syncSourceUser(true).catch(() => undefined);
}

export function useSourceUser() {
  const user = useUserStore((s) => s.user);
  const login = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      animeApi.account.login(email, password),
    onSuccess: (next) => {
      setSourceUser(next);
      useUserStore.getState().openLogin(false);
    },
  });
  const logout = useMutation({
    mutationFn: () => animeApi.account.logout(),
    onSuccess: () => setSourceUser(null),
  });
  return { user, login, logout };
}
