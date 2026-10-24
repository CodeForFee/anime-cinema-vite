import { useSyncExternalStore } from "react";

/**
 * The one place that decides between the two interfaces of the app. Mobile: a touch screen, or any screen
 * narrower than 1024 px (where the tab bar replaces the header menu); desktop otherwise.
 */
const MOBILE_QUERY = "(pointer: coarse), (max-width: 1023.98px)";

export type FormFactor = "mobile" | "desktop";

const media = () => window.matchMedia(MOBILE_QUERY);

export const formFactor = (): FormFactor =>
  media().matches ? "mobile" : "desktop";
export const isMobile = () => formFactor() === "mobile";

const subscribe = (listener: () => void) => {
  const query = media();
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
};

/** The current form factor; components re-render when a window is resized or a tablet rotated across it */
export const useFormFactor = () =>
  useSyncExternalStore(subscribe, formFactor, () => "desktop" as const);
