# Spec File Templates

Copy-paste templates for each spec file. Omit sections that don't apply — don't leave empty headings.

---

## index.md

```markdown
# {Feature Name} — Tech Spec

**Last updated:** {YYYY-MM-DD}
**Commit:** {short-hash}
**Status:** draft | review | stable

## Contents
- [Decisions](decisions.md) — why we built it this way
- [API](api.md) — contracts, endpoints, types
- [Implementation](implementation.md) — how it works, key files
- [Quirks](quirks.md) — edge cases and gotchas

## Changelog
- {YYYY-MM-DD} ({short-hash}): Initial spec
```

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
