# 10 — Maintenance plan

How to keep the library at the standard the 2026-07-08 audit left it at.

## Re-verification schedule

| When | Command | What it proves |
|---|---|---|
| Before every commit | `node --test` | mirror parity, budgets, manifest validity + pair parity, trigger contracts, marketplace paths, no-egress |
| After ANY skills/ edit | `bash scripts/sync.sh <name>` then `node --test` | the mirror is current |
| After cloning | `bash scripts/install-hooks.sh` | pre-commit auto-sync exists on this clone |
| Any skill rename/add/retire | re-read `distillation/03_trigger_matrix.md` seams + update the affected `evals/trigger_eval.json` | trigger space still partitioned |
| Quarterly (or when the library grows by ~5 skills) | re-run the routing eval (`node scripts/eval-triggers.mjs --runs 3`; see health-campaign Front A3) | descriptions still route correctly on a real model |
| Quarterly — upstream review (adopted from claude-sdlc-wizard's analyze-release pattern) | read Claude Code + Codex release notes and ask "does an official feature now REPLACE our custom one?" — check the `interface` doctrine (campaign B3 tripwire), `claude plugin eval` vs `scripts/eval-triggers.mjs`, hooks wiring, and `claude plugin validate --strict` viability | custom machinery isn't silently obsolete; the parity doctrine still matches host reality |

## Drift checks (manual spot-checks, faster than the suite)

```bash
node --test tests/dist-mirror.test.mjs            # skills/ ↔ dist/ byte parity
node --test tests/manifest-parity.test.mjs        # manifest pairs + trigger contracts
diff -r skills/<n> dist/plugins/<n>/skills/<n>    # one standalone skill by hand
diff -r skills/<n> dist/plugins/<bundle>/skills/<bundle>/<n>   # one bundle skill
jq -r '.plugins[].name' .claude-plugin/marketplace.json        # registration list
```

## How to add a new skill

Follow `skills/plugin-foundry/SKILL.md` (canonical, updated 2026-07-08) — scaffold
both trees, SKILL.md, both manifests, marketplace entry, `scripts/sync.sh`,
`node --test`, commit. Content bar: `skills/toolkit-skill-standards/SKILL.md`.
Ship gate: `skills/toolkit-change-control/SKILL.md`. Placement (bundle vs
standalone): decision tree in `distillation/02` §3 / toolkit-orientation.

## How to retire a skill

Remove all of: `skills/<n>/`, its dist target (standalone plugin dir or bundle
subdir), the marketplace entry (standalone only), the README + CLAUDE.md catalog
rows. Bundle retirement = bundle minor/major bump. Run `node --test`. Note the
removal for installed users (their copies persist until reinstall).

## How to update trigger evals

Edit `skills/<n>/evals/trigger_eval.json` (≥20 queries, keep should-NOT and
sibling-routing cases), re-sync, update `distillation/03_trigger_matrix.md`'s row for
that skill. When adding a skill that borders an existing one, add the boundary query
to BOTH eval files with the same `expected_skill`.

## How to re-run model-transfer evals

`distillation/04_model_transfer_eval.md` — 14 tasks with scoring. Tasks 2 and 5 are
mechanically reproducible (seed a drift / a parity break, watch the named test fail,
restore). The full run needs a fresh session or weaker model executing the prompts;
score PASS/GOLD/FAIL per the rubric and record results in a dated file under
`distillation/`.

## Standing rules (from the owner, encoded 2026-07-08)

- `when_to_use` is a blessed trigger-contract field alongside "Use when…" descriptions.
- Version bumps: both plugin.json manifests, on any shipped plugin content change.
- README.md/CLAUDE.md catalog rows are part of a plugin's definition of done.
- distillation/ is the audit trail — append, don't rewrite.

Last generated: 2026-07-08
