import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { meterFrames, useReducedMotion, type BackdropProps } from "kb-ext-sdk/page";
import { createRenderer, type Renderer } from "./gl.ts";
import type { Palette } from "./key.ts";
import { MEAN_MOTION, bodies, rgb, semiMajor } from "./orbit.ts";

/** The orbit plane seen at rest: tilted well back, turned a little on screen. */
const TILT = 1.12;
const ROLL = -0.16;
/** How far the pointer may pull the plane (rad), and how fast it follows (per second). */
const PULL_TILT = 0.16;
const PULL_YAW = 0.24;
const PULL_RATE = 1.4;
/** What the owner's activity adds to the speed, and how long a kick lasts (s). */
const KICK_WRITE = 0.6;
const KICK_EVENT = 0.4;
const EDITING_LIFT = 0.25;
const BOOST_MAX = 1.6;
const BOOST_DECAY = 3;
/** A still frame (reduced motion) is always this composition. */
const STILL_SEED = 20261108;
const STILL_TIME = 9.5;
/** The meter's floor: as low as kb's own GPU scenes step. */
const QUALITY_FLOOR = 0.4;

const num = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

/** Whether the page is painted dark: the class kb's shell sets on the root. */
function useDarkPage(): boolean {
  const read = () => document.documentElement.classList.contains("dark");
  const [dark, setDark] = useState(read);
  useEffect(() => {
    const watch = new MutationObserver(() => setDark(read()));
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => watch.disconnect();
  }, []);
  return dark;
}

/**
 * Two bodies in a Keplerian binary orbit, tilted back behind the page's
 * title, each trailing a stream of stars along the path it has swept, in a
 * disc of stars that streams through the two arms the binary drives. The
 * scene is mounted once: knobs, theme, strength, pointer and activity all
 * reach the running scene, and its orbit's clock only moves forward. It
 * draws only while on screen and the tab is shown, and one still frame
 * under reduced motion.
 */
export function BinaryOrbitsScene(props: BackdropProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const still = useReducedMotion();
  const dark = useDarkPage();
  const latest = useRef({ props, dark });
  useLayoutEffect(() => {
    latest.current = { props, dark };
  });
  const poke = useRef<() => void>(() => undefined);
  const pinned = props.knobs.seed;
  // A pinned seed is a composition of its own, so a new pin mounts again; unpinned, one is drawn a mount.
  const seed = useMemo(
    () => (still ? STILL_SEED : typeof pinned === "number" ? pinned : Math.floor(Math.random() * 2 ** 31)),
    [pinned, still],
  );

  useEffect(() => {
    const element = canvas.current;
    if (element === null) return undefined;
    let renderer: Renderer | null = null;
    let raf = 0;
    let shown = true;
    let last = performance.now();
    let time = still ? STILL_TIME : 4;
    let clock = 0;
    let boost = 0;
    let lift = 0;
    let pullX = 0;
    let pullY = 0;
    let gpuMs: number | null = null;
    const seen = { ...latest.current.props.activity, node: latest.current.props.node?.id };
    const meter = meterFrames(element, latest.current.props.budget, { floor: QUALITY_FLOOR });

    const layout = () => {
      if (renderer === null) return;
      const q = meter.quality();
      const ratio = Math.min(window.devicePixelRatio || 1, 2) * (0.5 + 0.5 * q);
      renderer.layout(element.clientWidth, element.clientHeight, ratio, q);
    };

    const step = (dt: number) => {
      const { props: now } = latest.current;
      const { activity, knobs } = now;
      let kick = 0;
      if (activity.writes !== seen.writes) kick += KICK_WRITE;
      if (activity.arrivals !== seen.arrivals || activity.turns !== seen.turns) kick += KICK_EVENT;
      if (now.node?.id !== seen.node) kick += KICK_EVENT;
      Object.assign(seen, activity, { node: now.node?.id });
      boost = Math.min(BOOST_MAX, boost * Math.exp(-dt / BOOST_DECAY) + kick);
      const target = boost + (activity.editing ? EDITING_LIFT : 0);
      lift += (target - lift) * Math.min(1, dt * 2.5);
      time += dt * num(knobs.speed, 1) * (1 + lift);
      clock += dt;
      const at = knobs.follow === false ? null : now.pointer.now();
      const w = Math.max(element.clientWidth, 1);
      const h = Math.max(element.clientHeight, 1);
      const tx = at === null ? 0 : Math.max(-1, Math.min(1, (at.x / w - 0.5) * 2));
      const ty = at === null ? 0 : Math.max(-1, Math.min(1, (at.y / h - 0.5) * 2));
      const ease = Math.min(1, dt * PULL_RATE);
      pullX += (tx - pullX) * ease;
      pullY += (ty - pullY) * ease;
    };

    const render = () => {
      if (renderer === null) return;
      const { props: now, dark: isDark } = latest.current;
      const { knobs } = now;
      const palette = (typeof knobs.palette === "string" ? knobs.palette : "auto") as Palette;
      const ink = palette === "ink" || (palette === "auto" && !isDark);
      const a = semiMajor(num(knobs.separation, 0.55));
      const e = Math.max(0, Math.min(0.85, num(knobs.eccentricity, 0.35)));
      const M = (MEAN_MOTION * time) % (2 * Math.PI);
      renderer.draw({
        time,
        clock,
        M,
        a,
        e,
        bodies: bodies(M, a, e),
        trail: num(knobs.trail, 0.6),
        glow: num(knobs.glow, 0.8),
        stars: num(knobs.stars, 0.5),
        ink,
        opacity: now.opacity,
        primary: rgb(knobs.primary, [0.44, 0.55, 1]),
        companion: rgb(knobs.companion, [1, 0.68, 0.4]),
        tilt: TILT - pullY * PULL_TILT,
        yaw: pullX * PULL_YAW,
        roll: ROLL,
        drift: [-pullX * 6, -pullY * 4],
      });
      element.dataset.clock = time.toFixed(3);
    };

    const measure = (dt: number) => {
      if (renderer === null) return;
      // The GPU's own time where it reports it (its latest, as kb's GPU host reads it), else the frame interval.
      gpuMs = renderer.gpuMs() ?? gpuMs;
      const lowered =
        gpuMs !== null ? meter.record(gpuMs, "gpu") : dt > 0 && meter.record(dt * 1000, "interval");
      // Lower detail while frames run over budget: the scene's cost to hold, not the page's to pay.
      if (lowered) layout();
    };

    const running = () => shown && !still && renderer !== null && document.visibilityState === "visible";
    const tick = (stamp: number) => {
      const dt = Math.min(stamp - last, 50) / 1000;
      last = stamp;
      step(dt);
      render();
      measure(dt);
      raf = running() ? requestAnimationFrame(tick) : 0;
    };
    const resume = () => {
      if (raf !== 0 || !running()) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    // A change while nothing runs (a still frame, a hidden tab) is drawn once.
    poke.current = () => {
      if (raf === 0) render();
    };

    const start = () => {
      try {
        renderer = createRenderer(element, seed);
      } catch (error) {
        console.warn(error);
        renderer = null;
      }
      if (renderer === null) return;
      gpuMs = null;
      element.dataset.backend = "webgl2";
      layout();
      render();
      resume();
    };
    const lost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
      renderer = null;
    };
    const sized = new ResizeObserver(() => {
      layout();
      poke.current();
    });
    const visible = new IntersectionObserver(([entry]) => {
      shown = entry?.isIntersecting ?? true;
      resume();
    });
    element.addEventListener("webglcontextlost", lost);
    element.addEventListener("webglcontextrestored", start);
    sized.observe(element);
    visible.observe(element);
    document.addEventListener("visibilitychange", resume);
    start();
    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      poke.current = () => undefined;
      sized.disconnect();
      visible.disconnect();
      document.removeEventListener("visibilitychange", resume);
      element.removeEventListener("webglcontextlost", lost);
      element.removeEventListener("webglcontextrestored", start);
      renderer?.dispose();
      renderer = null;
    };
  }, [seed, still]);

  const { knobs, opacity } = props;
  useEffect(() => poke.current(), [knobs, opacity, dark]);

  return <canvas ref={canvas} style={{ width: "100%", height: "100%", display: "block" }} />;
}
