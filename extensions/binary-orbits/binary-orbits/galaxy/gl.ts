/**
 * The galaxy's WebGL2 renderer: a tilted spiral of stars streaming
 * through its arms. Every star is a point whose place the vertex shader
 * computes from a few constants and the clocks, so a frame uploads only
 * uniforms. Two passes:
 *
 * - the haze, one full-frame triangle: the bulge's light and the disc's
 *   glow along its arms, with the dust lanes, computed per pixel on the
 *   disc's plane;
 * - the stars, one batch: the bulge and the disc.
 *
 * How the arms hold while stars stream through them: a star's angle is
 * its arm's angle plus a phase that advances at the star's own speed
 * against the pattern's, read through a monotone map that lingers near
 * the arm (`armPhase`). Inner stars outrun outer ones, the arms stay put,
 * and no star ever jumps.
 *
 * The owner's hand reaches the stars two ways:
 * - a wake: where the pointer swept, the stars it passed are gathered
 *   toward its path, then carried on their own orbits, so the rotation
 *   shears the filament into a trailing arc as it relaxes;
 * - a burst: a click pushes the stars near it outward on the screen and
 *   lets them spring back, critically damped, never snapping.
 */
import { random } from "../util.ts";

/** The most stars a frame may draw: the density knob at 1. */
export const MAX_STARS = 140_000;
/** Wake points kept (each a moment of a sweep), and bursts. */
export const WAKES = 64;
export const BURSTS = 8;
const FLOATS = 12;

/** The disc's rotation: a flat curve, ω = W0 / (r + R0), and the arms' own slower turn. */
/** How much nearer the disc's near edge stands than its far one. */
const PERSPECTIVE = 0.2;
const W0 = 0.05;
const R0 = 0.06;
const PATTERN = 0.024;
/** How long a wake takes to relax (s), and a burst to peak (s). */
export const WAKE_RELAX = 3;
export const BURST_RISE = 0.3;

const COMMON = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_ink;
uniform float u_opacity;
uniform vec2 u_center;
uniform float u_R;
uniform vec4 u_view; // cos tilt, sin tilt, cos roll, sin roll
uniform float u_time;
uniform float u_arms;
uniform float u_twist;
uniform float u_armS;
uniform float u_dust;
uniform vec3 u_labA;
uniform vec3 u_labB;
const float TAU = 6.28318530718;

float feather(vec2 s) {
  vec2 f = s / u_res;
  return smoothstep(0.0, 0.08, f.x) * smoothstep(0.0, 0.08, 1.0 - f.x)
       * smoothstep(0.0, 0.1, f.y) * smoothstep(0.0, 0.12, 1.0 - f.y);
}
float armAngle(float r) { return u_twist * log(max(r, 0.015)); }
vec3 oklabToSrgb(vec3 c) {
  float l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  vec3 lms = vec3(l_ * l_ * l_, m_ * m_ * m_, s_ * s_ * s_);
  vec3 lin = vec3(
     4.0767416621 * lms.x - 3.3077115913 * lms.y + 0.2309699292 * lms.z,
    -1.2684380046 * lms.x + 2.6097574011 * lms.y - 0.3413193965 * lms.z,
    -0.0041960863 * lms.x - 0.7034186147 * lms.y + 1.7076147010 * lms.z);
  lin = clamp(lin, 0.0, 1.0);
  return mix(lin * 12.92, 1.055 * pow(lin, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, lin));
}
/** The disc's colour at radius r: the arms' outside, the core's inside, in OKLab. */
vec3 discLab(float r, float jitter) {
  return mix(u_labB, u_labA, clamp(0.85 * smoothstep(0.03, 0.4, r) + jitter, 0.0, 1.0));
}
/** Where a plane point lands on the frame: tilted back, then rolled; y up on the plane, down on screen. */
vec3 project(vec3 p) {
  float y1 = p.y * u_view.x - p.z * u_view.y;
  float z1 = p.y * u_view.y + p.z * u_view.x;
  // A little perspective: the near half of the disc (below) stands larger than the far.
  float k = 1.0 / (1.0 + ${PERSPECTIVE} * z1);
  vec2 q = k * vec2(p.x * u_view.z - y1 * u_view.w, p.x * u_view.w + y1 * u_view.z);
  return vec3(u_center + u_R * vec2(q.x, -q.y), z1);
}
`;

const STAR_VERTEX = /* glsl */ `${COMMON}
layout(location = 0) in vec4 a_a; // r, u0, h, size
layout(location = 1) in vec4 a_b; // arm share, jitter, brightness, colour jitter
layout(location = 2) in vec4 a_c; // twinkle phase, burst angle, burst reach, sparkle
uniform float u_clock;
uniform float u_px;
uniform float u_size;
uniform float u_twinkle;
uniform float u_lift;
uniform vec4 u_wake[${WAKES}];
uniform int u_wakes;
uniform float u_pull;
uniform vec4 u_burst[${BURSTS}];
uniform int u_bursts;
out vec3 v_col;
out float v_alpha;

/** A star's angle at orbit time t, and where it sits in its arm's period (0 at the arm). */
float angleAt(float r, float t, out float f) {
  float P = TAU / u_arms;
  float om = ${W0.toFixed(4)} / (r + ${R0.toFixed(3)});
  float U = a_a.y * u_arms + (om - ${PATTERN.toFixed(4)}) * t / P;
  float k = floor(U);
  f = U - k;
  float s = a_b.x;
  float g = f - s * sin(TAU * f) / TAU;
  return armAngle(r) + ${PATTERN.toFixed(4)} * t + P * (k + g) + a_b.y / max(r, 0.12);
}

void main() {
  float r = a_a.x;
  float f;
  float phi = angleAt(r, u_time, f);
  vec3 p = vec3(r * cos(phi), r * sin(phi), a_a.z);

  // The wake: stars the pointer passed are gathered toward its path, then ride their own orbits.
  vec2 shift = vec2(0.0);
  float gather = 0.0;
  for (int i = 0; i < ${WAKES}; i++) {
    if (i >= u_wakes) break;
    vec4 e = u_wake[i];
    float age = u_clock - e.w;
    float env = smoothstep(0.0, 0.18, age) * exp(-age / ${WAKE_RELAX.toFixed(2)});
    if (env < 0.01) continue;
    // A star's radius never changes, so one far from the wake's ring is passed over cheaply.
    if (abs(length(e.xy) - r) > 0.36) continue;
    float f0;
    float phi0 = angleAt(r, e.z, f0);
    vec2 p0 = r * vec2(cos(phi0), sin(phi0));
    vec2 d = e.xy - p0;
    float w = exp(-dot(d, d) / 0.017) * env;
    if (w < 0.003) continue;
    float a = phi - phi0;
    shift += vec2(cos(a) * d.x - sin(a) * d.y, sin(a) * d.x + cos(a) * d.y) * w;
    gather += w;
  }
  p.xy += shift * u_pull / max(1.0, gather);
  float heat = min(gather * u_pull, 1.0);

  vec3 s = project(p);
  float fa = f - floor(f + 0.5);
  float armness = pow(0.5 + 0.5 * cos(TAU * fa), 4.0) * step(0.001, a_b.x);
  float dust = 1.0 - u_dust * 0.8 * exp(-pow((fa + 0.07) / 0.04, 2.0)) * step(0.001, a_b.x) * smoothstep(0.08, 0.2, r);
  float core = exp(-r / 0.13);
  float bright = a_b.z * (0.48 + 1.08 * armness) * (0.55 + 0.45 * step(0.001, a_b.x)) * dust * (1.0 + u_lift) * (1.0 + 0.25 * heat);
  // The centre's light is the haze's: stars crowd there, and would only burn it white.
  // The rim frays: where it fades wanders with the angle, so the disc has no edge to see.
  float rim = 0.88 + 0.07 * sin(3.0 * phi + 1.3) + 0.06 * sin(7.0 * phi - 0.4 + a_c.x);
  bright *= (0.4 + 0.6 * smoothstep(0.02, 0.35, r)) * (1.0 - smoothstep(rim - 0.25, rim + 0.3, r));
  bright *= 1.0 - u_twinkle + u_twinkle * (0.5 + 0.5 * sin(u_clock * (0.8 + 2.2 * a_c.x) + a_c.x * TAU));
  bright *= 1.0 - 0.4 * clamp(s.z, 0.0, 1.0);

  // A burst: pushed out from the click on the screen, critically damped back.
  for (int i = 0; i < ${BURSTS}; i++) {
    if (i >= u_bursts) break;
    vec4 b = u_burst[i];
    float age = u_clock - b.z;
    if (age < 0.0 || age > 4.0) continue;
    float k = age / ${BURST_RISE.toFixed(2)};
    float spring = k * exp(1.0 - k);
    vec2 d = s.xy - b.xy;
    float dist = length(d);
    // Outward, a little scattered; near the click the push shrinks with the distance, so no hole tears open.
    float turn = (a_c.y - 0.5) * 0.9;
    vec2 push = vec2(cos(turn) * d.x - sin(turn) * d.y, sin(turn) * d.x + cos(turn) * d.y) / (dist + u_R * 0.12);
    float reach = exp(-dist / (u_R * 0.55));
    s.xy += push * b.w * u_R * 0.42 * reach * (0.35 + 1.3 * a_c.z) * spring;
    bright *= 1.0 + 0.9 * b.w * spring * reach;
  }

  bright *= feather(s.xy);
  float size = a_a.w * u_size * u_px * (1.0 - 0.12 * clamp(s.z, -1.0, 1.0));
  gl_PointSize = max(size, 1.0);
  bright *= min(size, 1.0);
  gl_Position = vec4(s.x / u_res.x * 2.0 - 1.0, 1.0 - s.y / u_res.y * 2.0, 0.0, 1.0);

  vec3 lab = discLab(r, a_b.w);
  // Newly formed stars in the arms, and gathered ones, take a deeper, richer shade of the core's colour:
  // a pale one would stack to white where the wake crowds them.
  lab = mix(lab, vec3(u_labB.x - 0.05, u_labB.yz * 2.0), clamp(0.35 * armness * a_c.w + 1.1 * heat, 0.0, 1.0));
  if (u_ink > 0.5) {
    v_col = oklabToSrgb(vec3(lab.x * 0.55, lab.yz * 1.25));
    v_alpha = clamp(bright * 0.75, 0.0, 0.9) * u_opacity;
  } else {
    v_col = mix(oklabToSrgb(vec3(lab.x + 0.06, lab.yz * 0.85)), vec3(1.0, 0.96, 0.92), clamp(core * 0.4, 0.0, 1.0));
    v_alpha = clamp(bright, 0.0, 1.0) * u_opacity;
  }
}
`;

const STAR_FRAGMENT = /* glsl */ `${COMMON}
in vec3 v_col;
in float v_alpha;
out vec4 o;
void main() {
  vec2 d = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(d, d);
  if (r2 > 1.0) discard;
  float k = u_ink > 0.5 ? 1.0 - smoothstep(0.4, 1.0, r2) : exp(-r2 * 3.0);
  float a = v_alpha * k;
  o = vec4(v_col * a, a);
}
`;

const HAZE_VERTEX = /* glsl */ `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

const HAZE_FRAGMENT = /* glsl */ `${COMMON}
uniform float u_glow;
uniform float u_core;
uniform float u_clock;
uniform vec4 u_burst[${BURSTS}];
uniform int u_bursts;
out vec4 o;
void main() {
  vec2 s = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);
  // Back onto the disc's plane: unroll, then undo the tilt's foreshortening.
  vec2 q = (s - u_center) / u_R;
  q.y = -q.y;
  vec2 u = vec2(q.x * u_view.z + q.y * u_view.w, -q.x * u_view.w + q.y * u_view.z);
  u.y /= max(u_view.x - ${PERSPECTIVE} * u.y * u_view.y, 1e-4);
  u.x *= 1.0 + ${PERSPECTIVE} * u.y * u_view.y;
  float r = length(u);
  float P = TAU / u_arms;
  float fa = (atan(u.y, u.x) - armAngle(r) - ${PATTERN.toFixed(4)} * u_time) / P;
  fa -= floor(fa + 0.5);
  float arm = exp(-pow(fa / 0.3, 2.0)) * smoothstep(0.06, 0.2, r);
  float dust = 1.0 - u_dust * 0.7 * exp(-pow((fa + 0.07) / 0.045, 2.0)) * smoothstep(0.08, 0.2, r);
  float disc = exp(-r / 0.5) * (0.25 + 0.75 * smoothstep(0.0, 0.35, r)) * (0.35 + 0.65 * arm * u_armS) * dust * (1.0 - smoothstep(0.45, 1.1, r)) + 0.2 * exp(-r / 0.5) * (1.0 - smoothstep(0.9, 1.45, r));
  float bulge = exp(-pow(r / 0.13, 2.0)) * u_core + exp(-r / 0.05) * 0.5 * u_core;
  float calm = 1.0;
  for (int i = 0; i < ${BURSTS}; i++) {
    if (i >= u_bursts) break;
    vec4 b = u_burst[i];
    float age = u_clock - b.z;
    if (age < 0.0 || age > 4.0) continue;
    float k = age / ${BURST_RISE.toFixed(2)};
    calm *= 1.0 - 0.7 * b.w * k * exp(1.0 - k) * exp(-length(s - b.xy) / (u_R * 0.6));
  }
  vec3 lab = discLab(r, -0.18);
  float f = feather(s) * u_opacity * u_glow * max(calm, 0.0);
  if (u_ink > 0.5) {
    float a = clamp((disc * 0.5 + bulge * 0.35) * f, 0.0, 0.4);
    o = vec4(oklabToSrgb(vec3(lab.x * 0.75, lab.yz)) * a, a);
  } else {
    vec3 c = oklabToSrgb(vec3(lab.x, lab.yz * 0.85)) * disc * 2.0 + vec3(1.0, 0.94, 0.88) * bulge * 0.55;
    c *= f;
    float a = clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0);
    o = vec4(min(c, vec3(a)), a);
  }
}
`;

/** A colour as OKLab, from `#rrggbb`. */
export function oklab(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  const lin = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const [r, g, b] = lin;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Where the disc stands on the frame, in canvas CSS pixels: its centre and its radius. */
export interface Placement {
  readonly center: readonly [number, number];
  readonly radius: number;
}

/** What one frame draws. */
export interface Frame {
  /** Orbit time: only ever moves forward, at the speed and the owner's hand. */
  readonly time: number;
  /** Seconds of the page's clock: what twinkles, wakes and bursts are timed by. */
  readonly clock: number;
  readonly place: Placement;
  readonly tilt: number;
  readonly roll: number;
  readonly arms: number;
  readonly twist: number;
  /** 0..1, the share of the stars drawn. */
  readonly stars: number;
  readonly glow: number;
  readonly ink: boolean;
  readonly opacity: number;
  readonly armColor: readonly [number, number, number];
  readonly coreColor: readonly [number, number, number];
  /** How much brighter the disc is while the pointer is over it. */
  readonly lift: number;
  /** Wake points: plane x, y, the orbit time and the clock they were left at. */
  readonly wakes: Float32Array;
  readonly wakeCount: number;
  /** How hard a wake gathers the stars it passed (0 none, 1 onto the path). */
  readonly pull: number;
  /** Bursts: canvas CSS x, y, the clock they began at, their strength. */
  readonly bursts: Float32Array;
  readonly burstCount: number;
}

export interface Renderer {
  /** Size the drawing buffer: `pixelRatio` device pixels per CSS pixel, `quality` the share of stars. */
  readonly layout: (cssWidth: number, cssHeight: number, pixelRatio: number, quality: number) => void;
  readonly draw: (frame: Frame) => void;
  /** The GPU's time for a finished earlier frame (ms), once each; null while none is ready, or where the GPU reports none. */
  readonly gpuMs: () => number | null;
  readonly dispose: () => void;
}

/** A plane point under a frame point (CSS px), by the shaders' own projection: what the pointer touches. */
export function toPlane(place: Placement, tilt: number, roll: number, x: number, y: number): [number, number] {
  const qx = (x - place.center[0]) / place.radius;
  const qy = -(y - place.center[1]) / place.radius;
  const [cr, sr] = [Math.cos(roll), Math.sin(roll)];
  const ux = qx * cr + qy * sr;
  const uy = -qx * sr + qy * cr;
  const py = uy / Math.max(Math.cos(tilt) - PERSPECTIVE * uy * Math.sin(tilt), 1e-4);
  return [ux * (1 + PERSPECTIVE * py * Math.sin(tilt)), py];
}

function compile(gl: WebGL2RenderingContext, vertex: string, fragment: string): WebGLProgram {
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const shader = gl.createShader(type);
    if (shader === null) throw new Error("binary-orbits: no shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true)
      throw new Error(`binary-orbits: ${gl.getShaderInfoLog(shader) ?? "shader failed"}`);
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true)
    throw new Error(`binary-orbits: ${gl.getProgramInfoLog(program) ?? "link failed"}`);
  return program;
}

/**
 * Every star's constants, laid out once per seed, in an order where any
 * prefix is a fair sample: a bulge of about one star in eight, the rest an
 * exponential disc, most of it gathered by its arms, the rest between them.
 */
function layStars(seed: number): Float32Array {
  const next = random(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());
  const data = new Float32Array(MAX_STARS * FLOATS);
  for (let i = 0; i < MAX_STARS; i++) {
    const bulge = next() < 0.08;
    let r: number;
    let h: number;
    if (bulge) {
      const [x, y] = [gauss() * 0.075, gauss() * 0.075];
      r = Math.min(Math.hypot(x, y), 0.4);
      h = gauss() * 0.055;
    } else {
      do r = -0.5 * Math.log(Math.max(1e-9, next() * next()));
      while (r > 1.4);
      h = gauss() * 0.018 * (1 + 2.5 * Math.exp(-r / 0.15));
    }
    const sparkle = next() < 0.07 ? 1 : 0;
    data.set(
      [
        r,
        next(),
        h,
        sparkle === 1 ? 2.0 + 1.2 * next() : 0.8 + 0.5 * next() + 0.7 * next() ** 4,
        bulge || next() < 0.18 ? 0 : 0.69,
        gauss() * 0.075,
        (sparkle === 1 ? 0.95 + 0.45 * next() : 0.3 + 0.45 * next()) * (bulge ? 0.22 : 1),
        (next() - 0.5) * 0.3,
        next(),
        next(),
        next(),
        sparkle,
      ],
      i * FLOATS,
    );
  }
  return data;
}

/** A renderer on `canvas`, or null where WebGL2 is not to be had. */
export function createRenderer(canvas: HTMLCanvasElement, seed: number): Renderer | null {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (gl === null) return null;
  const stars = compile(gl, STAR_VERTEX, STAR_FRAGMENT);
  const haze = compile(gl, HAZE_VERTEX, HAZE_FRAGMENT);
  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, layStars(seed), gl.STATIC_DRAW);
  for (let i = 0; i < 3; i++) {
    gl.enableVertexAttribArray(i);
    gl.vertexAttribPointer(i, 4, gl.FLOAT, false, FLOATS * 4, i * 16);
  }
  gl.bindVertexArray(null);
  const empty = gl.createVertexArray();

  const where = (program: WebGLProgram) => {
    const cache = new Map<string, WebGLUniformLocation | null>();
    return (name: string) => {
      if (!cache.has(name)) cache.set(name, gl.getUniformLocation(program, name));
      return cache.get(name) ?? null;
    };
  };
  const starAt = where(stars);
  const hazeAt = where(haze);

  const timer = gl.getExtension("EXT_disjoint_timer_query_webgl2") as {
    readonly TIME_ELAPSED_EXT: number;
    readonly GPU_DISJOINT_EXT: number;
  } | null;
  const pending: WebGLQuery[] = [];

  let width = 1;
  let height = 1;
  let ratio = 1;
  let quality = 1;

  /** The uniforms both passes read, set on the program in use. */
  const shared = (at: (name: string) => WebGLUniformLocation | null, f: Frame) => {
    gl.uniform2f(at("u_res"), width, height);
    gl.uniform1f(at("u_ink"), f.ink ? 1 : 0);
    gl.uniform1f(at("u_opacity"), f.opacity);
    gl.uniform2f(at("u_center"), f.place.center[0] * ratio, f.place.center[1] * ratio);
    gl.uniform1f(at("u_R"), f.place.radius * ratio);
    gl.uniform4f(at("u_view"), Math.cos(f.tilt), Math.sin(f.tilt), Math.cos(f.roll), Math.sin(f.roll));
    gl.uniform1f(at("u_time"), f.time);
    gl.uniform1f(at("u_clock"), f.clock);
    gl.uniform1f(at("u_arms"), f.arms);
    gl.uniform1f(at("u_twist"), f.twist);
    gl.uniform1f(at("u_armS"), 0.4);
    gl.uniform1f(at("u_dust"), 0.5);
    gl.uniform3fv(at("u_labA"), f.armColor);
    gl.uniform3fv(at("u_labB"), f.coreColor);
    // Bursts are kept in CSS pixels; the shaders work in the buffer's.
    const bursts = f.bursts.slice(0, f.burstCount * 4);
    for (let i = 0; i < f.burstCount; i++) {
      bursts[i * 4] = f.bursts[i * 4]! * ratio;
      bursts[i * 4 + 1] = f.bursts[i * 4 + 1]! * ratio;
    }
    if (f.burstCount > 0) gl.uniform4fv(at("u_burst"), bursts);
    gl.uniform1i(at("u_bursts"), f.burstCount);
  };

  return {
    layout: (cssWidth, cssHeight, pixelRatio, q) => {
      ratio = pixelRatio;
      quality = q;
      width = Math.max(1, Math.round(cssWidth * pixelRatio));
      height = Math.max(1, Math.round(cssHeight * pixelRatio));
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
    },
    draw: (f) => {
      const query = timer !== null && pending.length < 4 ? gl.createQuery() : null;
      if (query !== null && timer !== null) gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      if (f.ink) gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      else gl.blendFunc(gl.ONE, gl.ONE);

      if (f.glow > 0) {
        gl.useProgram(haze);
        gl.bindVertexArray(empty);
        shared(hazeAt, f);
        gl.uniform1f(hazeAt("u_glow"), f.glow * (1 + f.lift));
        gl.uniform1f(hazeAt("u_core"), 1);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      gl.useProgram(stars);
      gl.bindVertexArray(vao);
      shared(starAt, f);
      gl.uniform1f(starAt("u_px"), ratio);
      gl.uniform1f(starAt("u_size"), 0.9);
      gl.uniform1f(starAt("u_twinkle"), 0.35);
      gl.uniform1f(starAt("u_lift"), f.lift);
      if (f.wakeCount > 0) gl.uniform4fv(starAt("u_wake"), f.wakes.subarray(0, f.wakeCount * 4));
      gl.uniform1i(starAt("u_wakes"), f.wakeCount);
      gl.uniform1f(starAt("u_pull"), f.pull);
      const count = Math.floor(MAX_STARS * Math.min(1, Math.max(0.05, f.stars)) * quality);
      gl.drawArrays(gl.POINTS, 0, count);
      gl.bindVertexArray(null);

      if (query !== null && timer !== null) {
        gl.endQuery(timer.TIME_ELAPSED_EXT);
        pending.push(query);
      }
    },
    gpuMs: () => {
      if (timer === null) return null;
      // A disjoint run (a power change, a context switch) voids every query in flight.
      if (gl.getParameter(timer.GPU_DISJOINT_EXT) === true) {
        for (const query of pending.splice(0)) gl.deleteQuery(query);
        return null;
      }
      const oldest = pending[0];
      if (oldest === undefined || gl.getQueryParameter(oldest, gl.QUERY_RESULT_AVAILABLE) !== true) return null;
      pending.shift();
      const ns = gl.getQueryParameter(oldest, gl.QUERY_RESULT) as number;
      gl.deleteQuery(oldest);
      return ns / 1e6;
    },
    dispose: () => {
      for (const query of pending.splice(0)) gl.deleteQuery(query);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteVertexArray(empty);
      gl.deleteProgram(stars);
      gl.deleteProgram(haze);
    },
  };
}
