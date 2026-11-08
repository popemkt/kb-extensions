import { BACKDROP_OPTIONS, defineExtension, type Knob, type SeedBackdrop } from "kb-ext-sdk";

/**
 * The palette a frame is painted in: `glow` adds light, for a dark page;
 * `ink` stipples coloured stars, for a light one; `auto` follows the page.
 */
export const PALETTES = ["auto", "glow", "ink"] as const;
export type Palette = (typeof PALETTES)[number];

/**
 * Every knob, in the order Backdrop Studio lists them. Each id is what the
 * scene reads (`scene.tsx`); each default is the composition the backdrop
 * is made to be seen at.
 */
export const KNOBS: readonly Knob[] = [
  { kind: "number", id: "speed", label: "Orbit speed", min: 0, max: 3, step: 0.05, default: 1 },
  { kind: "number", id: "separation", label: "Separation", min: 0.2, max: 1, step: 0.05, default: 0.55 },
  { kind: "number", id: "eccentricity", label: "Eccentricity", min: 0, max: 0.8, step: 0.05, default: 0.35 },
  { kind: "number", id: "trail", label: "Trail length", min: 0, max: 1, step: 0.05, default: 0.6 },
  { kind: "number", id: "glow", label: "Glow", min: 0, max: 2, step: 0.05, default: 0.8 },
  { kind: "color", id: "primary", label: "First body", default: "#6f8dff" },
  { kind: "color", id: "companion", label: "Second body", default: "#ffad66" },
  {
    kind: "enum",
    id: "palette",
    label: "Palette",
    options: [
      { id: "auto", label: "Follow the page" },
      { id: "glow", label: "Glow (dark pages)" },
      { id: "ink", label: "Ink (light pages)" },
    ],
    default: "auto",
  },
  { kind: "number", id: "stars", label: "Star field density", min: 0, max: 1, step: 0.05, default: 0.5 },
  { kind: "boolean", id: "follow", label: "Follow the pointer", default: true },
  { kind: "seed", id: "seed", label: "Seed", default: null },
];

/** The backdrop, as both halves name it: its id is `<extension>.<local id>`. */
export const BinaryOrbits: SeedBackdrop = {
  id: "binary-orbits.binary-orbits",
  label: "Binary Orbits",
  credit: "Binary Orbits by popemkt",
  strength: "soft",
  knobs: KNOBS,
};

export const declaration = defineExtension({
  name: "binary-orbits",
  label: "Binary Orbits",
  declaredOptions: [{ kind: BACKDROP_OPTIONS, options: [BinaryOrbits] }],
});
