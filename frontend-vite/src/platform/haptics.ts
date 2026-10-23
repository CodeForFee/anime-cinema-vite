import { isNativeApp } from "@/platform/transport"

/**
 * A short tick under the finger, as iOS gives on taps that change something; silent where unsupported.
 * The Android app uses the phone's haptic engine (a crisp "light impact"), browsers the plain vibrator.
 */
export function haptic() {
  if (isNativeApp) {
    void import("@capacitor/haptics")
      .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }))
      .catch(() => {})
    return
  }
  try {
    navigator.vibrate?.(8)
  } catch {
    // vibration blocked by the browser: nothing to do
  }
}
