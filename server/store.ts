import { homedir } from "node:os";
import { join } from "node:path";

// Per OS user, so each daemon (puchkoff, oleg) has its own copy.
export const MCP_DIR = join(homedir(), ".paseo-todo");
export const MCP_FILE = join(MCP_DIR, "mcp.mjs");
// The daemon's settings document for this plugin (todoSettings, id "todo"), see PluginSettingsStore.
export const TODO_FILE = join(process.env.PASEO_HOME || join(homedir(), ".paseo"), "plugin-settings", "paseo-todo", "todo.json");
