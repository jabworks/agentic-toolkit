# blueprint — Implementation

## Skill layout

```
skills/blueprint/
  SKILL.md                    # lean: trigger contract, flow, boundaries
  references/
    wireframe-kit.md          # wireframe discipline rules + copyable base CSS
    diagram-kit.md            # inline-SVG patterns: ER, flow, architecture, state
```

## Artifacts

- Output: `.condux/designs/<date>-<feature>/mockups/<name>.html`
  (self-contained; one file per screen/flow state or per diagram).
- Beside the feature's design doc, which links them (ephemeral→ephemeral OK).
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
