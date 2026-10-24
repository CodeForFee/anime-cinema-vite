/// <reference types="@webgpu/types" />
// Anime4K (Mode A, M networks) on WebGPU, drawn into the overlay canvas. Our own renderer around the vendored
// pipelines (./anime4k/README.md): it can be stopped, rebuilds on resize, and draws only when asked.
import quadWGSL from "./anime4k/renderer/shaders/fullscreenTexturedQuad.wgsl?raw";
import sampleWGSL from "./anime4k/renderer/shaders/sampleExternalTexture.wgsl?raw";
import { modeALight } from "./anime4k/modeA";
import type { Anime4KPipeline } from "./anime4k/pipelines/interfaces";
import { GRADE } from "./model";

const f = (x: number) => x.toFixed(4);
/** The final draw with model.ts gradePixel applied (fsr.ts GRADE_GLSL in WGSL) */
const GRADED_WGSL = `
@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_2d<f32>;
fn grade(input: vec3f) -> vec3f {
  var c = clamp((input - vec3f(${f(GRADE.black)})) / ${f(1 - GRADE.black)}, vec3f(0.0), vec3f(1.0));
  c += (c * c * (3.0 - 2.0 * c) - c) * ${f(GRADE.contrast)};
  let sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
  let luma = dot(c, vec3f(0.2126, 0.7152, 0.0722));
  let skin = smoothstep(0.0, 0.08, c.r - c.g) * smoothstep(0.0, 0.08, c.g - c.b) * (1.0 - smoothstep(0.3, 0.55, sat));
  let amount = ${f(GRADE.vibrance)} * (1.0 - sat) * (1.0 - ${f(GRADE.skinProtect)} * skin);
  return clamp(vec3f(luma) + (c - vec3f(luma)) * (1.0 + amount), vec3f(0.0), vec3f(1.0));
}
@fragment
fn main(@location(0) fragUV: vec2f) -> @location(0) vec4f {
  return vec4f(grade(textureSampleBaseClampToEdge(myTexture, mySampler, fragUV).rgb), 1.0);
}`;

/** Whether this device can run it at all (an adapter, not just navigator.gpu) */
export async function hasWebGPU() {
  try {
    return Boolean(await navigator.gpu?.requestAdapter());
  } catch {
    return false;
  }
}

export async function createAnime4K(
  canvas: HTMLCanvasElement,
  onLost: (message: string) => void,
  options = { color: false },
) {
  const requestAdapter = () => navigator.gpu?.requestAdapter({ powerPreference: "high-performance" });
  // an adapter makes one device and is then "consumed": the first build takes this one, later builds
  // (a resize, full screen) ask for a fresh adapter
  let spare: GPUAdapter | null | undefined = await requestAdapter();
  if (!spare) throw new Error("Máy này chưa hỗ trợ WebGPU");
  const context = canvas.getContext("webgpu");
  if (!context) throw new Error("Không mở được WebGPU trên khung hình");
  const format = navigator.gpu.getPreferredCanvasFormat();

  // one device per size: destroying it frees every texture of the previous pipeline chain at once
  let built: {
    device: GPUDevice;
    input: GPUTexture;
    pipelines: Anime4KPipeline[];
    render: GPURenderPipeline;
    bindGroup: GPUBindGroup;
    key: string;
  } | null = null;
  let stopped = false;

  async function build(video: HTMLVideoElement) {
    const key = `${video.videoWidth}x${video.videoHeight}>${canvas.width}x${canvas.height}`;
    if (built?.key === key) return built;
    built?.device.destroy();
    built = null;
    const adapter = spare ?? (await requestAdapter());
    spare = null;
    if (!adapter) throw new Error("Không mở lại được GPU");
    const device = await adapter.requestDevice();
    void device.lost.then((info) => {
      if (!stopped && info.reason !== "destroyed") onLost(info.message || "GPU bị reset");
    });
    context?.configure({ device, format, alphaMode: "opaque" });
    const input = device.createTexture({
      size: [video.videoWidth, video.videoHeight, 1],
      format: "rgba16float",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    const pipelines = modeALight({
      device,
      inputTexture: input,
      nativeDimensions: { width: video.videoWidth, height: video.videoHeight },
      targetDimensions: { width: canvas.width, height: canvas.height },
    });
    const output = pipelines.at(-1)?.getOutputTexture() ?? input;
    const render = device.createRenderPipeline({
      layout: "auto",
      vertex: { module: device.createShaderModule({ code: quadWGSL }), entryPoint: "vert_main" },
      fragment: {
        module: device.createShaderModule({ code: options.color ? GRADED_WGSL : sampleWGSL }),
        entryPoint: "main",
        targets: [{ format }],
      },
      primitive: { topology: "triangle-list" },
    });
    const bindGroup = device.createBindGroup({
      layout: render.getBindGroupLayout(0),
      entries: [
        { binding: 1, resource: device.createSampler({ magFilter: "linear", minFilter: "linear" }) },
        { binding: 2, resource: output.createView() },
      ],
    });
    built = { device, input, pipelines, render, bindGroup, key };
    return built;
  }

  let busy = false;
  return {
    /** Runs the network on the current frame; skipped while the previous frame is still being built */
    async draw(video: HTMLVideoElement) {
      if (stopped || busy || !video.videoWidth) return;
      busy = true;
      try {
        const b = await build(video);
        if (stopped) return;
        // throws SecurityError on a cross-origin video without CORS
        b.device.queue.copyExternalImageToTexture({ source: video }, { texture: b.input }, [
          video.videoWidth,
          video.videoHeight,
        ]);
        const encoder = b.device.createCommandEncoder();
        for (const pipeline of b.pipelines) pipeline.pass(encoder);
        const pass = encoder.beginRenderPass({
          colorAttachments: [
            {
              view: (context as GPUCanvasContext).getCurrentTexture().createView(),
              clearValue: { r: 0, g: 0, b: 0, a: 1 },
              loadOp: "clear",
              storeOp: "store",
            },
          ],
        });
        pass.setPipeline(b.render);
        pass.setBindGroup(0, b.bindGroup);
        pass.draw(6);
        pass.end();
        b.device.queue.submit([encoder.finish()]);
      } finally {
        busy = false;
      }
    },
    destroy() {
      stopped = true;
      built?.device.destroy();
      built = null;
    },
  };
}
