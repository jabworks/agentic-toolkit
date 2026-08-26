# Quirks

## Q1 — The flag survives every uninstall, on purpose

After removing all three plugins, `[features] hooks = true` is still set in
Codex's `config.toml`. That is correct, not a leak — see decisions.md §1. It
fires nothing on its own; a registered hook is what fires, and those are gone.

Expect this to be reported as a question ("uninstall didn't finish"), which is
why every UNINSTALL.md states it explicitly and the report emits a `warn` row
naming the other riders rather than staying silent.

## Q2 — `.bak` is not a rollback point after the second install

`skills/record/server/install.sh:47` copies `config.toml` to `config.toml.bak`
at the start of **every** run. Install twice and the backup holds an
already-registered config, so "restore the backup" would reinstate the exact
registration being removed. It also discards any unrelated edit made since the
last install. Uninstall removes its own key surgically and never restores.

## Q3 — Re-running uninstall must be boring

A second `--uninstall` finds nothing and reports `skipped`. Treating "already
gone" as `failed` breaks the repair path — `<plugin>-doctor --fix` and the
installers are both expected to be safe to re-run, and an uninstall that fails
on a clean machine makes any wrapper around it unreliable.

## Q4 — A missing delegate is not an error

`npx skills add` ships bare skill trees with no plugin manifest, so condux's
front door can legitimately find no `install-codex-agents.mjs` or
`install-codex-hook.sh` to delegate to. Report `skipped` with the reason. The
install path already probes plugin-root-first then source-tree; uninstall uses
the same probe rather than a second one.

## Q5 — User data is never touched

`.concord/` memory files and `docket/`'s backlog tree survive uninstall. They are
data, not registration. Each document names them as deliberately preserved —
silence would read as "it might have deleted my backlog".

## Q6 — Codex Desktop and absolute paths

Relevant when *verifying* a removal rather than performing it: Codex Desktop does
not inherit `PATH`, which is why installers record node's absolute path. A
verification step that shells out to `node` bare can fail on a machine where the
removal actually succeeded.
