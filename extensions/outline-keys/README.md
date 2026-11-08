# outline-keys

Keys for kb's outline, written as data. It is the sample for kb's
`ui.keybindings` point (DESIGN-UI.md → Keybindings).

| Key | Where | Does |
| --- | --- | --- |
| Alt-↑ / Alt-↓ | editing a row, or with a row selected | moves the row up or down among its siblings |
| ⌘⇧S (Ctrl+Shift+S) | editing a row, or with a row selected | tags the row `#starred` |

**How it binds.** Each key is a `provideKeybinding` contribution: a context
(`outline.editing` or `outline.selection`), a chord written as text, and
what it runs.

- Alt-↑ and Alt-↓ run the outline's own `move-up` and `move-down` intents.
  The outline already holds those chords: a bare arrow, with or without
  Alt, moves the caret or the selection. So each binding names the
  outline's binding in `replaces`. It takes only Alt with the arrow; the
  bare arrow still moves as before. Remove a `replaces` and kb refuses that
  binding, and tells you which binding holds the chord.
- ⌘⇧S runs kb's own `node.update` action through the page's invoke path,
  with the row's node as `id`, so the same guards hold as for any call. The
  tag it adds, `#starred`, is the one node this extension seeds.

**What it reaches.** No network, storage or secrets. It writes one thing,
the `#starred` tag on a row you press ⌘⇧S on. Its bindings are data, but
they arrive in a page half, and a trusted page half runs with the page's
power, so its manifest declares the `full` page tier; its code does
nothing but contribute the six bindings above.

**Author** popemkt. **License** MIT.
