import { Effect, declarationPlugin, definePlugin } from "kb-ext-sdk";
import {
  CommandPoint,
  PICKED,
  PaletteStepPoint,
  provideCommand,
  providePaletteStep,
} from "kb-ext-sdk/page";
import { ALL_TOPICS, NOT_TOPICS, TOPICS, declaration } from "./link-to/link-to.ts";

/**
 * "Link to a topic…", in the node menu's `make` group after kb's own rows.
 * It is offered on a row that is no topic, and opens the picker below.
 */
const command = provideCommand("link", {
  label: "Link to a topic…",
  icon: "link",
  group: "make",
  order: 70,
  when: NOT_TOPICS,
  run: { step: "link-to.topic" },
});

/**
 * The picker: the topics, by their text. The topic picked is added to the
 * row's `topics` by kb's own `node.update`, through the page's invoke path,
 * so the same guards hold as for any write.
 */
const step = providePaletteStep("topic", {
  label: "Link to a topic",
  placeholder: "Search topics…",
  icon: "link",
  candidates: ALL_TOPICS,
  commit: {
    action: "node.update",
    input: { setProps: [{ field: TOPICS, value: { t: "ref", v: PICKED } }] },
  },
});

export default definePlugin({
  name: declaration.name,
  uses: [PaletteStepPoint.name],
  apply: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.plugin(declarationPlugin(declaration));
      yield* ctx.contribute(CommandPoint, command);
      yield* ctx.contribute(yield* ctx.point(PaletteStepPoint), step);
    }),
});
