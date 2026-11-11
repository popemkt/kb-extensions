/**
 * Checklist: a Markdown checklist pasted into a row becomes rows, each with
 * a `done` checkbox. The server half is the declaration alone (the `done`
 * field); the paste handler is the page half's, a transform from text to
 * outline paste text.
 */
export { declaration } from "./checklist/checklist.ts";
