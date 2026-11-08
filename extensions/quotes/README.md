# Quotes: declared point owner

By popemkt, MIT licensed. No network, storage, secrets or kb graph access;
no page half.

Requires kb's extensibility parity Step 5. This extension owns
`ext.quotes.sources`, validates each source with Standard Schema, and offers
`ext.quotes.list`. It imports no contributor.

Install and trust `quotes` and `quote-source` through kb's ordinary extension
flow. Calling `ext.quotes.list` then returns the contributed source:

```json
[{"text":"A point connects independent plugins.","author":"kb sample"}]
```

With `quotes` alone the result is `[]`. With `quote-source` alone,
`kb ext list` reports `waiting for point ext.quotes.sources`, with no load
error. Removing the owner returns its contributor to pending; loading the
owner again reapplies the contributor.
