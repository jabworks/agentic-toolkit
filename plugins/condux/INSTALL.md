# Installing condux

Agent-followable installer. This document and `install.mjs` implement the same
procedure — run the script when you can, follow this by hand when you cannot
(no node on PATH, restricted shell, or the user wants to see each step).

```bash
node install.mjs                 # register everything this machine needs
node install.mjs --dry-run       # report what would change, write nothing
node install.mjs --host codex    # one host only
node install.mjs --uninstall     # reverse what this installer registered
```

Both follow the **toolkit ease-of-install convention**: `detect → register →
verify → report`. Every step is safe to re-run, and registration is
read-modify-write on one key — it never rewrites config another plugin owns.

**condux does not have one install story, it has two.** A marketplace plugin
install registers its own hooks from the plugin manifest; an `npx skills add`
install has no manifest and needs the Stop hook wired by hand. Step 3 is the
only step that differs, and conflating the two is what made this plugin's
install story wrong for as long as it was undocumented.

## 0. Detect

- `PLUGIN_ROOT` = this file's directory.
- **Which install is this?** `$PLUGIN_ROOT/.claude-plugin/plugin.json` exists →
  a plugin install. Absent → a source tree or `npx skills add` layout. This is
  the discriminator for step 3, not a guess about which host is in use.
- Sub-installers, probed plugin-root first and then the source tree:
  - `$PLUGIN_ROOT/skills/condux/subagent-execution/references/install-codex-agents.mjs`
  - `$PLUGIN_ROOT/skills/condux/plan-review/references/install-codex-hook.sh`
  - `$PLUGIN_ROOT/skills/condux/condux-doctor/doctor.mjs`
  - `$PLUGIN_ROOT/skills/condux/condux-doctor/conflicts.json` and
    `conflicts.mjs` — the known-conflicts registry and its reader, shared with
    the doctor so the same warning is not written twice (step 5)
- Check `node` exists and record its **absolute path**. Codex Desktop does not
  inherit `PATH`, so a bare `node` in a hook command fails there.
- `CODEX_HOME` = `$CODEX_HOME` if set, else `~/.codex`.
- Which hosts are present? `~/.claude/` (Claude Code), `$CODEX_HOME` (Codex),
  `${XDG_CONFIG_HOME:-~/.config}/opencode/` (OpenCode).

## 1. Claude Code — skip

condux registers nothing on Claude Code by hand. The plugin manifest declares
the `SessionStart` hook that injects the routing rule, and installing the
plugin is what registers it.

Report `skipped` when `~/.claude` exists, `absent` when it does not. Neither is
a failure, and neither is omitted from the report.

## 2. Codex — enable the experimental hooks feature

File: `$CODEX_HOME/config.toml`.

condux declares its Codex hooks in the plugin manifest, but **nothing in a
plugin can enable Codex's hooks feature**. Until this flag is set, the manifest
parses, the paths resolve, and no hook fires.

Read the file if it exists. If `[features]` appears more than once, **stop** —
report `broken` and leave it alone; that is invalid TOML and resolving it is a
human's call. Otherwise:

- `[features]` present with `hooks = true` → already done.
- `[features]` present with `hooks = false` or no `hooks` key → set or insert
  `hooks = true` inside that table. Do not append a second table.
- No `[features]` table → append one:

```toml
[features]
hooks = true
```

Write atomically: temp file beside the target, preserve the existing mode,
rename over it.

**This flag is shared.** concord and plan-review ride the same one, which is
why removal never clears it (see Removal).

## 3. Codex — the agents, and the Stop hook only when unmanaged

**Always:** the four specialist agents. Codex plugins cannot bundle agents —
the plugin format has no `agents/` component — so they are standalone TOMLs
under `$CODEX_HOME/agents/` regardless of how condux was installed.

```bash
node "$AGENT_INSTALLER" --codex-home "$CODEX_HOME"
```

It preserves any tuning keys already on an existing TOML (`model`,
`model_reasoning_effort`, `sandbox_mode`, `nickname_candidates`) and backs each
file up to `<name>.toml.bak` before writing.

**Plugin install:** stop here. `hooks/codex-hooks.json` already declares both
`SessionStart` and the plan-review `Stop` hook, and the manifest points at it.
Report that the Stop hook comes from the manifest — do not run the script, and
do not report the step as skipped without saying why.

**Source tree or `npx skills add`:** no manifest registers anything, so wire the
Stop hook by hand:

```bash
bash "$HOOK_INSTALLER"
```

It merges a `Stop` entry into `$CODEX_HOME/hooks.json` pointing at
`annotate-server.js --codex-stop` with absolute paths, and is idempotent — it
matches on the `--codex-stop` string rather than re-adding. It has **no
`--dry-run`**, so under a dry run do not invoke it at all; report what it would
do instead.

## 4. OpenCode — one key

File: `${XDG_CONFIG_HOME:-~/.config}/opencode/opencode.json`.

Read it if it exists. If it exists and does not parse, **stop** — report
`broken` and refuse to overwrite it. Otherwise add `@jabworks/condux` to the
`plugin` array, creating the array or the file if needed:

```json
{
  "plugin": ["@jabworks/condux"]
}
```

The package bundles the condux agents and the 13 condux skills and
self-registers them through its `config` hook, so this one key is the whole
OpenCode install.

## 5. Check for a competing skill library

condux is not the only library that routes dev work, and the closest one is
the one it learned from. Read the registry —
`skills/condux/condux-doctor/conflicts.json` in a plugin install,
`skills/condux-doctor/conflicts.json` in the source tree — and match each
entry's `detect` block against what is already on this machine. Name matching
only; nothing here reaches the network or compares skills by meaning.

Two surfaces, because a machine can carry the conflict either way:

| Surface | Where | Match |
|---|---|---|
| Installed plugin | `~/.claude/plugins/installed_plugins.json` keys · `$CODEX_HOME/config.toml` `[plugins."<name>@<marketplace>"]` headers | the part before `@` equals `detect.plugin` |
| Loose skills | `~/.claude/skills` · `~/.agents/skills` · `$CODEX_HOME/skills` · `${XDG_CONFIG_HOME:-~/.config}/opencode/skills` | at least `detect.minSkills` (default 2) directory names in `detect.skills` |

Read the registration files, not `plugins/cache/` — a cache directory outlives
the install that created it. Deduplicate the loose skills on their resolved
path: `~/.claude/skills/<name>` is routinely a symlink into
`~/.agents/skills/<name>`, and that is one skill, not two.

Report `warn` on a hit and `done` on a clean machine. **Never `broken`** —
condux installed correctly, and the exit code must not say otherwise.

**Report the removal command; do not run it.** This installer's contract is to
reverse what *it* registered. Another library's registration is not that, and
uninstalling a plugin the user chose is not a step an installer takes on its
own initiative.

## 6. Verify

Do not report success on the strength of having written a file. Run the doctor,
which already implements every probe:

```bash
node "$DOCTOR" --host <host> --quiet
```

Never pass `--fix` here. The doctor's own `--fix` runs this installer, and
passing it back down is the cycle that convention forbids.

Exit 0 → the registration resolves. Non-zero → report `broken` and carry the
doctor's last line as the detail.

## 7. Report

One row per host, `host status detail`, columns at widths 10 and 8, with any
fix on an indented continuation line:

```
claude     skipped  the plugin manifest registers the SessionStart hook — nothing to do
codex      done     set [features] hooks = true — restart Codex for it to take effect
opencode   done     added @jabworks/condux to opencode.json
conflicts  warn     superpowers — installed as superpowers@claude-plugins-official on claude; 11 skills overlap condux
                    ↳ /plugin uninstall superpowers@claude-plugins-official — or … (run one library or the other; condux does not remove it for you)
```

| Status | Meaning |
|---|---|
| `done` | Registered, and verify confirmed it resolves |
| `broken` | A step failed, or verify still reports a problem |
| `absent` | The host is not on this machine |
| `skipped` | Present, and deliberately needs nothing here |
| `warn` | Registered fine, but something on this machine competes with it |

Exit 0 when nothing is `broken`, 1 otherwise. `warn` does not move the exit
code — the install did succeed, and a conflict the user may well have chosen
on purpose is not a failed step. A sub-installer that fails is
reported as failed — could not be run, killed by a signal, or a non-zero exit —
before verify runs. `running …` followed by silence reads as a repair that
happened.

## 8. After

- **Restart Codex** (and Codex Desktop if used). The feature flag is read at
  startup; writing it is not the same as hooks being live, and nothing on disk
  records whether a restart has happened.
- Codex will ask you to trust the hook definition — approve it.
- Enter plan mode; when the planning turn ends, the plan-review UI opens.
- On any host, `/condux:workflow` should now be the entry point for dev tasks.
  If the routing rule stops appearing, run `/condux:condux-doctor`.

## Removal

```bash
node install.mjs --uninstall
```

Reverses the OpenCode key and reports the rest honestly rather than guessing:

- **`features.hooks` is left set.** concord and plan-review use the same flag;
  clearing it on condux's way out would break them.
- **Agent TOMLs and the Stop hook are removed by hand.** Neither sub-installer
  has a reverse path, and the report prints the exact paths.

There is no verify beat on the way out — the correct end state is that nothing
answers.

A documented removal procedure across all three plugins is its own piece of
work (docket #2); this flag is parity with concord's installer, not that.
