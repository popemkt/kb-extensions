import {
  ActionPoint,
  Effect,
  Schema,
  defineExtension,
  definePlugin,
  extensionNamespace,
  provideAction,
} from "kb-ext-sdk";

export const declaration = defineExtension({ name: "quotes", label: "Quotes" });
const Source = Schema.Struct({ text: Schema.String, author: Schema.String });
type Source = typeof Source.Type;

/** Owns a point and reads it; it imports no contributor's code. */
export default definePlugin({
  name: declaration.name,
  namespace: extensionNamespace(declaration.name),
  apply: (ctx) => Effect.gen(function* () {
    const sources = yield* ctx.declare<Source>("sources", {
      cardinality: "list",
      combine: "all sources in contribution order",
      kernel: "registry",
      tier: "T0",
      contract: Schema.toStandardSchemaV1(Source),
    });
    yield* ctx.contribute(ActionPoint, provideAction({
      id: "list",
      title: "List quote sources",
      description: "Read the sources contributed by independent plugins",
      mode: { kind: "read" },
      inputSchema: Schema.toStandardSchemaV1(Schema.Struct({})),
      outputSchema: Schema.toStandardSchemaV1(Schema.Array(Source)),
      effect: () => Effect.succeed(ctx.contributions(sources).map(({ value }) => value)),
    }));
  }),
});
