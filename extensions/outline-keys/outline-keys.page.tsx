import { Effect, declarationPlugin, definePlugin } from "kb-ext-sdk";
import { KeybindingPoint, provideKeybinding } from "kb-ext-sdk/page";
import { STARRED, declaration } from "./outline-keys/keys.ts";

/**
 * Alt-↑ and Alt-↓ move the row, as in most code editors, in both of the
 * outline's contexts. Each takes a chord the outline already holds (moving
 * the caret or the selection), so it names that binding in `replaces`:
 * it takes Alt with the arrow and nothing else, and the bare arrow still
 * moves as before. Without `replaces`, kb refuses the binding and says why.
 */
const MOVES = [
  ["outline.editing", "line-up", "line-down"],
  ["outline.selection", "up", "down"],
] as const;

const moveKeys = MOVES.flatMap(([context, up, down]) => [
  provideKeybinding(`${context}.move-up`, {
    context,
    chord: "Alt-ArrowUp",
    run: { intent: "move-up" },
    replaces: `${context}.${up}`,
  }),
  provideKeybinding(`${context}.move-down`, {
    context,
    chord: "Alt-ArrowDown",
    run: { intent: "move-down" },
    replaces: `${context}.${down}`,
  }),
]);

/**
 * ⌘⇧S (Ctrl+Shift+S) stars the row: it runs kb's own `node.update` through
 * the page's invoke path, which adds the row's node as `id`, so the key is
 * held to every guard a call meets. The chord is free in both contexts.
 */
const starKeys = (["outline.editing", "outline.selection"] as const).map((context) =>
  provideKeybinding(`${context}.star`, {
    context,
    chord: "Mod-Shift-s",
    run: {
      action: "node.update",
      input: { setProps: [{ field: "sys.f.type", value: { t: "ref", v: STARRED } }] },
    },
  }),
);

/** The page half: its keys, contributed as data. */
export default definePlugin({
  name: declaration.name,
  apply: (ctx) =>
    Effect.all(
      [
        ctx.plugin(declarationPlugin(declaration)),
        ...[...moveKeys, ...starKeys].map((binding) => ctx.contribute(KeybindingPoint, binding)),
      ],
      { discard: true },
    ),
});
