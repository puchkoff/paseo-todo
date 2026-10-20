import { defineRpc, defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const itemSchema = z.object({
  id: z.string(),
  todo: z.string(),
  prompt: z.string().default(""),
  launchedAt: z.number().optional(),
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
export const removeItem = (d: TodoDoc, id: string): TodoDoc => ({ items: d.items.filter((i) => i.id !== id) });

// Auto-prompt needs a todo; Run needs a prompt, falling back to the todo text.
export const launchPrompt = (i: Pick<Item, "todo" | "prompt">): string => (i.prompt.trim() || i.todo.trim());
