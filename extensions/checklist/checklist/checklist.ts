import { defineExtension, type KbNode } from "kb-ext-sdk";

/** The checkbox field a pasted item's tick is kept in. */
export const DONE = "checklist.f.done";

/**
 * The declaration: the `done` field, a checkbox. It is an ordinary field,
 * so a row's tick is changed as any checkbox is, and a query reads it as
 * any field.
 */
export const declaration = defineExtension({
  name: "checklist",
  label: "Checklist",
  seed: (at): readonly KbNode[] => [
    {
      id: DONE,
      text: "done",
      props: {
        "sys.f.type": [{ t: "ref", v: "sys.field" }],
        "sys.f.fieldType": [{ t: "ref", v: "sys.ft.checkbox" }],
      },
      children: [],
      createdAt: at,
      updatedAt: at,
    },
  ],
});
