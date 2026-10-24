// Virtual 7.1.4 cinema from the stereo track, the way headphone "spatial" modes (Netflix spatial audio, Windows
// Sonic, Atmos-for-headphones on stereo content) treat a 2-channel source. This is an upmix and virtualizer, not
// Dolby Atmos: the source carries no height or object data. Web Audio only.
//
//   L,R ─┬─ mid (L+R)/2 ─┬─ < 120 Hz ─────────────► LFE: + harmonics, centred, not localised
//        │               └─ 150 Hz – 6 kHz voice ─► centre speaker (0°): dialogue stays in front
//        ├─ L, R (> 120 Hz) ──────────────────────► front speakers ±30°
//        ├─ side (L−R)/2, decorrelated ───────────► side ±100°, rear ±145°
//        └─ > 2.5 kHz, quiet ─────────────────────► four height speakers (front ±40°, rear ±135°, above)
//   everything ─► cinema room ─► cinema EQ ─► gentle compressor ─► limiter ─► speakers
//
// Headphones: every speaker is rendered binaurally (HRTF). Speakers: HRTF would only colour the sound, so the
// same layout is folded onto the two speakers with equal-power panning, which still widens the stage.
import { around, impulseResponse, type SurroundMode } from "@/features/player/engines/enhance/model";
type Ctx = BaseAudioContext;

const gain = (ctx: Ctx, value: number) => {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
};

const filter = (ctx: Ctx, type: BiquadFilterType, frequency: number, extra: { Q?: number; gain?: number } = {}) => {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  if (extra.Q !== undefined) f.Q.value = extra.Q;
  if (extra.gain !== undefined) f.gain.value = extra.gain;
  return f;
};

/** Two filters in a row: a 24 dB/oct crossover, so bands overlap less */
const steep = (ctx: Ctx, type: "lowpass" | "highpass", frequency: number) => {
  const input = filter(ctx, type, frequency, { Q: Math.SQRT1_2 });
  const output = filter(ctx, type, frequency, { Q: Math.SQRT1_2 });
  input.connect(output);
  return { input, output };
};

function speaker(ctx: Ctx, mode: SurroundMode, degrees: number, height = 0) {
  const p = ctx.createPanner();
  p.panningModel = mode === "headphones" ? "HRTF" : "equalpower";
  p.distanceModel = "inverse";
  p.refDistance = 1;
  p.rolloffFactor = 0;
  const at = around(degrees);
  p.positionX.value = at.x;
  p.positionY.value = height;
  p.positionZ.value = at.z;
  return p;
}

/** Soft saturation that adds the 2nd/3rd harmonics of the bass: heard as weight even on small drivers */
function harmonics(ctx: Ctx) {
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(2.2 * x) / Math.tanh(2.2);
  }
  shaper.curve = curve;
  shaper.oversample = "2x";
  return shaper;
}

/** Final safety: transparent below 0.8, then a smooth knee that never reaches 1 (no hard clipping, ever) */
function softClip(ctx: Ctx) {
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(2049);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 4 - 2; // the curve spans -2..2
    const a = Math.abs(x);
    curve[i] = Math.sign(x) * (a <= 0.8 ? a : 0.8 + 0.18 * Math.tanh((a - 0.8) / 0.18));
  }
  shaper.curve = curve;
  shaper.oversample = "4x";
  // the curve spans inputs -2..2 and WaveShaper reads -1..1: halve going in; the curve's values are final
  const input = gain(ctx, 0.5);
  input.connect(shaper);
  return { input, output: shaper };
}

/** Decorrelates a feed (short delay + all-pass) so two speakers playing it sound like two places, not one */
function decorrelate(ctx: Ctx, input: AudioNode, ms: number, allpassHz: number) {
  const delay = ctx.createDelay(0.1);
  delay.delayTime.value = ms / 1000;
  const allpass = filter(ctx, "allpass", allpassHz, { Q: 0.7 });
  input.connect(delay).connect(allpass);
  return allpass;
}

/**
 * Levels of each feed, tuned by rendering test signals through OfflineAudioContext (2026-10-24), against the
 * untouched stereo:
 *   headphones  voice 0 dB, music/effects (uncorrelated noise) +0.6 dB and wider (L/R correlation 0 -> -0.3),
 *               bass (60 Hz) +2.8 dB
 *   speakers    voice 0 dB, music/effects -1.3 dB (correlation -0.11), bass +1.5 dB
 *   a source peaking at 1.5 (clipping) comes out at 0.82-0.9: the soft clipper never lets it distort.
 * Retune all of them together; `trim` sets voice back to 0 dB.
 */
export const LEVEL = {
  lfe: 0.75,
  harmonics: 0.2,
  centre: 0.5,
  front: 0.75,
  side: 0.8,
  rear: 0.6,
  heightFront: 0.2,
  heightRear: 0.15,
  room: 0.09,
  trim: 0.745,
  /** On two speakers the mid adds up louder than through HRTF: a quieter centre, stronger surrounds and bass */
  speakers: { centre: 0.15, surround: 1.8, lfe: 1.3, trim: 0.49 },
};

/**
 * The effect graph: `input` takes the stereo source, `output` goes to the speakers.
 * `lite` drops the rear and height speakers (4 HRTF renders instead of 11) for weak devices.
 */
export function buildGraph(ctx: Ctx, mode: SurroundMode, lite = false) {
  const spk = mode === "speakers" ? LEVEL.speakers : null;
  const L = {
    ...LEVEL,
    lfe: LEVEL.lfe * (spk?.lfe ?? 1),
    centre: spk?.centre ?? LEVEL.centre,
    side: LEVEL.side * (spk?.surround ?? 1),
    rear: LEVEL.rear * (spk?.surround ?? 1),
    trim: spk?.trim ?? LEVEL.trim,
  };
  const input = ctx.createChannelSplitter(2);
  const bus = gain(ctx, 1);
  const to = (node: AudioNode, level: number, s: AudioNode) => node.connect(gain(ctx, level)).connect(s).connect(bus);

  // mid and side
  const mid = gain(ctx, 0.5);
  input.connect(mid, 0);
  input.connect(mid, 1);
  const side = gain(ctx, 0.5);
  input.connect(side, 0);
  input.connect(gain(ctx, -1), 1).connect(side);

  // LFE: the bass of the mid, plus its harmonics, straight to the bus (low notes carry no direction)
  const low = steep(ctx, "lowpass", 120);
  mid.connect(low.input);
  const lfe = gain(ctx, L.lfe);
  low.output.connect(lfe);
  const warmth = harmonics(ctx);
  lfe.connect(bus);
  lfe.connect(gain(ctx, L.harmonics)).connect(warmth).connect(filter(ctx, "lowpass", 400)).connect(bus);

  // centre: the voice band of the mid, a touch of presence
  const voice = filter(ctx, "highpass", 150, { Q: Math.SQRT1_2 });
  mid.connect(voice);
  const presence = filter(ctx, "peaking", 2800, { Q: 1, gain: 2.5 });
  voice.connect(filter(ctx, "lowpass", 6500, { Q: Math.SQRT1_2 })).connect(presence);
  to(presence, L.centre, speaker(ctx, mode, 0));

  // fronts: each channel above the bass
  const left = filter(ctx, "highpass", 120, { Q: Math.SQRT1_2 });
  const right = filter(ctx, "highpass", 120, { Q: Math.SQRT1_2 });
  input.connect(left, 0);
  input.connect(right, 1);
  to(left, L.front, speaker(ctx, mode, -30));
  to(right, L.front, speaker(ctx, mode, 30));

  // sides and rears: the difference signal (ambience, music, effects), each pair from its own decorrelated copy
  const ambience = filter(ctx, "highpass", 100, { Q: Math.SQRT1_2 });
  side.connect(ambience);
  const sides = decorrelate(ctx, ambience, 12, 900);
  to(sides, L.side, speaker(ctx, mode, -100));
  to(sides, -L.side, speaker(ctx, mode, 100)); // opposite polarity: the side signal is L−R
  if (!lite) {
    const rears = decorrelate(ctx, ambience, 21, 1600);
    to(rears, L.rear, speaker(ctx, mode, -145));
    to(rears, -L.rear, speaker(ctx, mode, 145));

    // heights: the air of each channel, quietly, from above (front and rear)
    const airL = filter(ctx, "highpass", 2500, { Q: Math.SQRT1_2 });
    const airR = filter(ctx, "highpass", 2500, { Q: Math.SQRT1_2 });
    input.connect(airL, 0);
    input.connect(airR, 1);
    const up = mode === "headphones" ? 0.75 : 0;
    to(airL, L.heightFront, speaker(ctx, mode, -40, up));
    to(airR, L.heightFront, speaker(ctx, mode, 40, up));
    to(decorrelate(ctx, airL, 9, 4000), L.heightRear, speaker(ctx, mode, -135, up));
    to(decorrelate(ctx, airR, 9, 4000), L.heightRear, speaker(ctx, mode, 135, up));
  }

  // cinema room: early reflections and a short tail around everything
  const room = ctx.createConvolver();
  const [l, r] = impulseResponse(ctx.sampleRate, 0.9, 3.5);
  const buffer = ctx.createBuffer(2, l.length, ctx.sampleRate);
  buffer.copyToChannel(l, 0);
  buffer.copyToChannel(r, 1);
  room.buffer = buffer;
  const mix = gain(ctx, 1);
  bus.connect(mix);
  bus.connect(room).connect(gain(ctx, L.room)).connect(mix);

  // cinema EQ: fuller lows, open highs; then a gentle leveller (quiet effects come up) and a hard ceiling
  const lowShelf = filter(ctx, "lowshelf", 90, { gain: 1.5 });
  const highShelf = filter(ctx, "highshelf", 9000, { gain: 1.5 });
  const leveller = ctx.createDynamicsCompressor();
  leveller.threshold.value = -20;
  leveller.knee.value = 14;
  leveller.ratio.value = 2.5;
  leveller.attack.value = 0.01;
  leveller.release.value = 0.3;
  const peaks = ctx.createDynamicsCompressor();
  peaks.threshold.value = -6;
  peaks.knee.value = 3;
  peaks.ratio.value = 6;
  peaks.attack.value = 0.002;
  peaks.release.value = 0.12;
  const clip = softClip(ctx);
  mix.connect(lowShelf).connect(highShelf).connect(leveller).connect(gain(ctx, L.trim)).connect(peaks);
  peaks.connect(clip.input);

  return { input, output: clip.output as AudioNode };
}

// one source node per element, ever: createMediaElementSource cannot be called twice or undone
const sources = new WeakMap<
  HTMLMediaElement,
  { ctx: AudioContext; source: MediaElementAudioSourceNode; graph?: ReturnType<typeof buildGraph>; key?: string }
>();

/**
 * Turns the effect on (with `mode`) or off for `video`. On needs a running AudioContext first, or the element
 * would go silent; when the browser keeps it suspended it throws and nothing changes. Off plays straight through.
 */
export async function setSurround(video: HTMLMediaElement, on: boolean, mode: SurroundMode = "headphones", lite = false) {
  let entry = sources.get(video);
  if (!entry) {
    if (!on) return;
    const ctx = new AudioContext({ latencyHint: "playback" });
    if (ctx.state !== "running")
      await Promise.race([ctx.resume(), new Promise((resolve) => setTimeout(resolve, 1500))]);
    if (ctx.state !== "running") {
      void ctx.close();
      throw new Error("Trình duyệt chặn âm thanh: chạm vào video một lần rồi bật lại");
    }
    entry = { ctx, source: ctx.createMediaElementSource(video) };
    sources.set(video, entry);
  }
  const { ctx, source } = entry;
  if (ctx.state === "suspended") await ctx.resume();
  const key = on ? `${mode}:${lite}` : "off";
  if (entry.key === key) return;
  source.disconnect();
  entry.graph?.output.disconnect();
  entry.graph = undefined;
  if (on) {
    entry.graph = buildGraph(ctx, mode, lite);
    source.connect(entry.graph.input);
    entry.graph.output.connect(ctx.destination);
  } else source.connect(ctx.destination);
  entry.key = key;
}
