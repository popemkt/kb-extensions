import { Effect, declarationPlugin, definePlugin } from "kb-ext-sdk";
import { BACKDROP_BUDGETS, BackdropPoint, provideBackdrop } from "kb-ext-sdk/page";
import { BinaryOrbits, declaration } from "./binary-orbits/key.ts";
import { BinaryOrbitsScene } from "./binary-orbits/scene.tsx";

/**
 * The page half: the scene, contributed under the key its declaration
 * names. It frames as kb's own GPU backdrops do (a head-tall frame under
 * the content, no direction) and is held to the GPU scene's budget.
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
            presentation: {
              space: 120,
              height: 360,
              span: { reach: "content", maxWidth: 1040 },
              offset: -10,
              directions: [],
              opacity: { subtle: 0.55, soft: 0.8, vivid: 1 },
            },
            budget: BACKDROP_BUDGETS.gpu,
            interactions: [
              { cue: "pointer", does: "the orbit plane leans toward the cursor" },
              { cue: "editing", does: "the orbit quickens a little while you type" },
              { cue: "writes", does: "the orbit speeds up for a moment" },
              { cue: "arrivals", does: "the orbit speeds up for a moment" },
              { cue: "turns", does: "the orbit speeds up for a moment" },
              { cue: "navigation", does: "the orbit speeds up for a moment" },
            ],
            Component: BinaryOrbitsScene,
          }),
        ),
      ],
      { discard: true },
    ),
});
