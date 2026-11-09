# link-to

"Link to a topic…" in a row's node menu: pick a `#topic`, and it is added
to the row's `topics` field. It is the sample for a node command and a
picker step written as data (kb's DESIGN-UI.md → The node menu).

**How it works.** Its page half contributes two things, each as data:

- a command, `provideCommand`: a label, an icon by name, its place in the
  node menu (the `make` group, after kb's own rows), when it is offered,
  and what it runs, here the picker step below;
- a picker step, `providePaletteStep`: a label, a placeholder, where its
  candidates come from, and the action a pick calls. kb runs the picker.
  The pick calls kb's own `node.update` with the row as `id`, and the
  topic picked stands where the input says `PICKED`.

"When it is offered" and "the candidates" are each a query node, named
by id: the command is offered on the rows in the first query's answer
(every node that is no topic), and the picker offers the nodes in the
second's (every `#topic`), by their text. The extension seeds both as ordinary
nodes under its own node in kb's Extensions list, out of the outline's
home, so you can open and change them there.

**What it reaches.** No network, storage or secrets. It seeds the `#topic`
tag, the `topics` field and the two query nodes, and writes one thing:
a topic you pick, added to the `topics` of the row you picked it for,
through `node.update`, under the same guards as any write. Its command and
picker are data, but they arrive in a page half, and a trusted page half
runs with the page's power, so its manifest declares the `full` page
tier. Its code does nothing but contribute the two.

**Author** popemkt. **License** MIT.
