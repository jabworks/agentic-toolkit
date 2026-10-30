# usage-trace

Durable, local usage history for Claude Code and Codex. Agent transcripts get pruned, so usage-trace copies session metrics into a private store while they still exist.

## Install

```text
/plugin install usage-trace@jabworks-agentic-toolkit
```

Capture starts at your next session, and the first run backfills whatever transcripts are still on disk.

To also track limit percentages on Claude Code, ask your agent to set up limit tracking. It shows you the status line change before applying it. Undo it with `usage-trace setup --undo`.

## What is stored

| Stored | Example |
|---|---|
| Token counts, by model and effort | Per API call |
| Tool calls and outcomes | `Bash`, ok, denied, error |
| Turn timing, prompt size, compactions | Durations and counts, not text |
| Limit percentages | 5-hour and 7-day, when set up |

**Never stored by default:** prompts, responses, tool input or output, and file contents. Paths, branches, PR URLs and custom skill or MCP names are stored as salted hashes. Hashes keep names out of the store, but anyone with both the store and its `salt` file could guess short names back.

Nothing is sent anywhere.

## Commands

The `usage-trace` skill runs these for you: `status`, `ingest`, `setup`, `setup --apply` and `setup --undo`.

## Uninstall

Run `setup --undo` first if you applied it, remove the plugin, then delete `~/.usage-trace/` if you don't want the history.
