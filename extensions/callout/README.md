# callout

A node tagged `#callout` is drawn in kb's outline as a callout: its text
set apart in a tinted box, with a mark. It is the sample for kb's `row`
placement (DESIGN-UI.md → Row views).

**How it draws.** The extension declares one view, `callout.box`, and
claims it as the `#callout` tag's row view (`tagRowViews`). kb writes that
claim as the tag's `view.row` field, which you can change or clear on the
tag like any field. Its page half provides the view at placement `row`.
While no one edits a `#callout` row, the outline draws the view in place of
the row's text and hands it the row (`host.row`). The view places the row's
own text, as the outline drew it, inside the box. Press the text and you
edit the row as usual, with its caret, its undo and its keys. The callout
comes back when you leave the row.

**How it looks.** The box takes the page's own warning colour, which every
theme and design system sets for light and for dark, as a tint, a hairline
and a left rule. The mark stays on the first line, and the text wraps beside
it at any width.

**What it reaches.** No network, storage or secrets, and it writes nothing.
It seeds the `#callout` tag, and its view reads only the row it is handed.
It arrives in a page half, and a trusted page half runs with the page's
power, so its manifest declares the `full` page tier. Its code does nothing
but draw that box.

**Author** popemkt. **License** MIT.
