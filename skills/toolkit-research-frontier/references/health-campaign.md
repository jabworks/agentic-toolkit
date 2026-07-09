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

### A3. Live model scoring — DONE 2026-07-08 (verdict refined 2026-07-09: operating band ~89–92%, borderline vs the 90% bar)

Three-run progression, same judge (claude-haiku-4-5-20251001), zero failed batches:

| Run | Score | What changed before it |
|---|---|---|
| baseline (`eval-baseline-…`) | 76.0% (298/392) | none — raw corpus, full contracts as shipped |
| round 2 (`eval-rerun-…`) | 85.8% (320/373) | workflow + subagent-execution contract fixes; 19 in-context cases excluded; accepts introduced |
| round 3 (`eval-round3-…`) | **91.7% (342/373)** | plan-review machinery vocabulary, tfd spec-edit ownership, discovery brainstorm phrasing, change-control retire trigger, one-hop accepts |

Remaining 31 misses are genuine adjacencies (discovery↔session-handoff "resume"
space, draft-plan↔technical-spec doc-creation space) — seed material for A4.

**Trials addendum (2026-07-09):** a 3-trial CI run (`eval-trials-2026-07-08.md`)
was attempted but 29/96 batches failed on session limits — its headline
"91.6% ± 6.1pp" is statistically unsound (run 3 scored only 36 cases). What
stands: two near-complete trials measured **90.6%** and **89.8%**, which with
round 3's 91.7% gives three independent measurements clustering at ~90–92% —
the ≥90% criterion holds across runs, but a clean multi-trial CI is deferred to
a quiet usage window (the harness now retries with backoff and aborts a run
early on limit-class errors). The **35 flaky cases** recorded there are prime
A4 seed material — "resume the design we started yesterday" (discovery↔
session-handoff) is the most unstable seam at 1/3.

**Clean trials (2026-07-09,** `eval-trials-2026-07-09.md`, post-release-skill
corpus of 394 cold cases, limit-resilient harness, **0 failed batches):**
3 trials at 89.8 / 86.5 / 89.8 → mean **88.7% ± 4.7pp** (95% CI, t-dist).
Honest read: round 3's single-run 91.7% sat at the top of the noise band; the
operating rate is high-80s-to-low-90s and the CI *straddles* the ≥90% criterion
rather than clearing it. Dominant error mode is judge variance (44 flaky cases,
mostly one-hop adjacencies). Bright spot: the brand-new `release` skill routed
**15/15** with zero contract tuning — the authoring standards hold. Standing
claim going forward: **~89–92%, criterion borderline-met**; further gains come
from flaky-seam contract work (discovery↔session-handoff first), not more runs.

--- Original phase design (kept for provenance): ---
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

### A4. Collision automation — CLOSED 2026-07-09: lexical approach falsified
- Preregistered criterion: static n-gram overlap reproduces ≥80% of observed
  collisions with <20% false alarms.
- Result (`node scripts/collision-scan.mjs --check`): **max recall 5%** at every
  threshold 0.08–0.18. Two verified reasons: the observed collisions are semantic
  adjacencies whose contracts share almost no vocabulary (the 2026-07-08
  disambiguation passes de-overlapped them lexically), and the highest lexical
  overlaps are mutual cross-reference vocabulary — deliberate disambiguation —
  partially inverting the signal.
- Adopted detector instead: the eval harness itself — sibling-miss pairs and the
  flaky list from periodic `scripts/eval-triggers.mjs` runs (cadence in the
  maintenance plan). The curated empirical-pair registry lives in
  `scripts/collision-scan.mjs` (update it per eval round); the script stays as
  the falsification record and an exploratory lens (`--top`).

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

### C3. Close the fresh-clone gap — DONE 2026-07-08
- Setup notes exist in README ("Structure" section) and CLAUDE.md ("After cloning,
  `bash scripts/install-hooks.sh` installs the pre-commit sync hook").
- `tests/local-hooks.test.mjs` WARNS (never fails) when `.git/hooks/pre-commit` is
  missing or doesn't run sync.sh; silent on CI (CI checks drift directly).
- Success criterion met: a contributor cannot end up hook-less unknowingly —
  `node --test` tells them even if they skipped the README.
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

### D2. Enforce catalogs — DONE 2026-07-09
- `tests/docs-catalog.test.mjs`: every marketplace plugin must appear in README
  (skill link or install id) and CLAUDE.md (backticked table row) — bare
  substring matches deliberately rejected. Removing any catalog row turns CI red.

### C4. Publish-surface dry-run in CI — SHIPPED (advisory) 2026-07-09
- `scripts/validate-plugins.sh`: every plugin must pass `claude plugin validate`
  with exactly the one known `interface` warning (the tested parity contract);
  anything else fails. Wired into ci.yml as the `release-dry-run` job —
  `continue-on-error: true` until the CLI is proven headless-stable on runners,
  then flip to enforcing. Load-bearing constraint documented in the script:
  never `--strict` while the interface-parity doctrine stands.

---

Last updated: 2026-07-08 (B and C closed; A3 baseline recorded with corpus-semantics
re-run in progress; A4 and D2 open. Post-review fixer pass applied same day — see
distillation/08_fixer_report.md).
