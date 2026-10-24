// Android back button inside the app. Open layers (sheet, full-screen player, detail modal) register a
// handler; back closes the newest one first, then goes back a page, and at home needs a second press
// within 2 s to leave the app.
import { isNativeApp } from "@/platform/transport";

type Handler = () => void;
const layers: Handler[] = [];

/** Registers a layer that back should close; returns the unregister function (use as an effect cleanup) */
export function onBack(close: Handler) {
  layers.push(close);
  return () => {
    const i = layers.lastIndexOf(close);
    if (i >= 0) layers.splice(i, 1);
  };
}

const EXIT_WINDOW_MS = 2000;

/** What one press of back does; exported for the check in src/__test__/back.spec.ts */
export function handleBack(
  now: number,
  lastPress: number,
  atHome: boolean,
): "layer" | "page" | "exit" | "arm" {
  if (layers.length > 0) return "layer";
  if (!atHome) return "page";
  return now - lastPress < EXIT_WINDOW_MS ? "exit" : "arm";
}

function toast(text: string) {
  const el = document.createElement("div");
  el.textContent = text;
  el.className = "app-toast";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), EXIT_WINDOW_MS);
}

/** `goBack`: what back does once no layer is open (the router's history back, with its slide) */
export function installBackButton(goBack: () => void) {
  if (!isNativeApp) return;
  let lastPress = 0;
  void import("@capacitor/app").then(({ App }) =>
    App.addListener("backButton", () => {
      const now = Date.now();
      switch (handleBack(now, lastPress, location.pathname === "/")) {
        case "layer":
          layers[layers.length - 1]();
          break;
        case "page":
          goBack();
          break;
        case "exit":
          void App.exitApp();
          break;
        case "arm":
          lastPress = now;
          toast("Nhấn quay lại lần nữa để thoát");
      }
    }),
  );
}
