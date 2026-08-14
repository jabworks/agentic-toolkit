# Implementation

## Builder

Two scripts, one transform. `scripts/build-opencode.mjs` keeps its existing
outputs and exports `transformSkill` + `copyTransformed`;
`scripts/build-cursor.mjs` imports both and owns only the output location:

- `dist/opencode/skills/<name>/` + `packages/condux-opencode/{agents,skills}`
  — `build-opencode.mjs`, unchanged
- `dist/cursor/skills/<name>/` — `build-cursor.mjs` (same fold, separate tree)

`scripts/sync.sh` invokes both after the dist/plugins mirror, in both its
single-skill and full-sync arms.

## Tests

Mirror guard follows `opencode-dist.test.mjs`: re-run the transform in
memory, byte-compare against `dist/cursor/skills/`, keep the 1024-char
merged-description assertion. No undeclared trees at `dist/` roots stays
`composition.test.mjs`'s job.

## Install paths (Cursor)

- Project: `.agents/skills/` or `.cursor/skills/` at the project root.
- Global: `~/.agents/skills/` or `~/.cursor/skills/`.
- Via CLI: `npx skills add` (vercel-labs) — subdirectory addressing for
  `dist/cursor/skills/` verified live (see quirks.md for the #421 caveat).

## Docket installer

`skills/record/server/install.sh` (synced to `dist/plugins/docket/server/`)
gains a `cursor` target: writes/merges the stdio entry

```json
{ "mcpServers": { "docket": { "type": "stdio", "command": "node",
  "args": ["<abs path>/mcp-server.mjs"] } } }
```

into `~/.cursor/mcp.json` (global — the installer's only target, gated on
`~/.cursor/` existing). Merge, never clobber; backup before modifying.
Project-level `.cursor/mcp.json` uses the same shape, wins on name
collision, and stays a documented manual snippet in INSTALL.md — the right
path on WSL split-home setups, where the installer honestly reports
`absent`.

## Docs

README: channel/Structure section gains the fourth channel; a verified
compatibility row (works / degrades / absent). CLAUDE.md three-channels
paragraph becomes four. Catalog tables stay generated — no hand edits.
