# popemkt's kb extensions

A [kb](https://github.com/popemkt/kb) extension marketplace named `popemkt`.

| Extension | What it adds |
| --- | --- |
| [`binary-orbits`](extensions/binary-orbits) | A page-head backdrop: two bodies in a binary orbit, trailing streams of stars through a tilted disc |

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

1. The index lists each directory once. Each pinned entry's bytes match the commit it names.
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
