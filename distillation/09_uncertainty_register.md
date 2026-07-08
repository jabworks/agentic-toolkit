# 09 — Uncertainty register (honest, as of 2026-07-08)

What this mission did NOT verify. Read this before trusting any absolute claim in the
skills or in distillation/.

## Facts not verified

- **Whether Claude Code reads `interface`** — **RESOLVED 2026-07-08** (owner-requested
  verification): Claude Code does NOT recognize it. `claude plugin validate` (2.1.204)
  warns "Unknown field 'interface'. Claude Code ignores it at load time"; the official
  plugins reference confirms unrecognized fields load fine and explicitly blesses
  cross-ecosystem metadata in one manifest. Codex docs document `interface` as native.
  Kept in both manifests for parity (docs-blessed). One consequence:
  `claude plugin validate --strict` fails on it — never add strict validation to CI
  without flipping the doctrine (campaign B3 has the recipe, incl. Claude's native
  top-level `displayName` as the replacement surface). Remaining unknown: Codex's own
  tolerance of unrecognized fields (unexercised — our manifests are fully
  Codex-documented).
- **Exact cache-refresh mechanics per host tool** — inferred from ONE evidenced
  incident (a4f4aa8, Codex). The "bump to invalidate" doctrine is safe but its
  mechanism is not documented from tool sources.
- **How each host weights `description` vs `when_to_use`** for auto-triggering —
  observed (listings concatenate them) but not specified anywhere authoritative.
- **`$schema` URL in marketplace.json** — never fetched or validated by anything here.
- **Whether marketplace `category` values other than "development" do anything.**
- **README ecosystem counts** — "40+ other tools" (line 3) vs "68+ agents"
  (Structure section) for vercel-labs/skills; contradictory, unverifiable from this
  repo (owner-confirmation-needed).
- **`npx skills add` internals** — the two-channel model is verified from this repo's
  structure + README doctrine, not by tracing the installer.

## Docs suspected stale (flag-only)

- Root `PLAN.md` — the plan-review design doc, superseded by the shipped skill;
  archive-into-docs/plans candidate (root file, outside this mission's write scope).
- `docs/plans/*.md` (11 design docs) — listed, not content-audited; may describe
  since-changed designs.

## Commands not run

- **Live weaker-model trigger-eval run** (campaign A3) — the 150-query corpus has
  never been executed against a real model. Biggest open item.
- **End-to-end plugin install** (`/plugin install toolkit-ops@…`, `codex plugin
  add …`, `npx skills add`) — install-channel behavior asserted from structure +
  passing path-resolution tests, not from a live install.
- **`scripts/install-hooks.sh`** — written and reviewed, never executed (the
  developer-local hook already present was deliberately left untouched).

## Repo areas not inspected in depth

- Reference script internals (plan-review annotate-server.js, session-report
  analyzers, technical-spec scaffold.sh) — trusted via their passing tests only.
- The remote branch `feature/interactive-planning` and `.remember/` history.

## Historical claims needing owner (Hiếu) confirmation

- The pre-normalization state ("7 of 8 pairs disagreed on skills-path form; 5 Claude
  manifests lacked interface") is evidenced only by this session's pre-edit sweeps of
  the working tree — once these changes are committed, that before-state exists in no
  commit. If it matters, it's preserved in distillation/01/02.
- "Which past mistake cost the most time" was never answered directly; the owner
  selected all four focus areas instead.

## Skills still needing real weaker-model evals

All 7 toolkit-ops skills (plus, ideally, the three condux skills whose trigger
contracts changed: preflight, subagent-execution, test-first-development).

## Deployment caveat

Everything from this mission is ONE uncommitted working-tree changeset. Committing it
partially (e.g. skills/ without dist/, or a manifest without its twin) would
transiently break the very invariants the tests enforce — commit as one change, or in
test-green stages.

Last generated: 2026-07-08
