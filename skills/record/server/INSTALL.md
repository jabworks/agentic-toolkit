# Installing docket's MCP server

Agent-followable installer. This document and `install.sh` implement the same
procedure — run the script when you can, follow this by hand when you cannot
(no bash, restricted shell, or the user wants to see each step).

This is also the reference implementation of the **toolkit ease-of-install
convention**: `detect → register → verify → report`. Every step is safe to
re-run; registration edits are append-only or read-modify-write with a
backup; unrelated config is never touched. Complex plugins (condux, concord)
adopt the same shape for their own installers.

The skills work without any of this — they fall back to
`node <skill-base>/server/docket.mjs` via the shell. Registering the MCP
server only removes per-operation shell prompts.

## 0. Detect

- `SERVER` = absolute path to `mcp-server.mjs` in this directory
- Check `node` exists. Without it, stop: FATAL, nothing to register.
- Which hosts are present? `~/.claude/` (Claude Code), `~/.codex/` (Codex),
  an `opencode` binary or `~/.config/opencode/` (OpenCode).

## 1. Claude Code — skip

The plugin ships `.mcp.json`; a marketplace install registers the server by
itself. Report `skipped`. (Manual fallback if the skill was installed via
`npx skills add` instead: `claude mcp add docket -- node "$SERVER"`.)

## 2. Codex — append a TOML table

File: `~/.codex/config.toml`.

1. If it already contains a `[mcp_servers.docket]` table → report `skipped`.
2. Otherwise back it up (`config.toml.bak`) and append:

```toml
[mcp_servers.docket]
command = "node"
args = ["<absolute path to mcp-server.mjs>"]
```

Append-only: a new table at end-of-file is always valid TOML; never rewrite
the rest of the file.

## 3. OpenCode — merge one JSON key

File: `${XDG_CONFIG_HOME:-~/.config}/opencode/opencode.json`.

1. If `mcp.docket` already exists in it → report `skipped`.
2. Otherwise back the file up (when it exists), then merge — touching only
   this key:

```json
{
  "mcp": {
    "docket": { "type": "local", "command": ["node", "<absolute path to mcp-server.mjs>"], "enabled": true }
  }
}
```

## 4. Verify

Pipe one initialize request through the server and expect its name back:

```bash
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}\n' | node "$SERVER" | head -1
```

The response must contain `"name":"docket"`. A registration that was written
but does not answer this is a **failure to report, not a success** — that is
the convention's whole reason for the verify step.

## 5. Report

One line per host — `done` / `skipped` / `absent` / `failed` — plus the
verify result. Nothing silent: a host that was skipped is named, with why.
