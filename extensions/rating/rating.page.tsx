import { Effect, declarationPlugin, definePlugin } from "kb-ext-sdk";
import {
  ValueKindPoint,
  provideValueKind,
  type ValueKindSpec,
  type ValueSurfaceProps,
} from "kb-ext-sdk/page";
import { MOST, STARS, declaration, ratingError } from "./rating/rating.ts";

/**
 * A rating's row of data: its stars are always shown (`swatch`), and a press
 * on one commits it. It reads a number, and refuses what the guard refuses.
 */
const spec: ValueKindSpec = {
  editor: "swatch",
  text: (value) => (value.t === "num" ? String(value.v) : ""),
  parse: (text) => {
    const value = { t: "num" as const, v: Number(text) };
    const error = ratingError(value);
    return error === null ? { ok: true, value } : { ok: false, reason: error };
  },
  isBlank: (value) => value.t !== "num" || value.v === 0,
  layout: "stack",
  follow: () => null,
};

const STAR_STYLE = { padding: "0 1px", lineHeight: 1, fontSize: "15px", cursor: "pointer" };

/** Five stars, as many lit as the rating holds; a press on one sets it. */
function Stars({ value, spec, onEnd }: ValueSurfaceProps) {
  const held = value.t === "num" ? value.v : 0;
  return (
    <span role="group" aria-label="Rating" data-rating={held} style={{ display: "inline-flex" }}>
      {Array.from({ length: MOST }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`Rate ${n}`}
          aria-pressed={n <= held}
          title={`${n} of ${MOST}`}
          className={n <= held ? "text-primary" : "text-faint-foreground hover:text-foreground"}
          style={STAR_STYLE}
          onClick={() => onEnd(spec.parse(String(n)), String(n))}
        >
          {n <= held ? "★" : "☆"}
        </button>
      ))}
    </span>
  );
}

/** The stars type's value kind: a field of it is drawn as five stars, its glyph a star. */
export default definePlugin({
  name: declaration.name,
  apply: (ctx) =>
    Effect.all(
      [
        ctx.plugin(declarationPlugin(declaration)),
        ctx.contribute(ValueKindPoint, provideValueKind(STARS, { icon: "star", spec, Surface: Stars })),
      ],
      { discard: true },
    ),
});
