import { useMutation } from "@tanstack/react-query";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { animeApi } from "@/core/anime-api";
import type { SourceUser } from "@/core/source/endpoints/comments/fetch";

/**
 * Who signed in to AnimeVietsub from here. Remembered on the device instead of asked of the source on every
 * screen: that check is a whole page through the proxy. A failed write re-checks it (recheckSourceUser).
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
export const setSourceUser = (user: SourceUser | null) => useUserStore.getState().set(user);

let synced = false;
/**
 * Once per page load: the extension sends the browser's own AnimeVietsub cookies, so whoever is signed in on
 * the source site in this browser (Google included) is signed in here too, and signing out there signs out here.
 */
export async function syncSourceUser() {
  if (synced) return;
  synced = true;
  const { user, set } = useUserStore.getState();
  try {
    if (!(await animeApi.account.signedIn())) set(null);
    else if (!user) set(await animeApi.account.me());
  } catch {
    synced = false; // the source was unreachable: try again on the next mount
  }
}

/** The source may have ended the session (expired, signed out elsewhere): ask it who we are */
export async function recheckSourceUser() {
  useUserStore.getState().set(await animeApi.account.me().catch(() => null));
}

export function useSourceUser() {
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.set);
  const login = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      animeApi.account.login(email, password),
    onSuccess: (next) => {
      setUser(next);
      useUserStore.getState().openLogin(false);
    },
  });
  const logout = useMutation({
    mutationFn: () => animeApi.account.logout(),
    onSettled: () => setUser(null),
  });
  return { user, login, logout };
}
