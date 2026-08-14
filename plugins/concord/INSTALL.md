# Installing concord

Front door for concord's install story. The procedure itself lives four levels
down, at `skills/remember/references/INSTALL.md` — this document exists
so you do not have to find it, and so the per-host outcome is readable before
you commit to anything.

```bash
bash skills/remember/references/install-codex-hook.sh
bash skills/remember/references/install-codex-hook.sh --dry-run
```

Both the script and that document implement the same procedure — run the script
when you can, follow the document by hand when you cannot (no bash, restricted
shell, or the user wants to see each step). Both follow the **toolkit
ease-of-install convention**: `detect → register → verify → report`. Every step
is safe to re-run, and registration is read-modify-write on concord's own keys —
it never rewrites config another plugin owns.

## concord is Codex-only

This is the whole shape of concord's install story, and it is why the table
below is mostly empty. concord's capture hooks read Codex rollout files; there
is no equivalent surface on the other two hosts, so there is nothing to
register there and nothing is missing when it reports `skipped`.

| Host | Outcome | Why |
|---|---|---|
| Claude Code | `skipped` | concord registers nothing here. |
| OpenCode | `skipped` | Same — no rollout surface to read. |
| Codex | three hook events merged into `$CODEX_HOME/hooks.json`, then `[features] hooks = true` in `config.toml` | The hooks are the whole plugin. Without the feature flag the file parses, the paths resolve, and no hook ever fires. |

`CODEX_HOME` is `$CODEX_HOME` when set, else `~/.codex`. A host that is not
installed reports `absent`; neither `skipped` nor `absent` is a failure, and
neither is omitted from the report.

**The feature flag is shared.** `[features] hooks = true` is not owned by
concord — condux and plan-review ride the same flag. Setting it is safe and
idempotent; clearing it would break them, which is why no uninstaller touches it
(see Removal).

## Verify

```bash
node skills/concord-doctor/doctor.mjs
```

The doctor is the standing version of the installer's verify step: it probes
both Codex registration paths, all three hook events, the feature flag, and the
store. `--fix` delegates the repair back to the installer rather than
reimplementing registration.

## Source layout

In this repo the installer and its document live under the skill that owns them
— `skills/remember/references/` — and `scripts/sync.sh` mirrors the skill into
the plugin. The paths above are the ones a user actually lands on; edit the
sources, never the mirror.

Note that the deep document resolves its own base path relative to itself
(`SKILL` = this file's parent's parent). That is why this front door points at
it rather than replacing it — a copy at the plugin root would compute the wrong
skill root on its first step.

## Removal

The deep document carries a `## Removal` section; follow that. In short: drop
concord's three events from `$CODEX_HOME/hooks.json`, leave `[features] hooks`
alone because other plugins depend on it, and leave the memory files under
`.concord/` alone unless you mean to lose them. Re-run the doctor to confirm the
registration is gone.

Docket #2 is the standing item for writing this as a full `UNINSTALL.md` across
all three plugins.
