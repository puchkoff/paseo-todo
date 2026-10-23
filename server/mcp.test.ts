import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { itemSchema, createdAt } from "../shared/todo.ts";
import { MCP_SOURCE } from "./mcp-source.ts";

const call = (name: string, args: object, id: number) => ({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } });
function session(file: string, msgs: object[]) {
  const dir = mkdtempSync(join(tmpdir(), "paseo-todo-"));
  const script = join(dir, "mcp.mjs");
  writeFileSync(script, MCP_SOURCE);
  const out = spawnSync(process.execPath, [script], { input: msgs.map((m) => JSON.stringify(m)).join("\n"), env: { ...process.env, PASEO_TODO_FILE: file }, encoding: "utf8" });
  return out.stdout.trim().split("\n").map((l) => JSON.parse(l).result);
}

test("add_todo creates the file with a valid item; list_todos reads it back", () => {
  const file = join(mkdtempSync(join(tmpdir(), "paseo-todo-")), "sub", "todo.json");
  const r = session(file, [
    { jsonrpc: "2.0", id: 1, method: "tools/list" },
    call("add_todo", { todo: "  fix the flaky test  ", prompt: "Investigate it" }, 2),
    call("add_todo", {}, 3),
    call("list_todos", {}, 4),
  ]);
  assert.deepEqual(r[0].tools.map((t: { name: string }) => t.name), ["add_todo", "list_todos"]);
  assert.equal(r[2].isError, true);
  const doc = JSON.parse(readFileSync(file, "utf8"));
  assert.equal(doc.version, 1);
  const item = itemSchema.parse(doc.values.items[0]);
  assert.deepEqual([item.todo, item.prompt], ["fix the flaky test", "Investigate it"]);
  assert.ok(Math.abs(createdAt(item) - Date.now()) < 60_000);
  assert.equal(JSON.parse(r[3].content[0].text)[0].id, item.id);
});

test("existing items are kept, newest first, done ones hidden by default; a corrupt file is not overwritten", () => {
  const dir = mkdtempSync(join(tmpdir(), "paseo-todo-"));
  const file = join(dir, "todo.json");
  const old = { id: "old", title: "", todo: "old", prompt: "", runs: [] };
  writeFileSync(file, JSON.stringify({ version: 1, values: { items: [old, { ...old, id: "fin", todo: "fin", doneAt: 1 }] } }));
  const r = session(file, [call("add_todo", { todo: "new" }, 1), call("list_todos", {}, 2), call("list_todos", { status: "all" }, 3)]);
  assert.deepEqual(JSON.parse(r[1].content[0].text).map((x: { todo: string }) => x.todo), ["new", "old"]);
  assert.equal(JSON.parse(r[2].content[0].text).length, 3);
  assert.equal(JSON.parse(readFileSync(file, "utf8")).values.items.length, 3);

  writeFileSync(file, "{torn");
  const bad = session(file, [call("add_todo", { todo: "x" }, 1)]);
  assert.equal(bad[0].isError, true);
  assert.equal(readFileSync(file, "utf8"), "{torn");
});
