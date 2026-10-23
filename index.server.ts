import { mkdirSync, writeFileSync } from "node:fs";
import type { PluginServerContext } from "@getpaseo/plugin/server";
import { MCP_SOURCE } from "./server/mcp-source.ts";
import { generatePrompt } from "./server/autoprompt.ts";
import { MCP_DIR, MCP_FILE, TODO_FILE } from "./server/store.ts";
import { autoPrompt, todoSettings } from "./shared/todo.ts";

export default function contribute(server: PluginServerContext) {
  mkdirSync(MCP_DIR, { recursive: true });
  writeFileSync(MCP_FILE, MCP_SOURCE); // rewritten on every load, so a plugin update reaches new agents
  server.registerSettings(todoSettings);
  server.handle(autoPrompt, ({ todo }) => generatePrompt(todo));
  // Every new agent gets add_todo / list_todos (mcp__todo__*).
  server.before("agent.create", ({ request }) => ({
    ...request,
    config: {
      ...request.config,
      mcpServers: {
        ...request.config.mcpServers,
        todo: { type: "stdio", command: process.execPath, args: [MCP_FILE], env: { PASEO_TODO_FILE: TODO_FILE } },
      },
      toolPolicy: { preapproved: [...(request.config.toolPolicy?.preapproved ?? []), ...["add_todo", "list_todos"].map((tool) => ({ kind: "mcp" as const, server: "todo", tool }))] },
    },
  }));
  return () => {};
}
