<p align="center"><img src="assets/icon.png" width="96" alt="Todo logo"></p>

# Todo — a Paseo plugin

![Todo: Paseo plugin screen (illustration)](docs/hero.svg)

Park tasks with a prompt and launch an agent from them later.

Keeps a list of tasks, each with a short todo and a prompt. **Run** creates a workspace in a project you pick and starts a Claude agent with the prompt (or the todo text if the prompt is empty). Each task remembers its runs, with buttons to open the agent and workspace.

- Filters: status (all / open / done) and creation time (today / 7 / 30 days).
- List / Kanban switch: Todo, In progress (has a run, not done), Done. Columns are derived, nothing extra is stored.
- 🟢 marks a task with a running agent. The screen polls every 5 s.
- Marking a task done archives its runs' agents and workspaces (best effort).
- **Auto-prompt** writes the prompt with the `claude` CLI on the daemon (Sonnet, no tools, no saved session); the todo text is sent to Anthropic.
- **Agents can add tasks:** every new agent gets `add_todo` and `list_todos` (MCP server `todo`, pre-approved). The task is written straight to the daemon's todo store, and the open screen picks it up within 5 s. Only agents started after the plugin loads have the tools.

Todos are stored per daemon.

## Install

Requires Paseo 0.11.4 or later, and a signed-in `claude` CLI on the daemon for Auto-prompt.

```bash
paseo plugin install https://github.com/puchkoff/paseo-todo
```

Or from a local clone: `paseo plugin install ./paseo-todo`. Check with `paseo plugin ls`.

## Develop

```bash
npm install
npm run typecheck
npm test
```

The in-app description shown by Paseo lives in [OVERVIEW.md](OVERVIEW.md).
