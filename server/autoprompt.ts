import { resolveBin, runCommand } from "./exec.ts";

const SYSTEM_PROMPT = [
  "You turn a terse todo note into a prompt for a coding agent that has not seen the note.",
  "Write the prompt in the language of the note, in the user's voice, as a direct instruction.",
  "State the goal, the concrete steps or checks the note implies, and what done looks like.",
  "Do not invent file names, tools or facts the note does not contain; ask the agent to find them instead.",
  "Keep it short. Output only the prompt, no preamble, no quotes, no markdown fences.",
].join(" ");

export const MODEL = "claude-sonnet-5-5";

// No tools, settings, MCP or saved session: the call must not show up as work.
export function claudeArgs(): string[] {
  return ["-p", "--no-session-persistence", "--tools", "", "--setting-sources", "", "--strict-mcp-config",
    "--disable-slash-commands", "--system-prompt", SYSTEM_PROMPT, "--model", MODEL, "--output-format", "json"];
}

// The CLI thinks by default, which makes a short call take tens of seconds.
export async function generatePrompt(todo: string): Promise<{ prompt: string }> {
  if (!todo.trim()) throw new Error("Write the todo first");
  const out = await runCommand(resolveBin("claude"), claudeArgs(), {
    timeoutMs: 60_000,
    input: todo,
    env: { ...process.env, MAX_THINKING_TOKENS: "0" },
  });
  const r = JSON.parse(out) as { is_error?: boolean; result?: string };
  if (r.is_error || !r.result?.trim()) throw new Error(r.result?.split("\n")[0] || "empty answer from claude");
  return { prompt: r.result.trim() };
}
