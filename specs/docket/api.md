# Docket — API Contracts

## CLI — `docket.mjs` (dependency-free Node, run via Bash)

Resolution: walk up from CWD to git root; operate on `<git-root>/docket/`
(or detected legacy layout — see quirks.md). All output plain text,
exit 0 success / non-zero failure with a one-line reason on stderr.

| Subcommand | Contract |
|---|---|
| `next-id` | Print the next free id (from `docket.json`, cross-checked against both files) |
| `add "<title>" [--section committed\|someday\|loose] [--body -]` | Allocate id, append item `### <id>. <title> (<today>)` to the section (default: someday); body read from stdin when `--body -`; prints the new id |
| `close <id> [--note "<verification>"]` | Stamp `— ✅ DONE <today>` + verification note, move the entry from DOCKET.md to `archive/<year>.md` (create file with header if absent), update `docket.json`; prints suggested commit subject `docs(docket): close #<id>` |
| `check` | Id-space integrity: duplicates, reuse across open+archive, `next_id` drift, malformed headings; exit non-zero on any finding |
| `scaffold` | Create `docket/` (DOCKET.md with header contract, `archive/`, `docket.json`) in a repo that has none; refuses if a docket or legacy layout already exists |
| `migrate` | Convert detected legacy root `BACKLOG.md`/`BACKLOG_ARCHIVE.md` into layout A under `docket/`, preserving ids and bodies byte-faithfully; leaves originals in place for the user to delete |
| `browse [--open <id>] [--serve] [--out <path>]` | Render self-contained single-file HTML (default to a temp path, print it); `--open` deep-links an item anchor; `--serve` starts local HTTP + SSE live reload (annotate-server precedent) |

Status updates and splits are model-driven edits (freeform prose), not CLI
subcommands — the CLI owns only the mechanical, correctness-critical ops.

## MCP server — stdio, hand-rolled JSON-RPC

Registered for Claude Code via the plugin's `.mcp.json`; Codex/OpenCode via
the installer. Tools map 1:1 onto CLI subcommands (shared core module):

- `docket_add { title, section?, body? }` → `{ id }`
- `docket_close { id, note? }` → `{ id, archiveFile, commitSubject }`
- `docket_next {}` → `{ id }`
- `docket_check {}` → `{ ok, findings[] }`

No browse tool. Tool list may flex during planning (design open point).

## Installer — the toolkit ease-of-install convention

`install.sh` (idempotent, re-runnable) and `INSTALL.md` (same procedure,
written for an agent to follow) both implement:

1. **Detect** the host(s) present (Claude Code / Codex / OpenCode) and what
   is already registered.
2. **Register** only what's missing (Codex `config.toml` `mcp_servers`
   entry; OpenCode config json; Claude Code needs nothing — plugin handles it).
3. **Verify** the server via an initialize round-trip before reporting
   success (softened 2026-08-05 at preflight: one round-trip against the
   server binary — per-host config re-parsing buys little over it).
4. **Report** a per-host done/skipped/failed summary.

Convention rule: steps must be safe to re-run and must never clobber
unrelated user config — read-modify-write with a backup, or append-only.
