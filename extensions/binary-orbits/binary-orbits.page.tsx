import { Effect, declarationPlugin, definePlugin } from "kb-ext-sdk";
import { BACKDROP_BUDGETS, BackdropPoint, provideBackdrop } from "kb-ext-sdk/page";
import { BinaryOrbits, BinaryOrbitsClassic, declaration } from "./binary-orbits/key.ts";
import { BinaryOrbitsScene } from "./binary-orbits/classic/scene.tsx";
import { GalaxyScene } from "./binary-orbits/galaxy/scene.tsx";

/** Both scenes frame as kb's own GPU backdrops do: a head-tall frame under the content, no direction. */
const presentation = {
  space: 120,
  height: 360,
  span: { reach: "content", maxWidth: 1040 },
  offset: -10,
  directions: [],
  opacity: { subtle: 0.55, soft: 0.8, vivid: 1 },
} as const;

/** What the owner's activity does to either scene: each turns faster for a while. */
const activity = [
  { cue: "editing", does: "it turns a little faster while you type" },
  { cue: "writes", does: "it speeds up for a moment" },
  { cue: "arrivals", does: "it speeds up for a moment" },
  { cue: "turns", does: "it speeds up for a moment" },
  { cue: "navigation", does: "it speeds up for a moment" },
] as const;

/**
 * The page half: each scene, contributed under the key its declaration
 * names, and held to the GPU scene's budget.
 */
export default definePlugin({
  name: declaration.name,
  apply: (ctx) =>
    Effect.all(
      [
        ctx.plugin(declarationPlugin(declaration)),
        ctx.contribute(
          BackdropPoint,
          provideBackdrop(BinaryOrbits, {
            presentation,
            budget: BACKDROP_BUDGETS.gpu,
            interactions: [
              {
                cue: "pointer",
                does: "the stars it passes gather into a warm filament the rotation shears away; over the disc it turns faster and brighter",
              },
              {
                cue: "pointer",
                does: "a press on its empty area bursts the stars near it outward, and they spring back to their orbits",
              },
              ...activity,
            ],
            Component: GalaxyScene,
          }),
        ),
        ctx.contribute(
          BackdropPoint,
          provideBackdrop(BinaryOrbitsClassic, {
            presentation,
            budget: BACKDROP_BUDGETS.gpu,
            interactions: [{ cue: "pointer", does: "the orbit plane leans toward the cursor" }, ...activity],
            Component: BinaryOrbitsScene,
          }),
        ),
      ],
      { discard: true },
    ),
});
