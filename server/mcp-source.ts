// The plugin subprocess has no path to its own files, so the stdio MCP script ships as a string
// and is written to disk at startup (see index.server.ts). No backticks or `${` allowed inside.
export const MCP_SOURCE = String.raw`// Stdio MCP server, spawned per agent session. Zero dependencies: plain JSON-RPC over newline-delimited stdin/stdout.
// Edits the daemon's todo settings file directly; the daemon reads it from disk on every request.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createInterface } from "node:readline";

const file = process.env.PASEO_TODO_FILE;

const addTool = {
  name: "add_todo",
  description:
    "Add a task to the user's Todo list in Paseo, to be done later (by them or a fresh agent). Use it for follow-ups, " +
    "ideas and chores you found but should not do now. The prompt is what the future agent will be started with, so make it self-contained.",
  inputSchema: {
    type: "object",
    properties: {
      todo: { type: "string", description: "The task, one or two sentences." },
      title: { type: "string", description: "Optional short headline. Defaults to the first line of the todo." },
      prompt: { type: "string", description: "Optional full prompt for the agent that will run this task. Defaults to the todo text." },
    },
    required: ["todo"],
  },
};

const listTool = {
  name: "list_todos",
  description: "List the user's Todo tasks, newest first. Check it before add_todo to avoid duplicates.",
  inputSchema: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["open", "done", "all"], description: "Defaults to open." },
      limit: { type: "integer", minimum: 1, maximum: 100, description: "Defaults to 20." },
    },
  },
};

const text = (t, isError) => ({ isError: isError || undefined, content: [{ type: "text", text: t }] });

// A missing file is an empty list; an unparsable one throws so it is never overwritten.
function load() {
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return { version: 1, values: { items: [] } };
    throw e;
  }
  const doc = JSON.parse(raw);
  if (!Array.isArray(doc?.values?.items)) throw new Error("unexpected todo file format");
  return doc;
}

// Same id shape as the screen: Date.now() in base 36 first, so the creation time can be read back from it.
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// shortcut: read-modify-write with no lock; a save by the screen in the same instant can be lost. Fine for a personal list.
function add(args) {
  const todo = typeof args?.todo === "string" ? args.todo.trim() : "";
  if (!todo) return text("todo is required", true);
  const str = (v) => (typeof v === "string" ? v.trim() : "");
  const item = { id: newId(), title: str(args.title), todo, prompt: str(args.prompt), runs: [] };
  try {
    const doc = load();
    doc.values.items.unshift(item);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file + ".tmp", JSON.stringify(doc), { mode: 0o600 });
    renameSync(file + ".tmp", file);
  } catch (e) {
    return text("could not add todo: " + e.message, true);
  }
  return text("added " + item.id);
}

function list(args) {
  const status = ["open", "done", "all"].includes(args?.status) ? args.status : "open";
  const limit = Number.isInteger(args?.limit) ? Math.min(Math.max(args.limit, 1), 100) : 20;
  let items;
  try {
    items = load().values.items;
  } catch (e) {
    return text("could not read todos: " + e.message, true);
  }
  const rows = items
    .filter((i) => status === "all" || (status === "done") === !!i.doneAt)
    .slice(0, limit)
    .map((i) => ({ id: i.id, title: i.title || undefined, todo: i.todo, done: !!i.doneAt }));
  return text(rows.length ? JSON.stringify(rows, null, 1) : "No todos.");
}

function handle(msg) {
  switch (msg.method) {
    case "initialize":
      return {
        protocolVersion: msg.params?.protocolVersion ?? "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: { name: "paseo-todo", version: "1.0.0" },
      };
    case "tools/list":
      return { tools: [addTool, listTool] };
    case "tools/call": {
      const run = { add_todo: add, list_todos: list }[msg.params?.name];
      return run ? run(msg.params.arguments) : text("unknown tool", true);
    }
    case "ping":
      return {};
    default:
      return undefined;
  }
}

createInterface({ input: process.stdin }).on("line", (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  if (msg.id === undefined) return; // notification
  const result = handle(msg);
  const reply = result === undefined ? { error: { code: -32601, message: "method not found" } } : { result };
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, ...reply }) + "\n");
});
`;
