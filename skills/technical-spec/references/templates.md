# Spec File Templates

Copy-paste templates for each spec file. Omit sections that don't apply — don't leave empty headings.

**The layering rule, which every template below follows:** a concern file opens
with a scannable table and carries its reasoning underneath. The table serves
the reader scanning for one thing, `preflight`'s drift check, and an agent
loading the spec as context — all three read the same rows. Prose is reserved
for the one job that needs it: reasoning a future reader must be able to
follow. Write each table row as a claim someone could check, not a label.

---

## index.md

```markdown
# {Feature Name} — Tech Spec

> One line: what this spec is for. This is what the catalog (`specs/index.md`)
> shows for the spec — without it the spec is listed with no description.

**Last updated:** {YYYY-MM-DD}
**Commit:** {short-hash}
**Status:** draft | review | stable

## Contents

| File | Answers |
|---|---|
| [Decisions](decisions.md) | why it works this way, and what was rejected |
| [Quirks](quirks.md) | what will bite you, and whether it is mitigated |

## Changelog
- {YYYY-MM-DD} ({short-hash}): Initial spec
```

The Contents table answers *which file do I open* — one row per concern file
that actually exists, each `Answers` cell saying what a reader comes to it
for. Files that don't exist get no row.

**Cite committed paths only.** A spec is durable; the design and plan it came
from are working state under `.condux/`, gitignored and gone on any other
machine. If the changelog or body needs to point at a design or a verification
report, copy that file into this spec's directory first (`design.md`,
`verification.md`) and cite *that*. Six such citations were written before this
rule existed and two were already dead when they were found.

---

## decisions.md

```markdown
# Decisions — {Feature Name}

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | {what was decided, as a claim} | {why, one line} | accepted |

## 1. {Decision Title} — {YYYY-MM-DD}

**Decided:** one sentence, stated as a claim.
**Because:** one sentence — why this option won.

| Alternative | Why not |
|---|---|
| {option considered} | {one line} |

**Consequences**
- {what changes as a result — and where it costs, named}

**Context** *(only when the question's origin is not obvious)*
{prose — why a decision was needed at all, when the feature doesn't make
that self-evident}
```

The summary table is mandatory and answers "which decisions exist" without
reading the file. The alternatives table is mandatory too — an empty one is
visible in a way missing prose is not, and a decision recorded without its
rejected alternatives is assertion, not rationale. `Context` is the one
conditional block: `Because` covers why *this* option won; `Context` covers
why the question arose, which is frequently self-evident. Statuses:
`accepted | superseded | deprecated`.

---

## api.md

```markdown
# API — {Feature Name}

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/... | ... | Bearer |

## Key Types / Schemas

\`\`\`typescript
// The type says what a field MEANS; fields.md says what HAPPENS to it.
interface Invoice {
  id: string;               // Stripe invoice id, `in_`-prefixed
  amountDue: number;        // minor units (cents) — never format directly
  status: InvoiceStatus;    // drives the badge; `draft` is hidden in the list
  voidedAt: string | null;  // ISO 8601; null unless voided
}
\`\`\`

## External APIs Consumed

| Service | Purpose | Notes |
|---------|---------|-------|
| {Service} | {What we use it for} | {Rate limits, quirks} |
```

**Every field carries its meaning inline** — trailing `//` by default; a JSDoc
block only when a line won't do (units, constraints, nullability semantics).
This is the two-homes rule: a fact with two homes goes missing from the one
you are reading, and the un-annotated type is the home readers actually open.
`fields.md` keeps only what a type cannot express — the journey.

---

## fields.md

```markdown
# Fields — {Feature Name}

Document which fields flow from source (BE or 3rd-party API) to destination
(UI or your BE). The Description column is about the TRANSFORMATION — what
happens to the field on the way — never about what the field means; meaning
lives on the type in api.md.

## Response Fields — {Endpoint or Source Name}

> Source: `GET /api/...` or `{ThirdParty} → BE → FE`

| Source Field | UI Label / FE Key | Type | Nullable | Transformation |
|---|---|---|---|---|
| `user_full_name` | Full Name | `string` | no | rendered as-is in profile card |
| `created_at` | Created | `string (ISO 8601)` | no | formatted to `MMM D, YYYY` in UI |
| `metadata.region` | Region | `string` | yes | omitted from UI when null |

### Forwarding Chain (3rd-party → BE → FE)

Use this sub-section when your BE proxies a 3rd-party API and renames fields.

| 3rd-party Field | BE Field | FE Key | Notes |
|---|---|---|---|
| `usr_nm` | `username` | `username` | Renamed at BE layer |
| `acct_bal` | `accountBalance` | `balance` | Converted cents → dollars at BE |

## Request Fields — {Endpoint or Action Name}

> Sent from FE to `POST /api/...`

| FE Key | BE Field | Type | Required | Transformation |
|---|---|---|---|---|
| `email` | `email` | `string` | yes | validated client-side before send |
| `preferredName` | `preferred_name` | `string` | no | omitted from payload if empty |
```

---

## implementation.md

```markdown
# Implementation — {Feature Name}

| File | Role |
|------|------|
| `src/...` | ... |

## Data flow

1. {step} — {what happens}
2. {step} — {what happens}

## Patterns

| Pattern | Where | Why not the obvious thing |
|---|---|---|
| {pattern used} | {file or layer} | {what it displaced, one line} |

## Dependencies

Internal modules or external packages this feature leans on heavily.

## Overview *(only when the file table does not already tell the story)*

{prose — the end-to-end narrative, when the table and data flow leave it
untold}
```

Data flow is a numbered list — it is step-by-step by definition and was never
prose. The Patterns table's third column is mandatory: a pattern recorded
without the alternative it displaced is trivia, not guidance.

---

## quirks.md

```markdown
# Quirks — {Feature Name}

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | {symptom, one line} | {what sets it off} | low / medium / high | yes / no / partial |

## Q1 — {Quirk Title}

**Discovered:** {date or commit}

**Symptom:** what a reader will observe.
**Trigger:** what sets it off.
**Cause:** why it happens.
**Mitigation:** what to do — or "none", said plainly.

{prose — only the part that genuinely needs explaining}
```

Quirk headings are `## Q<n> — Title`, always — `durable-citations.test.mjs`
resolves every `Q<n>` a spec cites against these headings, so the format is a
contract, not a style. Numbers are unique and ascending, never reused and
never renumbered (citations from other specs may point at them). The
`Mitigated` column is a checkable claim: `yes / no / partial`, with `partial`
explained in the body's **Mitigation** field.
