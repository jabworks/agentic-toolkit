---
created: 2026-09-11 04:22:00
branch: main
repo: jabworks/agentic-toolkit (root)
task: visual-language-shipped
continues-from: 2026-09-10-083700-diagram-check-font-size-docket-76.md (dropped from main in 40a0d1c after its merge)
workstream: blueprint-diagram-kit
---

## Immediate next steps

1. **Harvey's open question: resanitize the 2026-09-08 specimen?** `specs/blueprint/verification/2026-09-08-routing-gate/routed.html:252-253` and `as-drawn.html` name four upstream systems (one matches a corporate repo name). If yes: replace them with the generic twins the 2.31.0 specimen uses (`Billing · Inventory · CRM` / `Payroll · future reporting sources`) in both files, and reshape the guard in `tests/diagram-check.test.mjs` (the fixture-hygiene identifier list, extended in #155) so the names are not themselves committed — e.g. assert against a hash or a pattern. If no: leave both as they are and close the question in `.condux/designs/2026-09-10-diagram-visual-language.md` → Open questions (local only).
2. **Trigger check for the new language on Codex** (the 2.29.0 lesson: a rule without a checked example is a hope). First upgrade Harvey's Codex to 2.31.0: `codex plugin marketplace upgrade jabworks-agentic-toolkit && codex plugin add condux@jabworks-agentic-toolkit` (it is on 2.30.0). Then rerun the 2026-09-10 recipe — `specs/blueprint/verification/2026-09-10-codex-trigger-check/report.md` has the prompt, flags, and scoring; the driver was `codex exec --json --sandbox workspace-write -c approval_policy="never" -C <dir> - < prompt.txt` with a fresh copy of a synthetic nine-service project per trial, three trials — and score four new things: role tints on every node (`fill-opacity="0.10"`), `<use href="#mark-…">` on stores/externals, an HTML `.legend` under the svg, a tinted title strip per boundary. Record under `specs/blueprint/verification/2026-09-11-codex-visual-language/`. A miss is a kit-wording fix in `skills/blueprint/references/diagram-kit.md` → `## Visual Language`, not a checker fix.
3. **Docket #81 (SMALL):** `skills/subagent-execution/references/task-brief.sh` awk pattern `^### Task N:` → accept `^##+ Task N:`; add a test that runs the script against `skills/draft-plan/references/plan-template.md` and gets Task 1's card. Sync, patch bump condux, changeset.
4. **Docket #80:** pick the stamp convention (option a in the docket body: `**Commit:** PR #N` in `specs/*/index.md` headers, test that every cited PR is merged or is the branch's own) and repair the two orphaned stamps (blueprint 3e31e7f, discovery-presentation a8b07b7).
5. **#82, #75, #79 wait for a real case.** Do not pre-empt.

## Blockers

| Blocker | Context | Workaround tried |
|---|---|---|
| none | — | — |

## Current State Summary

Docket #78 is closed and shipped end to end: discovery (five sections, Option A tinted roles picked in the browser) → D9 + Q10/Q11 written to `specs/blueprint/` (9cc6012) → six-task plan executed with two waves of coder agents on `feat/diagram-visual-language` → PR #155 squash-merged as c7fe747 (condux 2.31.0 tagged + released) → Version Packages PR #156 merged as cdd9014 (`@jabworks/condux` 0.24.0 on npm, confirmed). Earlier the same day: PR #153/#154 merged (2.30.0 / npm 0.23.0), the Codex trigger check for the diagram gate passed 3/3 (`specs/blueprint/verification/2026-09-10-codex-trigger-check/`), and dockets #80, #81, #82 were filed. Working tree clean on `main` at cdd9014; branch deleted; no preview or picker servers running. Suite 518 green at the merge.

## Stack snapshot

- **Package / app:** repo root (skills/, dist/, specs/, tests/) + `packages/condux-opencode`
- **Layer:** Tooling
- **Docker Compose:** N/A
- **Dev server:** not running (discovery preview on 36239 and picker on 7788 were stopped)
- **DB migrations in flight:** none

## Architecture context

### Critical files

| File | Why it matters |
|---|---|
| `skills/blueprint/references/diagram-kit.md` → `## Visual Language` | the shipped language: Roles (8 slots), Kinds (one stroked rect body), Marks (six `<g id="mark-…">` in a fence to paste into `<defs>`), Edges (dash = protocol), Boundaries (48-tall title strip), Legend (HTML under the svg), worked fragment |
| `skills/blueprint/references/diagram-check.mjs:381-388` | `snapshot()` returns `skip: false`; only the defs/marker frame ends a skip (Q11) |
| `tests/blueprint-kit.test.mjs` | pins the Marks/Legend fences, the Roles table, and runs the marks block through `checkSvg` |
| `tests/diagram-check.test.mjs:132` | fixture-hygiene identifier list — now includes the four original upstream names (see next step 1) |
| `specs/blueprint/verification/2026-09-10-visual-language/` | the reporting specimen in the language + report; same file is `tests/fixtures/diagram-check/visual-language.html` |
| `specs/blueprint/decisions.md` → D9, `quirks.md` → Q10/Q11 | the decision and the two checker quirks found on the way |
| `.condux/designs/2026-09-10-diagram-visual-language.md` (+ `/mockups`, `generate-options.mjs`), `.condux/plans/2026-09-10-diagram-visual-language.md`, `.condux/progress/diagram-visual-language.md` | local working state only — design (signed-off), plan, ledger; the generator's `--final` mode emitted the specimen |

### Key discoveries

- The checker classifies a `<path>` by fill alone: `fill="none"` = edge. Kind glyphs as raw paths tripped 14 `unlabeled-edge`; marks live in `<defs>` and are placed via `<use>`, which the walk never visits (Q10).
- Before 2.31.0 the `<defs>` skip ended at the first nested container's close tag (Q11): `snapshot()` stamped `skip: skipDepth > 0` on every frame, so a `<g>` inside defs claimed the decrement defs owned.
- `--cat-7` (external) and `--primary` (accent) are both warm tans; they separate by stroke weight and dash, not hue — an accented external node would read ambiguously.
- Codex's explicit skill mention is `$blueprint`; `codex exec` waits on a piped stdin unless fed a file; ~40s startup, 9–12 min per diagram trial on gpt-5.6-sol medium.
- The pre-commit hook stages all of `dist/` but NOT `packages/condux-opencode/skills/` — the sync regenerates it, and it needed its own commit (4b68d24) or `opencode-dist.test.mjs` fails in CI.
- `task-brief.sh` cannot extract a card from a template-compliant plan (#81); briefs were cut with a `## Task` awk instead.

## Completed work

### Tasks finished

- [x] Merged PR #153 → condux--v2.30.0; merged #154 → npm 0.23.0; dropped the merged handoff from main (40a0d1c)
- [x] Docket #80 filed (spec commit stamps orphaned by squash)
- [x] Codex trigger check for the diagram gate: 3/3, report + specimens committed (6fc7579, 6c9109a); Codex install moved 2.29.0 → 2.30.0
- [x] #78 discovery: five sections signed off, Option A picked via the picker; D9/Q10/Q11 written (9cc6012); #81 filed
- [x] #78 plan (6 tasks) executed: Tasks 1–2 wave 1 (7e0879b), Tasks 3–4 wave 2 + Tasks 5–6 by the controller (59678a7), advisor fixes (be6262c), mirror sync (4b68d24); #82 filed; #78 closed to the archive
- [x] PR #155 merged (c7fe747) → condux--v2.31.0; PR #156 merged (cdd9014) → `@jabworks/condux` 0.24.0

### Files modified

| File | Change | Why |
|---|---|---|
| `skills/blueprint/references/diagram-kit.md` | `## Visual Language` section; accent bullet rewritten; families 1–4; rule 5 halo fill `var(--card)` | D9 |
| `skills/blueprint/references/diagram-check.mjs` | `snapshot()` → `skip: false` | Q11 |
| `tests/diagram-check.test.mjs`, `tests/blueprint-kit.test.mjs`, `tests/fixtures/diagram-check/{mark-as-path,visual-language}.html` | defs-nesting tests, negative and positive fixtures, kit pins | guards |
| `specs/blueprint/{index,decisions,implementation,quirks}.md`, `specs/blueprint/verification/2026-09-10-{visual-language,codex-trigger-check}/` | D9, Q10, Q11, two verification records | spec write-back |
| `docket/DOCKET.md`, `docket/archive/2026.md`, `docket/docket.json` | #78 closed; #80, #81, #82 filed | backlog |
| `dist/plugins/condux/.{claude,codex}-plugin/plugin.json`, `CHANGELOG.md`, `.changeset/…` (consumed by #156), `packages/condux-opencode/*` | 2.31.0 / 0.24.0 | release |

## Decisions made

| Decision | Options considered | Chosen | Rationale |
|---|---|---|---|
| Visual language shape (D9) | A tinted roles · B role bars · C tinted regions + real geometry | A | role reads from across the room; every mark is footprint-free so the checker sees every node; B's 4px bar vanishes zoomed out; C blinds the checker to 3 of 12 nodes |
| Role colour | categorical slots · semantic tokens · new `--cat-N-muted` tokens | fixed categorical slots, `fill-opacity="0.10"` | semantic tokens already carry meaning; new tokens cross into the byte-pinned core |
| Kind marks | `<use>`d symbols in defs · raw paths · new body shapes | `<g>` groups in defs via `<use>` | raw paths read as edges; new bodies are invisible to the checker |
| Rollout | one PR · checker fix first · kit only | one PR (2.31.0) | the kit gives the checker fix its meaning; a kit without a checked specimen is a hope |
| Execution | implement myself · spawn agents | spawn (Harvey's pick at CP-1) | two waves of `coder` on disjoint files; controller did spec/docket/release |
| Halo/strip overlap in the specimen | leave (inherited geometry) · nudge | nudge the corridor 3 units | the PR's thesis is that examples honour their rules; advisor caught it |

## Important context

- **Squash merges orphan branch hashes** (#80): never stamp a commit hash in a spec; the 2.31.0 index line says "(2.31.0)", the report's Diff row says "PR #155".
- **Node strokes stay attributes on the tag** — a class-styled node reads as a halo and vanishes from the check. Marks are `fill="none"` paths inside `<defs>` only; the same path in the body is an `unlabeled-edge` (`mark-as-path.html` proves it).
- **A node body is exactly one stroked `<rect>`**; a nested stroked rect reclassifies it as a boundary; cylinders/hexagons are invisible to the checker (option C's false clean). Footprint-changing shapes are a future docket, opened only when a diagram needs one.
- **The design doc was corrected post-signoff** (seven → six mark groups, since a service has no mark). Factual only.
- **Preflight/finalize did not run as skills** in the #78 execution; the equivalent checks ran (every card verified against its output, 518 tests, renders observed). Said here so it is not silent.
- **Codex sessions:** four rollouts from the 2026-09-10 trials (synthetic "Ledgerly" project) sit in `~/.codex/sessions/2026/09/10/`; concord had not ingested them at last check. Harmless; delete if unwanted.
- **Handoffs are committed here** ("commit session handoff for cross-machine resume") and dropped from main after their merge — the 2026-09-08 handoff is superseded and still present.

## Deferred / out of scope

- Footprint-changing node shapes (cylinder, hexagon, ellipse) — later docket when a diagram needs one.
- Token-core edits (no `--cat-N-muted`) — never; the tint recipe is the answer.
- Resanitizing the 2026-09-08 specimen — Harvey's open question (next step 1).
- #74 (OpenCode C2 reminder) stays gated off; #65/#67 untouched this session.
