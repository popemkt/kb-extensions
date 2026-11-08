import { defineExtension, type KbNode } from "kb-ext-sdk";

/** The tag a key puts on the row it is pressed on: `outline-keys.<local id>`, in its own namespace. */
export const STARRED = "outline-keys.starred";

/**
 * The declaration: its name, and the one node it seeds, the tag `#starred`,
 * typed as a tag (`sys.f.type` → `sys.tag`) so the outline draws it as one.
 */
export const declaration = defineExtension({
  name: "outline-keys",
  label: "Outline keys",
  seed: (at): readonly KbNode[] => [
    {
      id: STARRED,
      text: "starred",
      props: { "sys.f.type": [{ t: "ref", v: "sys.tag" }] },
      children: [],
      createdAt: at,
      updatedAt: at,
    },
  ],
});
