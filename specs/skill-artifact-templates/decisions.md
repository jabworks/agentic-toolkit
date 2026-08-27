# Decisions — Skill Artifact Templates

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | Templates formalize accumulation, never a restructuring step | the mid-flow file and the sign-off file are one artifact with one shape | accepted |
| 2 | Every design-template part carries a lifecycle stamp | *when* a section gets written is the piece agents miss mid-flow | accepted |
| 3 | An agreed design § carries decisions.md's four facts | spec write-back becomes transcription, not authorship | accepted |
| 4 | The template is the canonical home of the design frontmatter contract | a fact with two homes goes missing from the one you are reading | accepted |
| 5 | report.md **is** the terminal report — write the file, print its content | same two-homes rule, applied to live-verification | accepted |
| 6 | A run's files live only inside its run dir | root-level orphans were observed in the wild | accepted |
| 7 | The gate is four minimal structural assertions, reading `skills/` only | template prose must evolve without test churn; dist parity is already guarded | accepted |

## 1. Templates formalize accumulation, never a restructuring step — 2026-08-27

**Decided:** each template formalizes what its skill's own flow deposits —
fixed header at creation, agreed sections appended as they land, footer at
sign-off.
**Because:** the mid-flow file is the live reading surface; one artifact, one
shape, no restructuring step to skip or botch.

| Alternative | Why not |
|---|---|
| Restructure at sign-off (freeform mid-flow) | Double-write, and the file stays shapeless during the hours it is actually read |
| Independent mini-spec shape | Forks technical-spec's settled vocabulary; the design doc's job ends at sign-off |

**Consequences**
- The design template mirrors discovery's §-card contract rather than
  inventing a document structure; the card and the file entry are one shape.

## 2. Every design-template part carries a lifecycle stamp — 2026-08-27

**Decided:** each template part is stamped at-creation / appended-per-agreement /
at-sign-off (with `Constraints & out of scope` accumulating at any time).
**Because:** the observed failure was headings invented as timing demanded —
the section list was never the problem; knowing *when* each part gets written was.

| Alternative | Why not |
|---|---|
| Section list only, timing left implicit | Reproduces the 2026-08-24 failure: good content under ad-hoc headings |

**Consequences**
- An agent mid-discovery always has a home for what it is holding —
  constraints discovered in §3 have a section that already exists.

## 3. An agreed design § carries decisions.md's four facts — 2026-08-27

**Decided:** every agreed § records title+date, the choice, alternatives with
one-line why-nots, and the consequence — the same four facts a `decisions.md`
entry carries.
**Because:** Step 7's spec write-back becomes mechanical transcription; the
design doc and `decisions.md` cannot disagree on shape because they share one.

| Alternative | Why not |
|---|---|
| Free card shape, mapping decided at write-back | The mapping is authorship under time pressure — exactly where facts get dropped |

**Consequences**
- The deliberate asymmetry the docket names is honoured: the design doc feeds
  `decisions.md`, so their shapes agree by construction.

## 4. The template is the canonical home of the design frontmatter contract — 2026-08-27

**Decided:** the `status` / `date` / `feature` frontmatter contract lives in
`design-template.md`; discovery's SKILL.md points at it instead of restating it.
**Because:** the contract was restated inline in SKILL.md — two homes, and the
2026-08-24 design doc followed neither.

| Alternative | Why not |
|---|---|
| Keep the inline restatement as authoritative | Two homes drift; within one skill a `references/` pointer costs nothing |

**Consequences**
- SKILL.md loses its inline frontmatter block; the gate asserts the contract
  survives in the template.

## 5. report.md is the terminal report — write the file, print its content — 2026-08-27

**Decided:** live-verification writes `report.md` into the run dir, then prints
that same content as its terminal report.
**Because:** the terminal Output Format and a persisted report are the same
fact; two shapes would drift, and the persisted one is what makes runs
comparable.

| Alternative | Why not |
|---|---|
| Evidence naming only, report stays terminal-only | Bare evidence files are uncontextualized in a week — the observed state of `.condux/verification/` |
| Separate summary file with its own shape | Two homes for one fact — the drift #61 documented |

**Consequences**
- A nothing-could-be-driven run still writes `report.md` in the fallback
  shape; an absent report would be indistinguishable from a run that never
  happened.

## 6. A run's files live only inside its run dir — 2026-08-27

**Decided:** everything a verification run produces lives inside
`.condux/verification/<YYYY-MM-DD>-<slug>/`; nothing lands at the
verification root. Evidence files are named for the claim they support and
referenced from the report's claim table.
**Because:** root-level orphans (`report-*.png`) belonging to no run were
observed in this repo's own working state.

| Alternative | Why not |
|---|---|
| Naming convention only, placement advisory | Placement is the part that rotted; the convention already existed |

**Consequences**
- The claim table is the index: an evidence file not referenced from it is a
  defect the template makes visible.

## 7. The gate is four minimal structural assertions, reading skills/ only — 2026-08-27

**Decided:** `tests/skill-artifact-templates.test.mjs` asserts: both templates
exist; each SKILL.md references its template by path; the design template
carries `status: in-progress`, a `## §` card, and a `| Rejected | Why not |`
header; the report template carries `| Claim | Evidence | Verdict |`.
**Because:** instances are gitignored and untestable; the templates are the
testable surface, and minimal assertions let prose evolve without churn.

| Alternative | Why not |
|---|---|
| Advisory only, no test | #60's lesson: advice without a gate is what produced the walls |
| Assert full template structure | Every prose edit breaks the test; the gate should catch drift of the *contract*, not wording |
| Test dist/ copies too | `dist-mirror` / `opencode-dist` / `cursor-dist` tests already carry parity |

**Consequences**
- Renaming a template or dropping a pointer fails `node --test` immediately;
  rewording a rule's explanation does not.
