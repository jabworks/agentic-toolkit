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

**Post-foundry-rename trials (2026-07-09,** `eval-trials-2026-07-09-post-foundry.md`,
same 394-case corpus with the 4 foundry cases renamed after plugin-foundry was
absorbed into toolkit-ops as `toolkit-foundry`, **0 failed batches):**
3 trials at 87.1 / 90.1 / 88.6 → mean **88.6% ± 3.8pp** (95% CI, t-dist).
Statistically identical to the same-day baseline (88.7% ± 4.7pp) — the rename
cost nothing: **toolkit-foundry routed 4/4**, matching plugin-foundry's record.
Flaky count 37 (vs 44); discovery↔session-handoff remains the worst seam.
Standing claim unchanged.

**Post-discovery-rewrite trials (2026-07-11,** `eval-trials-2026-07-11.md`,
same 394-case corpus after discovery's description gained the two-round
detail-questioning wording (condux 2.4.0), **0 failed batches):**
3 trials at 88.1 / 88.6 / 88.6 → mean **88.4% ± 0.7pp** (95% CI, t-dist) —
the tightest trial spread recorded. Statistically identical to post-foundry
(88.6% ± 3.8pp): the rewrite cost nothing. Discovery routed 11/15; its misses
are the *same* pre-existing cases (the discovery↔session-handoff "resume"
seam, the technical-spec "design before documenting" adjacency). Flaky count
39. Standing claim unchanged.

**Design-resume seam fix (2026-07-11/12,** `eval-trial3-2026-07-12.md`,
corpus grown to 418 with preflight drift-check vocabulary +
session-handoff's first corpus, 21 cases): sharpened both sides of the
discovery↔session-handoff boundary (session-handoff dropped the bare
"resume" phrase and claims handoff-document resumption only; discovery
claims design resumption explicitly — condux 2.5.1 / session-handoff
1.5.3). Measurements: 90.0% (complete), 88.3% (30/35 batches,
limit-aborted), 88.5% (complete, 0 failed batches) — in band. The seam
itself: "resume the design we started yesterday" hit **3/3 valid trials**
(was 1/3 since 07-08); discovery 14/15, session-handoff 16/16.
Next-worst seams now: discovery↔technical-spec ("design before
documenting") and the new drift-check vocabulary (preflight↔technical-spec,
flaky in the limit-crashed run, clean in trial 3) — same treatment
available if they stay noisy. Standing claim unchanged (~89–92%).

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

### A3b. Trajectory-based scoring — PRICED AND DECLINED 2026-08-25 (docket #14)

Priced `@microsoft/vally`'s `skill-invocation-grader` against the judge-prompt
harness, as docket #14 asked. Three results, and the third closes it.

**vally is not needed.** Its grader walks `trajectory.events` counting
`skill_activation` against `{required, disallowed}`. That signal is already
emitted by `claude -p --output-format stream-json` as a `Skill` tool_use block,
so the free/deterministic half is ~30 lines of our own code. Adding an npm
dependency to a dependency-averse repo to avoid writing them is the wrong
trade — the primitive worth stealing is `disallowed`, and it can be added to
the *existing* judge harness without any of this.

**The API spend is not the cost.** Measured over 15 real runs:
**$0.027/run, ~9.8s, 1.9 turns** — so the 619-case corpus is ~$17 and ~70
minutes serial. That is affordable, and it is not the obstacle.

**The corpus is not portable, which is the obstacle.** A 12-case stratified
probe (6 dev-task, 6 non-dev, all `should_trigger: true`) produced **3
activations out of 12**. Every dev-task case activated **nothing at all** —
not the expected skill, and not `condux:workflow` either.

The mechanism is visible in the replies. `"write the implementation plan"`
returns *"I need to know what you're planning for. What's the task or feature
you want an implementation plan for?"* — a clarifying question, which is the
correct response. These stimuli were authored for a routing judge ("given this
catalog, which skill would you pick for this phrase"), and they are phrases,
not tasks. A real agent cannot route what is not yet a request.

Control: `"I need to add OAuth2 login with Google to our app"` — a realistic,
context-bearing prompt — **does** activate `condux:workflow`. So the failure is
the stimulus shape, not the method and not the router.

**Therefore:** trajectory scoring is not a drop-in replacement for A3. It needs
a rewritten corpus of realistic task prompts *and* a project fixture to run
them against (`"verify it live"` needs something to verify). That authoring
cost dominates the ~$17 of API calls by a wide margin, and it would measure a
different question — deployed behaviour including hooks, rather than catalog
legibility.

The cheap harness is vindicated **for what it measures**. Judge variance
remains its known cost (A3 above); this exercise did not reduce it, and did not
find a cheaper way to. Revisit only if a fixture repo exists for another reason.

Prediction that failed, recorded because it was wrong in an informative way:
the condux `SessionStart` routing hook was expected to dominate dev-task cases
and force `condux:workflow` everywhere. It forced nothing — 0/6 — because those
cases never became tasks.

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

### A3c. `disallowed` assertions — SHIPPED 2026-08-25 (docket #53)

The one primitive worth stealing from `@microsoft/vally`, salvaged from A3b's
decline. vally's grader takes `{required, disallowed}`; we had only the
`required` half (`expected_skill` scored against the judge's pick). Our
`should_trigger: false` cases approximated the other half as a *routing
decision* ("route this to null"), which is a weaker claim than "this skill must
NOT fire here" about exactly the collisions A3 keeps naming as its dominant
error mode.

**Shipped as a separate reported metric, not a hard fail.** A `disallowed`
violation does not touch `isHit`, so the ~89–92% operating band above stays a
like-for-like series across every run recorded in this section. The alternative
— failing the case outright — states the collision more strongly but re-bases
the accuracy number, and that number is what this campaign is judged on. A case
can now pass its routing check and still be reported as a violation; inferring
the same collision from an accuracy dip could not have surfaced that at all.

Scope as built:
- `disallowed: ["skill-a"]`, optional and per-case, in `skills/*/evals/trigger_eval.json`.
- Scored in `scripts/trigger-eval-score.mjs` — extracted from `eval-triggers.mjs`
  specifically so the predicates are testable without spawning a judge.
- Reported as its own headline line plus a `## Disallowed violations` table,
  counted across **every** trial rather than the last run, since a collision
  that fires in 1 of 3 trials is the signal.
- 17 seeded cases covering the three seams A3 names: discovery↔session-handoff
  ("resume" space), draft-plan↔technical-spec (doc-creation), and
  subagent-execution↔session-handoff (resume/ledger space).

Two guards, both because this metric's failure mode is silence — a misspelled
skill name matches no routing answer ever, so the counter reads zero and looks
like a clean corpus:
- `tests/trigger-eval-corpus.test.mjs` — the 643-case corpus had **no**
  validation before this. Every name in `expected_skill` / `accept` /
  `disallowed` must resolve to a real `skills/<name>/SKILL.md`, no case may
  disallow its own expectation or an accept alternate, and `disallowed` may not
  be parked on a `kind: "in-context"` case (default runs never score those).
- `tests/trigger-eval-score.test.mjs` — the predicates themselves, including an
  assertion that `isHit` semantics are unchanged.

Two partial runs verified the mechanism on the day it shipped, before the band
run below. Neither is a band measurement:
- A **103-case** partial (9 batches, 1 trial) covered 1 of the 17 seeded cases —
  "resume the design we started yesterday" routed to `discovery` as expected,
  0 violations. It scored 97.1% on that subset, which is not comparable to
  anything: different corpus composition, single trial, no CI.
- A **12-case** run with one case temporarily self-disallowing confirmed the
  non-empty path: accuracy **12/12 = 100%** *while* the violation table reported
  a row. That is the design claim made visible — a case passes its routing check
  and is still reported. The temporary edit was reverted; the corpus test forbids
  self-disallowing cases precisely because they are self-contradicting.

### A3d. First band with `disallowed` live — MEASURED 2026-08-25

`eval-disallowed-band-2026-08-25.{md,json}`, 598 cold cases, 3 trials,
**0 failed batches** (the first clean multi-trial run since 2026-07-12).

Per-run **93.8 / 93.8 / 92.5** → mean **93.4% ± 1.9pp** (95% CI, t-dist).

**The ≥90% criterion is met for the first time, not straddled.** The interval is
[91.5, 95.3]; every prior 3-trial run put the lower bound below 90 (88.7 ± 4.7,
88.6 ± 3.8, 88.4 ± 0.7). Standing claim updated from ~89–92% to **~92–95%**.

**Read this as not-like-for-like.** The corpus grew 394 → 598 cold cases since
the 88.4% run on 2026-07-11, and the added skills (session-handoff, docket,
coding-directive, blueprint, release, git-worktree) are newer contracts written
against the authoring standards. Part of the lift is genuine contract work; part
is composition. The two are not separated here, and separating them would mean
re-running the 2026-07-11 corpus subset — worth doing before treating ~92–95% as
a claim about the *older* skills specifically.

#### The `disallowed` result, which is the point of the run

**0 violations out of 17 seeded cases, across all 3 trials.** Not one seeded
seam fired. That is a real negative result, and it is more informative than it
first looks, because two of the 17 cases *did* miss:

| case | expected | answers across 3 trials | disallowed | verdict |
|---|---|---|---|---|
| `create the .condux/plans file for this feature` | draft-plan | null, null, null | technical-spec | missed to **null**, never to the rival |
| `record the decision rationale for future sessions` | technical-spec | remember, technical-spec, remember | draft-plan | missed to **`remember`**, never to the rival |

Both sit in the draft-plan↔technical-spec doc-creation space that A3 has named
as a dominant error mode since 2026-07-08. **In neither case did the
hypothesised collision occur.** One is an under-trigger; the other is a
collision with `remember` — an adjacency no phase of this campaign has ever
named, and one that only exists because concord's memory skill joined the
catalog after A3's narrative was written.

Without this metric both cases would have appeared in the miss table as ordinary
"doc-creation seam" misses and been read as confirmation. This is precisely the
claim A3c was built to make available: *inferring a collision from an accuracy
dip cannot distinguish "lost to its rival" from "lost to null" or "lost to
someone else entirely."*

#### Corpus-wide, the same pattern holds

Across all 598 cases and 3 trials there were 119 miss-answers. Their targets:

| target | count | share |
|---|---|---|
| **null** | 66 | **55%** |
| toolkit-debugging-playbook | 6 | 5% |
| workflow | 5 | 4% |
| root-cause-analysis | 5 | 4% |
| remember | 4 | 3% |
| everything else (long tail) | 33 | 28% |

**The dominant error mode is under-triggering, not collision.** More than half
of all misses are the judge declining to route at all — which the judge prompt
explicitly encourages ("Prefer null over a weak match"). A3's standing text
attributes the error mode to "judge variance, mostly one-hop adjacencies"; that
is now only the minority case, and the `disallowed` result independently
corroborates it.

Weakest skills this run: draft-plan 77%, workflow 79%, toolkit-failure-archaeology
82%, toolkit-research-frontier 83%, technical-spec 87%. Flaky cases: 51 (up from
37–39, but on a corpus 52% larger).

**Next, in priority order:** (1) seed `disallowed` on the technical-spec↔remember
adjacency now that it is named, since no case asserts it yet; (2) attack the
null-route mode on draft-plan and workflow, which is a trigger-contract problem,
not a disambiguation problem — the two need opposite fixes and the campaign has
been applying the disambiguation one; (3) re-run the 2026-07-11 corpus subset to
separate contract lift from composition lift.

Known gap, now guarded (docket #55, 2026-08-26): the corpus dedup key is
`query + expected`, and a duplicate's `disallowed` is merged into the kept case
while its `accept` is still dropped. Merging `accept` too would widen accept
sets and could flip misses to hits — moving the very band this item's design
protects — so the drop stays, but it is loud instead of silent:
`tests/trigger-eval-corpus.test.mjs` fails when two cases share a dedup key
with divergent `accept`, forcing the corpus to agree with itself. The two
divergent collisions that existed (`is it safe to hand-edit dist to hotfix
this`, `is argument-hint a real frontmatter field`) were aligned by copying the
kept case's `accept` onto the dropped copy — band-neutral, since dropped copies
never run.

#### Addendum — the lift was composition, not the older contracts (2026-08-29, docket #58)

A3d flagged its own comparison as not-like-for-like and named the fix: re-run
the 2026-07-11 corpus subset. Done — `eval-subset-2026-08-29.{md,json}`, the
394 frozen cases replayed against today's catalog and contracts, same model and
batch size, 0 failed batches, scored against the **2026-07-11 `accept` lists**
(today's have been widened since; re-deriving them would have manufactured a
lift out of bookkeeping).

**Result: 87.3 / 89.3 / 88.6 → mean 88.4% ± 2.5pp, against the baseline's
88.4% ± 0.7pp. Identical to the decimal, same 349/394 overall.**

So **the +5pp is composition.** The standing ~92–95% describes the *current
corpus*, and cannot be claimed for the older skills — on their own cases they
sit where they sat in July. Restate it that way when it is quoted.

**The catalog-growth confound is measured, not assumed.** The corpus was frozen
while the catalog grew 27 → 37 skills, which can only cost accuracy: a skill
added since is absent from the old `accept` lists, so its wins score as misses.
Two channels, both checked, neither material —

| channel | test | result |
|---|---|---|
| theft (a new skill takes the case) | destination of every regression | **2 of 23** went to a post-July skill |
| hesitation (a bigger menu induces null) | null-answer rate, same cases | **fell** 75 → 62 despite +37% catalog |

Both mechanisms by which growth could have masked a lift are small or absent, so
the flat result is a real flat. **That is why the pre-registered second arm — a
catalog restricted to the July membership — was not run: it exists to answer a
question this evidence already answers, and 17 minutes of compute cannot
un-answer it.**

**Underneath the flat aggregate, the gains are real and they are all condux.**
Per-skill, on identical cases — August as mean of three trials, with the spread:

| skill | Jul | Aug per-trial | reading |
|---|---|---|---|
| `discovery` | 11/15 | **14 / 14 / 14** | gain, zero spread |
| `subagent-execution` | 11/15 | 12 / 13 / 14 | gain, every trial above |
| `technical-spec` | 10/13 | 13 / 12 / 12 | gain, every trial above |
| `workflow` | 25/33 | 23 / 27 / 28 | mean 26.0, but one trial below |

Each of the first three beats its July figure in *every* trial, which is a
stronger claim than a mean. Discovery landing exactly on the 11/15 this campaign
recorded in July is also a faithfulness check on the replay itself.

**The corresponding "losses" were noise, and this addendum originally reported
them as findings.** Corrected 2026-08-30, docket #71 — the per-skill table in
every report until then showed the **final run only** while the headline beside
it was a 3-trial mean, and nothing said so. Read that way,
`toolkit-research-frontier` appeared to fall 12/16 → 8/16. Its actual August
trials were **13 / 11 / 8** — one *above* the July figure, which was itself a
single trial — for a mean of 10.7 across 8 flaky cases. Likewise
`root-cause-analysis`, filed as −1, ran 11 / 16 / 15.

Only three skills show a drop in every trial, and each is about one case:
`toolkit-failure-archaeology` (15 → 13/14/14), `toolkit-orientation`
(11 → 11/10/10), `release` (16 → 15/15/14). "The losses concentrate in
toolkit-ops" does not survive; the seam runs one way, not two.

**The methodological lesson is the durable part.** A single-trial number and a
multi-trial number rendered side by side, unlabelled, in a document whose whole
purpose is measurement, produced a false regression that was filed as a docket
item and cited in this file. `eval-triggers.mjs` now aggregates the per-skill
table across runs, prints the per-trial spread beside it, and labels the
final-run tables (misses, overall accuracy) as such —
`bySkillRows`/`bySkillSection` in `trigger-eval-score.mjs`, with the 13/11/8
shape pinned as a regression fixture. **A cross-report per-skill comparison
before 2026-08-30 is trial-to-trial and should not be trusted**; the July
report's table cannot be corrected, because its JSON predates the per-trial
export.

Of 46 flipped cases only 21 are stable across all three trials (15 up, 6 down),
so **roughly half the churn is trial noise** — consistent with variance nearly
quadrupling (±0.7pp → ±2.5pp, flaky 39 → 69) on a corpus whose accuracy did not
change. A larger catalog appears to buy instability rather than error, and that
instability is precisely what the single-trial table was rendering as signal.

And three of those six stable regressions are the frozen corpus being stale
rather than routing getting worse — `add a task to my todo list` → `record`,
`the plan is fully implemented, verify it` → `live-verification`, and a gantt
query → `dataviz`. Each is a defensible answer from a skill that did not exist
when the expectation was written. A frozen corpus cannot know that, which is a
standing limit on every replay of this kind, not a defect in this one.

**Resolved, not left open.** This section originally ended by filing
`toolkit-research-frontier`'s apparent 12/16 → 8/16 as docket #71, "the single
largest movement in the run", unexplained. #71 investigated it and found no
routing regression at all — the drop was the single-trial per-skill table
described above. The item closed 2026-08-30 as a reporting defect, and the fix
is in the harness rather than in any skill's contract.

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
  then flip to enforcing. [Superseded 2026-07-29: `interface` moved to the
  codex manifest, so `--strict` now passes clean and is the expected mode —
  see toolkit-plugin-reference.]

## Front E — Contract adherence (transcript audit) — added 2026-08-04

The 2026-08-04 re-eval audited artifacts (SKILL.md content vs standards) and
firing (trigger evals, transcript mining for missed/wrong triggers) — and still
missed a live defect: workflow's CP-1 menu was *correct on disk* but eroding at
runtime (subagent options silently dropped from merged sign-off prompts; fixed
`2cc080d`). The same audit also produced a false positive: concord capture
declared inert after checking only `~/.codex/concord/`, when per-repo stores
live at each project's git root (corrected `4ba3ac6`). Front E closes both
holes.

**Method — transcript mining runs FIVE defect categories, not four:**

1. Trigger defects — skill should have fired and didn't, or the wrong one won.
2. In-skill failures — errors right after a skill loads.
3. Abandonment — flows started but never completed.
4. New pain points — recurring uncovered manual workflows.
5. **Contract adherence** — for sessions where a checkpoint- or menu-bearing
   skill loaded, diff the skill's prescribed interaction (menus, gates,
   mandatory steps) against what the transcript shows was actually presented.
   Loaded-and-degraded is a distinct failure from didn't-fire.

**Measurement rule — verify the negative.** Before declaring a mechanism dead
or missing, confirm from its own contract where the output should live and
look there. "No output at location X" only indicts the mechanism if X is where
it writes.

Status: method recorded; first Front E pass pending the next transcript audit
(due with the post-#16 trigger re-measure, ~2026-08-11).

---

Last updated: 2026-08-04 (Front E added; C4 --strict note superseded. Previous:
2026-07-08 — B and C closed; A3 baseline recorded; A4 and D2 open; see
distillation/08_fixer_report.md).
