import assert from "node:assert/strict";
import { test } from "node:test";
import { MODEL, claudeArgs } from "./autoprompt.ts";

test("claude call is sonnet, toolless and not persisted", () => {
  const a = claudeArgs();
  assert.equal(a[a.indexOf("--model") + 1], MODEL);
  assert.ok(MODEL.includes("sonnet"));
  assert.ok(a.includes("--no-session-persistence"));
  assert.equal(a[a.indexOf("--tools") + 1], "");
});
