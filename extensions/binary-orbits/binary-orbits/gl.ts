/**
 * The scene's WebGL2 renderer. Every star is a point whose place the
 * vertex shader computes from its few constants and the orbit's time, so a
 * frame uploads a handful of uniforms and nothing else. Two passes:
 *
 * - the haze, one full-frame triangle: each body's glow and the disc's
 *   faint light, analytic;
 * - the stars, four populations drawn from one buffer: the circumbinary
 *   disc streaming through a two-armed spiral the binary drives, a cloud
 *   round each body, the tidal trails each body leaves along its own past
 *   orbit (Kepler's equation solved per trail star), and a faint field.
 *
 * `glow` adds light (premultiplied, additive), for a dark page; `ink`
 * lays coloured stipple over the page (premultiplied over), for a light one.
 */
import { MASS_RATIO, random } from "./orbit.ts";

const DISC = 22000;
const CLOUD = 1500;
const TRAIL = 7000;
const FIELD = 1600;
const FLOATS = 8;

type Population = { readonly kind: number; readonly first: number; readonly count: number };
const POPULATIONS = {
  disc: { kind: 0, first: 0, count: DISC },
  cloudA: { kind: 1, first: DISC, count: CLOUD },
  cloudB: { kind: 1, first: DISC + CLOUD, count: CLOUD },
  trail: { kind: 2, first: DISC + 2 * CLOUD, count: TRAIL },
  field: { kind: 3, first: DISC + 2 * CLOUD + TRAIL, count: FIELD },
} satisfies Record<string, Population>;
const TOTAL = DISC + 2 * CLOUD + TRAIL + FIELD;

const PRIMARY_SHARE = MASS_RATIO / (1 + MASS_RATIO);
const COMPANION_SHARE = 1 / (1 + MASS_RATIO);

const COMMON = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_ink;
uniform float u_opacity;
float feather(vec2 s) {
  vec2 f = s / u_res;
  return smoothstep(0.0, 0.14, f.x) * smoothstep(0.0, 0.1, 1.0 - f.x)
       * smoothstep(0.0, 0.16, f.y) * smoothstep(0.0, 0.22, 1.0 - f.y);
}
`;

const STAR_VERTEX = /* glsl */ `${COMMON}
layout(location = 0) in vec4 a_a;
layout(location = 1) in vec4 a_b;
uniform int u_kind;
uniform vec2 u_center;
uniform float u_scale;
uniform mat3 u_view;
uniform float u_time;
uniform float u_clock;
uniform float u_px;
uniform vec2 u_bodyA;
uniform vec2 u_bodyB;
uniform float u_a;
uniform float u_e;
uniform float u_M;
uniform float u_trail;
uniform float u_rin;
uniform vec3 u_colA;
uniform vec3 u_colB;
uniform vec2 u_drift;
out vec3 v_col;
out float v_alpha;

const float TAU = 6.28318530718;

vec2 bodyAt(float M, float side) {
  float E = M + u_e * sin(M);
  for (int i = 0; i < 5; i++) E -= (E - u_e * sin(E) - M) / (1.0 - u_e * cos(E));
  vec2 rel = vec2(u_a * (cos(E) - u_e), u_a * sqrt(1.0 - u_e * u_e) * sin(E));
  return side < 0.5 ? -rel * ${PRIMARY_SHARE.toFixed(6)} : rel * ${COMPANION_SHARE.toFixed(6)};
}

void main() {
  vec3 p;
  vec3 col;
  float bright = a_b.z;
  float whiten = 0.0;
  float size = a_a.w;
  float twinkle = 0.18;
  bool screen = false;
  vec2 s;
  if (u_kind == 0) {
    // The disc: Keplerian shear, so the inner stars outrun the outer and stream through the
    // two arms the binary drives; near the pair, its pull stretches their orbits.
    float r = mix(u_rin, 1.0, a_a.x);
    float phi = a_a.y + 0.085 * pow(r, -1.5) * u_time;
    float near = 1.0 - smoothstep(u_rin, u_rin + 0.35, r);
    r *= 1.0 + 0.1 * near * cos(2.0 * phi - u_M);
    float arm = pow(0.5 + 0.5 * cos(2.0 * phi - u_M - 2.7 * log(r)), 3.0);
    bright *= (0.12 + 1.7 * arm) * (1.0 - 0.6 * smoothstep(0.5, 1.0, r)) * (1.0 + 0.6 * near);
    p = vec3(r * cos(phi), r * sin(phi), a_a.z * (0.3 + 0.7 * (1.0 - r)));
    col = mix(u_colA, u_colB, a_b.x);
    whiten = 0.35 * arm + 0.3 * near;
  } else if (u_kind == 1) {
    // A body's own cloud, swirling round it; its first star is the body itself.
    bool primary = a_b.w < 0.5;
    vec2 body = primary ? u_bodyA : u_bodyB;
    float reach = (0.035 + 0.16 * u_a) * (primary ? 1.0 : 0.82);
    float rc = a_a.x * reach;
    float phi = a_a.y + 1.4 * pow(max(a_a.x, 0.06), -0.5) * u_time;
    p = vec3(body + rc * vec2(cos(phi), sin(phi)), a_a.z * rc);
    col = primary ? u_colA : u_colB;
    bright *= 0.35 + 0.65 * (1.0 - a_a.x);
    whiten = 0.85 * pow(1.0 - a_a.x, 3.0);
    twinkle = 0.08;
  } else if (u_kind == 2) {
    // A trail star: where its body was a while ago, drifted outward and loosened with age.
    float side = a_b.w;
    float age = a_a.x;
    vec2 body = bodyAt(u_M - age * u_trail * 4.4, side);
    body *= 1.0 + 0.28 * age;
    body += vec2(cos(a_a.y), sin(a_a.y)) * a_a.z * (0.004 + 0.05 * age);
    p = vec3(body, (a_b.y - 0.5) * 0.02 * age);
    col = side < 0.5 ? u_colA : u_colB;
    bright *= 1.4 * pow(1.0 - age, 1.3) * step(0.001, u_trail);
    whiten = 0.6 * pow(1.0 - age, 3.0);
  } else {
    // The field: far stars fixed to the frame, barely drifting with the pointer.
    screen = true;
    s = a_a.xy * u_res + u_drift * a_a.z * u_px;
    col = mix(vec3(0.82, 0.86, 1.0), mix(u_colA, u_colB, a_b.x), 0.35);
    twinkle = 0.45;
  }
  float depth = 0.0;
  float persp = 1.0;
  if (!screen) {
    vec3 v = u_view * p;
    persp = 1.0 / (1.0 + 0.3 * v.z);
    depth = v.z;
    s = u_center + u_scale * vec2(v.x, -v.y) * persp;
    bright *= 1.0 - 0.35 * clamp(depth, 0.0, 1.0);
  }
  bright *= 1.0 - twinkle + twinkle * sin(u_clock * (0.7 + 1.6 * a_b.y) + a_b.y * TAU);
  bright *= feather(s);
  float px = max(size * u_px * persp, 1.0);
  // A star smaller than a pixel keeps its light, spread thinner.
  bright *= min(size * u_px * persp, 1.0);
  gl_PointSize = px;
  gl_Position = vec4(s.x / u_res.x * 2.0 - 1.0, 1.0 - s.y / u_res.y * 2.0, 0.0, 1.0);
  if (u_ink > 0.5) {
    // Ink: the colour itself, deepened a little, so a light page shows it saturated, not grey.
    v_col = pow(col, vec3(1.35)) * 0.86;
    v_alpha = clamp(bright * (screen ? 0.5 : 0.9), 0.0, 0.9) * u_opacity;
  } else {
    v_col = mix(col, vec3(1.0), clamp(whiten, 0.0, 1.0));
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
  float k = u_ink > 0.5 ? smoothstep(1.0, 0.45, r2) : exp(-r2 * 3.2);
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
uniform vec2 u_sA;
uniform vec2 u_sB;
uniform vec2 u_center;
uniform float u_scale;
uniform float u_squash;
uniform float u_roll;
uniform vec3 u_colA;
uniform vec3 u_colB;
uniform float u_glow;
out vec4 o;
void main() {
  vec2 p = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);
  float dA = length(p - u_sA) / u_scale;
  float dB = length(p - u_sB) / u_scale;
  vec2 q = p - u_center;
  q = mat2(cos(u_roll), sin(u_roll), -sin(u_roll), cos(u_roll)) * q;
  q.y /= u_squash;
  float rr = length(q) / u_scale;
  float disc = exp(-rr * 3.2) * 0.07;
  vec3 c = u_colA * (exp(-dA * dA * 160.0) * 0.9 + exp(-dA * 6.5) * 0.22)
         + u_colB * (exp(-dB * dB * 190.0) * 0.8 + exp(-dB * 7.0) * 0.2)
         + mix(u_colA, u_colB, 0.5) * disc;
  float f = feather(p) * u_glow * u_opacity;
  if (u_ink > 0.5) {
    // On a light page the haze is a faint tint of the bodies' colour, never a pale plate.
    vec3 t = u_colA * (exp(-dA * dA * 120.0) * 0.5 + exp(-dA * 6.0) * 0.12)
           + u_colB * (exp(-dB * dB * 140.0) * 0.45 + exp(-dB * 6.5) * 0.1);
    float a = clamp(max(t.r, max(t.g, t.b)) * 0.5 * f, 0.0, 0.35);
    o = vec4(t / max(max(t.r, max(t.g, t.b)), 1e-3) * a, a);
  } else {
    c += vec3(1.0) * (exp(-dA * dA * 1400.0) * 0.8 + exp(-dB * dB * 1700.0) * 0.7);
    c *= f;
    float a = clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0);
    o = vec4(min(c, vec3(a)), a);
  }
}
`;

/** What one frame draws, all of it in canvas pixels or the orbit's own units. */
export interface Frame {
  /** Orbit time: only ever moves forward, at the knob's speed and the owner's activity. */
  readonly time: number;
  /** Seconds for twinkling, which runs at its own pace. */
  readonly clock: number;
  /** The mean anomaly now, wrapped to a turn. */
  readonly M: number;
  readonly a: number;
  readonly e: number;
  readonly bodies: readonly [readonly [number, number], readonly [number, number]];
  readonly trail: number;
  readonly glow: number;
  /** 0..1, the share of the disc and the field drawn. */
  readonly stars: number;
  readonly ink: boolean;
  readonly opacity: number;
  readonly primary: readonly [number, number, number];
  readonly companion: readonly [number, number, number];
  /** The orbit plane's tilt (rad, 0 face on), its yaw toward the pointer, and its roll on screen. */
  readonly tilt: number;
  readonly yaw: number;
  readonly roll: number;
  /** The pointer's pull on the far field, in CSS pixels. */
  readonly drift: readonly [number, number];
}

export interface Renderer {
  /** Size the drawing buffer: `pixelRatio` device pixels per CSS pixel, `quality` the share of stars. */
  readonly layout: (cssWidth: number, cssHeight: number, pixelRatio: number, quality: number) => void;
  readonly draw: (frame: Frame) => void;
  /** The GPU's time for a finished earlier frame (ms), once each; null while none is ready or none is measured. */
  readonly gpuMs: () => number | null;
  readonly measured: boolean;
  readonly dispose: () => void;
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

const gauss = (next: () => number) => Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());

/** Every star's constants, laid out once per seed: `[r, phi, h, size, mix, phase, brightness, side]`. */
function layStars(seed: number): Float32Array {
  const next = random(seed);
  const data = new Float32Array(TOTAL * FLOATS);
  const put = (i: number, values: readonly number[]) => data.set(values, i * FLOATS);
  for (let i = 0; i < DISC; i++) {
    const u = next();
    const bright = next() < 0.04 ? 1.4 + next() : 0.35 + 0.5 * next();
    put(POPULATIONS.disc.first + i, [
      u ** 1.25,
      next() * Math.PI * 2,
      gauss(next) * 0.035,
      bright > 1.3 ? 2.1 + next() : 1.0 + 0.7 * next(),
      next() ** 1.6,
      next(),
      bright,
      0,
    ]);
  }
  for (const [side, population] of [POPULATIONS.cloudA, POPULATIONS.cloudB].entries()) {
    for (let i = 0; i < CLOUD; i++) {
      const core = i === 0;
      put(population.first + i, [
        core ? 0 : next() ** 1.8,
        next() * Math.PI * 2,
        gauss(next) * 0.4,
        core ? 14 : 0.9 + 0.9 * next(),
        0,
        next(),
        core ? 1 : 0.55 + 0.45 * next(),
        side,
      ]);
    }
  }
  for (let i = 0; i < TRAIL; i++) {
    put(POPULATIONS.trail.first + i, [
      next() ** 0.8,
      next() * Math.PI * 2,
      Math.abs(gauss(next)),
      0.9 + 0.8 * next(),
      0,
      next(),
      0.45 + 0.55 * next(),
      i % 2,
    ]);
  }
  for (let i = 0; i < FIELD; i++) {
    const big = next() < 0.06;
    put(POPULATIONS.field.first + i, [
      next(),
      next(),
      next(),
      big ? 1.8 + next() : 0.8 + 0.6 * next(),
      next(),
      next(),
      big ? 0.7 : 0.18 + 0.3 * next(),
      0,
    ]);
  }
  return data;
}

/** The view rotation: yaw (about the screen's vertical), then tilt (about its horizontal), then roll. Column-major. */
export function viewMatrix(tilt: number, yaw: number, roll: number): Float32Array {
  const [cy, sy, ct, st, cr, sr] = [Math.cos(yaw), Math.sin(yaw), Math.cos(tilt), Math.sin(tilt), Math.cos(roll), Math.sin(roll)];
  // Row-major R = Rz(roll) · Rx(tilt) · Ry(yaw).
  const ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  const rx = [1, 0, 0, 0, ct, -st, 0, st, ct];
  const rz = [cr, -sr, 0, sr, cr, 0, 0, 0, 1];
  const mul = (a: number[], b: number[]) =>
    Array.from({ length: 9 }, (_, k) => {
      const row = Math.floor(k / 3);
      const col = k % 3;
      return a[row * 3]! * b[col]! + a[row * 3 + 1]! * b[3 + col]! + a[row * 3 + 2]! * b[6 + col]!;
    });
  const m = mul(rz, mul(rx, ry));
  return new Float32Array([m[0]!, m[3]!, m[6]!, m[1]!, m[4]!, m[7]!, m[2]!, m[5]!, m[8]!]);
}

/** Where a point of the orbit plane lands on the frame, in canvas pixels, by the shader's own projection. */
export function project(
  view: Float32Array,
  center: readonly [number, number],
  scale: number,
  [x, y]: readonly [number, number],
): [number, number] {
  const vx = view[0]! * x + view[3]! * y;
  const vy = view[1]! * x + view[4]! * y;
  const vz = view[2]! * x + view[5]! * y;
  const persp = 1 / (1 + 0.3 * vz);
  return [center[0] + scale * vx * persp, center[1] - scale * vy * persp];
}

/**
 * Where the system stands, composed as kb's own heroes are: from the
 * frame's height, never its width, right of the centre of the head's
 * content (the frame is centred under it). It stands in the breathing room
 * above the title, so a page's text sits below its brightest part. Narrow
 * frames (a side panel, a card) ease toward a smaller, higher, quieter
 * composition; a wider frame only adds field at the sides.
 */
const PANEL = { x: 0.14, y: 0.24, scale: 0.52, presence: 0.75 };
const WIDE = { x: 0.55, y: 0.34, scale: 0.8, presence: 1 };
const PANEL_WIDTH = 480;
const WIDE_WIDTH = 900;
const MAX_WIDTH_SHARE = 0.36;

export interface Composition {
  readonly center: [number, number];
  /** Pixels per unit of the orbit plane: the disc's radius. */
  readonly scale: number;
  /** How present the scene is, against the strength's opacity. */
  readonly presence: number;
}

export function compose(width: number, height: number): Composition {
  const t = Math.min(1, Math.max(0, (width - PANEL_WIDTH) / (WIDE_WIDTH - PANEL_WIDTH)));
  const k = t * t * (3 - 2 * t);
  const at = (a: number, b: number) => a + (b - a) * k;
  // The disc is about twice as wide as it is tall, so a tall frame (the studio's) holds it by its width.
  const scale = Math.min(at(PANEL.scale, WIDE.scale) * height, MAX_WIDTH_SHARE * width);
  return {
    center: [Math.min(width / 2 + at(PANEL.x, WIDE.x) * height, width - scale * 0.92), at(PANEL.y, WIDE.y) * height],
    scale,
    presence: at(PANEL.presence, WIDE.presence),
  };
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
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, FLOATS * 4, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, FLOATS * 4, 16);
  gl.bindVertexArray(null);
  const empty = gl.createVertexArray();

  const where = (program: WebGLProgram) => {
    const cache = new Map<string, WebGLUniformLocation | null>();
    return (name: string) => {
      if (!cache.has(name)) cache.set(name, gl.getUniformLocation(program, name));
      return cache.get(name) ?? null;
    };
  };
  const at = where(stars);
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

  return {
    measured: timer !== null,
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

      const framed = compose(width / ratio, height / ratio);
      const center: [number, number] = [framed.center[0] * ratio, framed.center[1] * ratio];
      const scale = framed.scale * ratio;
      const opacity = f.opacity * framed.presence;
      const view = viewMatrix(f.tilt, f.yaw, f.roll);
      const ink = f.ink ? 1 : 0;

      if (f.glow > 0) {
        gl.useProgram(haze);
        gl.bindVertexArray(empty);
        gl.uniform2f(hazeAt("u_res"), width, height);
        gl.uniform1f(hazeAt("u_ink"), ink);
        gl.uniform1f(hazeAt("u_opacity"), opacity);
        gl.uniform2fv(hazeAt("u_sA"), project(view, center, scale, f.bodies[0]));
        gl.uniform2fv(hazeAt("u_sB"), project(view, center, scale, f.bodies[1]));
        gl.uniform2f(hazeAt("u_center"), center[0], center[1]);
        gl.uniform1f(hazeAt("u_scale"), scale);
        gl.uniform1f(hazeAt("u_squash"), Math.max(Math.cos(f.tilt), 0.15));
        gl.uniform1f(hazeAt("u_roll"), f.roll);
        gl.uniform3fv(hazeAt("u_colA"), f.primary);
        gl.uniform3fv(hazeAt("u_colB"), f.companion);
        gl.uniform1f(hazeAt("u_glow"), f.glow);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      gl.useProgram(stars);
      gl.bindVertexArray(vao);
      gl.uniform2f(at("u_res"), width, height);
      gl.uniform1f(at("u_ink"), ink);
      gl.uniform1f(at("u_opacity"), opacity);
      gl.uniform2f(at("u_center"), center[0], center[1]);
      gl.uniform1f(at("u_scale"), scale);
      gl.uniformMatrix3fv(at("u_view"), false, view);
      gl.uniform1f(at("u_time"), f.time);
      gl.uniform1f(at("u_clock"), f.clock);
      gl.uniform1f(at("u_px"), ratio);
      gl.uniform2fv(at("u_bodyA"), f.bodies[0]);
      gl.uniform2fv(at("u_bodyB"), f.bodies[1]);
      gl.uniform1f(at("u_a"), f.a);
      gl.uniform1f(at("u_e"), f.e);
      gl.uniform1f(at("u_M"), f.M);
      gl.uniform1f(at("u_trail"), f.trail);
      gl.uniform1f(at("u_rin"), Math.min(0.45, f.a * 0.62));
      gl.uniform3fv(at("u_colA"), f.primary);
      gl.uniform3fv(at("u_colB"), f.companion);
      gl.uniform2f(at("u_drift"), f.drift[0], f.drift[1]);
      const share = (population: Population, of: number) => {
        const count = Math.floor(population.count * of);
        if (count < 1) return;
        gl.uniform1i(at("u_kind"), population.kind);
        gl.drawArrays(gl.POINTS, population.first, count);
      };
      share(POPULATIONS.field, f.stars * quality);
      share(POPULATIONS.disc, (0.2 + 0.8 * f.stars) * quality);
      share(POPULATIONS.trail, f.trail > 0 ? Math.min(1, 0.35 + f.trail) * quality : 0);
      share(POPULATIONS.cloudA, 0.4 + 0.6 * quality);
      share(POPULATIONS.cloudB, 0.4 + 0.6 * quality);
      gl.bindVertexArray(null);

      if (query !== null && timer !== null) {
        gl.endQuery(timer.TIME_ELAPSED_EXT);
        pending.push(query);
      }
    },
    gpuMs: () => {
      if (timer === null) return null;
      const oldest = pending[0];
      if (oldest === undefined || gl.getQueryParameter(oldest, gl.QUERY_RESULT_AVAILABLE) !== true) return null;
      pending.shift();
      const disjoint = gl.getParameter(timer.GPU_DISJOINT_EXT) === true;
      const ns = gl.getQueryParameter(oldest, gl.QUERY_RESULT) as number;
      gl.deleteQuery(oldest);
      return disjoint ? null : ns / 1e6;
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
