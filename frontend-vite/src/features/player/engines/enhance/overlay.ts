import { canvasSize, contentRect } from "@/features/player/engines/enhance/model";

type FrameCallback = (now: number, meta: { presentedFrames: number }) => void;
type VideoWithFrames = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: FrameCallback) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

export interface Overlay {
  canvas: HTMLCanvasElement;
  destroy(): void;
}

/**
 * A canvas laid exactly over the picture of `video` (its own sibling, so it shows in full screen and in the
 * player frame alike), sized to the device's GPU budget. `draw` runs once per new video frame, never while
 * paused or hidden (requestVideoFrameCallback does not fire then), and again after a resize.
 * `framesSinceLast` lets the caller notice frames it could not keep up with.
 */
export function createOverlay(
  video: VideoWithFrames,
  options: { mobile: boolean },
  draw: (framesSinceLast: number, now: number) => void,
  resized: (width: number, height: number) => void,
): Overlay {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.capyEnhance = "";
  Object.assign(canvas.style, {
    position: "absolute",
    pointerEvents: "none",
    margin: "0",
    padding: "0",
    border: "0",
    display: "block",
    background: "#000",
  });
  video.insertAdjacentElement("afterend", canvas);

  let destroyed = false;
  let lastPresented = -1;
  let frameId = 0;
  let rafId = 0;

  const layout = () => {
    if (destroyed) return;
    const style = getComputedStyle(video);
    const box = { width: video.clientWidth, height: video.clientHeight };
    const rect =
      style.objectFit === "fill"
        ? { x: 0, y: 0, ...box }
        : contentRect(box.width, box.height, video.videoWidth, video.videoHeight);
    // same containing block as the video (both are children of one parent), so its offsets carry over
    Object.assign(canvas.style, {
      left: `${video.offsetLeft + rect.x}px`,
      top: `${video.offsetTop + rect.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      zIndex: style.zIndex === "auto" ? "" : style.zIndex,
      filter: style.filter === "none" ? "" : style.filter,
      visibility: video.hidden || style.display === "none" ? "hidden" : "",
    });
    const size = canvasSize(rect, window.devicePixelRatio, options.mobile);
    if (size.width !== canvas.width || size.height !== canvas.height) {
      canvas.width = size.width;
      canvas.height = size.height;
      resized(size.width, size.height);
      if (video.readyState >= 2) draw(1, performance.now()); // the paused picture, at the new size
    }
  };

  const onFrame: FrameCallback = (now, meta) => {
    if (destroyed) return;
    const frames = lastPresented < 0 ? 1 : meta.presentedFrames - lastPresented;
    lastPresented = meta.presentedFrames;
    draw(frames, now);
    frameId = video.requestVideoFrameCallback?.(onFrame) ?? 0;
  };

  // older engines without requestVideoFrameCallback: draw when the playhead moved
  let lastTime = -1;
  const onAnimationFrame = (now: number) => {
    if (destroyed) return;
    if (!video.paused && video.currentTime !== lastTime) {
      lastTime = video.currentTime;
      draw(1, now);
    }
    rafId = requestAnimationFrame(onAnimationFrame);
  };

  if (video.requestVideoFrameCallback) frameId = video.requestVideoFrameCallback(onFrame);
  else rafId = requestAnimationFrame(onAnimationFrame);

  const observer = new ResizeObserver(layout);
  observer.observe(video);
  const events = ["loadedmetadata", "resize"] as const;
  for (const name of events) video.addEventListener(name, layout);
  window.addEventListener("resize", layout);
  document.addEventListener("fullscreenchange", layout);
  // the paused frame shows at once instead of on the next played frame
  const onSeeked = () => video.readyState >= 2 && draw(1, performance.now());
  video.addEventListener("seeked", onSeeked);
  layout();

  return {
    canvas,
    destroy() {
      destroyed = true;
      if (frameId) video.cancelVideoFrameCallback?.(frameId);
      cancelAnimationFrame(rafId);
      observer.disconnect();
      for (const name of events) video.removeEventListener(name, layout);
      video.removeEventListener("seeked", onSeeked);
      window.removeEventListener("resize", layout);
      document.removeEventListener("fullscreenchange", layout);
      canvas.remove();
    },
  };
}
