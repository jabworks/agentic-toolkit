# 04 — Model-transfer eval

Purpose: prove the audit's fixes made the library better — that a session (or a weaker
model) equipped with the current repo + toolkit-ops skills completes maintenance tasks
it would previously fumble. Designed and (where marked) live-verified against the repo
state after Phases 3–4 on 2026-07-08.

Scoring per task: PASS = minimum acceptable behavior met with evidence; GOLD = matches
the gold-standard outline; FAIL = any red flag observed.

---

## Task 1 — Add a brand-new standalone skill end to end

Prompt: "Add a `changelog-writer` skill to the toolkit and ship it."
Expected skills: plugin-foundry (primary), toolkit-skill-standards,
toolkit-change-control.
Minimum: scaffold both trees, SKILL.md with valid trigger contract, BOTH manifests,
marketplace entry, `bash scripts/sync.sh changelog-writer`, `node --test` green.
Red flags: editing dist/ skill tree by hand; one manifest; no marketplace entry;
"done" without `node --test` output; description with no trigger contract.
Gold: also runs the collision scan against all sibling descriptions and writes
evals/trigger_eval.json.
Weaker models miss: the marketplace entry (66a71eb precedent) and the codex manifest.

## Task 2 — Detect and fix a deliberate skills/↔dist divergence  ✅ LIVE-VERIFIED

Prompt: "Something's off between skills/ and dist — check and fix."
Expected: toolkit-debugging-playbook → toolkit-change-control.
Minimum: run `node --test tests/dist-mirror.test.mjs`, read the named skill from the
failure, `bash scripts/sync.sh <name>`, re-run green.
Red flags: hand-editing dist to match; claiming synced without the test output;
diffing by eyeball.
Gold: also asks WHY it drifted (hand edit vs forgotten sync) before resyncing.
Live evidence (2026-07-08): appended a comment to
dist/…/toolkit-orientation/SKILL.md → test failed naming exactly that file →
`scripts/sync.sh` → suite green. The loop works end to end.
Weaker models miss: that sync is directional (skills/ → dist/), and "fix" the source.

## Task 3 — Review a new skill's description for trigger collisions

Prompt: "Here's my new skill `skill-sync-helper`: 'Use when syncing skills to dist…'
— good to ship?"
Expected: toolkit-skill-standards.
Minimum: flag the collision with plugin-foundry's trigger space; recommend merge or
sharp disambiguation; check budgets.
Red flags: approving because the wording "reads fine"; checking only description and
ignoring siblings' `when_to_use`.
Gold: quotes the exact overlapping phrases from both skills, proposes the
discriminating trigger or an extension to plugin-foundry instead.
Weaker models miss: reading the other 20+ skills at all.

## Task 4 — Diagnose "skill isn't triggering" from a vague report

Prompt: "preflight never fires for me."
Expected: toolkit-debugging-playbook (→ toolkit-skill-standards or version bump).
Minimum: check the trigger contract in skills/preflight/SKILL.md first, then the
installed-version-vs-repo question, before proposing rewrites.
Red flags: immediately rewriting the description; never asking which install channel
/ version the user runs.
Gold: notes preflight's contract was FIXED on 2026-07-08 (when_to_use added) so a
stale installed condux (< 2.0.1) is the leading hypothesis → version-bump path.
Weaker models miss: the stale-cache hypothesis entirely (a4f4aa8 class).

## Task 5 — Fix a plugin.json breaking pair parity  ✅ LIVE-VERIFIED

Prompt: "CI is red on manifest parity for git-commit."
Expected: toolkit-plugin-reference, toolkit-debugging-playbook.
Minimum: `node --test tests/manifest-parity.test.mjs`, read the exact field diff from
the failure, fix the LAGGING manifest, re-run green.
Red flags: changing both manifests blindly; "fixing" the claude-side hooks absence
(by-design asymmetry); leaving the pair on different versions.
Live evidence (2026-07-08): set codex git-commit version to 9.9.9 → test failed with
`"version" differs — claude "1.0.1" vs codex "9.9.9"` → restored → green.
Weaker models miss: which side is authoritative (answer: whichever matches the
shipped content change — check git diff, not vibes).

## Task 6 — Duplicate-skill decision

Prompt: "I want a skill that adapts skills we find on GitHub into this repo."
Expected: toolkit-skill-standards, adapting-skills (as the incumbent).
Minimum: identify adapting-skills as the existing owner of that trigger space;
recommend extending it, not shipping a twin.
Red flags: scaffolding the new skill first and comparing later.
Gold: also names the second seam (plugin-foundry owns this-repo mechanics that any
adapted skill must still pass through).
Weaker models miss: that "adapt" + "skill" is already claimed vocabulary.

## Task 7 — Identify a stale catalog/registry claim

Prompt: "Audit the README install docs against reality."
Expected: toolkit-orientation (docs trust order) → toolkit-docs discipline.
Minimum: diff README claims against disk (`ls scripts/`, `jq` the marketplace,
`cat .github/workflows/ci.yml`) and report contradictions with paths.
Red flags: trusting the README as ground truth; "looks fine".
Gold: knows the class of failure from history — the validate.sh ghost lived in
README from eb2b5b5 until 2026-07-08 while the catalogs were missing 3 plugins.
Weaker models miss: verifying claims about CI against the actual workflow file.

## Task 8 — Append-only correction to README.md

Prompt: "README says X and it's wrong — fix the doc."
Expected: toolkit-change-control (doc-only class), git-commit (if committing).
Minimum: minimal targeted edit; no wholesale rewrite; no version bump (doc-only,
outside plugin content); house-style commit only if asked.
Red flags: rewriting unrelated sections; bumping versions for a root-doc change;
silently deleting the wrong claim's history where an appended correction was asked.
Weaker models miss: the doc-only class needing NO version bump (vs skill README.md
inside a plugin, which does).

## Task 9 — Reconstruct the publish checklist WITHOUT plugin-foundry

Prompt: "From tests and scripts alone, derive what 'published' means here."
Expected: toolkit-change-control (or raw repo reading).
Minimum: derive source-written + mirror-synced + both-manifests + marketplace-entry
+ node --test + house commit from tests/*.test.mjs and scripts/sync.sh.
Red flags: inventing steps no test enforces (e.g. changelog files); missing the
marketplace entry because no single test screams about it loudly.
Gold: maps each checklist item to the exact test file that enforces it.
Weaker models miss: manifest PAIR parity as part of done (new since 2026-07-08).

## Task 10 — External template adoption decision

Prompt: "Found a great skill template in another repo — drop it in as-is?"
Expected: adapting-skills → toolkit-skill-standards → plugin-foundry.
Minimum: no as-is adoption — run it through adapting-skills conventions, then this
repo's frontmatter/mirror requirements, then the foundry pipeline.
Red flags: copying the template's own manifest/marketplace conventions (e.g.
`strict`/`skills` arrays) into this repo's marketplace.json.
Gold: cites plugin-foundry's own provenance (adapted from softaworks plugin-forge —
adaptation, not adoption, is the house pattern).
Weaker models miss: foreign marketplace schemas leaking in.

## Task 11 — Retire a skill correctly

Prompt: "We're killing spec-browser. Remove it."
Expected: toolkit-change-control (retirement class).
Minimum: remove skills/spec-browser/, dist/plugins/spec-browser/, the
marketplace.json entry, AND the README + CLAUDE.md catalog rows; `node --test` green
after; note the removal for users of installed copies.
Red flags: removing only skills/ (dist keeps installing); leaving a dangling
marketplace source (skill-invariants would catch — run it); forgetting catalog rows
(nothing catches those yet — frontier item D2).
Weaker models miss: the catalog rows and the installed-user impact.

## Task 12 — Forensic review of a claimed "synced" skill

Prompt: "Previous session says it synced everything. Trust but verify."
Expected: toolkit-change-control, toolkit-debugging-playbook.
Minimum: `node --test` (not `ls`) as the verification; check the condux plugin-level
agents/ mirror specifically if agents changed.
Red flags: accepting the claim from the transcript; verifying with directory listings
instead of byte-parity tests.
Gold: knows the agents/ blind spot precedent (6ba6572) — "synced" once meant "synced
except the part that mattered".
Weaker models miss: that a passing dist-mirror test still says nothing about
manifests (separate tests) — run the whole suite.

## Task 13 — Bundle vs standalone placement

Prompt: "New skill: 'workflow-metrics' — dashboards for condux tier usage. Where does
it live?"
Expected: toolkit-orientation (placement tree), plugin-foundry.
Minimum: apply the placement decision tree — workflow-tier adjacent → condux bundle,
with the dist target at dist/plugins/condux/skills/condux/<name>/ and a condux minor
bump; NOT a new standalone plugin without justification.
Red flags: defaulting to standalone (marketplace sprawl); scaffolding under
dist/plugins/workflow-metrics/ then ALSO under condux.
Weaker models miss: that bundle membership changes the sync target and the version
bump target (condux's manifests, not new ones).

## Task 14 — Version-bump matrix under pressure

Prompt: "I fixed a typo in finalize's SKILL.md and added a new skill to toolkit-ops.
What bumps?"
Expected: toolkit-change-control.
Minimum: condux patch (typo in bundled content), toolkit-ops minor (new bundle
member); both manifests each; marketplace untouched.
Red flags: bumping marketplace.json; bumping only one manifest; skipping the condux
bump because "it's just a typo" (cache-refresh rule says bump anyway).
Weaker models miss: the cache-invalidation rationale that makes "just a typo" bumps
non-optional.

---

## What this eval measures

Tasks 1/8/11/13/14 test the change-control + foundry pipeline; 2/5/12 test the
verification loop (both live-verified today); 3/6/10 test collision/adoption
judgment; 4/7 test evidence-over-assumption; 9 tests whether the doctrine survives
without its documents. A model that passes 12+ of 14 with evidence is trusted to
maintain this repo unsupervised; below 10, restrict it to toolkit-orientation +
read-only triage.

Not yet done: an actual scored run with a weaker model (Haiku-class) — recorded as
campaign phase A3 / uncertainty register.

Last generated: 2026-07-08
