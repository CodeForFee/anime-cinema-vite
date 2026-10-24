// The arithmetic of the picture and sound enhancers, kept apart from WebGL / WebGPU / Web Audio so it can be tested.

export type UpscaleMode = "off" | "fsr" | "anime4k";
/** Headphones: binaural (HRTF) virtual speakers; speakers: the same layout folded onto two speakers */
export type SurroundMode = "headphones" | "speakers";

export interface EnhanceSettings {
  surround: boolean;
  surroundMode?: SurroundMode;
  upscale: UpscaleMode;
  /** The colour grade (gradePixel), with or without upscaling */
  color?: boolean;
  /** Weak device (html[data-lite]): cheaper passes, no Anime4K */
  lite?: boolean;
  /** Phone or tablet: a smaller GPU budget */
  mobile?: boolean;
}

export interface EnhanceSupport {
  audio: boolean;
  webgl2: boolean;
  webgpu: boolean;
}

/** What actually runs; `notice` explains a change the viewer did not ask for (fallback, blocked audio) */
export interface EnhanceState {
  surround: boolean;
  surroundMode?: SurroundMode;
  upscale: UpscaleMode;
  color?: boolean;
  support: EnhanceSupport;
  error?: string;
  notice?: "downgraded" | "stopped";
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Where the picture sits inside a box of `box` size with object-fit: contain */
export function contentRect(
  boxWidth: number,
  boxHeight: number,
  videoWidth: number,
  videoHeight: number,
): Rect {
  if (!boxWidth || !boxHeight || !videoWidth || !videoHeight)
    return { x: 0, y: 0, width: boxWidth, height: boxHeight };
  const scale = Math.min(boxWidth / videoWidth, boxHeight / videoHeight);
  const width = videoWidth * scale;
  const height = videoHeight * scale;
  return { x: (boxWidth - width) / 2, y: (boxHeight - height) / 2, width, height };
}

/** GPU budget per device: how many device pixels the canvas may have */
export const BUDGET = {
  desktop: { dpr: 2, maxWidth: 3840 },
  mobile: { dpr: 1.5, maxWidth: 1920 },
} as const;

/** Device pixels of the canvas over a `rect` of CSS pixels, within the device's budget */
export function canvasSize(rect: Rect, devicePixelRatio: number, mobile = false) {
  const budget = mobile ? BUDGET.mobile : BUDGET.desktop;
  let ratio = Math.min(devicePixelRatio || 1, budget.dpr);
  if (rect.width * ratio > budget.maxWidth) ratio = budget.maxWidth / rect.width;
  return {
    width: Math.max(1, Math.round(rect.width * ratio)),
    height: Math.max(1, Math.round(rect.height * ratio)),
  };
}

/**
 * FSR 1 EASU constants (ffx_fsr1.h FsrEasuCon) for a whole-frame input of `input` px drawn at `output` px:
 * con0 maps an output pixel to the input position, the rest are not needed with texelFetch.
 */
export function easuScale(inputWidth: number, inputHeight: number, outputWidth: number, outputHeight: number) {
  const sx = inputWidth / outputWidth;
  const sy = inputHeight / outputHeight;
  return [sx, sy, 0.5 * sx - 0.5, 0.5 * sy - 0.5] as const;
}

/** EASU only helps when the picture is blown up; at the same size or smaller a plain resample does */
export const needsEasu = (inputWidth: number, outputWidth: number, lite = false) =>
  !lite && outputWidth > inputWidth * 1.05;

/** RCAS strength (ffx_fsr1.h FsrRcasCon): 0 stops is the sharpest, each stop halves it */
export const rcasSharpness = (stops: number) => 2 ** -stops;

/**
 * A cinema-like room: decaying noise, a little different on each ear so the space feels wide.
 * Deterministic (seeded) so tests and every viewer get the same room.
 */
export function impulseResponse(sampleRate: number, seconds = 1.2, decay = 3, seed = 7) {
  const length = Math.max(1, Math.round(sampleRate * seconds));
  const channels = [new Float32Array(length), new Float32Array(length)];
  let state = seed >>> 0 || 1;
  const random = () => {
    // xorshift32
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) / 0xffffffff) * 2 - 1;
  };
  for (let i = 0; i < length; i++) {
    const envelope = (1 - i / length) ** decay;
    channels[0][i] = random() * envelope;
    channels[1][i] = random() * envelope;
  }
  return channels;
}

/**
 * The colour grade of "Màu sắc sống động", on one sRGB pixel (0..1). The shaders (fsr.ts GRADE, anime4k.ts) run the
 * same steps; this copy is what the tests pin down. Keep the three in step.
 *  1. black point: web anime encodes often come out washed out, a slightly deeper black restores depth
 *  2. gentle S-curve contrast around mid grey
 *  3. vibrance: muted colours gain more saturation than vivid ones, skin tones (warm, r > g > b) much less
 */
export const GRADE = { black: 0.02, contrast: 0.16, vibrance: 0.38, skinProtect: 0.65 } as const;

export function gradePixel(r: number, g: number, b: number): [number, number, number] {
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  const smooth = (e0: number, e1: number, x: number) => {
    const t = clamp((x - e0) / (e1 - e0));
    return t * t * (3 - 2 * t);
  };
  let c = [r, g, b].map((x) => clamp((x - GRADE.black) / (1 - GRADE.black)));
  c = c.map((x) => x + (x * x * (3 - 2 * x) - x) * GRADE.contrast);
  const max = Math.max(...c);
  const min = Math.min(...c);
  const sat = max - min;
  const luma = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const skin = smooth(0, 0.08, c[0] - c[1]) * smooth(0, 0.08, c[1] - c[2]) * (1 - smooth(0.3, 0.55, sat));
  const amount = GRADE.vibrance * (1 - sat) * (1 - GRADE.skinProtect * skin);
  return c.map((x) => clamp(luma + (x - luma) * (1 + amount))) as [number, number, number];
}

/** Point on a circle around the listener (Web Audio: x right, z towards the back), degrees clockwise from front */
export const around = (degrees: number, distance = 1) => {
  const r = (degrees * Math.PI) / 180;
  return { x: Math.sin(r) * distance, y: 0, z: -Math.cos(r) * distance };
};

/**
 * Notices a device that cannot keep up: each drawn frame reports how many video frames went by since the last one
 * (1 = none skipped). Over budget when more than `limit` of the frames in the last `windowMs` were skipped.
 */
export class FrameBudget {
  private samples: { at: number; skipped: number }[] = [];
  constructor(
    private windowMs = 3000,
    private limit = 0.25,
  ) {}

  record(framesSinceLast: number, now: number): boolean {
    // a long gap is a seek, a stall or a hidden tab, not a slow GPU: it counts as at most 2 lost frames
    this.samples.push({ at: now, skipped: Math.min(2, Math.max(0, framesSinceLast - 1)) });
    while (this.samples.length && now - this.samples[0].at > this.windowMs) this.samples.shift();
    // a full window first, so a single hiccup (seek, tab switch) never counts
    if (now - this.samples[0].at < this.windowMs * 0.9) return false;
    const skipped = this.samples.reduce((sum, s) => sum + s.skipped, 0);
    return skipped / (skipped + this.samples.length) > this.limit;
  }

  reset() {
    this.samples = [];
  }
}
