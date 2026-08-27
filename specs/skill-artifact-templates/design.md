---
status: signed-off
date: 2026-08-27
feature: skill-artifact-templates
---

# skill-artifact-templates — docket #62

Templates for the two condux skills that persist artifacts without one:
`discovery` (`.condux/designs/*.md`) and `live-verification`
(`.condux/verification/<run>/`). Pass three of the spec-presentation work —
consumes #60's vocabulary (table layer over reasoning), agrees with
discovery-presentation's §-card contract, and closes the "evidence with no
stated shape" gap by persisting the verification report.

**Sections:** 4 — producer relationship · design-doc template ·
verification report template · enforcement & shipping.

Settled in the goal round (2026-08-27):

| Question | Answer |
|---|---|
| Persist live-verification's report? | Yes — `report.md` per run dir; the terminal report and the file are one shape |
| Enforcement | Structural test on the templates themselves; instances are gitignored and untestable |
| Migration of existing artifacts | Out of scope |
| technical-spec's shapes | Settled reference — consumed, never forked |

## §1 · Producer relationship — AGREED 2026-08-27

**Decided: A — accumulation.** The template formalizes what the skill's own
flow deposits: fixed header at creation, agreed §-cards appended per section,
footer at sign-off. The mid-flow file and the sign-off file are one artifact
with one shape; no restructuring step exists to skip or botch.

| Rejected | Why not |
|---|---|
| B. Restructure at sign-off | Double-write; leaves the live reading surface shapeless mid-flow, which is when it matters |
| C. Independent mini-spec shape | Forks technical-spec's settled vocabulary; the design doc's job ends at sign-off |

Corollary carried to §3: live-verification's persisted `report.md` **is** the
terminal report — write the file, print its content. One fact, one home (#61's
lesson applied to ourselves).

## §2 · Design-doc template — AGREED 2026-08-27

**Decided:** `discovery/references/design-template.md`, lifecycle-stamped —
every part says when it gets written.

```markdown
---
status: in-progress        # → signed-off at Step 7 (draft-plan's gate reads this)
date: YYYY-MM-DD
feature: <slug>
---
# <feature> — <one line>                    [at creation]
<what we're building and why — ≤3 lines>    [at creation]
**Sections:** N — <names>                   [at creation]

## §n · <name> — AGREED <date>              [appended per agreement]
**Decided:** <choice>, because <one line>.
| Rejected | Why not |                      (one line each)
<evidence table / linked blueprint artifact — never a wall>

## Constraints & out of scope               [accumulates — rows added any time]
| Constraint / exclusion | Why |

## Open questions                           [finalized at sign-off; "none" is valid]
```

Rules riding along:

| Rule | Why |
|---|---|
| Each agreed § carries decisions.md's four facts (title+date, choice, alternatives-with-why-not, consequence) | Step 7 spec write-back becomes transcription, not authorship — the shape agreement #62 demands |
| Frontmatter contract's canonical home is the template; SKILL.md points at it | Two-homes rule; within one skill a references/ pointer is fine |

## §3 · Verification report template — AGREED 2026-08-27

**Decided:** `live-verification/references/report-template.md` — one
`report.md` per run dir, fixed header table (Date / Target / Diff / Themes),
fixed claim table (Claim | Evidence | Verdict), "Also seen", outcome line.

| Rule | Why |
|---|---|
| Terminal report **is** the file — write `report.md`, then print its content | One fact, one home; SKILL.md's Output Format becomes a pointer to the template |
| Everything for a run lives inside `.condux/verification/<YYYY-MM-DD>-<slug>/`; no loose files at the verification root | Observed rot: root-level `report-*.png` orphans belonging to no run |
| Evidence files named for the claim they support, referenced from the table | The table is the index; an unreferenced PNG is uncontextualized in a week |

Fixed header keys + fixed claim-table shape is what makes two runs of the same
surface diffable — the comparability #62 names as the point.

Settled detail: a nothing-could-be-driven run still writes `report.md`, using
the SKILL.md fallback shape (what was attempted, what blocked it) — an absent
report is indistinguishable from a run that never happened.

## §4 · Enforcement & shipping — AGREED 2026-08-27

**Decided:** new `tests/skill-artifact-templates.test.mjs`, reading from
`skills/` only — dist parity stays the mirror tests' job. Four assertions,
minimal so template prose can evolve without test churn:

| Assertion | Catches |
|---|---|
| Both template files exist | Deletion, or a rename that never synced |
| Each SKILL.md references its template by path | Pointer rot — §2/§3's two-homes moves depend on the pointer |
| Design template carries `status: in-progress`, a `## §` card, `| Rejected | Why not |` | Frontmatter contract / four-facts shape drifting out of the canonical home |
| Report template carries `| Claim | Evidence | Verdict |` | The claim table — the comparability contract — going missing |

SKILL.md edits: discovery's Output + Design File sections point at the
template (restated frontmatter block removed); live-verification's Step 4
gains write-report-then-print, Output Format becomes the pointer.

Ship: `sync.sh discovery live-verification` → condux 2.24.3→2.25.0 (minor,
both host manifests) → `pnpm changeset` (npm-channel gate) →
`release-plugins.mjs --write-changelog` → `node --test` → PR.
