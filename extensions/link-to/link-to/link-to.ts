import { defineExtension, type KbNode } from "kb-ext-sdk";

/** The tag a topic is: `link-to.<local id>`, in its own namespace. */
export const TOPIC = "link-to.topic";

/** The ref field a row's topics are in. */
export const TOPICS = "link-to.f.topics";

/** The query node whose answer is every `#topic`: what the picker offers. */
export const ALL_TOPICS = "link-to.q.topics";

/** The query node whose answer is every node that is no topic: the rows the command is offered on. */
export const NOT_TOPICS = "link-to.q.not-topics";

const node = (at: string, id: string, text: string, props: KbNode["props"]): KbNode => ({
  id,
  text,
  props,
  children: [],
  createdAt: at,
  updatedAt: at,
});

const query = (edn: string): KbNode["props"] => ({ "sys.f.query": [{ t: "str", v: edn }] });

/**
 * The declaration: the `#topic` tag, the `topics` ref field, and two query
 * nodes, filed under the extension's own node (`sys.extension.link-to`) so
 * they stay out of the outline's home. They are ordinary nodes: change a
 * query and the command and the picker follow it.
 */
export const declaration = defineExtension({
  name: "link-to",
  label: "Link to",
  seed: (at): readonly KbNode[] => [
    node(at, TOPIC, "topic", { "sys.f.type": [{ t: "ref", v: "sys.tag" }] }),
    node(at, TOPICS, "topics", {
      "sys.f.type": [{ t: "ref", v: "sys.field" }],
      "sys.f.fieldType": [{ t: "ref", v: "sys.ft.ref" }],
    }),
    node(
      at,
      ALL_TOPICS,
      "Topics",
      query(`[:find ?id :where [?t :node/id "${TOPIC}"] [?n :f/sys.f.type ?t] [?n :node/id ?id]]`),
    ),
    node(
      at,
      NOT_TOPICS,
      "Rows that are no topic",
      query(
        `[:find ?id :where [?n :node/id ?id] (not [?n :f/sys.f.type ?t] [?t :node/id "${TOPIC}"])]`,
      ),
    ),
  ],
  files: { "sys.extension.link-to": [ALL_TOPICS, NOT_TOPICS] },
});
