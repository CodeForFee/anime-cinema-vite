// System volume and screen brightness in the Android app, through window.AvsNative (MainActivity.java).
// Elsewhere (a browser) there is no such object and the player falls back to the video volume / a CSS filter.

type Shell = {
  postMessage: (message: string) => void;
  onmessage?: ((event: { data: unknown }) => void) | null;
};
const shell = () => (window as unknown as { AvsNative?: Shell }).AvsNative;

export const hasNativeLevels = () => Boolean(shell());

let levels = { volume: 1, brightness: 0.5 };

/** Asks the app for the current levels (hardware buttons or the system may have changed them) */
export function refreshLevels() {
  const native = shell();
  if (!native) return;
  native.onmessage = (event) => {
    try {
      const reply = JSON.parse(String(event.data)) as Partial<typeof levels>;
      levels = { ...levels, ...reply };
    } catch {
      // not a levels reply
    }
  };
  native.postMessage("query");
}

/** Last known levels, 0..1 */
export const nativeLevels = () => levels;

export function setNativeVolume(value: number) {
  levels = { ...levels, volume: value };
  shell()?.postMessage(`volume:${value.toFixed(3)}`);
}

export function setNativeBrightness(value: number) {
  levels = { ...levels, brightness: value };
  shell()?.postMessage(`brightness:${value.toFixed(3)}`);
}
