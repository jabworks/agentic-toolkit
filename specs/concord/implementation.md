# Implementation

## Layout

```
skills/concord/
  SKILL.md                 # trigger contract; teaches explicit-remember + deep grep
  README.md
  hooks/codex-hooks.json   # SessionStart / UserPromptSubmit / SessionEnd
  lib/
    paths.mjs              # project-root + global-dir resolution (worktree aware)
    rollout.mjs            # clean-room Codex rollout JSONL reader
    store.mjs              # tier read/write, atomic writes, promotion
    budget.mjs             # recall composition + oldest-first truncation
  bin/
    recall.mjs             # SessionStart: catch-up, then emit recall
    capture.mjs            # UserPromptSubmit / SessionEnd
    consolidate.mjs        # detached; deterministic promotion + codex exec
    doctor.mjs             # resolved paths, hook wiring, last capture
  references/
    install-codex-hook.sh  # wire into ~/.codex/hooks.json + config.toml
```

Mirrored to `dist/plugins/concord/` by `scripts/sync.sh`.

## Patterns to follow

- **Rollout parsing** — `skills/session-report/analyze-codex.mjs` is the
  reference for record shapes and the quirks in quirks.md. Read it before
  writing `rollout.mjs`; do not import it (different lifecycle, different
  plugin).
- **Codex hook wiring** — `skills/plan-review/references/install-codex-hook.sh`
  for the `~/.codex/hooks.json` merge and the config.toml experimental flag;
  `dist/plugins/condux/hooks/codex-hooks.json` for the manifest shape and
  `${PLUGIN_ROOT}` usage.
- **Manifests** — both `.claude-plugin/plugin.json` and
  `.codex-plugin/plugin.json`, matching on name/version/skills, both carrying
  `interface`, `hooks` **codex-only**.
- **Artifact contract** — `skills/toolkit-skill-standards/SKILL.md`. Restate the
  bootstrap inline in `SKILL.md` (toolkit-ops is not installed alongside).

## Consolidation invocation

Detached at `SessionEnd`:

```
spawn(process.execPath, [consolidate.mjs, ...], { detached: true, stdio: 'ignore' }).unref()
```

Never blocks the shell. All tier writes atomic (tmp + rename). Promotion is
copy-then-truncate, never move.

## Testing

New tests alongside the existing suite (`node --test`):

- `concord-paths.test.mjs` — worktree → main root; non-git → global bucket;
  `CODEX_HOME` honored
- `concord-rollout.test.mjs` — fixture rollout JSONL: subagent skip, truncated
  final line, out-of-order timestamps, `response_item` vs `event_msg` split
- `concord-budget.test.mjs` — oldest-first truncation, pinned/global exempt,
  overflow note, silence when empty
- `concord-store.test.mjs` — atomic write, idempotent promotion, no data loss on
  simulated mid-write kill

Existing suites that must stay green — they will fail on drift, by design:
`dist-mirror`, `skill-invariants`, `plugin-manifests`, `manifest-parity`,
`docs-catalog` (needs README.md + CLAUDE.md catalog entries).

## Registration checklist

Per `skills/toolkit-foundry/SKILL.md`:

1. `skills/concord/` + `dist/plugins/concord/` trees
2. `SKILL.md` frontmatter — trigger contract, ≤500 char description, ≤1024 total
3. Both plugin manifests
4. `.claude-plugin/marketplace.json` entry
5. `bash scripts/sync.sh concord`
6. `node --test`
7. README.md + CLAUDE.md catalog rows
8. Commit `-s`, `feat:` prefix, no Co-Authored-By

## Phasing

1. **Phase 1** — paths + rollout reader + store + recall + capture. Shippable:
   memory accrues and comes back, compressed only deterministically.
2. **Phase 2** — `codex exec` consolidation, doctor, install script.

Phase 1 is independently useful; Phase 2 is what keeps it from growing
unbounded.
