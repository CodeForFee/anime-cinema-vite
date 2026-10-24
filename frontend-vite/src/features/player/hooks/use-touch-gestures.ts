import { useDrag } from "@use-gesture/react";
import { type RefObject, useEffect, useRef, useState } from "react";

import {
  type ControlsProps,
  SEEK_STEP,
  seekBy,
} from "@/features/player/components/control-parts";
import {
  BRIGHTNESS_MAX,
  BRIGHTNESS_MIN,
  swipeLevel,
  swipeSeek,
  tapZone,
} from "@/features/player/model/gestures";
import {
  hasNativeLevels,
  nativeLevels,
  refreshLevels,
  setNativeBrightness,
  setNativeVolume,
} from "@/platform/native-levels";

const DOUBLE_TAP_MS = 280;
// iOS ignores HTMLMediaElement.volume: the hardware buttons are the only way there
const IS_IOS =
  /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 1);

/** fraction: the level as 0..1, what the bar and the percentage show */
export type Hud =
  | { kind: "volume" | "brightness"; fraction: number }
  | { kind: "seek"; value: number; delta: number };

/**
 * The touch gestures of the mobile player: tap shows / hides the controls, double tap a side jumps 10 s, a
 * sideways swipe seeks; in full screen a vertical swipe on the right is volume and on the left brightness (the
 * phone's own in the app, the picture's in a browser).
 */
export function useTouchGestures(
  props: ControlsProps,
  surfaceRef: RefObject<HTMLElement | null>,
  { locked, toggleVisible }: { locked: boolean; toggleVisible: () => void },
) {
  const { state, send, isFullscreen, brightness, onBrightness } = props;
  const [jump, setJump] = useState<{ direction: -1 | 1; key: number } | null>(
    null,
  );
  const [hud, setHud] = useState<Hud | null>(null);

  const lastTap = useRef({ time: 0, zone: 0 });
  const tapTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hudTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dragFrom = useRef({ volume: 1, brightness: 1, time: 0, right: false });

  // in the app the swipes drive the phone's own volume and brightness: start from where they are now
  const native = hasNativeLevels();
  useEffect(() => {
    if (native) refreshLevels();
  }, [native, isFullscreen]);

  useEffect(
    () => () => {
      clearTimeout(tapTimer.current);
      clearTimeout(hudTimer.current);
    },
    [],
  );

  const handleTap = (x: number, width: number) => {
    const zone = tapZone(x, width);
    const now = Date.now();

    if (
      !locked &&
      zone !== 0 &&
      lastTap.current.zone === zone &&
      now - lastTap.current.time < DOUBLE_TAP_MS
    ) {
      clearTimeout(tapTimer.current);
      lastTap.current = { time: 0, zone: 0 };
      seekBy(props, zone * SEEK_STEP);
      setJump({ direction: zone, key: now });
      return;
    }

    lastTap.current = { time: now, zone };
    clearTimeout(tapTimer.current);
    // a side tap waits a moment: it may be the first half of a double tap
    tapTimer.current = setTimeout(
      toggleVisible,
      zone === 0 ? 0 : DOUBLE_TAP_MS,
    );
  };

  const bind = useDrag(
    ({
      first,
      last,
      tap,
      axis,
      movement: [mx, my],
      initial: [ix],
      xy: [x],
      event,
    }) => {
      // buttons and the seek bar handle their own pointer
      if ((event.target as Element).closest("button, input")) return;
      const surface = surfaceRef.current;
      if (!surface) return;
      const rect = surface.getBoundingClientRect();
      if (tap) return handleTap(x - rect.left, rect.width);
      if (locked) return;

      if (first) {
        clearTimeout(hudTimer.current);
        dragFrom.current = {
          volume: native ? nativeLevels().volume : (state.volume ?? 1),
          brightness: native ? nativeLevels().brightness : brightness,
          time: state.currentTime,
          right: ix - rect.left > rect.width / 2,
        };
      }
      const from = dragFrom.current;

      if (axis === "y" && isFullscreen) {
        if (from.right) {
          const volume = swipeLevel(from.volume, my, rect.height, 0, 1);
          if (native) setNativeVolume(volume);
          else if (IS_IOS || state.volume === undefined) return;
          else send("volume", Math.round(volume * 100) / 100);
          setHud({ kind: "volume", fraction: volume });
        } else if (native) {
          const value = swipeLevel(from.brightness, my, rect.height, 0.01, 1);
          setNativeBrightness(value);
          setHud({ kind: "brightness", fraction: value });
        } else {
          // a browser cannot touch the screen: dim or brighten the picture instead
          const value = swipeLevel(
            from.brightness,
            my,
            rect.height,
            BRIGHTNESS_MIN,
            BRIGHTNESS_MAX,
          );
          onBrightness(value);
          setHud({
            kind: "brightness",
            fraction:
              (value - BRIGHTNESS_MIN) / (BRIGHTNESS_MAX - BRIGHTNESS_MIN),
          });
        }
      } else if (axis === "x" && state.duration > 0) {
        const target = swipeSeek(from.time, mx, rect.width, state.duration);
        setHud({ kind: "seek", value: target, delta: target - from.time });
        if (last) send("seek", target);
      }

      if (last) hudTimer.current = setTimeout(() => setHud(null), 600);
    },
    { axis: "lock", filterTaps: true, pointer: { touch: true } },
  );

  return { bind, jump, hud };
}
