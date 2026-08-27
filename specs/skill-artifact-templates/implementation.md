# Implementation — Skill Artifact Templates

> Written at design time, before implementation. Intended touch list, in the
> shape this spec designs.

| File | Role |
|---|---|
| `skills/discovery/references/design-template.md` | new — the lifecycle-stamped design-doc template; canonical home of the frontmatter contract |
| `skills/live-verification/references/report-template.md` | new — the per-run report shape and run-dir containment rules |
| `skills/discovery/SKILL.md` | Output + Design File sections point at the template; inline frontmatter restatement removed |
| `skills/live-verification/SKILL.md` | Step 4 gains write-report-then-print; Output Format becomes a pointer to the template |
| `tests/skill-artifact-templates.test.mjs` | new — the four structural assertions, reading `skills/` only |

Plus the shipping surface: `bash scripts/sync.sh discovery live-verification`
(dist, opencode, cursor, and npm-package trees regenerate), condux
2.24.3 → 2.25.0 in both host manifests, `pnpm changeset`
(`npm-channel.test.mjs` fails without one), and
`node scripts/release-plugins.mjs --write-changelog` after the bump.

## Data flow

1. discovery §1 opens — the agent copies `design-template.md`'s at-creation
   parts into `.condux/designs/<date>-<slug>.md` (`status: in-progress`).
2. Each agreed section is appended in the template's §-card shape, carrying
   decisions.md's four facts; constraints accumulate in their fixed section.
3. Step 7 flips `status: signed-off`; spec write-back transcribes the § cards
   into `decisions.md` rows — same facts, no authorship.
4. live-verification Step 4 writes `report.md` from `report-template.md` into
   the run dir, evidence files beside it, named per claim.
5. Step 5 prints `report.md`'s content as the terminal report — one fact, one
   home.
6. `tests/skill-artifact-templates.test.mjs` gates the templates and pointers
   on every `node --test`.

## Patterns

| Pattern | Where | Why not the obvious thing |
|---|---|---|
| Lifecycle stamps on template parts | `design-template.md` | A bare section list reproduces the observed failure — headings invented as timing demanded |
| Write the file, print its content | live-verification Step 4/5 | A separate terminal shape and file shape are two homes for one fact, and drift |
| Minimal structural gate | the new test | Asserting full structure makes every prose edit a test failure; the contract is the four anchors |

## Dependencies

`technical-spec`'s templates (`skills/technical-spec/references/templates.md`)
are the settled vocabulary both templates consume — table layer over
reasoning, four-facts decision entries. Consumed, never forked.
