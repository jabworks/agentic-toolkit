# Spec File Templates

Copy-paste templates for each spec file. Omit sections that don't apply — don't leave empty headings.

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
- [Decisions](decisions.md) — why we built it this way
- [API](api.md) — contracts, endpoints, types
- [Fields](fields.md) — field mappings: BE/3rd-party → UI
- [Implementation](implementation.md) — how it works, key files
- [Quirks](quirks.md) — edge cases and gotchas

## Changelog
- {YYYY-MM-DD} ({short-hash}): Initial spec
```

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

## {Decision Title}

**Date:** {YYYY-MM-DD}
**Status:** accepted | superseded | deprecated

### Context
Why this decision needed to be made. What constraints or requirements drove it.

### Decision
What was decided, stated clearly.

### Rationale
Why this over the alternatives. Include alternatives considered and why they were rejected.

### Consequences
What changes as a result — positive and negative trade-offs.
```

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
interface ExampleType {
  id: string;
  // ...
}
\`\`\`

## External APIs Consumed

| Service | Purpose | Notes |
|---------|---------|-------|
| {Service} | {What we use it for} | {Rate limits, quirks} |
```

---

## fields.md

```markdown
# Fields — {Feature Name}

Document which fields flow from source (BE or 3rd-party API) to destination (UI or your BE),
with descriptions so you can glance at the spec instead of traversing the codebase.

## Response Fields — {Endpoint or Source Name}

> Source: `GET /api/...` or `{ThirdParty} → BE → FE`

| Source Field | UI Label / FE Key | Type | Nullable | Description |
|---|---|---|---|---|
| `user_full_name` | Full Name | `string` | no | Display name shown in profile card |
| `created_at` | Created | `string (ISO 8601)` | no | Formatted to `MMM D, YYYY` in UI |
| `metadata.region` | Region | `string` | yes | Omitted from UI when null |

### Forwarding Chain (3rd-party → BE → FE)

Use this sub-section when your BE proxies a 3rd-party API and renames fields.

| 3rd-party Field | BE Field | FE Key | Notes |
|---|---|---|---|
| `usr_nm` | `username` | `username` | Renamed at BE layer |
| `acct_bal` | `accountBalance` | `balance` | Converted cents → dollars at BE |

## Request Fields — {Endpoint or Action Name}

> Sent from FE to `POST /api/...`

| FE Key | BE Field | Type | Required | Description |
|---|---|---|---|---|
| `email` | `email` | `string` | yes | Validated client-side before send |
| `preferredName` | `preferred_name` | `string` | no | Optional; omitted if empty |
```

---

## implementation.md

```markdown
# Implementation — {Feature Name}

## Overview
One paragraph on how the feature works end-to-end.

## Key Files

| File | Role |
|------|------|
| `src/...` | ... |

## Data Flow
Step-by-step description of how data moves through the system.

## Patterns Used
Non-obvious patterns, abstractions, or conventions introduced.

## Dependencies
Internal modules or external packages this feature leans on heavily.
```

---

## quirks.md

```markdown
# Quirks — {Feature Name}

## {Quirk Title}

**Severity:** low | medium | high
**Discovered:** {date or commit}

Description of the edge case, gotcha, or known issue. Include what triggers it and how it's handled or worked around.
```
