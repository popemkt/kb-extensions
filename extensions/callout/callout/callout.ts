import { NoParams, defineExtension, viewDef, viewKey, type KbNode } from "kb-ext-sdk";

/** The tag a callout is: `callout.<local id>`, in its own namespace. */
export const CALLOUT = "callout.callout";

/** The view a `#callout` row is drawn as: a row, never a page of its own. */
export const CalloutView = viewKey("callout.box", "Callout", NoParams);

/**
 * The declaration: the `#callout` tag it seeds, typed as a tag
 * (`sys.f.type` → `sys.tag`), the view it draws, and the claim that the
 * tag's nodes are drawn as that view in an outline (`tagRowViews`, which
 * becomes the tag's `view.row`: a person may change it there).
 */
export const declaration = defineExtension({
  name: "callout",
  label: "Callout",
  seed: (at): readonly KbNode[] => [
    {
      id: CALLOUT,
      text: "callout",
      props: { "sys.f.type": [{ t: "ref", v: "sys.tag" }] },
      children: [],
      createdAt: at,
      updatedAt: at,
    },
  ],
  views: [viewDef(CalloutView, { body: () => ["A callout: the row's text, set apart."] })],
  tagRowViews: { [CALLOUT]: CalloutView },
});
