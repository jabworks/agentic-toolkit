# Installing concord's memory hooks

Agent-followable installer. This document and `install-codex-hook.sh` implement
the same procedure — run the script when you can, follow this by hand when you
cannot (no bash, restricted shell, or the user wants to see each step).

Both follow the **toolkit ease-of-install convention**: `detect → register →
verify → report`. Every step is safe to re-run; registration is
read-modify-write on one key and never touches config another plugin owns.
`skills/record/server/INSTALL.md` is the reference implementation; this is the
same shape for a plugin whose machinery is hooks rather than a server.

concord is **Codex-only by design**. Claude Code and OpenCode are named in the
report with that reason — not omitted.

## 0. Detect

- `SKILL` = this file's parent's parent (the memory skill root)
- `RECALL` = `$SKILL/bin/recall.mjs`, `CAPTURE` = `$SKILL/bin/capture.mjs`.
  Either missing → stop: FATAL, the plugin install is incomplete.
- Check `node` exists, and record its **absolute path**. Codex Desktop does not
  inherit `PATH`, so a bare `node` in a hook command fails there.
- `CODEX_HOME` = `$CODEX_HOME` if set, else `~/.codex`. Create it if absent.
- Which hosts are present? `~/.claude/` (Claude Code), `$CODEX_HOME` (Codex),
  an `opencode` binary or `${XDG_CONFIG_HOME:-~/.config}/opencode/` (OpenCode).

## 1. Claude Code — skip

concord registers nothing on Claude Code. Report `skipped` when `~/.claude`
exists, `absent` when it does not. Neither is a failure.

## 2. OpenCode — skip

Same as above, for the same reason.

## 3. Codex — merge three hook events

File: `$CODEX_HOME/hooks.json`.

Read it if it exists. If it exists and does not parse, **stop** — report
`broken` and change nothing. Overwriting a malformed hooks file destroys
whatever else the user registered there.

Under `hooks`, each event is an array. For each of the three events below:

1. Remove entries that are concord's own — serialize the entry and match on the
   literal `concord`, on `$RECALL`, or on `$CAPTURE`. Matching the script path
   is what keeps this idempotent, and what keeps it from touching another
   plugin's hooks. (The `concord` string alone is not enough: the skill was
   renamed to `remember`, so an `npx`-installed tree no longer carries it.)
2. Append the wanted entry.

| Event | `command` |
|---|---|
| `SessionStart` | `"<node>" "<RECALL>"` |
| `UserPromptSubmit` | `"<node>" "<CAPTURE>" --prompt` |
| `SessionEnd` | `"<node>" "<CAPTURE>" --session-end` |

Each entry has the shape `{ "hooks": [{ "type": "command", "command": "…" }] }`.
All three or none — they share one idempotent sync, and losing one loses
exactly-once capture.

Write via a temp file and rename, preserving the original file mode (default
`0600`).

## 4. Codex — enable the experimental hooks feature

File: `$CODEX_HOME/config.toml`. Registered hooks with the feature off do
nothing at all.

1. Already contains a line matching `hooks = true` → report `skipped`.
2. Has a `[features]` table → set `hooks = true` inside it, replacing any
   existing `hooks =` line in that table. Do not add a second one.
3. No `[features]` table → append `\n[features]\nhooks = true\n`. A new table at
   end-of-file is always valid TOML; never rewrite the rest.

## 5. Verify

Run the sibling doctor — same plugin, so this is not a cross-plugin dependency:

```bash
node "$SKILL/../concord-doctor/doctor.mjs" --host codex --quiet
```

Exit 0 → verified. Non-zero → report `broken` and show its output; the fix is
whatever it names.

**If the doctor is not there** (`npx skills add` ships bare skill trees), read
the registration back instead: parse `$CODEX_HOME/hooks.json`, confirm each of
the three events contains its script path, and confirm each path exists on
disk. Say in the report that this was the fallback — a verify step that
silently degrades is the failure mode the convention exists to catch.

A registration that was written but does not resolve is a **failure to report,
not a success**.

## 6. Report

One row per step — `host status detail`, columns at 10 and 8:

```
claude     skipped  concord is Codex-only — nothing is registered here by design
codex      done     merged SessionStart / UserPromptSubmit / SessionEnd in /home/u/.codex/hooks.json
codex      done     added [features] hooks = true to /home/u/.codex/config.toml
opencode   absent   no opencode install found
verify     done     concord-doctor confirms the Codex registration resolves
```

Statuses are the convention's four — `done`, `skipped`, `absent`, `broken` —
plus `FATAL` for a precondition that stops the run. Nothing silent: a host that
was skipped is named, with why.

## 7. After

Codex must be restarted and the hooks trusted before anything fires. No probe
can prove the host actually invoked a hook — say so rather than implying a
green report means memory is flowing.

## Removal

`bash install-codex-hook.sh --uninstall` removes the three events and leaves
the feature flag and the memory files under `.concord/` alone. Verify is
skipped on the way out: the correct end state is that nothing answers.
