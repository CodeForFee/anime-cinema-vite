// Anime4K Mode A with the M (medium) networks: the upstream ModeA preset (ModeA/index.ts of Anime4K-WebGPU)
// with CNN M in place of VL, light enough for laptops and recent phones.
import { ClampHighlights, Downscale } from "./pipelines/helpers";
import type { Anime4KPipeline, Anime4KPresetPipelineDescriptor } from "./pipelines/interfaces";
import { CNNM } from "./pipelines/restore/CNNM";
import { CNNx2M } from "./pipelines/upscale/CNNx2M";

export function modeALight({
  device,
  inputTexture,
  nativeDimensions,
  targetDimensions,
}: Anime4KPresetPipelineDescriptor): Anime4KPipeline[] {
  const native = nativeDimensions;
  const target = targetDimensions;
  const pipelines: Anime4KPipeline[] = [];
  let current = inputTexture;
  const add = (pipeline: Anime4KPipeline) => {
    pipelines.push(pipeline);
    current = pipeline.getOutputTexture();
  };
  let width = native.width;
  let height = native.height;
  const above = (factor: number) => target.width > factor * width && target.height > factor * height;

  add(new ClampHighlights({ device, inputTexture: current }));
  add(new CNNM({ device, inputTexture: current }));
  if (above(1.2)) {
    add(new CNNx2M({ device, inputTexture: current }));
    width *= 2;
    height *= 2;
  }
  const ratio = Math.min(target.width / native.width, target.height / native.height);
  if (ratio > 1.2 && ratio < 2) {
    add(new Downscale({ device, inputTexture: current, targetDimensions: target }));
    width = target.width;
    height = target.height;
  } else if (ratio > 2.4 && ratio < 4) {
    const half = { width: Math.ceil(target.width / 2), height: Math.ceil(target.height / 2) };
    add(new Downscale({ device, inputTexture: current, targetDimensions: half }));
    width = half.width;
    height = half.height;
  }
  if (above(1.2)) add(new CNNx2M({ device, inputTexture: current }));
  return pipelines;
}
