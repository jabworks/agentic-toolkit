# Uninstalling condux

Reverse of [INSTALL.md](INSTALL.md). This document and `install.mjs --uninstall`
implement the same procedure — run the script when you can, follow this by hand
when you cannot.

```bash
node install.mjs --uninstall             # reverse everything this installer registered
node install.mjs --uninstall --dry-run   # report what would change, write nothing
node install.mjs --uninstall --host codex
```

Both follow the toolkit **ease-of-removal convention**: `detect → reverse →
verify → report`. Every step is safe to re-run — a second run finds nothing and
reports `skipped`, never `failed`.

## What this does and does not do

It reverses what **this installer wrote**. It does not uninstall the plugin
itself: `/plugin uninstall condux@jabworks-agentic-toolkit` (or the Codex
equivalent) is the host's job, and this script has no business doing it for you.

Run this *before* removing the plugin. Afterwards the script is gone and the
registrations it left behind have to be cleaned up by hand.

## What happens per host

| Host | Outcome | Why |
|---|---|---|
| Claude Code | `skipped` | The plugin manifest registered the `SessionStart` routing hook. Removing the plugin removes it — nothing was ever written by hand. |
| Codex | `warn` | The four specialist agent TOMLs and the plan-review `Stop` hook are removed. The shared feature flag is left set — see below, which is why the row is `warn` and not `done`. |
| OpenCode | `done` | `@jabworks/condux` is removed from the `plugin` array in `opencode.json`. Other entries are untouched. |

A host that is not installed reports `absent`. Neither `skipped` nor `absent` is
a failure, and neither is omitted from the report.

### A plugin install reverses less than a source install

This asymmetry is real and is **not** a bug — it mirrors step 3 of INSTALL.md.
On a plugin install the Codex `Stop` hook comes from the plugin manifest, so
nothing registered it by hand and there is nothing to take back; the report says
so. On an `npx skills add` or source-tree layout the hook *was* wired by hand,
and `--uninstall` removes it. The discriminator is the same one install uses:
`.claude-plugin/plugin.json` beside this file.

## What is deliberately left behind

**`[features] hooks = true` in `$CODEX_HOME/config.toml`.** Three plugins write
this flag — condux, concord, and plan-review's own installer — and none owns it.
Clearing it on condux's way out would silently stop concord capturing and
plan-review's Stop hook firing. So no uninstaller clears it, and the report says
`warn` with the riders named rather than quietly leaving you to wonder.

If condux is genuinely the last thing on this machine that wants Codex hooks,
remove the flag by hand. The flag alone fires nothing.

**`.condux/`** — your designs, plans, progress ledgers and verification
evidence. Working state, not registration. Delete it yourself if you want it
gone.

## Verify

```bash
node skills/condux/condux-doctor/doctor.mjs
```

The doctor reports what is still registered on each host. After a successful
uninstall it should find condux absent everywhere except whatever the plugin
manifest still provides.

## Source layout

In this repo the installer lives at `plugins/condux/install.mjs` and
`scripts/sync.sh` mirrors it to the plugin root. The paths above are the ones a
user actually lands on; edit the source, never the mirror.
