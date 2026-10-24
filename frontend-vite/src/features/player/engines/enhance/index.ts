// Picture and sound enhancers for one <video>: FSR 1 or Anime4K upscaling drawn over it, and virtual surround.
// The same code runs in the app (in-page hls.js video) and inside the source's player frame, where
// public/player-bridge.js drives it (built into public/player-enhance.js by scripts/build-enhance.mjs).
import { createFsr } from "@/features/player/engines/enhance/fsr";
import {
  type EnhanceSettings,
  type EnhanceState,
  type EnhanceSupport,
  FrameBudget,
  type UpscaleMode,
} from "@/features/player/engines/enhance/model";
import { createOverlay, type Overlay } from "@/features/player/engines/enhance/overlay";
import { setSurround } from "@/features/player/engines/enhance/surround";

export type { EnhanceSettings, EnhanceState, EnhanceSupport, UpscaleMode };

let supportCache: Promise<EnhanceSupport> | undefined;
/** What this device can run; asked once */
export function support(): Promise<EnhanceSupport> {
  supportCache ??= (async () => {
    let webgl2 = false;
    try {
      webgl2 = Boolean(document.createElement("canvas").getContext("webgl2"));
    } catch {
      /* no WebGL */
    }
    const webgpu = await import("@/features/player/engines/enhance/anime4k")
      .then(({ hasWebGPU }) => hasWebGPU())
      .catch(() => false);
    return { audio: typeof AudioContext !== "undefined", webgl2, webgpu };
  })();
  return supportCache;
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));
const tainted = (error: unknown) =>
  error instanceof DOMException && error.name === "SecurityError"
    ? "Video này không cho phép xử lý hình (nguồn chặn CORS)"
    : message(error);

type Pipeline = "off" | "fsr" | "anime4k" | "color";

/**
 * `onChange` hears every state the enhancer moves to by itself: an Anime4K that could not keep up and fell back
 * to FSR for now, an upscaler paused on a weak device, a GPU reset, surround starting once audio was allowed.
 * The viewer's choice is never changed here: a fallback lasts until the next `set` (next episode, next toggle).
 */
export function createEnhancer(video: HTMLVideoElement, onChange: (state: EnhanceState) => void) {
  let settings: EnhanceSettings = { surround: false, upscale: "off" };
  let pipeline: Pipeline = "off";
  let pipelineKey = "off";
  let surround = false;
  let surroundKey = "off";
  let overlay: Overlay | null = null;
  let renderer: { draw(video: HTMLVideoElement): unknown; destroy(): void } | null = null;
  let generation = 0;

  const state = async (extra: Partial<EnhanceState> = {}): Promise<EnhanceState> => ({
    surround,
    surroundMode: settings.surroundMode ?? "headphones",
    upscale: pipeline === "fsr" || pipeline === "anime4k" ? pipeline : "off",
    color: pipeline !== "off" && Boolean(settings.color),
    support: await support(),
    ...extra,
  });

  const stopPipeline = () => {
    renderer?.destroy();
    overlay?.destroy();
    renderer = null;
    overlay = null;
    pipeline = "off";
    pipelineKey = "off";
  };

  /** Starts `mode` (with the colour grade when chosen); returns the error that kept it from running, if any */
  async function startPipeline(mode: Pipeline): Promise<string | undefined> {
    stopPipeline();
    if (mode === "off") return;
    const run = ++generation;
    const color = Boolean(settings.color);
    const budget = new FrameBudget();
    const fail = (error: unknown) => {
      if (run !== generation) return;
      stopPipeline();
      void state({ error: tainted(error), notice: "stopped" }).then(onChange);
    };
    const created = createOverlay(
      video,
      { mobile: Boolean(settings.mobile) },
      (frames, now) => {
        if (!renderer || run !== generation) return;
        try {
          const drawing = renderer.draw(video);
          if (drawing instanceof Promise) drawing.catch(fail);
        } catch (error) {
          return fail(error);
        }
        if (!budget.record(frames, now)) return;
        // cannot keep up: Anime4K steps down to FSR for now; on a weak device the picture goes back to plain
        if (pipeline === "anime4k") {
          void startPipeline("fsr").then((error) => state({ error, notice: "downgraded" }).then(onChange));
        } else if (settings.lite || settings.mobile) {
          stopPipeline();
          void state({ notice: "stopped" }).then(onChange);
        } else budget.reset();
      },
      // a resize (full screen, rotation) drops a few frames: that is not a slow device
      () => budget.reset(),
    );
    overlay = created;
    try {
      if (mode === "anime4k") {
        if (settings.lite) throw new Error("Máy yếu: Anime4K tắt để giữ mượt");
        const { createAnime4K } = await import("@/features/player/engines/enhance/anime4k");
        const a4k = await createAnime4K(created.canvas, (lost) => fail(new Error(lost)), { color });
        if (run !== generation) {
          a4k.destroy();
          return;
        }
        renderer = a4k;
      } else renderer = createFsr(created.canvas, Boolean(settings.lite), { sharpen: mode === "fsr", color });
      pipeline = mode;
      pipelineKey = keyOf(settings);
      if (video.readyState >= 2) renderer.draw(video);
    } catch (error) {
      if (run === generation) stopPipeline();
      return tainted(error);
    }
  }

  const wantedPipeline = (s: EnhanceSettings): Pipeline =>
    s.upscale !== "off" ? s.upscale : s.color ? "color" : "off";
  const keyOf = (s: EnhanceSettings) => {
    const mode = wantedPipeline(s);
    return mode === "off" ? "off" : `${mode}:${Boolean(s.color)}:${Boolean(s.lite)}:${Boolean(s.mobile)}`;
  };

  async function applySurround(): Promise<string | undefined> {
    const mode = settings.surroundMode ?? "headphones";
    const key = settings.surround ? `${mode}:${Boolean(settings.lite)}` : "off";
    if (key === surroundKey) return;
    try {
      await setSurround(video, settings.surround, mode, Boolean(settings.lite));
      surround = settings.surround;
      surroundKey = key;
    } catch (error) {
      return message(error);
    }
  }

  // audio the browser held back (no gesture had reached this frame yet) starts on the next play
  const retrySurround = () => {
    if (!settings.surround || surround) return;
    void applySurround().then((error) => {
      if (!error) void state().then(onChange);
    });
  };
  video.addEventListener("playing", retrySurround);

  return {
    /** Applies the viewer's choice and answers with what actually runs (and why not, when it does not) */
    async set(next: EnhanceSettings): Promise<EnhanceState> {
      settings = next;
      const errors: string[] = [];
      const audioError = await applySurround();
      if (audioError) errors.push(audioError);
      if (keyOf(next) !== pipelineKey) {
        const error = await startPipeline(wantedPipeline(next));
        if (error) errors.push(error);
      }
      return state(errors.length ? { error: errors.join(" · ") } : {});
    },
    destroy() {
      generation++;
      stopPipeline();
      video.removeEventListener("playing", retrySurround);
      void setSurround(video, false).catch(() => undefined);
    },
  };
}

export type Enhancer = ReturnType<typeof createEnhancer>;
