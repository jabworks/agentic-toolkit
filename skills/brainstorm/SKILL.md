---
name: brainstorm
description: Refine a rough idea into a signed-off design. Asks clarifying questions, surfaces alternatives, and presents the design in sections for sign-off before any planning or code begins.
when_to_use: Trigger for LARGE tasks or when scope is unclear. Acts as a soft gate before /write-plan — if brainstorm hasn't run, ask the user if they want to skip it consciously.
argument-hint: "<rough idea or feature description>"
effort: high
---

# /brainstorm

Turn a rough idea into a clear, agreed-upon design. Nothing gets planned or built until you sign off.

## Usage

```
/brainstorm $ARGUMENTS
```

## How It Works

Before Step 1, check for an existing design: glob `docs/plans/*<slug>*-design.md`
and `specs/<slug>/` (slug = kebab-case of the feature name). If either
exists, offer: "Found an existing design for this feature at `<path>` —
resume from there, or start a fresh brainstorm?" Accept either answer, same
as any other soft gate in this skill.

```
┌──────────────────────────────────────────────────────────────────┐
│                        BRAINSTORM                               │
├──────────────────────────────────────────────────────────────────┤
│  Step 1: SCOPE CHECK                                            │
│  Before asking detailed questions, assess:                      │
│    - Does this describe multiple independent subsystems?        │
│      → Flag decomposition opportunity before going deeper       │
│    - Is the request already well-defined (ticket, spec doc)?    │
│      → Ask: "This looks well-defined. Skip brainstorm and       │
│        go straight to planning?"                                │
│    - Is the scope genuinely unclear?                            │
│      → Proceed to Step 2                                        │
│                                                                  │
│  Step 2: CLARIFY                                                │
│  Ask targeted questions — one batch, not one at a time.        │
│  Focus on: goals, constraints, what "done" looks like,         │
│  known unknowns, and what should explicitly NOT be built.      │
│                                                                  │
│  Step 3: PROPOSE                                                │
│  Present 2-3 approaches with tradeoffs.                        │
│  Show design in sections — get acknowledgment per section      │
│  before moving on.                                              │
│                                                                  │
│  Step 4: SIGN-OFF                                               │
│  Get explicit approval: "Looks good, proceed to planning"      │
│  Do not proceed to /write-plan without this.                    │
│                                                                  │
│  Step 5: INLINE SELF-REVIEW                                     │
│  Before handing off, silently check:                            │
│    ✓ No placeholders or TBDs in the design                     │
│    ✓ All requirements covered                                   │
│    ✓ Out-of-scope items explicitly noted                        │
│    ✓ No subsystems that should be separate tasks               │
└──────────────────────────────────────────────────────────────────┘
```

## Clarifying Questions — Good vs Bad

```
Good (goal-oriented, unambiguous):
  ✓ "What does success look like for the user?"
  ✓ "Are there any libraries or patterns already in use we should follow?"
  ✓ "What should this explicitly NOT do?"
  ✓ "Is there a deadline or constraint that affects the approach?"

Bad (too detailed too early):
  ✗ "Should the button be primary or secondary variant?"
  ✗ "What exact file should this go in?"
  ✗ "Should we use useCallback here?"
```

## Soft Gate Behavior

If the user jumps straight to `/write-plan` or starts describing implementation without brainstorming:

> "We haven't brainstormed this yet — want to quickly align on the design first, or do you already have a clear picture and want to go straight to planning?"

Accept either answer. Never block. Never lecture.

## What Does NOT Happen

```
✗ Writing any code
✗ Writing a plan doc (that's /write-plan)
✗ Asking questions one at a time in a long back-and-forth
✗ Proceeding to planning without explicit sign-off
✗ Treating a well-defined ticket as needing full brainstorm
```

## Output

A short design summary covering:

- What we're building and why
- Approach chosen + why alternatives were rejected
- Key constraints and out-of-scope items
- Open questions (if any remain after sign-off)

Save to: `docs/plans/YYYY-MM-DD-<feature>-design.md` (optional — ask user)

Optionally generate an HTML visual using `references/brainstorm-design-template.html`.
Fill in the `{{PLACEHOLDERS}}` and open it in the browser for a scannable one-page summary.

For side-by-side layout comparisons or architecture diagrams during the design phase, see `references/visual-companion.md`.

## Spec Integration (Live Preview)

Integrates with the `technical-spec` skill to persist the design and render it live while you brainstorm.

### At brainstorm start

Infer the feature slug (kebab-case from `$ARGUMENTS`). Detect the package root
(walk up from CWD to git root, find nearest `package.json` / `Cargo.toml` /
`go.mod` / `pyproject.toml`). Check `<package-root>/specs/<feature-slug>/`
(and `<git-root>/specs/<feature-slug>/` if different) for an existing spec.

If found, offer:

> "Found an existing spec for this feature. Open live preview while we brainstorm? [y/n]"

If yes, go straight to **Launch preview** below (skip scaffold + write — spec already exists).

### At sign-off

Offer:

> "Save design as tech spec and open live preview? [y/n]"

If yes:

1. **Find scripts** from the installed technical-spec plugin:
   ```bash
   SCAFFOLD=$(find ~/.claude ~/.agents -name "scaffold.sh" -path "*/technical-spec/*" 2>/dev/null | head -1)
   PREVIEW=$(find ~/.claude ~/.agents -name "preview-server.js" -path "*/technical-spec/*" 2>/dev/null | head -1)
   ```
   If either is missing, tell the user: "`jabworks/technical-spec` plugin not found — install it to enable spec integration."

2. **Scaffold** the spec dir and capture the output:
   ```bash
   SCAFFOLD_OUT=$(bash "$SCAFFOLD" "<FeatureName>")
   SPEC_PATH=$(echo "$SCAFFOLD_OUT" | sed 's/^[^:]*://; s/ .*//')
   ```
   `SPEC_PATH` is an absolute path (e.g. `/repo/apps/web/specs/wan-config`).
   The scaffold script places specs under the nearest package root automatically.

3. **Write initial spec files** from the design summary into `$SPEC_PATH/`.
   At minimum, write `decisions.md` with the chosen approach and rationale.
   Add `api.md` or `fields.md` if the design covers contracts or field mappings.

4. **Launch preview** in the background, pointing at the absolute spec path:
   ```bash
   node "$PREVIEW" "$SPEC_PATH"
   ```
   Tell user: "Preview is live. The browser updates automatically as spec files change. Ctrl+C in the terminal to stop."

### Keeping the spec current

As the brainstorm continues and design details shift, update the relevant spec files — the preview re-renders on every save. This is the main benefit: the spec stays in sync with the conversation instead of being written once at the end.
