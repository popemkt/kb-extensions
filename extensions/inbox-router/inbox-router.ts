import type { TxChange, ReactionHost } from "kb-ext-sdk";
import { Effect, defineExtension, definePlugin, extensionNamespace, onCommit } from "kb-ext-sdk";

export const INBOX_TAG = "ext.inbox-router.inbox-tag";
export const INBOX_NODE = "ext.inbox-router.inbox";

export const declaration = defineExtension({
  name: "inbox-router",
  label: "Inbox router",
  seed: (at) => [
    {
      id: INBOX_TAG,
      text: "inbox",
      props: { "sys.f.type": [{ t: "ref", v: "sys.tag" }] },
      children: [],
      createdAt: at,
      updatedAt: at,
    },
    {
      id: INBOX_NODE,
      text: "Inbox",
      props: {},
      children: [],
      createdAt: at,
      updatedAt: at,
    },
  ],
});

export default definePlugin({
  name: declaration.name,
  namespace: extensionNamespace(declaration.name),
  apply: (ctx) =>
    onCommit(
      ctx,
      { tagged: [INBOX_TAG] },
      Effect.fn("inbox-router.route")(function* (change: TxChange, kb: ReactionHost) {
        for (const { after } of change.writes) {
          if (after === undefined || after.id === INBOX_NODE) continue;
          const receipt = yield* kb.invoke("node.update", { id: after.id, parent: INBOX_NODE });
          if (receipt.status === "failed") return yield* Effect.die(new Error(receipt.message));
        }
      }),
      "route",
    ),
});
