# popemkt's kb extensions

A [kb](https://github.com/popemkt/kb) extension marketplace named `popemkt`.

| Extension | What it adds |
| --- | --- |
| [`binary-orbits`](extensions/binary-orbits) | A page-head backdrop: two bodies in a binary orbit, trailing streams of stars through a tilted disc |
| [`plain-fields`](extensions/plain-fields) | A field-row provider that replaces ui.field-editor through an approved manifest claim |
| [`quotes`](extensions/quotes) | Declares a point and lists the quote sources contributed to it |
| [`quote-source`](extensions/quote-source) | Contributes to the independent quotes point; waits while its owner is absent |
| [`link-to`](extensions/link-to) | "Link to a topic…" in the node menu: a command and a picker step written as data |
| [`rating`](extensions/rating) | A field type, stars: drawn as five stars, stored as a number, its form held by a commit guard |
| [`outline-keys`](extensions/outline-keys) | Keys for the outline: Alt-↑/↓ move a row, and ⌘⇧S stars it |
| [`callout`](extensions/callout) | Rows tagged #callout drawn as a callout: a tinted box with a mark, around the row's own text |
| [`inbox-router`](extensions/inbox-router) | Routes newly inbox-tagged nodes into an Inbox after their committing call |
| [`checklist`](extensions/checklist) | A pasted Markdown checklist becomes rows, each with a `done` checkbox: a paste handler written as a transform |

## Add it

```sh
kb ext marketplace add github:popemkt/kb-extensions
kb ext install binary-orbits
kb ext trust binary-orbits      # at a terminal: review, then answer y
```

Adding the marketplace pins this index to the commit it read. Installing an
extension never trusts it, and an untrusted extension runs no code. Backdrop
Studio lists it under **From plugins** as needing approval. Read its source,
then trust it with `kb ext trust` at a terminal. After that it appears in Backdrop
Studio under **From plugins**, and **Use as my page backdrop** puts it on a
page's head. `kb ext remove binary-orbits` takes it away. A page that chose it
falls back to the next choice.

Each entry in `kb-marketplace.json` is pinned to the full commit that last
changed its directory, so the marketplace serves exactly the bytes that
commit holds.

## Layout

```
kb-marketplace.json          the index: version 1, name "popemkt", one entry per extension
extensions/<name>/
  <name>.ts                  the server half (its declaration)
  <name>.page.tsx            the page half (its UI contributions), when it has one
  <name>/                    helpers both halves import
  README.md, LICENSE         kept with the install
scripts/check                the checks CI runs
```

## Checks

`scripts/check` runs kb's own gates over every extension:

1. The index lists each directory once. Every entry is pinned to a full commit of this branch, and the bytes checked are exactly that commit's: no later edits, staged or not, and no untracked files in its directory.
2. `kb ext validate` admits all of them together in a scratch store. Each server
   half must import and its declaration must fold. Each page half must bundle.
   No two may clash.
3. Every extension typechecks against the SDK types that the same kb emits
   (`kb ext sdk --write`).

CI ([`.github/workflows/check.yml`](.github/workflows/check.yml)) runs it with
kb at a pinned commit. Locally, you need `bun`, `jq` and a kb checkout:

```sh
bun install
KB=/path/to/kb/bin/kb scripts/check
```

## Adding an extension

1. Add `extensions/<name>/`, laid out as above. Its declaration's `name` is
   `<name>`, and every id it declares is `<name>.<local id>`.
2. In its README, say what it adds, who wrote it, its license, and what it
   reaches: network, storage, kb data, and the page power it has once trusted.
3. Commit it. Then add its entry to `kb-marketplace.json`, pinned to that
   commit's full id, and commit the index.

MIT licensed.
