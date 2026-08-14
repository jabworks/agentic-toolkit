# Uninstalling docket

Reverse of [INSTALL.md](INSTALL.md). The procedure lives one level down at
`server/INSTALL.md`; the removal half is a mode of the same script.

```bash
bash server/install.sh --uninstall   # remove the MCP registration from every host present
```

Follows the toolkit **ease-of-removal convention**: `detect → reverse → verify →
report`. Safe to re-run — a second run reports `skipped`, never `failed`.

## What this does and does not do

It removes the **MCP server registration**. It does not uninstall the plugin
(`/plugin uninstall docket@jabworks-agentic-toolkit` is the host's job), and it
does not touch your backlog.

Nothing here is required in the first place: docket's skills work with no
registration at all, falling back to `node server/docket.mjs` through the shell.
Uninstalling the registration returns you to that state — it does not break the
skills, it just brings the per-operation shell prompts back.

## What happens per host

| Host | Outcome | Why |
|---|---|---|
| Claude Code | `skipped` | The plugin ships `.mcp.json` and the marketplace install registered the server from it. That file is not this script's to edit — remove the plugin instead. |
| Codex | `done` | The `[mcp_servers.docket]` table is removed from `~/.codex/config.toml`, surgically: the header and its own key lines, stopping at the next table. Every other table is untouched. |
| OpenCode | `done` | The `mcp.docket` key is removed from `opencode.json`. Sibling keys and the rest of your config survive. |

A host that is not installed reports `absent`; a host where docket was never
registered reports `skipped`. Both appear in the report rather than being
omitted.

The verify beat confirms **no registration remains** — not that the server still
answers, which would be true either way and prove nothing about the removal.

## What is deliberately left behind

**`config.toml.bak` and `opencode.json.bak`.** These are install-time safety
nets and uninstall never restores them. That is deliberate: the installer
rewrites the backup at the start of *every* run, so after a second install the
backup holds an already-registered config — restoring it would put back the very
registration you are removing, and would discard any unrelated edits you made
since. Removal is surgical instead. Delete the `.bak` files yourself whenever you
no longer want them.

**Your backlog.** `docket/DOCKET.md`, `docket/archive/`, and `docket.json` are
data, not registration. Nothing here touches them.

**`[features] hooks = true`,** if something set it. docket does not use Codex
hooks and never writes that flag, but condux and concord do — so if you find it
set, leave it alone unless you have removed those too.

## Verify

```bash
node skills/docket-doctor/doctor.mjs
```

The doctor probes the MCP registration on every host and the CLI fallback. After
uninstall it should report the server unregistered and the CLI still working —
that combination is the correct end state, not a failure.

## Source layout

In this repo the script and its deep document live under the skill that owns
them — `skills/record/server/install.sh` and `skills/record/server/INSTALL.md` —
and `scripts/sync.sh` mirrors that directory to the plugin root. The paths above
are the ones a user lands on; edit the sources, never the mirror.
