---
created: YYYY-MM-DD HH:MM:SS
branch: [output of: git branch --show-current]
repo: [monorepo package or app, e.g. apps/web, packages/oxlint-config]
task: [slug — what were you doing]
continues-from: [previous handoff filename | none]
workstream: [slug describing the workstream]
---

## Current State Summary

<!-- One paragraph: where things stand right now. What just finished, what's in flight. -->

[FILL]

## Stack snapshot

- **Package / app:** [path or package name]
- **Layer:** [Frontend | Backend | API | Infra | Tooling | Other]
- **Docker Compose:** [up / down / partial — list which services | N/A]
- **Dev server:** [running on port X | not running | N/A]
- **DB migrations in flight:** [describe | none]

## Architecture context

### Critical files

| File | Why it matters |
|---|---|
| `path/to/file.ts:42` | [what it does and why it's relevant now] |

### Key discoveries

- [Non-obvious thing learned or confirmed this session]

## Completed work

### Tasks finished

- [x] [Specific task — include file:line where applicable]

### Files modified

| File | Change | Why |
|---|---|---|
| `path/to/file.ts` | [what changed] | [rationale] |

## Decisions made

| Decision | Options considered | Chosen | Rationale |
|---|---|---|---|
| [What was decided] | [A vs B vs C] | [A] | [The constraint, tradeoff, or intent] |

## Immediate next steps

<!-- Ordered and specific. "Fix auth" is not acceptable. "Add `refreshToken` to `auth.schema.ts:12` and run `pnpm drizzle-kit generate`" is. -->

1. [Step 1 — include file:line where applicable]
2. [Step 2]
3. [Step 3]

## Blockers

| Blocker | Context | Workaround tried |
|---|---|---|
| [What's stuck] | [Why] | [What was attempted] |

## Important context

<!-- MUST READ. Things the next agent gets wrong without knowing this. -->

- [Critical invariant, hidden constraint, or gotcha]
- [Known pitfall to avoid]

## Deferred / out of scope

- [Thing that came up but was intentionally left for later]
