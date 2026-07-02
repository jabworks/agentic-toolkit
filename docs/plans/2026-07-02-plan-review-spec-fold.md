# Plan: plan-review × technical-spec fold

> Date: 2026-07-02
> Design: docs/plans/2026-07-02-plan-review-spec-fold-design.md (signed off)

## Goal

One review engine for plans and specs, with a Files tab, a bottom decision bar, and a fixed spec scaffold.

## Approach

Extend plan-review's `annotate-server.js` with directory mode so it replaces technical-spec's preview server entirely; rework the template sidebar (Contents | Files tabs) and move decisions into a fixed bottom bar; fix `scaffold.sh` slug generation and switch to a root-mirrored monorepo spec layout. Ships as three commits: scaffold fixes (1.15.0), bottom bar (1.16.0), fold + Files tab (1.17.0).

## Files Affected

- `skills/technical-spec/references/scaffold.sh` — slug fix + root-mirrored spec layout
- `skills/technical-spec/references/preview-server.js` — deleted (replaced by annotate-server dir mode)
- `skills/technical-spec/references/preview-template.html` — deleted
- `skills/technical-spec/SKILL.md` — layout section, migration note, preview section repointed
- `skills/plan-review/references/annotate-server.js` — directory mode (doc list, per-doc content, dir watch, grouped feedback)
- `skills/plan-review/references/plan-review-template.html` — bottom decision bar; Contents | Files tabs; multi-doc rendering
- `skills/plan-review/SKILL.md` — review-surface, directory mode, Files tab docs
- `skills/brainstorm/SKILL.md` — Spec Integration section repointed at annotate-server
- `dist/plugins/condux/**` — synced mirror of all of the above
- `dist/plugins/condux/.claude-plugin/plugin.json` + `.codex-plugin/plugin.json` — version bumps

## Tasks

- [ ] Task 1: scaffold.sh slug fix + root-mirrored spec layout
- [ ] Task 2: bottom decision bar
- [ ] Task 3: directory mode in annotate-server.js
- [ ] Task 4: template — multi-doc Contents + Files tab
- [ ] Task 5: retire preview-server, repoint docs

---

### Task 1: scaffold.sh slug fix + root-mirrored spec layout

**What:** Fix the kebab-case conversion in `scaffold.sh` so acronyms survive: insert a dash only at `lowercase/digit→Upper` and `UPPER→Upper+lower` boundaries (`AOGrcIntegration` → `ao-grc-integration`, `UIFormControls` → `ui-form-controls`; already-kebab input passes through unchanged). Change the spec destination from `<package-root>/specs/<slug>` to `<git-root>/specs/<pkg-relpath>/<slug>`, where `pkg-relpath` is the package root's path relative to the git root (empty when they're equal, giving `<git-root>/specs/<slug>`). Keep the nearest-package-root detection — it now only computes the relative path. Update the "Spec Folder Layout" section of `skills/technical-spec/SKILL.md` to describe the mirrored layout, and add a one-line note that existing co-located specs can be `git mv`'d — no auto-migration.

**Why:** The current sed explodes acronyms into single letters, and co-located specs scatter across the monorepo with no home for cross-cutting features.

**Files:**

- Modify: `skills/technical-spec/references/scaffold.sh`
- Modify: `skills/technical-spec/SKILL.md`

**Gotchas:**

- Keep the script POSIX-friendly bash as it is now (`set -euo pipefail`, sed/tr only — no external deps).
- `REPO_ROOT` falls back to `$PWD` when not in a git repo — the relpath computation must handle that (relpath is empty).
- Verify with sample inputs: `AOGrcIntegration`, `UIFormControls`, `WanConfig`, `already-kebab-name`.
- Ships as commit 1: `fix(condux): scaffold slug + root-mirrored spec layout`, sync `technical-spec`, bump both plugin.json → 1.15.0.

**Dependencies:** None

### Task 2: Bottom decision bar

**What:** In `plan-review-template.html`, move the final-decision actions out of the right rail into a fixed bottom bar spanning the viewport: `[Reject]` isolated on the left, `[Request revisions] [Approve]` grouped on the right. The bar shows a live summary of what rides along with the decision ("3 notes · 1 message will be sent"), updating as notes/messages are added or removed. After submit, the sent-state confirmation (existing `SENT` copy per decision) replaces the bar's content instead of the rail's. The right rail becomes purely conversational: notes list + Send message input. Content panes get bottom padding so the bar never covers the last lines of the plan. Update the review-surface description and ASCII diagram in `skills/plan-review/SKILL.md`.

**Why:** Decisions read as the end of a review; separating them from the notes rail removes the last misclick risk and frees rail space for conversation.

**Files:**

- Modify: `skills/plan-review/references/plan-review-template.html`
- Modify: `skills/plan-review/SKILL.md`

**Gotchas:**

- The server reads the template once at startup (`fs.readFileSync`) — restart the server between test rounds; a browser refresh is not enough.
- Localhost HTTP tests must go through `ctx_execute` — curl/inline-node to localhost is intercepted in this environment.
- Reuse the existing `SENT` map / `showSent()` / `resetDecisionUI()` logic — relocate, don't rewrite.
- Keep Terminus UI token classes; no new fonts, no external resources (no-egress audit: `grep -rE 'https?://'` on the template must stay clean).
- Ships as commit 2: `feat(condux): bottom decision bar`, sync `plan-review`, bump → 1.16.0.

**Dependencies:** None

### Task 3: Directory mode in annotate-server.js

**What:** Teach `annotate-server.js` to accept a directory path (manual and `--steer` modes). When the argument is a directory: enumerate its top-level `*.md` files (sorted, `index.md` first), expose the doc list and each doc's content to the client (extend the existing initial-payload/API shape), `fs.watch` the whole directory and tag SSE change events with the filename, and write the decision to `<dir>/review.feedback.md` with notes grouped under a heading per source file. `feedbackReason()` and the decision protocol (`/api/decision` long-poll, exit behavior) are unchanged. Single-file manual/steer and `--hook`/`--codex-stop` paths are untouched.

**Why:** This is the fold — one server serves both a single plan file and a whole spec directory, replacing technical-spec's preview server.

**Files:**

- Modify: `skills/plan-review/references/annotate-server.js`

**Gotchas:**

- Node stdlib only — no dependencies (repo guarantee).
- `fs.watch` on a directory fires duplicate/no-op events — reuse the existing content-hash guard from the single-file `load()` hardening, per file.
- Skip `*.feedback.md` files when enumerating docs (and don't fire reload events for the feedback file the server itself writes).
- Exclude dotfiles; only top-level `.md` — no recursion in v1.
- Bind stays `127.0.0.1` only.

**Dependencies:** None (but only shippable together with Task 4)

### Task 4: Template — multi-doc Contents + Files tab

**What:** Rework the template's left sidebar into two tabs. **Contents**: in single-file mode, the existing heading outline unchanged; in directory mode, a doc tree — each document is a top-level node with its heading outline nested beneath, clicking a doc swaps the rendered content pane to that doc, and per-section note counts roll up per doc. Notes are tagged with their source doc so the review rail and feedback output attribute them correctly; the revision-diff banner and orphaned-note clearing operate per doc (a change to `api.md` doesn't clear notes on `decisions.md`). **Files**: parse path-like tokens from the rendered markdown's inline code spans and code fences (heuristic: contains `/` or a file extension), de-duplicate, have the server verify each against the git root (`fs.existsSync`) and badge entries **exists** or **new**; clicking an entry scrolls to its first mention in the plan, repeat clicks cycle through subsequent mentions. No file-content rendering.

**Why:** Delivers spec-directory navigation and Plannotator-style touched-file visibility inside the same annotation UI.

**Files:**

- Modify: `skills/plan-review/references/plan-review-template.html`
- Modify: `skills/plan-review/references/annotate-server.js` (file-existence verification endpoint or precomputed flags in the doc payload)

**Gotchas:**

- Anchor/highlight offsets are per-doc — switching docs must persist and restore each doc's highlights and scroll position.
- Path heuristic should ignore obvious non-paths (URLs, `a/b` option syntax); false negatives are fine, noisy false positives are not.
- Server restart required to see template changes (template cached at startup).
- Existence checks resolve against the git root of the *reviewed file's* location, not the server's CWD.
- Keep the template self-contained — renderer, styles, and logic all inline; no egress.

**Dependencies:** Task 3

### Task 5: Retire preview-server, repoint docs

**What:** Delete `preview-server.js` and `preview-template.html` from `skills/technical-spec/references/`. Rewrite the "Live HTML Preview" section of `skills/technical-spec/SKILL.md` to launch plan-review's `annotate-server.js` in manual mode against the spec directory (locate via `find ... -name annotate-server.js -path '*plan-review*'`), including the review/decision semantics for specs (Approve = accurate, Request Revisions = fix spec files, Reject = premise wrong). Rewrite `skills/brainstorm/SKILL.md`'s "Spec Integration (Live Preview)" section the same way (it currently locates `preview-server.js`). Add a "Directory mode" section and the Contents/Files-tab description to `skills/plan-review/SKILL.md`, and update its Files table. Grep `skills/` for any remaining `preview-server` or `preview-template` references and clean them up.

**Why:** Completes the fold — one engine, no dead code, no docs pointing at a deleted server.

**Files:**

- Delete: `skills/technical-spec/references/preview-server.js`
- Delete: `skills/technical-spec/references/preview-template.html`
- Modify: `skills/technical-spec/SKILL.md`
- Modify: `skills/brainstorm/SKILL.md`
- Modify: `skills/plan-review/SKILL.md`

**Gotchas:**

- `scripts/sync.sh` uses rsync `--delete`, so syncing `technical-spec` propagates the deletions to dist — verify the dist mirror after sync.
- Tasks 3+4+5 ship as one commit: `feat(condux): fold spec review into plan-review — directory mode + Files tab`, sync `plan-review` + `technical-spec` + `brainstorm`, bump → 1.17.0.
- Commit style: `git commit -s`, no Co-Authored-By trailer.

**Dependencies:** Task 3, Task 4
