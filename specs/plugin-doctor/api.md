# Plugin doctor — API

## CLI contract

Every plugin's doctor is a dependency-free ESM script invoked the same way:

```bash
node <skill-base>/doctor.mjs           # probe everything, report, exit 0/1
node <skill-base>/doctor.mjs --host codex   # restrict to one host
node <skill-base>/doctor.mjs --fix     # all three, once condux #9 landed
```

| Flag | Meaning |
|---|---|
| *(none)* | Detect hosts, run every probe, print the report |
| `--host <claude\|codex\|opencode>` | Probe one host only; others are omitted, not reported `absent` |
| `--fix` | Perform the printed repair where one exists; otherwise print it and report `broken` unchanged |
| `--quiet` | Suppress `done` rows; print only `broken` and `absent` |

No other flags. No subcommands — a doctor with modes is a CLI, and the CLI
already exists (`docket.mjs`).

## Output grammar

One row per probe, in the installer's column layout:

```
<host>     <status>  <detail>
```

- `<host>` — `claude`, `codex`, `opencode`, or `all` for host-independent
  probes (version comparison).
- `<status>` — one of:

| Status | Meaning |
|---|---|
| `done` | Registration present and the thing it registers answered correctly |
| `broken` | Registration present but non-functional — parse failure, unresolvable path, wrong or absent output |
| `absent` | The probed thing is not there — the host is not installed, or an *optional* registration was never made. Not a failure: the dependency ladder says the skill still works a rung down, and the detail says which case it is |
| `skipped` | Present, and deliberately needs nothing here (Claude Code registers docket's MCP server from the shipped `.mcp.json`; concord is Codex-only) |

- `<detail>` — one clause, lowercase, concrete. For `broken`, the detail names
  the fix or is immediately followed by an indented fix line.

A trailing summary line states the verdict and, when anything is `broken`,
the marketplace-clone freshness so a version claim is never read as fresher
than it is.

## Exit codes

| Code | When |
|---|---|
| 0 | No probe reported `broken` |
| 1 | At least one probe reported `broken` |
| 2 | The doctor could not run at all — no `node`, or its own files are missing |

`absent` and `skipped` never affect the exit code. A machine with only Codex
installed exits 0.

## Probe: version vs marketplace

Reads, in order, all locally:

1. The plugin's own `.claude-plugin/plugin.json` → installed version.
2. `~/.claude/plugins/marketplaces/<marketplace>/.claude-plugin/marketplace.json`
   → which marketplace clone offers this plugin, and where its source lives.
   The entries carry no version, so the version comes from that source's own
   `.claude-plugin/plugin.json` inside the clone.
3. That clone's last commit date → freshness, reported verbatim.

Mismatch between (1) and (2) is `broken` only when installed is *older*;
newer-than-marketplace is `done` with a detail noting it is a local build.

**Not read: `~/.claude/plugins/installed_plugins.json`.** An earlier draft
had the probe report when another *scope* (a different project) holds a
different version of the same plugin. Dropped at preflight: the version row
already answers "am I current?", the signal would cost the same twenty-odd
lines triplicated across three doctors that may not share code, and the file
is an undocumented host internal whose shape can change without notice. If
"works in one repo, not another" turns out to bite in practice, this is the
first thing to add back.

## Probe: Codex `features.hooks` (condux, docket #9)

Codex's hook support is behind an experimental feature flag. The plugin
manifest can declare hooks, but nothing in a plugin can enable
`features.hooks = true` in a user's `config.toml` — only an installer can.

The probe reads `[features] hooks` from `<CODEX_HOME>/config.toml`:

| Flag state | Row |
|---|---|
| `true` | continue to the existing manifest and execution probes |
| absent or `false` | `broken` — the manifest resolves but no hook can fire |

It runs *before* the SessionStart and Stop probes, because with the flag off
those probes describe a registration that cannot execute regardless of how
well it parses. This is the static-parse blind spot the probe-depth decision
names, applied to an input rather than to a path.

The doctor cannot distinguish *flag written* from *Codex restarted since*.
The row reports the flag, and the detail says a restart is required if it was
just set — see quirks.

## Installer contract: condux's front door (docket #9)

`plugins/condux/install.mjs`, alongside `plugins/condux/INSTALL.md` as the
by-hand twin. Same four beats as docket's and concord's installers —
**detect → register → verify → report** — and the same column layout.

| Flag | Meaning |
|---|---|
| *(none)* | Detect hosts, register what each needs, verify, report |
| `--host <claude\|codex\|opencode>` | Act on one host only |
| `--dry-run` | Report what would change; write nothing |
| `--uninstall` | Reverse what this installer registered. No verify beat on the way out — the correct end state is that nothing answers |

What it registers, per host:

| host | action |
|---|---|
| `claude` | none — the plugin manifest already registers the SessionStart hook. Reported `skipped` with that reason, never silently omitted |
| `codex` | set `[features] hooks = true`; run `subagent-execution/references/install-codex-agents.mjs` for the four agent TOMLs; on a non-plugin (npx) install, also run `plan-review/references/install-codex-hook.sh` |
| `opencode` | add `@jabworks/condux` to the `plugin` array in `opencode.json` |

**Composition, not reimplementation.** The two sub-installers are located
plugin-root-first with a source-tree fallback and executed as-is. Both are
position-dependent — `install-codex-hook.sh` resolves
`$SCRIPT_DIR/annotate-server.js`, `install-codex-agents.mjs` resolves
`../agents` — so the wrapper must invoke them in place and never copy them.

A sub-installer that fails is reported as failed — could not be run, killed by
a signal, or non-zero exit — before the verify beat runs, mirroring what both
doctors already do with their delegates.

**Verify** delegates to `condux-doctor --host <host> --quiet` and never passes
`--fix`, so installer and doctor cannot ping-pong. This is the same acyclic
delegation concord uses in the opposite direction.

## The convention other plugins adopt

Written into `toolkit-skill-standards` alongside ease-of-install, as the same
four beats:

1. **Detect** — which hosts exist on this machine; without `node`, exit 2.
2. **Probe** — for each host, every registration this plugin depends on;
   static parse *and* execution.
3. **Report** — one row per probe, nothing silent; a skipped host is named
   with its reason.
4. **Fix** — print the repair for every `broken` row, whether or not `--fix`
   can perform it.

Re-runnable, side-effect-free without `--fix`, and never touching config the
plugin does not own.
