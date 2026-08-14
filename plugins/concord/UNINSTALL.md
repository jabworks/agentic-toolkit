# Uninstalling concord

Reverse of [INSTALL.md](INSTALL.md). The full procedure is the `## Removal`
section of `skills/remember/references/INSTALL.md`; this document is the
front door to it, and the script below is the same procedure automated.

```bash
bash skills/remember/references/install-codex-hook.sh --uninstall
```

Follows the toolkit **ease-of-removal convention**: `detect → reverse → verify →
report`. Safe to re-run — a second run reports `skipped`, never `failed`.

## What this does and does not do

It removes concord's **three Codex hook events**. It does not uninstall the
plugin (that is the host's job), and it does not delete a single line of the
memory it captured.

## What happens per host

| Host | Outcome | Why |
|---|---|---|
| Claude Code | `skipped` | concord registers nothing here — it is Codex-only by design, because the capture reads Codex rollout files. |
| OpenCode | `skipped` | Same: no rollout surface to read, so nothing was ever registered. |
| Codex | `done` | concord's three hook events are removed from `$CODEX_HOME/hooks.json`. Hooks belonging to other plugins in the same file are left exactly as they were. |

`CODEX_HOME` is `$CODEX_HOME` when set, else `~/.codex`. A host that is not
installed reports `absent`. Neither `skipped` nor `absent` is a failure, and
neither is omitted.

## What is deliberately left behind

**`[features] hooks = true` in `$CODEX_HOME/config.toml`.** concord sets this
flag but does not own it — condux and plan-review's installer write the same
one. Clearing it here would silently stop condux's routing hook and
plan-review's Stop hook from firing. No uninstaller in this toolkit clears it.

If concord is the last thing on this machine that wants Codex hooks, remove the
flag by hand. On its own it fires nothing.

**Your memory.** Everything under `.concord/` — the buffer, the daily, recent
and archive tiers, and anything you pinned — survives untouched. That is data
you accumulated, not registration this installer created, and losing it to a
plugin removal would be unrecoverable. Delete the directory yourself if you
really want it gone.

## Verify

```bash
node skills/concord-doctor/doctor.mjs
```

The doctor probes both Codex registration paths, all three hook events, the
feature flag, and the store. After uninstall it should report the hooks absent
and the store intact.

## Source layout

In this repo the installer and its deep document live under the skill that owns
them — `skills/remember/references/` — and `scripts/sync.sh` mirrors the skill
into the plugin. The paths above are the ones a user lands on; edit the sources,
never the mirror.

Note that the deep document computes its own base path relative to itself
(`SKILL` = this file's parent's parent), which is why this front door points at
it rather than being a copy of it — a copy at the plugin root would resolve the
wrong skill root on its first step.
