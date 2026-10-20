Keeps a list of tasks you want to remember, each with a short todo and a prompt. A button on each task starts a new agent from its prompt.

Todos are stored on the daemon you have open, so each host has its own list. Auto-prompt writes the prompt from the todo with the Claude Code CLI on that daemon (Sonnet, no tools, no saved session), so `claude` must be installed and signed in there. The todo text is sent to Anthropic for that call.

Run asks which project to use, creates a new workspace in that project directory, and starts a Claude agent in it with the prompt, or with the todo text when the prompt is empty.
