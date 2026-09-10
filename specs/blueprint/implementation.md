# blueprint — Implementation

## Skill layout

```
skills/blueprint/
  SKILL.md                    # lean: trigger contract, flow, boundaries
  references/
    wireframe-kit.md          # two-mode discipline + copyable mode CSS blocks
    diagram-kit.md            # inline-SVG patterns: ER, flow, architecture, state
    diagram-check.mjs         # collision gate for inline-SVG diagrams — run before
                              # Deliver (tests/diagram-check.test.mjs + fixtures);
                              # never walks <defs>, however nested (Q11)
    token-core.css            # byte-pinned copy of scripts/tokens/core.css
                              # (guarded by tests/blueprint-kit.test.mjs)
```

## Visual language (D9, 2.31.0)

- `references/diagram-kit.md` → `## Visual Language` (Roles · Kinds · Marks · Edges · Boundaries · Legend · A worked fragment): role slot table, tint recipe, kinds table, six mark groups as a fence to paste into `<defs>`, edge dash table, legend markup + CSS, boundary title strip; Shared Conventions' accent rule rewritten; family sections 1–4 say how each applies it.
- `references/diagram-check.mjs`: `walkBlock`'s frame snapshot no longer claims the skip decrement, so the `<defs>` skip survives nested containers (Q11); `<use>` stays ignored.
- `tests/blueprint-kit.test.mjs` pins the marks block and legend markup verbatim; `tests/diagram-check.test.mjs` gains the defs-nesting test and a negative fixture (a mark as a raw path is still an `unlabeled-edge`).
- Specimen: the reporting diagram redrawn in the language (generic upstream names) under `verification/2026-09-10-visual-language/`, also `tests/fixtures/diagram-check/visual-language.html` asserting `clean`; `mark-as-path.html` is the negative twin.

## Artifacts

- Output: `.condux/designs/<date>-<feature>/mockups/<name>.html`
  (self-contained; one file per screen/flow state or per diagram).
- Beside the feature's design doc, which cites them by path — inline code,
  never a clickable relative link, which 404s in the review preview
  (ephemeral→ephemeral OK; see discovery-presentation Q5).
- Cited from `specs/` or other durable content → promote the file into the
  spec directory first (citation doctrine, unchanged).
- Delivery: `xdg-open` (Linux) / `open` (macOS); headless fallback = write
  files and print paths.

## Integration edits

- `skills/discovery/SKILL.md` — Step 3 (propose) and sign-off load `blueprint`
  when the feature has a UI surface or a data model.
- `skills/draft-plan/SKILL.md` — task cards may cite mockup paths.
- `skills/workflow/SKILL.md` — skill table row + lazy-loading note.
- `skills/workflow/hooks/routing.md` — add blueprint to the executes-within-
  workflow list (payload stays prose, ~390-token budget in mind).

## Distribution ripple (all test-guarded)

1. `composition.json` — add `blueprint` to the condux bundle `skills` array.
2. `bash scripts/sync.sh` — dist/plugins, dist/opencode (+ regenerated
   `packages/condux-opencode/skills/`), dist/cursor.
3. Manifest parity (`.claude-plugin` / `.codex-plugin`), README member list
   (15 skills, `plugin-files.test.mjs` enforces naming every member).
4. condux minor version bump + `pnpm changeset` (npm channel) +
   `node scripts/release-plugins.mjs --write-changelog`.
5. `node --test` green before commit.
