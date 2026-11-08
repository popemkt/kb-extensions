import type { CSSProperties } from "react";
import { Effect, declarationPlugin, definePlugin } from "kb-ext-sdk";
import { ViewPoint, provideView, type ViewProps } from "kb-ext-sdk/page";
import { CalloutView, declaration } from "./callout/callout.ts";

/**
 * The callout's box, tinted from the page's own warning colour, which each
 * theme and design system sets for light and dark: mixed into the page's
 * background in oklab (so its hue stays the warning's) and given back some
 * of its chroma, a cream in light and an ember in dark. Its padding is
 * small and even, so the row's text sits close to where a plain row's
 * would, beside the outline's bullet. Its mark keeps to the first line and
 * its text wraps beside it, so a long callout on a narrow screen keeps the
 * mark and the text apart.
 */
const tint = (share: number, chroma: number) =>
  `oklch(from color-mix(in oklab, var(--warning) ${share}%, var(--background)) l calc(c * ${chroma}) h)`;

const box: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "0.5rem",
  margin: "1px 0",
  padding: "3px 0.625rem 3px 0.5rem",
  borderRadius: "var(--radius-md, 6px)",
  borderLeft: "3px solid var(--warning)",
  background: tint(14, 2.5),
  boxShadow: `inset 0 0 0 1px ${tint(30, 2)}`,
};

const mark: CSSProperties = {
  flex: "none",
  display: "flex",
  alignItems: "center",
  height: "1.5rem",
  color: "var(--warning)",
};

/** A lightbulb, drawn in the current colour. */
function Mark() {
  return (
    <svg width="15" height="15" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M176 232a8 8 0 0 1-8 8H88a8 8 0 0 1 0-16h80a8 8 0 0 1 8 8Zm40-128a87.55 87.55 0 0 1-33.64 69.21A16.24 16.24 0 0 0 176 186v6a16 16 0 0 1-16 16H96a16 16 0 0 1-16-16v-6a16 16 0 0 0-6.23-12.66A87.59 87.59 0 0 1 40 104.49C39.74 56.83 78.26 17.14 125.88 16A88 88 0 0 1 216 104Z" />
    </svg>
  );
}

/**
 * A `#callout` row: the row's own text (`host.row.text`, as the outline
 * draws it, so pressing it edits the row there), set in the box beside
 * its mark. Drawn only while no one edits the row; while someone does,
 * the row is the outline's text.
 */
function Callout({ host }: ViewProps<unknown>) {
  if (host.row === undefined) return null;
  return (
    <div style={box} data-callout={host.row.id} role="note">
      <span style={mark}>
        <Mark />
      </span>
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>{host.row.text}</div>
    </div>
  );
}

/** The page half: the callout view, drawn at a row. */
export default definePlugin({
  name: declaration.name,
  apply: (ctx) =>
    Effect.all(
      [
        ctx.plugin(declarationPlugin(declaration)),
        ctx.contribute(
          ViewPoint,
          provideView(CalloutView, { placements: ["row"], sample: {}, Component: Callout }),
        ),
      ],
      { discard: true },
    ),
});
