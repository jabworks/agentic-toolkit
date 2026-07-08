# Library-health campaign — four fronts

Owner-selected fronts (2026-07-08): A trigger precision, B manifest parity,
C sync/publish automation, D docs staleness. Status is recorded per phase so the
campaign is resumable by any session. Update statuses as phases complete; never
delete a phase — mark it done with evidence.

Publish protocol for EVERY front: changes flow through `toolkit-change-control`'s
checklist (sync → `node --test` → marketplace/docs as applicable → commit only when
the owner asks, house style).

---

## Front A — Trigger precision & collisions

Goal: every toolkit skill triggers on its intended prompts and loses cleanly on its
siblings' prompts.

### A1. Static baseline — DONE 2026-07-08
- Command: audit all 20+ SKILL.md trigger contracts (description + `when_to_use`).
- Observed: 3 skills had no machine-visible trigger contract (preflight,
  subagent-execution, test-first-development) → fixed by adding `when_to_use`.
- Evidence: git diff of the three frontmatter blocks; `node --test` green after.

### A2. Eval corpus — DONE 2026-07-08 (extended to condux same day)
- Command: write `skills/<n>/evals/trigger_eval.json` (≥20 realistic queries each,
  including should-NOT-trigger cases aimed at sibling skills).
- Observed: corpus exists for all 7 toolkit-ops skills AND all 12 condux skills
  (398 queries total; using-condux was merged into workflow on 2026-07-08 and its
  eval queries re-pointed), mirrored to dist (`ls skills/*/evals/`). Cross-bundle
  seams (preflight↔toolkit-change-control,
  root-cause-analysis↔toolkit-debugging-playbook) are tested from both sides.

### A3. Live model scoring — BASELINE RECORDED 2026-07-08 (target not yet met)
- Harness: `node scripts/eval-triggers.mjs [--model <id>] [--limit <n>]` — builds
  the catalog from live SKILL.md frontmatter, batches the corpus through
  `claude -p` (default judge: claude-haiku-4-5-20251001, ~34 calls per full run).
- Result: **76.0% (298/392)**, 0 failed batches. Full report + raw JSON:
  `references/eval-baseline-2026-07-08.{md,json}`.
- Miss taxonomy (94 misses):
  1. ~60% are judge-nulls on in-context/follow-up phrasings ("is the build
     green", "whats the task card format again") — the corpus conflates
     cold-trigger queries with questions asked while the skill is already
     loaded. Fix the corpus (tag or split in-context cases), not descriptions.
  2. Doctrine-correct alternates scored as misses — routing dev-task queries to
     `workflow` IS the condux entry contract; the scorer should accept it as
     valid for implementation requests.
  3. Genuine contract gaps, fixed same day: workflow's when_to_use gained the
     operating-manual vocabulary orphaned by the using-condux merge (all its
     philosophy queries had judge-nulled); subagent-execution (worst skill,
     6/15) gained ledger/task-brief/resume vocabulary (two misses had routed to
     session-handoff).
  4. Confirmed live collisions, matching the usability review's predictions:
     plan-review↔spec-browser ("review the spec folder"),
     subagent-execution↔session-handoff (resume space), and
     toolkit-change-control's 3-way crowding with orientation/plugin-reference
     (12/18).
- Branch taken: <90% → trigger-contract fixes applied for the two worst skills
  (taxonomy 3). Remaining A3 work: corpus semantics split + scorer alternates
  (taxonomy 1–2), then re-run.
- Wrong path (still fenced): keyword-stuffing descriptions with eval queries
  verbatim — the two fixes above add capability vocabulary the skills genuinely
  own, not eval phrases.
- Success criterion unchanged: ≥90% accuracy, zero unexplained collisions.

### A4. Collision automation — OPEN (after A3)
- Only worth building if A3 shows recurring drift: a script that flags description/
  when_to_use n-gram overlap between skill pairs above a threshold.
- Success criterion: the script reproduces ≥80% of A3's observed collisions with <20%
  false alarms; wired into `node --test` as a warning, not a failure.

---

## Front B — Claude↔Codex manifest parity

Goal: the two manifests of every plugin are a verified pair.

### B1. Normalize — DONE 2026-07-08
- Commands run: jq sweep of all 16 manifests; `interface` added to 5 Claude manifests;
  `skills` normalized to `"./skills/<plugin-dir-name>"` on 7 divergent pairs;
  session-report descriptions unified; every touched plugin patch-bumped in both
  manifests.
- Evidence: `for m in dist/plugins/*/.{claude,codex}-plugin/plugin.json; do jq -r '.skills + " " + .version' "$m"; done`

### B2. Enforce — DONE 2026-07-08
- `tests/manifest-parity.test.mjs`: pair exists, name/version/skills equal,
  `interface` present in both, `skills == "./skills/<dir-name>"`; `description` and
  `interface` content may carry platform wording; `hooks` allowed codex-side only.
- Success criterion (met when `node --test` is green and stays green): any future
  asymmetric edit fails CI.

### B3. Watch — ONGOING (verification executed 2026-07-08)
- Verified: `claude plugin validate` (Claude Code 2.1.204) reports `interface` as an
  unknown field it "ignores at load time"; official Claude docs bless carrying
  foreign-ecosystem metadata (warning, not error). Codex docs document `interface`
  as its native install-surface block. Branch NOT triggered — warning ≠ rejection;
  the parity doctrine stands.
- Standing tripwire: `--strict` treats that warning as an error. If strict validation
  is ever added to CI, flip the doctrine FIRST: remove Claude-side `interface`,
  allow-list the asymmetry in tests/manifest-parity.test.mjs, optionally adopt Claude's
  native top-level `displayName` (recognized v2.1.143+) — and record the decision in
  the incident ledger.

---

## Front C — Sync/publish automation

Goal: no clone can accidentally ship drift.

### C1. Generalize sync — DONE 2026-07-08
- `scripts/sync.sh` + `tests/dist-mirror.test.mjs` now detect ANY
  `dist/plugins/<p>/skills/<p>/<name>` bundle, not just condux.
- Evidence: `bash scripts/sync.sh` output shows toolkit-ops targets; `node --test`.

### C2. Version the hook — DONE 2026-07-08
- `scripts/install-hooks.sh` writes the pre-commit sync hook; plugin-foundry no longer
  claims the hook is automatic.

### C3. Close the fresh-clone gap — HALF DONE
- DONE 2026-07-08: setup notes exist in README ("Structure" section) and CLAUDE.md
  ("After cloning, `bash scripts/install-hooks.sh` installs the pre-commit sync hook").
- OPEN: optionally, a test that WARNS (not fails) when `.git/hooks/pre-commit` is
  absent locally.
- Wrong path (fenced): committing anything into `.git/` or requiring husky/deps —
  this repo is dependency-free by policy.
- Success criterion: documented setup step exists; a contributor following README
  cannot end up hook-less unknowingly.

---

## Front D — Docs staleness

Goal: docs of record never contradict the disk for more than one change cycle.

### D1. Fix current staleness — DONE 2026-07-08 (owner-authorized)
- README validate.sh ghost replaced with the real CI commands; spec-browser,
  git-commit, git-operations, toolkit-ops added to README + CLAUDE.md catalogs;
  CLAUDE.md "Use when…" invariant amended to name the two-field trigger contract.

### D2. Enforce catalogs — OPEN
- Proposed: extend `node --test` with a docs-catalog check — every
  `marketplace.json` plugin name must appear in README.md and CLAUDE.md.
- Expected observation on first run: passes (post-D1). Introduce a fake plugin entry
  locally to confirm it fails.
- Success criterion: removing any catalog row turns CI red.

---

Last updated: 2026-07-08 (initial campaign; B and C substantially closed; A3/A4,
C3's warn-test, and D2 open. Post-review fixer pass applied same day — see
distillation/08_fixer_report.md).
