# Plan: <Feature Name>

> Date: YYYY-MM-DD

## Overview

**Goal:** One sentence — what this builds.

**Approach:** 2–3 sentences on the chosen direction.

**Tech / conventions:** Key libraries, patterns, and rules in play for this work.

## Global Constraints

Project-wide rules that every task must honour — copy exact values verbatim
from the design/spec, one line each. Delete this section only if there are
genuinely none.

- <version floor / dependency limit>
- <naming or copy rule>
- <platform / runtime requirement>

## Files Affected

- `path/to/file.ts` — what it does / what changes
- `path/to/other.ts:120-160` — the specific region touched

## Task Checklist

- [ ] Task 1: <Short Name>
- [ ] Task 2: <Short Name>
- [ ] Task 3: <Short Name>

---

## Task 1: <Short Name>

**What:** One paragraph — what this task builds or changes.

**Why:** One sentence — why this is needed / what it enables.

**Files:**

- Create: `exact/path/to/file.ts`
- Modify: `exact/path/to/existing.ts:123-145`

**Interfaces:**

- Consumes: what this task uses from earlier tasks — exact names / signatures
- Produces: what later tasks rely on — exact function names, parameter and
  return types. A task's implementer sees only their own card; this block is
  how neighbouring tasks learn the names and types they share. Use "None" for
  a leaf task.

**Sketch:** _(optional — include only where seeing the code changes whether
you'd approve: the non-obvious algorithm, a tricky transform, a key data
shape or type definition. Skip boilerplate the implementer will obviously
write.)_

```ts
type Layer = { id: string; visible: boolean };

// core logic worth reviewing before it's written
function mergeLayers(base: Layer[], incoming: Layer[]): Layer[] {
  // …the actual approach, concrete enough to annotate and tweak
}
```

**Gotchas:**

- Use `dayjs` for date handling, not native JS `Date`
- This touches the auth middleware — don't change its signature
- <any project convention or known quirk relevant to this task>

**Dependencies:** Task 2, Task 3 (or "None")

## Task 2: <Short Name>

**What:** …

**Why:** …

**Files:**

- Create: `…`

**Interfaces:**

- Consumes: …
- Produces: …

**Gotchas:**

- …

**Dependencies:** …
