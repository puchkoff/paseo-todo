import { defineRpc, defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const itemSchema = z.object({
  id: z.string(),
  title: z.string().default(""),
  todo: z.string(),
  prompt: z.string().default(""),
  launchedAt: z.number().optional(),
  runs: z.array(z.object({ agentId: z.string(), at: z.number(), workspaceId: z.string().optional() })).default([]),
  doneAt: z.number().optional(),
});
export type Item = z.infer<typeof itemSchema>;

export const todoSettings = defineSettings({
  id: "todo",
  scope: "host",
  version: 1,
  schema: z.object({ items: z.array(itemSchema).default([]) }),
});
export type TodoDoc = { items: Item[] };

export const autoPrompt = defineRpc({
  name: "todo.auto-prompt",
  input: z.object({ todo: z.string() }),
  output: z.object({ prompt: z.string() }),
});

export const addItem = (d: TodoDoc, item: Item): TodoDoc => ({ items: [item, ...d.items] });
export const updateItem = (d: TodoDoc, id: string, patch: Partial<Omit<Item, "id">>): TodoDoc => ({
  items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
});
// Appends to the stored runs, so concurrent launches of one task both survive.
export const addRun = (d: TodoDoc, id: string, agentId: string, at: number, workspaceId?: string): TodoDoc => ({
  items: d.items.map((i) => (i.id === id ? { ...i, launchedAt: at, runs: [...i.runs, { agentId, at, workspaceId }] } : i)),
});
// Done flag for many items at once; items already in the target state keep their original doneAt.
export const setDone = (d: TodoDoc, ids: ReadonlySet<string>, doneAt: number | undefined): TodoDoc => ({
  items: d.items.map((i) => (ids.has(i.id) && !i.doneAt !== !doneAt ? { ...i, doneAt } : i)),
});
export const removeItem =(d: TodoDoc, id: string): TodoDoc => ({ items: d.items.filter((i) => i.id !== id) });

// Auto-prompt needs a todo; Run needs a prompt, falling back to the todo text.
export const launchPrompt = (i: Pick<Item, "todo" | "prompt">): string => (i.prompt.trim() || i.todo.trim());

// Items saved before titles existed have an empty one; show the first line of the todo.
export const itemTitle = (i: Pick<Item, "title" | "todo">): string =>
  i.title.trim() || i.todo.trim().split("\n")[0].slice(0, 80) || "Untitled";

// Ids start with Date.now() in base 36 (see newId in client/todo.tsx), so no separate created field is stored.
export const createdAt = (i: Pick<Item, "id">): number => parseInt(i.id.slice(0, 8), 36);

export type StatusFilter = "all" | "open" | "done";
export type RangeFilter = "any" | "today" | "week" | "month";
const DAY = 86_400_000;

export function filterItems(items: Item[], status: StatusFilter, range: RangeFilter, now: number): Item[] {
  const since = { any: 0, today: new Date(now).setHours(0, 0, 0, 0), week: now - 7 * DAY, month: now - 30 * DAY }[range];
  return items.filter((i) => (status === "all" || (status === "done") === !!i.doneAt) && createdAt(i) >= since);
}

// Kanban column, derived: done beats started (has a run), everything else is todo.
export type Column = "todo" | "progress" | "done";
export const columnOf = (i: Pick<Item, "doneAt" | "runs" | "launchedAt">): Column =>
  i.doneAt ? "done" : i.runs.length || i.launchedAt ? "progress" : "todo";

// How many of the task's agents are in the running set.
export const runningCount = (i: Pick<Item, "runs">, running: ReadonlySet<string>): number =>
  i.runs.filter((r) => running.has(r.agentId)).length;
