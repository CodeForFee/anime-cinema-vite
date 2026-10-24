// AMD FidelityFX Super Resolution 1 (FSR 1) on WebGL2: EASU blows the frame up to the screen with edge-aware
// filtering, RCAS sharpens the result. Ported from ffx_fsr1.h (MIT, Copyright (c) 2021 Advanced Micro Devices,
// Inc., https://github.com/GPUOpen-Effects/FidelityFX-FSR), with texelFetch instead of gathers and guards where
// the reference relies on approximate reciprocals of zero.
import { easuScale, GRADE, needsEasu, rcasSharpness } from "@/features/player/engines/enhance/model";

const f = (x: number) => x.toFixed(4);
/** model.ts gradePixel, in GLSL */
export const GRADE_GLSL = `
vec3 grade(vec3 c) {
  c = clamp((c - ${f(GRADE.black)}) / ${f(1 - GRADE.black)}, 0.0, 1.0);
  c += (c * c * (3.0 - 2.0 * c) - c) * ${f(GRADE.contrast)};
  float mx = max(c.r, max(c.g, c.b));
  float sat = mx - min(c.r, min(c.g, c.b));
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float skin = smoothstep(0.0, 0.08, c.r - c.g) * smoothstep(0.0, 0.08, c.g - c.b) * (1.0 - smoothstep(0.3, 0.55, sat));
  float amount = ${f(GRADE.vibrance)} * (1.0 - sat) * (1.0 - ${f(GRADE.skinProtect)} * skin);
  return clamp(luma + (c - luma) * (1.0 + amount), 0.0, 1.0);
}`;

const VERTEX = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const HEAD = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D src;
uniform ivec2 srcSize;
out vec4 color;
vec3 at(ivec2 p) { return texelFetch(src, clamp(p, ivec2(0), srcSize - 1), 0).rgb; }
float luma(vec3 c) { return c.b * 0.5 + (c.r * 0.5 + c.g); }
`;

/** Plain bilinear resample, for frames that need no blowing up (or lite devices) */
const RESAMPLE = `${HEAD}
uniform vec2 outSize;
void main() { color = vec4(texture(src, gl_FragCoord.xy / outSize).rgb, 1.0); }`;

const EASU = `${HEAD}
uniform vec4 con0;
void tapF(inout vec3 aC, inout float aW, vec2 off, vec2 dir, vec2 len, float lob, float clp, vec3 c) {
  vec2 v = vec2(dot(off, dir), dot(off, vec2(-dir.y, dir.x))) * len;
  float d2 = min(dot(v, v), clp);
  float wB = 0.4 * d2 - 1.0;
  float wA = lob * d2 - 1.0;
  wB *= wB;
  wA *= wA;
  wB = 1.5625 * wB - 0.5625;
  float w = wB * wA;
  aC += c * w;
  aW += w;
}
void setF(inout vec2 dir, inout float len, float w, float lA, float lB, float lC, float lD, float lE) {
  float lenX = max(abs(lD - lC), abs(lC - lB));
  float dirX = lD - lB;
  dir.x += dirX * w;
  lenX = lenX > 0.0 ? clamp(abs(dirX) / lenX, 0.0, 1.0) : 0.0;
  len += lenX * lenX * w;
  float lenY = max(abs(lE - lC), abs(lC - lA));
  float dirY = lE - lA;
  dir.y += dirY * w;
  lenY = lenY > 0.0 ? clamp(abs(dirY) / lenY, 0.0, 1.0) : 0.0;
  len += lenY * lenY * w;
}
void main() {
  vec2 pp = floor(gl_FragCoord.xy) * con0.xy + con0.zw;
  vec2 fp = floor(pp);
  pp -= fp;
  ivec2 f0 = ivec2(fp);
  //    b c
  //  e f g h
  //  i j k l
  //    n o
  vec3 bC = at(f0 + ivec2(0, -1)), cC = at(f0 + ivec2(1, -1));
  vec3 eC = at(f0 + ivec2(-1, 0)), fC = at(f0), gC = at(f0 + ivec2(1, 0)), hC = at(f0 + ivec2(2, 0));
  vec3 iC = at(f0 + ivec2(-1, 1)), jC = at(f0 + ivec2(0, 1)), kC = at(f0 + ivec2(1, 1)), lC = at(f0 + ivec2(2, 1));
  vec3 nC = at(f0 + ivec2(0, 2)), oC = at(f0 + ivec2(1, 2));
  float bL = luma(bC), cL = luma(cC), eL = luma(eC), fL = luma(fC), gL = luma(gC), hL = luma(hC);
  float iL = luma(iC), jL = luma(jC), kL = luma(kC), lL = luma(lC), nL = luma(nC), oL = luma(oC);
  vec2 dir = vec2(0.0);
  float len = 0.0;
  setF(dir, len, (1.0 - pp.x) * (1.0 - pp.y), bL, eL, fL, gL, jL);
  setF(dir, len, pp.x * (1.0 - pp.y), cL, fL, gL, hL, kL);
  setF(dir, len, (1.0 - pp.x) * pp.y, fL, iL, jL, kL, nL);
  setF(dir, len, pp.x * pp.y, gL, jL, kL, lL, oL);
  vec2 dir2 = dir * dir;
  float dirR = dir2.x + dir2.y;
  bool zro = dirR < 1.0 / 32768.0;
  dirR = zro ? 1.0 : inversesqrt(dirR);
  dir.x = zro ? 1.0 : dir.x;
  dir *= dirR;
  len = len * 0.5;
  len *= len;
  float stretch = dot(dir, dir) / max(abs(dir.x), abs(dir.y));
  vec2 len2 = vec2(1.0 + (stretch - 1.0) * len, 1.0 - 0.5 * len);
  float lob = 0.5 - 0.29 * len;
  float clp = 1.0 / lob;
  vec3 aC = vec3(0.0);
  float aW = 0.0;
  tapF(aC, aW, vec2(0.0, -1.0) - pp, dir, len2, lob, clp, bC);
  tapF(aC, aW, vec2(1.0, -1.0) - pp, dir, len2, lob, clp, cC);
  tapF(aC, aW, vec2(-1.0, 1.0) - pp, dir, len2, lob, clp, iC);
  tapF(aC, aW, vec2(0.0, 1.0) - pp, dir, len2, lob, clp, jC);
  tapF(aC, aW, vec2(0.0, 0.0) - pp, dir, len2, lob, clp, fC);
  tapF(aC, aW, vec2(-1.0, 0.0) - pp, dir, len2, lob, clp, eC);
  tapF(aC, aW, vec2(1.0, 1.0) - pp, dir, len2, lob, clp, kC);
  tapF(aC, aW, vec2(2.0, 1.0) - pp, dir, len2, lob, clp, lC);
  tapF(aC, aW, vec2(2.0, 0.0) - pp, dir, len2, lob, clp, hC);
  tapF(aC, aW, vec2(1.0, 0.0) - pp, dir, len2, lob, clp, gC);
  tapF(aC, aW, vec2(1.0, 2.0) - pp, dir, len2, lob, clp, oC);
  tapF(aC, aW, vec2(0.0, 2.0) - pp, dir, len2, lob, clp, nC);
  vec3 min4 = min(min(fC, gC), min(jC, kC));
  vec3 max4 = max(max(fC, gC), max(jC, kC));
  color = vec4(min(max4, max(min4, aC / max(aW, 1e-5))), 1.0);
}`;

const RCAS = `${HEAD}
uniform float sharpness;
uniform float colorAmount;
${GRADE_GLSL}
void main() {
  ivec2 ip = ivec2(gl_FragCoord.xy);
  //    b
  //  d e f
  //    h
  vec3 b = at(ip + ivec2(0, 1)), d = at(ip + ivec2(-1, 0)), e = at(ip), f = at(ip + ivec2(1, 0)), h = at(ip + ivec2(0, -1));
  float bL = luma(b), dL = luma(d), eL = luma(e), fL = luma(f), hL = luma(h);
  // noise detection: flat-ish noise is sharpened less
  float nz = 0.25 * (bL + dL + fL + hL) - eL;
  float range = max(max(max(bL, dL), max(eL, fL)), hL) - min(min(min(bL, dL), min(eL, fL)), hL);
  nz = 1.0 - 0.5 * clamp(abs(nz) / max(range, 1e-5), 0.0, 1.0);
  vec3 mn4 = min(min(b, d), min(f, h));
  vec3 mx4 = max(max(b, d), max(f, h));
  vec3 hitMin = min(mn4, e) / max(4.0 * mx4, vec3(1e-5));
  vec3 hitMax = (1.0 - max(mx4, e)) / min(4.0 * mn4 - 4.0, vec3(-1e-5));
  vec3 lobeRGB = max(-hitMin, hitMax);
  float lobe = max(-0.1875, min(max(lobeRGB.r, max(lobeRGB.g, lobeRGB.b)), 0.0)) * sharpness * nz;
  vec3 sharp = clamp((lobe * (b + d + f + h) + e) / (4.0 * lobe + 1.0), 0.0, 1.0);
  color = vec4(colorAmount > 0.0 ? grade(sharp) : sharp, 1.0);
}`;

function program(gl: WebGL2RenderingContext, fragment: string) {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type) as WebGLShader;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw new Error(`Shader: ${gl.getShaderInfoLog(shader)}`);
    return shader;
  };
  const p = gl.createProgram() as WebGLProgram;
  gl.attachShader(p, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`Program: ${gl.getProgramInfoLog(p)}`);
  return p;
}

const texture = (gl: WebGL2RenderingContext) => {
  const t = gl.createTexture() as WebGLTexture;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
};

/** RCAS strength: 0.25 stops below the maximum, crisp line art without ringing */
const SHARPNESS = rcasSharpness(0.25);

/**
 * `sharpen`: FSR upscaling and RCAS (off: a plain resample, for colour alone); `color`: the colour grade.
 */
export function createFsr(canvas: HTMLCanvasElement, lite: boolean, options = { sharpen: true, color: false }) {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
    desynchronized: true,
  });
  if (!gl) throw new Error("WebGL2 không khả dụng");
  const programs = { easu: program(gl, EASU), resample: program(gl, RESAMPLE), rcas: program(gl, RCAS) };
  const uniform = (p: WebGLProgram, name: string) => gl.getUniformLocation(p, name);
  // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
  const select = (p: WebGLProgram) => gl.useProgram(p);
  const source = texture(gl);
  const scaled = texture(gl);
  const framebuffer = gl.createFramebuffer();
  let sourceSize = [0, 0];
  let outSize = [0, 0];
  let lost = false;
  canvas.addEventListener("webglcontextlost", () => (lost = true));

  return {
    /** Uploads the current video frame and draws it, upscaled and sharpened. Throws on a tainted video. */
    draw(video: HTMLVideoElement) {
      if (lost) throw new Error("Mất WebGL (GPU bị reset)");
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return;
      const [ow, oh] = [canvas.width, canvas.height];

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, source);
      // GL rows go bottom-up; flipping on upload keeps every pass in one orientation
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      if (sourceSize[0] !== w || sourceSize[1] !== h) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, video);
        sourceSize = [w, h];
      } else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, video);

      if (outSize[0] !== ow || outSize[1] !== oh) {
        gl.bindTexture(gl.TEXTURE_2D, scaled);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, ow, oh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, scaled, 0);
        outSize = [ow, oh];
      }

      // pass 1: frame -> screen size (EASU when it is blown up, else a plain resample)
      const p1 = options.sharpen && needsEasu(w, ow, lite) ? programs.easu : programs.resample;
      select(p1);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.viewport(0, 0, ow, oh);
      gl.bindTexture(gl.TEXTURE_2D, source);
      gl.uniform1i(uniform(p1, "src"), 0);
      gl.uniform2i(uniform(p1, "srcSize"), w, h);
      if (p1 === programs.easu) gl.uniform4f(uniform(p1, "con0"), ...easuScale(w, h, ow, oh));
      else gl.uniform2f(uniform(p1, "outSize"), ow, oh);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // pass 2: RCAS onto the canvas
      select(programs.rcas);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, ow, oh);
      gl.bindTexture(gl.TEXTURE_2D, scaled);
      gl.uniform1i(uniform(programs.rcas, "src"), 0);
      gl.uniform2i(uniform(programs.rcas, "srcSize"), ow, oh);
      // sharpness 0 leaves the pixel as it is (the lobe is 0)
      gl.uniform1f(uniform(programs.rcas, "sharpness"), options.sharpen ? SHARPNESS : 0);
      gl.uniform1f(uniform(programs.rcas, "colorAmount"), options.color ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
