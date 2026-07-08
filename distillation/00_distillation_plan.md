# 00 — Distillation plan (evaluation contract)

Mission: audit and upgrade `jabworks/agentic-toolkit`'s skill library in place — in this
working tree, now — per `DAWN_DIRECTIVE.md`. This directory (`distillation/`) is the
mission's planning/scratch trail, not a shipped skill.

## 1. What this evaluation is optimizing for

- A correct, internally-consistent skill library in this repo **today** — not a knowledge
  deposit for a hypothetical future session.
- Hiếu (project owner) reviewing the audit findings and the fixes before they ship.
  Nothing is committed by this mission (no mutating git commands); everything stays
  reviewable in `git status` / `git diff`.
- Anyone working in this repo next inherits a better state as a side effect, not as the
  stated goal.

## 2. Capability types to preserve

- Repo navigation: `skills/` (editable source, also the `npx skills add` install source)
  vs `dist/plugins/` (build mirror, the marketplace install source) vs `.claude-plugin/`
  (marketplace registry) vs per-plugin `.claude-plugin/` + `.codex-plugin/` manifests.
- Skill-authoring standards: frontmatter budgets (description ≤ 500 chars, frontmatter
  ≤ 1024 chars), "Use when..." trigger-first descriptions, progressive disclosure
  (SKILL.md runbook vs `references/`).
- The scaffold → author → manifests → marketplace registration → `scripts/sync.sh` →
  `node --test` → commit workflow (canonical source: `skills/plugin-foundry/SKILL.md`).
- Debugging skill/plugin problems: trigger misses, dist drift, manifest errors,
  marketplace path errors.
- Marketplace and manifest schema knowledge (`.claude-plugin/marketplace.json`,
  paired `plugin.json` for Claude Code and Codex).
- The condux bundle's internal tiering. **Disk-confirmed skill list** (source of truth:
  `skills/` directories, verified 2026-07-08): workflow, discovery, draft-plan,
  test-first, subagent-execution, subagent-deployment, finalize, code-review, preflight,
  root-cause-debugging, plan-review, technical-spec, using-condux (+ spec-browser as a
  standalone plugin). NOTE: `CLAUDE.md`'s condux row currently names
  `test-first-development` and `root-cause-analysis`, which do **not** exist on disk —
  disk names win pending owner confirmation (see uncertainty register).
- Evidence review: verifying claims about this repo against actual files, never
  against assumption or "how skill repos usually work."
- Forensic failure archaeology: mining `git log` for real, evidenced mistakes.
- Documentation maintenance (README.md, CLAUDE.md, per-skill README.md) — noting that
  README.md and CLAUDE.md are **read-only** for this mission; defects there get flagged,
  not silently fixed.
- Skeptic/adversarial review of new skills before they ship (Phase 6).
- Publish/registration decisions: is a skill done, or missing a manifest / registration /
  sync step.

## 3. Failure modes the skills must prevent

- Hallucinated paths, flags, commands, or schema fields that don't exist in this repo.
- `dist/plugins/<name>` diverging from `skills/<name>` (hand-edited dist, or sync
  forgotten). Enforced today by `tests/dist-mirror.test.mjs`; skills must not re-derive a
  weaker manual substitute.
- A skill shipped without both `.claude-plugin/plugin.json` and
  `.codex-plugin/plugin.json`.
- A skill authored but never registered in `.claude-plugin/marketplace.json`.
- `description` fields that don't lead with trigger conditions, exceed 500 chars, or push
  frontmatter past 1024 chars.
- A new skill silently overlapping an existing skill's trigger space (esp.
  `plugin-foundry`, `adapting-skills`, condux skills).
- Reading a skill from the system/installed plugin cache instead of this repo's
  `skills/<name>/SKILL.md` (CLAUDE.md: "Always look up skills from `skills/`").
- Writing to `.claude/skills/` or `~/.claude/` instead of `skills/` + `dist/plugins/`.
- Overwriting history instead of appending corrections to docs.
- Stale docs (README.md, CLAUDE.md) overriding what the repo actually shows — live
  example already found: README.md claims `scripts/validate.sh` runs in CI (verify),
  and CLAUDE.md's condux row names two skills that don't exist on disk.
- Commits that skip `-s` signoff, use the wrong prefix, or add a `Co-Authored-By`
  trailer. (This mission itself makes no commits.)

## 4. Expected final artifact inventory

- New skill folders under `skills/` with verbatim mirrors under `dist/plugins/`
  (condux-bundled skills mirror to `dist/plugins/condux/skills/condux/<name>/`).
- Updated `.claude-plugin/marketplace.json` entries for every new standalone plugin.
- In-place fixes to existing skills where the audit finds real defects.
- Trigger evals per new skill (`skills/<name>/evals/trigger_eval.json`, ≥ 20 queries).
- `distillation/` index (`README.md`), capability map, expert-distillation notes,
  trigger matrix, model-transfer eval, three review reports + fixer report,
  uncertainty register, maintenance plan.

## 5. Write-scope guardrails (hard)

- Writes only inside: `skills/`, `dist/plugins/`, `.claude-plugin/marketplace.json`,
  `distillation/`.
- Never: `~/.claude/`, repo-root `.claude/skills/` (installed-plugin mirror, currently
  empty — confirmed by inspection), README.md, CLAUDE.md, `scripts/`, `spec/`, `tests/`
  (defects there get flagged in the uncertainty register instead).
- No mutating git commands; no "verified/fixed/done" claims without commands or
  artifacts to back them.

## 6. Scope amendments — owner rulings (appended 2026-07-08, after Phase 1 Q&A)

Hiếu's answers to the Phase 1 questions amend the contract above:

1. **New-skill count**: consolidated **~7 dense skills**, covering all 16 directive
   capability families (mapping recorded in the Q&A and distillation/README.md).
2. **Packaging**: one condux-style bundled plugin (`toolkit-ops`), single marketplace
   entry, skills nested at `dist/plugins/toolkit-ops/skills/toolkit-ops/<name>/`.
3. **Description doctrine**: `when_to_use` is blessed — description + when_to_use
   together form the trigger contract. "Use when…" is enforced only on new skills and
   where description is the sole trigger field. Existing descriptions are NOT rewritten.
4. **Focus areas** (all four selected): trigger precision & collisions, Claude↔Codex
   manifest parity, sync/publish automation, docs staleness. The hardest-problem
   campaign skill becomes a four-front library-health campaign.
5. **Docs write scope EXPANDED**: README.md and CLAUDE.md defects (validate.sh ghost,
   missing catalog rows, invariant wording) may be fixed in this mission — overriding
   the directive's read-only default for these two files only.
6. **tests/ + scripts/ additions**: authorized by the directive's own Phase 2 §5
   ("encode that as … a new scripts//tests/ addition") and the owner's focus choices:
   a new `tests/manifest-parity.test.mjs`, a versioned pre-commit installer
   (`scripts/install-hooks.sh`), and — required by the approved bundle packaging —
   generalizing the hardcoded condux-only bundle detection in `scripts/sync.sh` and
   `tests/dist-mirror.test.mjs` so any `dist/plugins/<p>/skills/<p>/<name>` bundle
   syncs and is parity-checked. These are the only touches to scripts/ and tests/.

Last generated: 2026-07-08 (amended same day after owner Q&A)
