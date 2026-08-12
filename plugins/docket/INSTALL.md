# Installing docket

Front door for docket's install story. The procedure itself lives one level
down, at `server/INSTALL.md` — this document exists so you do not have to find
it, and so the per-host outcome is readable before you commit to anything.

```bash
bash server/install.sh            # register the MCP server on every host present
bash server/install.sh --dry-run  # report what would change, write nothing
```

Both the script and `server/INSTALL.md` implement the same procedure — run the
script when you can, follow the document by hand when you cannot (no bash,
restricted shell, or the user wants to see each step). That document is also the
reference implementation of the **toolkit ease-of-install convention**:
`detect → register → verify → report`. Every step is safe to re-run,
registration is append-only or read-modify-write with a backup, and unrelated
config is never touched.

## Nothing here is required

docket's skills work with no installation at all. They fall back to
`node server/docket.mjs` via the shell — rung 2 of the degrade-gracefully
ladder, a CLI bundled inside the skill that travels with it through every
channel and needs only Node. Registering the MCP server is rung 3, and it only
removes the per-operation shell prompts.

## What happens per host

| Host | Outcome | Why |
|---|---|---|
| Claude Code | `skipped` | The plugin ships `.mcp.json`; a marketplace install registers the server by itself. Nothing to do by hand. |
| Codex | one MCP server table appended to `~/.codex/config.toml` | Codex has no plugin-side MCP registration. |
| OpenCode | one JSON key merged into `opencode.json` | Same reason, different config shape. A `.bak` backup is written first. |

A host that is not installed reports `absent`. Neither `skipped` nor `absent` is
a failure, and neither is omitted from the report.

## Verify

```bash
node skills/docket/docket-doctor/doctor.mjs
```

The doctor is the standing version of the installer's verify step: it probes the
MCP registration on every host, the CLI fallback, and the installed version, and
prints the fix for anything broken. `--fix` delegates the repair back to
`server/install.sh` rather than reimplementing registration.

## Source layout

In this repo the two files live under the skill that owns them —
`skills/record/server/INSTALL.md` and `skills/record/server/install.sh` — and
`scripts/sync.sh` mirrors that directory to the plugin root. The paths above are
the ones a user actually lands on; edit the sources, never the mirror.

## Removal

Not written yet — docket #2 is the removal half of this convention across all
three plugins. Until it lands: drop the `[mcp_servers.docket]` table from
`~/.codex/config.toml`, remove the `docket` key from `opencode.json` (or restore
the `.bak` beside it), and re-run the doctor to confirm the registration is gone.
