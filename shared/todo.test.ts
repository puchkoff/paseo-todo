import assert from "node:assert/strict";
import { test } from "node:test";
import { addItem, launchPrompt, removeItem, updateItem } from "./todo.ts";

test("add puts the newest first, update and remove target one id", () => {
  let d = addItem({ items: [] }, { id: "a", todo: "A", prompt: "" });
  d = addItem(d, { id: "b", todo: "B", prompt: "" });
  assert.deepEqual(d.items.map((i) => i.id), ["b", "a"]);
  d = updateItem(d, "a", { prompt: "do A" });
  assert.equal(d.items[1].prompt, "do A");
  assert.equal(d.items[0].prompt, "");
  assert.deepEqual(removeItem(d, "b").items.map((i) => i.id), ["a"]);
});

test("launch prompt falls back to the todo text", () => {
  assert.equal(launchPrompt({ todo: " fix x ", prompt: "  " }), "fix x");
  assert.equal(launchPrompt({ todo: "fix x", prompt: "Fix x in y" }), "Fix x in y");
});
