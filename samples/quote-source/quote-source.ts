import { Effect, defineExtension, definePlugin, extensionNamespace } from "kb-ext-sdk";

export const declaration = defineExtension({ name: "quote-source", label: "Quote source" });
interface Source { readonly text: string; readonly author: string; }

/** Names a foreign point; no import from the declaring extension. */
export default definePlugin({
  name: declaration.name,
  namespace: extensionNamespace(declaration.name),
  uses: ["ext.quotes.sources"],
  apply: (ctx) => Effect.gen(function* () {
    const sources = yield* ctx.point<Source>("ext.quotes.sources");
    yield* ctx.contribute(sources, {
      id: "example",
      value: { text: "A point connects independent plugins.", author: "kb sample" },
    });
  }),
});
