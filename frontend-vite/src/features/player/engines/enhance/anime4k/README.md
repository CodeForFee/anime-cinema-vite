# Vendored Anime4K (WebGPU), Mode A light subset

From [Anime4KWebBoost/Anime4K-WebGPU](https://github.com/Anime4KWebBoost/Anime4K-WebGPU) @ad1ef0c (MIT, see LICENSE.md),
a WebGPU port of [bloc97/Anime4K](https://github.com/bloc97/Anime4K) (MIT).

Only what Mode A with the M networks needs: ClampHighlights, Restore CNN M, Upscale CNN x2 M, Downscale and their
helpers (~200 KB of shaders). The npm package bundles every mode in one 3.5 MB file and its renderer cannot be
stopped, so the renderer here is our own (../anime4k.ts). Changes from upstream: `.wgsl?raw` imports for Vite,
helpers/index.ts without the unused Original pipeline.
