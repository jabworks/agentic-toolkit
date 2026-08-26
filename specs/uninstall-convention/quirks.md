# Quirks

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | The flag survives every uninstall, on purpose | removing all three hook-writing plugins | low | yes — stated in every UNINSTALL.md, `warn` row names the riders |
| Q2 | `.bak` is not a rollback point after the second install | restoring the backup on uninstall | high | yes — surgical key removal, never restore |
| Q3 | Re-running uninstall must be boring | a second `--uninstall` on a clean machine | medium | yes — "already gone" reports `skipped`, never `failed` |
| Q4 | A missing delegate is not an error | npx installs with no plugin manifest | low | yes — `skipped` with the reason, same probe as install |
| Q5 | User data is never touched | uninstall near `.concord/` or `docket/` | medium | yes — named as deliberately preserved in each document |
| Q6 | Codex Desktop does not inherit `PATH` | verification shelling out to bare `node` | low | yes — installers record node's absolute path |

## Q1 — The flag survives every uninstall, on purpose

**Symptom:** after removing all three plugins, `[features] hooks = true` is still set in Codex's `config.toml` — expect this to be reported as a question ("uninstall didn't finish").
**Trigger:** uninstalling every plugin that rides the flag.
**Cause:** the flag is shared state with three writers and no owner (decisions.md §1), and it fires nothing on its own — a registered hook is what fires, and those are gone.
**Mitigation:** yes — correct, not a leak: every UNINSTALL.md states it explicitly and the report emits a `warn` row naming the other riders rather than staying silent.

## Q2 — `.bak` is not a rollback point after the second install

**Symptom:** "restore the backup" reinstating the exact registration being removed, and discarding any unrelated edit made since the last install.
**Trigger:** treating `config.toml.bak` as an uninstall rollback point.
**Cause:** `skills/record/server/install.sh:47` copies `config.toml` to `config.toml.bak` at the start of **every** run — install twice and the backup holds an already-registered config.
**Mitigation:** yes — uninstall removes its own key surgically and never restores.

## Q3 — Re-running uninstall must be boring

**Symptom:** an uninstall that fails on a clean machine, making any wrapper around it unreliable.
**Trigger:** a second `--uninstall` finding nothing to remove.
**Cause:** treating "already gone" as `failed` breaks the repair path — `<plugin>-doctor --fix` and the installers are both expected to be safe to re-run.
**Mitigation:** yes — a second `--uninstall` finds nothing and reports `skipped`.

## Q4 — A missing delegate is not an error

**Symptom:** condux's front door finding no `install-codex-agents.mjs` or `install-codex-hook.sh` to delegate to.
**Trigger:** `npx skills add` installs, which ship bare skill trees with no plugin manifest.
**Cause:** the sub-installers are plugin-tree files on that channel's layout.
**Mitigation:** yes — report `skipped` with the reason. The install path already probes plugin-root-first then source-tree; uninstall uses the same probe rather than a second one.

## Q5 — User data is never touched

**Symptom:** silence reading as "it might have deleted my backlog".
**Trigger:** uninstalling plugins whose data lives beside their registration.
**Cause:** `.concord/` memory files and `docket/`'s backlog tree are data, not registration.
**Mitigation:** yes — both survive uninstall, and each document names them as deliberately preserved.

## Q6 — Codex Desktop and absolute paths

**Symptom:** a verification step failing on a machine where the removal actually succeeded.
**Trigger:** verifying a removal by shelling out to `node` bare.
**Cause:** Codex Desktop does not inherit `PATH`, which is why installers record node's absolute path.
**Mitigation:** yes — use the recorded absolute path when verifying.
