import type { PluginServerContext } from "@getpaseo/plugin/server";
import { generatePrompt } from "./server/autoprompt.ts";
import { autoPrompt, todoSettings } from "./shared/todo.ts";

export default function contribute(server: PluginServerContext) {
  server.registerSettings(todoSettings);
  server.handle(autoPrompt, ({ todo }) => generatePrompt(todo));
  return () => {};
}
