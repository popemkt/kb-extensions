import { BACKDROP_OPTIONS, defineExtension, type Knob, type SeedBackdrop } from "kb-ext-sdk";

/**
 * The palette a frame is painted in: `glow` adds light, for a dark page;
 * `ink` stipples coloured stars, for a light one; `auto` follows the page.
 */
export const PALETTES = ["auto", "glow", "ink"] as const;
export type Palette = (typeof PALETTES)[number];

const PALETTE: Knob = {
  kind: "enum",
  id: "palette",
  label: "Palette",
  options: [
    { id: "auto", label: "Follow the page" },
    { id: "glow", label: "Glow (dark pages)" },
    { id: "ink", label: "Ink (light pages)" },
  ],
  default: "auto",
};
const SEED: Knob = { kind: "seed", id: "seed", label: "Seed", default: null };

/**
 * The galaxy's knobs, in the order Backdrop Studio lists them. Each id is
 * what its scene reads (`galaxy/scene.tsx`); each default is the
 * composition it is made to be seen at. An id the classic scene also has
 * means the same there.
 */
export const GALAXY_KNOBS: readonly Knob[] = [
  { kind: "number", id: "speed", label: "Rotation speed", min: 0, max: 3, step: 0.05, default: 1 },
  { kind: "number", id: "arms", label: "Arms", min: 1, max: 8, step: 1, default: 3 },
  { kind: "number", id: "twist", label: "Arm twist", min: 0.5, max: 8, step: 0.1, default: 2.8 },
  { kind: "number", id: "tilt", label: "Tilt (degrees)", min: 0, max: 85, step: 1, default: 63 },
  { kind: "number", id: "glow", label: "Glow", min: 0, max: 2, step: 0.05, default: 0.8 },
  { kind: "color", id: "arm-color", label: "Arms", default: "#7b4dff" },
  { kind: "color", id: "core-color", label: "Core", default: "#f2c4ff" },
  PALETTE,
  { kind: "number", id: "stars", label: "Star density", min: 0, max: 1, step: 0.05, default: 0.7 },
  { kind: "number", id: "hover", label: "Hover strength", min: 0, max: 2, step: 0.05, default: 1 },
  { kind: "number", id: "burst", label: "Burst strength", min: 0, max: 2, step: 0.05, default: 1 },
  { kind: "number", id: "x", label: "Centre across", min: 0, max: 1, step: 0.01, default: 0.68 },
  { kind: "number", id: "y", label: "Centre down", min: 0, max: 1, step: 0.01, default: 0.5 },
  { kind: "number", id: "scale", label: "Size", min: 0.3, max: 2, step: 0.05, default: 1 },
  SEED,
];

/**
 * The classic scene's knobs, as they were before the galaxy took the
 * backdrop's name: a page that set them on Classic keeps its picture.
 */
export const CLASSIC_KNOBS: readonly Knob[] = [
  { kind: "number", id: "speed", label: "Orbit speed", min: 0, max: 3, step: 0.05, default: 1 },
  { kind: "number", id: "separation", label: "Separation", min: 0.2, max: 1, step: 0.05, default: 0.55 },
  { kind: "number", id: "eccentricity", label: "Eccentricity", min: 0, max: 0.8, step: 0.05, default: 0.35 },
  { kind: "number", id: "trail", label: "Trail length", min: 0, max: 1, step: 0.05, default: 0.6 },
  { kind: "number", id: "glow", label: "Glow", min: 0, max: 2, step: 0.05, default: 0.8 },
  { kind: "color", id: "primary", label: "First body", default: "#6f8dff" },
  { kind: "color", id: "companion", label: "Second body", default: "#ffad66" },
  PALETTE,
  { kind: "number", id: "stars", label: "Star field density", min: 0, max: 1, step: 0.05, default: 0.5 },
  { kind: "boolean", id: "follow", label: "Follow the pointer", default: true },
  SEED,
];

/** The backdrops, as both halves name them: each id is `<extension>.<local id>`. */
export const BinaryOrbits: SeedBackdrop = {
  id: "binary-orbits.binary-orbits",
  label: "Binary Orbits",
  credit: "Binary Orbits by popemkt",
  strength: "soft",
  knobs: GALAXY_KNOBS,
};
export const BinaryOrbitsClassic: SeedBackdrop = {
  id: "binary-orbits.classic",
  label: "Binary Orbits Classic",
  credit: "Binary Orbits by popemkt",
  strength: "soft",
  knobs: CLASSIC_KNOBS,
};

export const declaration = defineExtension({
  name: "binary-orbits",
  label: "Binary Orbits",
  declaredOptions: [{ kind: BACKDROP_OPTIONS, options: [BinaryOrbits, BinaryOrbitsClassic] }],
});
