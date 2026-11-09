import { definePlugin } from "kb-ext-sdk";
import { provideFieldEditor } from "kb-ext-sdk/page";
import { declaration } from "./plain-fields";

function BrokenField(): never {
  throw new Error("Recovery fixture render failed");
}
export default definePlugin({
  name: declaration.name,
  apply: (ctx) => provideFieldEditor(ctx, BrokenField),
});
