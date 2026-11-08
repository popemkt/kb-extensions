# Quote source: independent contributor

By popemkt, MIT licensed. No network, storage, secrets or kb graph access;
no page half.

Requires kb's extensibility parity Step 5. This extension restates the source
type, lists `ext.quotes.sources` in `uses`, and resolves it by name. It imports
only `kb-ext-sdk`, never the `quotes` extension. The owner's contract checks
the value before it reaches readers.

See [the owner sample](../quotes/README.md) for the paired example. Installed
alone, this extension waits for its point without running its apply function.
