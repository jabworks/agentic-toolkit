---
name: usage-trace
description: Checks and manages durable, local usage capture — ingest, health status, and the opt-in limit snapshot — for Claude Code and Codex. Capture itself runs automatically at session start.
when_to_use: "Run when the user asks whether usage capture is working, wants to backfill now, or wants to track limit percentages: \"is usage-trace working\", \"set up limit tracking\", \"run a usage backfill\", \"remove the status line snapshot\". Not for reading a usage or cost report (session-report)."
---

# usage-trace

A background hook copies session metrics from local transcripts into a private
store at `~/.usage-trace/` (`USAGE_TRACE_HOME` overrides). Nothing is sent
anywhere. Run the CLI, which sits beside this file:

```sh
node <skill-dir>/bin/usage-trace.mjs <command>
```

| Command | Does |
|---|---|
| `status` | Last run, lag, unknown record types, last limit snapshot, whether the status line is set up |
| `ingest` | Runs ingestion now. Safe to repeat, and the first run backfills what is still on disk |
| `setup` | Prints the planned status line change and changes nothing |
| `setup --apply` | Applies it |
| `setup --undo` | Restores the original status line |

## Rules

1. **Limit tracking is opt-in.** Run `setup`, show the user the printed plan,
   and run `setup --apply` only after they approve. It edits their settings file.
2. **Report coverage honestly.** If `status` shows unknown record types or
   failures in `last_run`, say so: numbers from that period may be incomplete.
3. **Limit history starts when snapshots start.** Never present earlier periods
   as having limit data. Codex limit fields can be empty, so "no limit data" is
   a valid answer.
4. **Content stays out by default.** Readable project names and prompt text need
   the project's exact path in `allow` in `<store>/config.json`. Add one only
   when the user names that project. Never share `<store>/salt` with the store:
   anyone holding both can guess short names back from their hashes.
