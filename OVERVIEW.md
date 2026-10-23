Keeps a list of tasks you want to remember, each with a short todo and a prompt. A button on each task starts a new agent from its prompt.

Todos are stored on the daemon you have open, so each host has its own list. Auto-prompt writes the prompt from the todo with the Claude Code CLI on that daemon (Sonnet, no tools, no saved session), so `claude` must be installed and signed in there. The todo text is sent to Anthropic for that call.

Each task can be marked done, and the list filters by status (all, open, done) and by creation time (today, 7 days, 30 days).

Run asks which project to use, creates a new workspace in that project directory, and starts a Claude agent in it with the prompt, or with the todo text when the prompt is empty.

Each Run is remembered on the task: its card lists the agents started from it, with buttons to open each agent and its workspace. Runs started before this was added have no agent link. The task you had open is reopened the next time you visit the screen.

A List/Kanban switch shows the tasks as three columns: Todo (not started), In progress (has a run, not done) and Done. A task moves by Run and Mark done/Reopen; the columns are derived, nothing extra is stored. The time filter applies to both views.

A 🟢 on a task (list row or kanban card) means one of its agents is running now; a number shows when several are. The screen polls the host every 5 s.

Marking a task done archives the agents and workspaces of all its runs (best effort; failures are toasted). Reopen does not restore them. Runs started before the workspace id was stored look it up from the agent.

Every new agent also gets two tools, `add_todo` and `list_todos` (MCP server `todo`, pre-approved), so an agent can park a follow-up here instead of doing it now. The task appears on the list within 5 s. Agents that were already running when the plugin loaded do not have the tools.
