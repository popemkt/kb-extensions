/**
 * Rating: a field type, stars, which stores as a number, and a `rating`
 * field of it. The server half holds every write to a field of stars to a
 * whole number from 1 to 5 with a commit guard, so `kb set`, an agent and
 * the page refuse the same values.
 */
import { Effect, declarationPlugin, definePlugin, extensionNamespace, guardAction } from "kb-ext-sdk";
import { declaration, ratingRefusal } from "./rating/rating.ts";

export { declaration };

export default definePlugin({
  name: declaration.name,
  namespace: extensionNamespace(declaration.name),
  apply: (ctx) =>
    Effect.all(
      [
        ctx.plugin(declarationPlugin(declaration)),
        guardAction(
          ctx,
          "every write",
          {
            commit: (call) => {
              const refusal = ratingRefusal(call);
              return Effect.succeed(
                refusal === null
                  ? { decision: "allow" as const }
                  : { decision: "deny" as const, rule: "rating.stars", message: refusal },
              );
            },
          },
          "stars",
        ),
      ],
      { discard: true },
    ),
});
