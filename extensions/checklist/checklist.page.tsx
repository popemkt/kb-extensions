import { Effect, declarationPlugin, definePlugin } from "kb-ext-sdk";
import { provideIngest, type IngestHandler } from "kb-ext-sdk/page";
import { DONE, declaration } from "./checklist/checklist.ts";

/** The outline's paste and drop handlers, a point it declares: reached by name. */
const INGEST = "outline.ingest";

/** One item of a Markdown checklist: its indent, its tick, its text. */
const ITEM = /^([ \t]*)[-*+] \[([ xX])\][ \t]*(.*)$/u;

/**
 * Each item as an outline item with its `done` value under it, nested as
 * the checklist nests: an item indented past the one before it is that
 * one's child, and the depth is counted, so tabs, two spaces and four all
 * read the same.
 */
function asOutline(text: string): string | null {
  const indents: number[] = [];
  const lines: string[] = [];
  for (const line of text.split(/\r?\n/u)) {
    if (line.trim() === "") continue;
    const item = ITEM.exec(line);
    if (item === null) return null;
    const [, indent = "", tick = " ", body = ""] = item;
    while (indents.length > 0 && (indents.at(-1) ?? 0) >= indent.length) indents.pop();
    const depth = "  ".repeat(indents.length);
    indents.push(indent.length);
    lines.push(`${depth}- ${body}`, `${depth}  - ${DONE}:: ${tick === " " ? "false" : "true"}`);
  }
  return lines.length === 0 ? null : lines.join("\n");
}

/**
 * A pasted Markdown checklist (`- [ ] milk`, `- [x] bread`), claimed before
 * the outline's own list paste: kb adds its rows after the row it was
 * pasted into, each with its tick in `done`.
 */
const paste = provideIngest("paste", {
  match: {
    gestures: ["paste"],
    types: ["text/plain"],
    // At least one item, and nothing but items and blank lines.
    pattern: "^(?=[\\s\\S]*[-*+] \\[[ xX]\\])(?:[ \\t]*(?:[-*+] \\[[ xX]\\][^\\r\\n]*)?(?:\\r?\\n|$))+$",
  },
  priority: 10,
  transform: asOutline,
});

export default definePlugin({
  name: declaration.name,
  uses: [INGEST],
  apply: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.plugin(declarationPlugin(declaration));
      yield* ctx.contribute(yield* ctx.point<IngestHandler>(INGEST), paste);
    }),
});
