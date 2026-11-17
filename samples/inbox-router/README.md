# Inbox router

Creates an `inbox` tag (`ext.inbox-router.inbox-tag`) and an ordinary Inbox
node (`ext.inbox-router.inbox`) in each store where it is enabled. A node
newly given that tag moves under the Inbox after its committing call
settles. The Inbox itself stays put. Renaming either node preserves the
routing relationship because it uses their ids.

Install and review the code and manifest before trusting its digest. Then:

```sh
kb add "Read this later" --tag ext.inbox-router.inbox-tag
kb get ext.inbox-router.inbox
```

The same rule runs for writes made through `kb ui`, CLI and MCP. It uses
`onCommit` and checked `ReactionHost.invoke` calls, imports only `kb-ext-sdk`,
and has no page half or background timer. Its own move does not feed back
into its callback. A refused move is reported on the extension.

Delivery is at most once in the committing process. Another process's
adopted transactions, hand edits and writes from before installation are
not replayed. Turning the extension off leaves its nodes and their history.

Requires the kb commit named by `KB_REF` in
[the check workflow](../../.github/workflows/check.yml).
