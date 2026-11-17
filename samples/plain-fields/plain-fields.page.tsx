import type { PropValue } from "kb-ext-sdk";
import { definePlugin } from "kb-ext-sdk";
import { provideFieldEditor, type FieldRowProps } from "kb-ext-sdk/page";
import { declaration } from "./plain-fields";

const inputStyle = {
  background: "transparent",
  color: "inherit",
  font: "inherit",
  minWidth: 0,
  border: "1px solid color-mix(in srgb, currentColor 18%, transparent)",
  borderRadius: "var(--radius)",
  padding: "2px 6px",
};

function Value({ row, value }: { row: FieldRowProps; value: PropValue | undefined }) {
  if (row.fieldType === "checkbox")
    return (
      <input
        type="checkbox"
        disabled={row.readOnly}
        checked={value?.v === true}
        onChange={(event) => void row.update({ t: "bool", v: event.currentTarget.checked }, value)}
      />
    );
  return (
    <input
      style={inputStyle}
      disabled={row.readOnly}
      aria-label={row.label}
      type={row.fieldType === "number" ? "number" : "text"}
      defaultValue={value === undefined ? "" : String(value.v)}
      onInput={(event) => event.currentTarget.setCustomValidity("")}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      onBlur={(event) => {
        if (value === undefined && event.currentTarget.value === "") return;
        const parsed = row.parse(event.currentTarget.value);
        event.currentTarget.setCustomValidity(parsed.ok ? "" : parsed.reason);
        if (!parsed.ok) {
          event.currentTarget.reportValidity();
          return;
        }
        if (value?.t !== parsed.value.t || value?.v !== parsed.value.v)
          void row.update(parsed.value, value);
      }}
    />
  );
}

function PlainField(row: FieldRowProps) {
  return (
    <div
      data-plain-fields-row
      style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0" }}
    >
      {!row.valueOnly && (
        <span style={{ color: "var(--muted-foreground)", minWidth: "7rem" }}>{row.label}</span>
      )}
      {row.fieldType === "secret" ? (
        <span>••••</span>
      ) : (
        (row.values.length === 0 ? [undefined] : row.values).map((value, index) => (
          <span
            key={`${index}:${value?.t}:${value?.v}`}
            style={{ display: "inline-flex", gap: "0.25rem" }}
          >
            <Value row={row} value={value} />
            {value !== undefined && !row.readOnly && (
              <button
                type="button"
                aria-label={`Remove ${row.label} value`}
                onClick={() => void row.remove(value)}
              >
                ×
              </button>
            )}
          </span>
        ))
      )}
    </div>
  );
}

export default definePlugin({
  name: declaration.name,
  apply: (ctx) => provideFieldEditor(ctx, PlainField),
});
