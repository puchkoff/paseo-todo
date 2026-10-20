import assert from "node:assert/strict";
import { test } from "node:test";
import { addItem, createdAt, filterItems, itemTitle, launchPrompt, removeItem, updateItem } from "./todo.ts";

test("add puts the newest first, update and remove target one id", () => {
  let d = addItem({ items: [] }, { id: "a", title: "A", todo: "A", prompt: "" });
  d = addItem(d, { id: "b", title: "B", todo: "B", prompt: "" });
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

test("title falls back to the first todo line", () => {
  assert.equal(itemTitle({ title: " T ", todo: "x" }), "T");
  assert.equal(itemTitle({ title: "", todo: "first\nsecond" }), "first");
  assert.equal(itemTitle({ title: "", todo: "" }), "Untitled");
});

test("created time comes from the id and filters combine with status", () => {
  const now = new Date("2026-10-20T12:00:00").getTime();
  const id = (t: number) => `${t.toString(36)}abcd`;
  const mk = (t: number, doneAt?: number) => ({ id: id(t), title: "", todo: "x", prompt: "", doneAt });
  const today = mk(now - 3_600_000), old = mk(now - 40 * 86_400_000, 1), week = mk(now - 3 * 86_400_000);
  assert.equal(createdAt(today), now - 3_600_000);
  const all = [today, week, old];
  assert.deepEqual(filterItems(all, "all", "any", now), all);
  assert.deepEqual(filterItems(all, "all", "today", now), [today]);
  assert.deepEqual(filterItems(all, "all", "week", now), [today, week]);
  assert.deepEqual(filterItems(all, "done", "any", now), [old]);
  assert.deepEqual(filterItems(all, "open", "month", now), [today, week]);
});
