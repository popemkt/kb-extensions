# Plain fields

A small field-row provider. It replaces `ui.field-editor` through a claim in
its manifest, with priority 50. It imports only the host SDK and its own
server declaration; it imports no outline code.

After installation, review the **Replaces** line and the full-page-power
statement. Until its digest is trusted, kb keeps the outline's field editor.
Once trusted, plain fields draws the rows. Its inputs edit primitive values;
reference inputs use node ids. Text is parsed by kb's own field-value parser. Secret fields stay masked. Every update and
removal goes through kb's normal checked writes.

The provider is chosen on the ordinary `sys.role.ui.field-editor` node, in
its `provider` field. Empty lets the best approved candidate win. Select
`sys.extension.outline` there to use the bundled editor again.

A separate [recovery fixture](../../fixtures/failing/plain-fields) supplies the
throwing provider for the end-to-end checks.

Requires the kb commit named by this repository's `KB_REF` in
[the check workflow](../../.github/workflows/check.yml).
