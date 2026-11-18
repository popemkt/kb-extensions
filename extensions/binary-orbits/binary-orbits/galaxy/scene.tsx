import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { meterFrames, useReducedMotion, type BackdropProps } from "kb-ext-sdk/page";
import { BURSTS, WAKES, createRenderer, oklab, toPlane, type Placement, type Renderer } from "./gl.ts";
import type { Palette } from "../key.ts";

/** What the owner's activity adds to the speed, and how long a kick lasts (s). */
const KICK_WRITE = 0.6;
const KICK_EVENT = 0.4;
const EDITING_LIFT = 0.25;
const BOOST_MAX = 1.6;
const BOOST_DECAY = 3;
/** While the pointer is over the disc: how much faster it turns and brighter it burns at hover 1, and how fast that eases (per s). */
const HOVER_SPEED = 0.5;
const HOVER_LIFT = 0.1;
const HOVER_EASE = 2.5;
/** A wake point is left each time the pointer has gone this far (CSS px), at most this often (s); a pointer at rest leaves none. */
const WAKE_SPACING = 24;
const WAKE_EVERY = 0.05;
/** The disc's radius on the frame, as a share of the frame's width or, for a wide frame, of its height times this. */
const SIZE = 0.414;
const ASPECT = 1.706;
/** A still frame (reduced motion) is always this composition. */
const STILL_SEED = 20261118;
const STILL_TIME = 40;
/** The meter's floor: as low as kb's own GPU scenes step. */
const QUALITY_FLOOR = 0.4;
/** What a press on any of these is meant for: never a burst. */
const MEANT_FOR_SOMETHING =
  "a, button, input, textarea, select, label, summary, details, dialog, [contenteditable], [role], [tabindex], [draggable=true]";

const num = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
const hex = (value: unknown, fallback: string) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
const DEG = Math.PI / 180;
/** The disc's turn on the screen: its right end a little lower, as the demo shows it. */
const ROLL = -12 * DEG;

/** Whether the page is painted dark: the class kb's shell sets on the root. */
// GAP [[01M7PBBDSCWT98ZS7BGR17AHJN]]: kb hands a backdrop no colour scheme, so it reads the root's class.
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

/** Where the disc stands on a frame of this size, by the knobs that place it. */
export function place(width: number, height: number, knobs: BackdropProps["knobs"]): Placement {
  return {
    center: [num(knobs.x, 0.68) * width, num(knobs.y, 0.5) * height],
    radius: SIZE * num(knobs.scale, 1) * Math.min(width, ASPECT * height),
  };
}

/**
 * Whether a press at this target is the page's own: on something meant to
 * be pressed, or on its words. Only the path from the target up to the
 * head that holds the backdrop is asked, so a page wrapper's own role or
 * tabindex claims nothing. A press on the empty head behind them is the
 * backdrop's.
 */
function pageOwns(target: EventTarget | null, backdrop: Element): boolean {
  if (!(target instanceof Element)) return true;
  for (const child of target.childNodes)
    if (child.nodeType === Node.TEXT_NODE && (child.textContent ?? "").trim() !== "") return true;
  for (let at: Element | null = target; at !== null && !at.contains(backdrop); at = at.parentElement)
    if (at.matches(MEANT_FOR_SOMETHING)) return true;
  return false;
}

/**
 * A spiral galaxy seen tilted back behind the page's title: three arms
 * that hold their shape while their stars stream through them, a bright
 * bulge, a violet haze. The pointer, passing over it, gathers the stars it
 * crosses into a rose-violet filament the rotation shears and lets go; a press on
 * its empty area bursts the stars near it outward, and they spring back to
 * their orbits. The scene is mounted once: knobs, theme, strength, pointer
 * and activity all reach the running scene, and its orbit's clock only
 * moves forward. It draws only while on screen and the tab is shown, and
 * one still frame, with no wake and no burst, under reduced motion.
 */
export function GalaxyScene(props: BackdropProps) {
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
    let time = still ? STILL_TIME : 12;
    let clock = 0;
    let boost = 0;
    let lift = 0;
    let hover = 0;
    const wakes = new Float32Array(WAKES * 4);
    let wakeCount = 0;
    let wakeNext = 0;
    let trail: { x: number; y: number; at: number } | null = null;
    const bursts = new Float32Array(BURSTS * 4);
    let burstCount = 0;
    let burstNext = 0;
    const seen = { ...latest.current.props.activity, node: latest.current.props.node?.id };
    const meter = meterFrames(element, latest.current.props.budget, { floor: QUALITY_FLOOR });

    const size = () => [Math.max(element.clientWidth, 1), Math.max(element.clientHeight, 1)] as const;
    const view = () => {
      const { knobs } = latest.current.props;
      const [w, h] = size();
      return { at: place(w, h, knobs), tilt: Math.min(85, Math.max(0, num(knobs.tilt, 63))) * DEG, roll: ROLL };
    };

    const layout = () => {
      if (renderer === null) return;
      const q = meter.quality();
      const ratio = Math.min(window.devicePixelRatio || 1, 2) * (0.5 + 0.5 * q);
      renderer.layout(element.clientWidth, element.clientHeight, ratio, q);
    };

    /** Leave a wake point where the pointer is, on the disc's plane. */
    const leave = (x: number, y: number) => {
      const { at, tilt, roll } = view();
      const [px, py] = toPlane(at, tilt, roll, x, y);
      wakes.set([px, py, time, clock], wakeNext * 4);
      wakeNext = (wakeNext + 1) % WAKES;
      wakeCount = Math.min(wakeCount + 1, WAKES);
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

      const strength = Math.max(0, num(knobs.hover, 1));
      const pointer = strength > 0 ? now.pointer.now() : null;
      const { at, tilt, roll } = view();
      const over =
        pointer !== null && Math.hypot(...toPlane(at, tilt, roll, pointer.x, pointer.y)) < 1.1 ? pointer : null;
      hover += ((over === null ? 0 : 1) - hover) * Math.min(1, dt * HOVER_EASE);
      if (over === null) trail = null;
      else if (trail === null) trail = { ...over, at: clock };
      else {
        // A fast sweep leaves its points along the way, not only where each frame found it.
        const gone = Math.hypot(over.x - trail.x, over.y - trail.y);
        const due = clock - trail.at;
        if (gone >= WAKE_SPACING && due >= WAKE_EVERY) {
          const n = Math.min(3, Math.max(1, Math.floor(gone / WAKE_SPACING)));
          for (let i = 1; i <= n; i++)
            leave(trail.x + ((over.x - trail.x) * i) / n, trail.y + ((over.y - trail.y) * i) / n);
          trail = { ...over, at: clock };
        }
      }
      time += dt * num(knobs.speed, 1) * (1 + lift) * (1 + HOVER_SPEED * hover * Math.min(strength, 1.5));
      clock += dt;
    };

    const render = () => {
      if (renderer === null) return;
      const { props: now, dark: isDark } = latest.current;
      const { knobs } = now;
      const palette = (typeof knobs.palette === "string" ? knobs.palette : "auto") as Palette;
      const { at, tilt, roll } = view();
      const strength = Math.max(0, num(knobs.hover, 1));
      renderer.draw({
        time,
        clock,
        place: at,
        tilt,
        roll,
        arms: Math.round(Math.min(8, Math.max(1, num(knobs.arms, 3)))),
        twist: num(knobs.twist, 2.8),
        stars: num(knobs.stars, 0.7),
        glow: num(knobs.glow, 0.8),
        ink: palette === "ink" || (palette === "auto" && !isDark),
        opacity: now.opacity,
        armColor: oklab(hex(knobs["arm-color"], "#7b4dff")),
        coreColor: oklab(hex(knobs["core-color"], "#f2c4ff")),
        lift: lift * 0.4 + HOVER_LIFT * hover * Math.min(strength, 1.5),
        wakes,
        wakeCount,
        pull: Math.min(1, 0.6 * strength),
        bursts,
        burstCount,
      });
      element.dataset.clock = time.toFixed(3);
    };

    const measure = (dt: number) => {
      if (renderer === null) return;
      // The GPU's own time where a result is ready, else the frame interval, as kb's GPU host meters.
      const gpu = renderer.gpuMs();
      const lowered = gpu !== null ? meter.record(gpu, "gpu") : dt > 0 && meter.record(dt * 1000, "interval");
      // Lower detail while frames run over budget: the scene's cost to hold, not the page's to pay.
      if (lowered) layout();
    };

    const running = () => shown && !still && renderer !== null && document.visibilityState === "visible";
    const tick = (stamp: number) => {
      const dt = Math.min(stamp - last, 250) / 1000;
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

    /**
     * A press on the backdrop's own area: listened for on the window, since
     * the frame takes no pointer events, and never kept from the page. It
     * bursts only where the frame says the pointer is over it, and never on
     * the page's words or controls.
     */
    const press = (event: PointerEvent) => {
      if (still || renderer === null || event.button !== 0 || !event.isPrimary) return;
      const strength = Math.max(0, num(latest.current.props.knobs.burst, 1));
      const over = latest.current.props.pointer.now();
      if (strength === 0 || over === null || pageOwns(event.target, element)) return;
      bursts.set([over.x, over.y, clock, strength], burstNext * 4);
      burstNext = (burstNext + 1) % BURSTS;
      burstCount = Math.min(burstCount + 1, BURSTS);
    };

    const start = () => {
      try {
        renderer = createRenderer(element, seed);
      } catch (error) {
        console.warn(error);
        renderer = null;
      }
      if (renderer === null) return;
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
    // GAP [[01M7PBBD84QWMRDM498KG025Y1]]: kb's pointer source has no press cue, so the window is heard.
    window.addEventListener("pointerdown", press, { capture: true, passive: true });
    start();
    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      poke.current = () => undefined;
      sized.disconnect();
      visible.disconnect();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pointerdown", press, { capture: true });
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
