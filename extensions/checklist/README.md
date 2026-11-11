# checklist

Paste a Markdown checklist into a row, and it becomes rows, each with a
`done` checkbox ticked as the item was:

```
- [ ] milk
- [x] bread
  - [ ] the good kind
```

It is the sample for a paste handler written as a transform (kb's
DESIGN-UI.md → Paste and drop).

**How it works.** Its page half contributes one handler to the outline's
`outline.ingest`, which it names in `uses` and reaches by name:

- its match is data: a paste of plain text whose every line is a
  checklist item (blank lines aside);
- its priority, 10, puts it before the outline's own list paste, at 0;
- its transform takes the pasted text and returns outline paste text: each
  item a row, its tick a `done:: true` or `false` under it, nested as the
  checklist nests.

kb adds the rows after the row you pasted into, in one transaction, with
`node.addTree`, under the same guards as any write. Pasted into a row that
holds nothing, they take its place. A `#word` in an item's text is read as
a tag, as outline paste reads it, so an item naming a tag that does not
exist is refused, and the paste writes nothing.

**What it reaches.** No network, storage or secrets. It seeds the `done`
field and writes the rows a paste makes. Its handler is data and a
transform, but it arrives in a page half, and a trusted page half runs
with the page's power, so its manifest declares the `full` page tier, and
the transform sees the pasted text there.

**Author** popemkt. **License** MIT.
