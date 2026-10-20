Keeps a list of tasks you want to remember, each with a short todo and a prompt. A button on each task starts a new agent from its prompt.

Todos are stored on the daemon you have open, so each host has its own list. Auto-prompt writes the prompt from the todo with the Claude Code CLI on that daemon (Sonnet, no tools, no saved session), so `claude` must be installed and signed in there. The todo text is sent to Anthropic for that call.

Each task can be marked done, and the list filters by status (all, open, done) and by creation time (today, 7 days, 30 days).

Run asks which project to use, creates a new workspace in that project directory, and starts a Claude agent in it with the prompt, or with the todo text when the prompt is empty.

Each Run is remembered on the task: its card lists the agents started from it, with a button to open each one. Runs started before this was added have no agent link. The task you had open is reopened the next time you visit the screen.
