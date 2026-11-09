import {
  FIELD_TYPE_OPTIONS,
  defineExtension,
  type CommitCall,
  type KbNode,
  type NodeId,
  type PropValue,
} from "kb-ext-sdk";

/** The field type it adds, as its declaration names it: `rating.<local id>`. */
export const STARS = "rating.stars";

/** The type's option node, a child of kb's field types, which a field's type names. */
export const STARS_TYPE = FIELD_TYPE_OPTIONS.prefix + STARS;

/** The field it seeds, of that type: a row's rating. */
export const RATING = "rating.f.rating";

/** How many stars a rating has at most. */
export const MOST = 5;

/** Why a value is no rating, or null: a rating is a whole number of stars, 1 to 5. */
export function ratingError(value: PropValue): string | null {
  const whole = value.t === "num" && Number.isInteger(value.v) && value.v >= 1 && value.v <= MOST;
  return whole ? null : `a rating is a whole number of stars, 1 to ${MOST}`;
}

/** The type a field names, as the commit will hold it: its own write first, else the graph's. */
function typeOf(call: CommitCall, fieldId: NodeId): NodeId | undefined {
  const written = call.writes.find(({ after }) => after?.id === fieldId)?.after;
  const field = written ?? call.nodeOf(fieldId);
  const [type] = field?.props[FIELD_TYPE_OPTIONS.field] ?? [];
  return type?.t === "ref" ? type.v : undefined;
}

/**
 * Why a commit writes a value no field of stars may hold, or null. Only the
 * values it adds are asked, so a node that held a bad one before it was
 * installed can still be edited.
 */
export function ratingRefusal(call: CommitCall): string | null {
  for (const { before, after } of call.writes) {
    for (const [fieldId, values] of Object.entries(after?.props ?? {})) {
      if (typeOf(call, fieldId) !== STARS_TYPE) continue;
      const held = new Set((before?.props[fieldId] ?? []).map((v) => JSON.stringify(v)));
      for (const value of values) {
        if (held.has(JSON.stringify(value))) continue;
        const error = ratingError(value);
        if (error !== null) return `${fieldId}: ${error}`;
      }
    }
  }
  return null;
}

/**
 * The declaration: the stars type, which stores as a number, so kb's store,
 * `kb set` and queries read a rating as one; and a `rating` field of it, one
 * value per node. Any field of yours can be of the type too: pick "stars" as
 * its type.
 */
export const declaration = defineExtension({
  name: "rating",
  label: "Rating",
  seed: (at): readonly KbNode[] => [
    {
      id: RATING,
      text: "rating",
      props: {
        "sys.f.type": [{ t: "ref", v: "sys.field" }],
        "sys.f.fieldType": [{ t: "ref", v: STARS_TYPE }],
        "sys.f.cardinality": [{ t: "ref", v: "sys.cardinality.one" }],
      },
      children: [],
      createdAt: at,
      updatedAt: at,
    },
  ],
  declaredOptions: [
    {
      kind: FIELD_TYPE_OPTIONS,
      options: [{ id: STARS, label: "stars", chooses: [{ kind: FIELD_TYPE_OPTIONS, id: "number" }] }],
    },
  ],
});
