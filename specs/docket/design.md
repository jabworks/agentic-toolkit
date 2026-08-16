# Design — Docket plugin (signed off 2026-08-05)

## What & why

A `docket` plugin bundle for jabworks/agentic-toolkit: lightweight, file-based
project backlog management, generalizing the terminus BACKLOG.md conventions
that proved themselves in practice — shared never-reused id space, `#N` in
commit subjects (the files are the tracker, not GitHub), open-items-only main
file, archive with verification records, and the anti-ghost-work rule (stamp
✅ + date + verification, then move to archive; stale open markers burned real
sessions in terminus: #27, #29).

## Skills (2 — bare names in the docket namespace, condux-style)

- **`docket:record`** (source `skills/record/`) — format contract; lifecycle
  ops: add (next free id), status updates, split, close (stamp → archive);
  scaffold bootstrap for repos without a docket; proactive capture — offers to
  docket ideas on "later" / "someday" / "we should eventually…"; handles
  "show/browse the backlog" via the CLI browser.
- **`docket:groom`** (source `skills/groom/`) — whole-backlog modes: grooming
  sweep (stale open items), id-space integrity check, pick-next advisor.
  Opens the browser view during sweeps and pick-next.

Naming note: source dirs must equal skill names (test invariant), so the
top-level dirs are `skills/record/` and `skills/groom/`. `record` is slightly
generic as a dir name — accepted at sign-off.

## File contract — everything under `docket/`, committed

```
docket/
  DOCKET.md         # open items only; header carries the contract prose
  archive/2026.md   # closed items + verification records, rotated yearly
  docket.json       # next_id, sections config — owned by the CLI
```

Item grammar (terminus-derived): `### <id>. Title (date)` under
`## Committed` / `## Someday` / `## Loose threads`; `#### Status <date>`
follow-up blocks; archive entries `— ✅ DONE <date>` with verification record.
Ids are never reused; the id space spans open + archive.

Legacy detection: root `BACKLOG.md`/`BACKLOG_ARCHIVE.md` recognized and usable
in place; migration offered, never forced (terminus keeps working untouched).

## Machinery (3 layers + browser)

1. **`docket.mjs`** — dependency-free Node CLI, single source of truth:
   `next-id · add · close · check · scaffold · migrate · browse[--serve]`.
   All hosts, via Bash. Tested with `node --test`.
2. **MCP server** — thin stdio wrapper over the same core, hand-rolled
   JSON-RPC (no SDK dependency): `docket_add`, `docket_close`, `docket_next`,
   `docket_check`. No browse tool (browser-opening is host-side). Registered
   automatically in Claude Code via the plugin's `.mcp.json`.
3. **`INSTALL.md` + `install.sh`** — ease-of-install as a *toolkit
   convention*, docket as reference implementation: detect host → register
   what needs registering (Codex `config.toml`, OpenCode config) → verify →
   report. INSTALL.md is the same procedure written agent-followable.
   Skills degrade gracefully: MCP if present, else CLI.

**Browser** (`docket.mjs browse`): renders docket/ into a self-contained
single-file HTML view — section groupings, item cards with `#N` anchors
(`--open 47` deep-links), status timelines, open-count/age stats, client-side
filter/search. Inline CSS/JS, no egress, no runtime deps (plan-review
renderer contract). `--serve` = opt-in live mode (tiny HTTP + SSE reload,
annotate-server precedent). Light theme first, then dark; toolkit template
styling conventions (session-report lineage).

## Git tie-in

Convention documented, no coupling: close flow *suggests*
`docs(docket): close #N`; the git-commit skill stays independent (no-deps
rule).

## Repo integration

Sources `skills/record/`, `skills/groom/`; bundle `dist/plugins/docket/`
with plugin-level `server/` (CLI + MCP + installer) mirrored via its own
`sync.sh` case + mirror test — the condux-hooks blind-spot lesson. Both host
manifests, marketplace.json, README/CLAUDE.md catalogs, canonical frontmatter
grammar, trigger contracts on both skills. OpenCode dist via
`build-opencode.mjs` as usual.

## Out of scope

- GitHub / external tracker sync
- Hooks (rejected in favour of MCP + installer)
- Priority/estimate fields beyond section semantics
- Editing other repos' backlogs from this repo
- Implementing INSTALL.md installers *for* condux/concord — follow-up only;
  this task ships the convention + docket's reference implementation

## Decisions log (alternatives rejected)

- Single-skill plugin (approach A) — rejected by user in favour of bundle
- SessionStart capture hook — rejected: taxes every session in every repo
- Per-item files layout (B) / minimal folder (C) — rejected for layout A
- MCP-only machinery — rejected: breaks hosts without registration
- Third `browse` skill — rejected: CLI subcommand adds no routing surface

## Open questions

None blocking. MCP tool list may flex during planning.
