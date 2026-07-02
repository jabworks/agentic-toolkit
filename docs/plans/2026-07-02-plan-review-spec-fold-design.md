# Design — plan-review × technical-spec fold, Files tab, bottom decision bar, spec layout

**Date:** 2026-07-02
**Status:** signed off
**Workstream:** plan-review-ui-ux (continues 2026-07-02-044152 handoff)

## What we're building and why

Four coordinated changes across the condux bundle:

1. **One review engine** — plan-review's `annotate-server.js` becomes the single
   review/preview surface for both plans and tech specs (directory mode);
   technical-spec's `preview-server.js` is retired.
2. **Files tab** — sidebar gains a second tab listing file paths the plan/spec
   touches, verified against the repo.
3. **Bottom decision bar** — the three decisions move out of the right rail into
   a fixed bottom bar.
4. **scaffold.sh fixes** — acronym-safe slug generation and root-mirrored
   monorepo spec layout.

## Section A — One review engine (fold)

`annotate-server.js` gains **directory mode**: `node annotate-server.js <spec-dir>`
serves every `.md` file in the folder through the existing annotation UI.

- **Doc switching:** sidebar lists the spec's documents (`index.md`,
  `decisions.md`, `api.md`…); clicking swaps the rendered doc. Notes are tagged
  with their source file.
- **Live reload:** existing SSE + `fs.watch` extends to the directory — fully
  replaces technical-spec's live preview.
- **Feedback:** one `<dir>/review.feedback.md` per session, notes grouped by
  file. Decisions map: Approve = spec accurate · Request Revisions = agent fixes
  spec files · Reject = spec premise wrong.
- **Retire** `preview-server.js` + `preview-template.html` from technical-spec.
  Repoint technical-spec SKILL.md **and** brainstorm SKILL.md's "Spec
  Integration (Live Preview)" section (currently `find`s `preview-server.js`)
  at plan-review's server.
- Single-file modes (hook / codex-stop / steer / manual) unchanged.

**Rejected:** shared template with two servers (double sync surface, no
user-visible gain); wiring-only integration (no multi-file navigation).

## Section B — Files tab

Sidebar becomes two tabs: **Contents | Files**.

- **Contents** keeps the heading outline; in directory mode, documents are
  top-level nodes with their headings nested.
- **Files** lists paths the plan/spec touches: parsed from inline code spans +
  code fences that look like paths, verified server-side (`fs.existsSync`
  relative to git root), badged **exists** / **new**. Click scrolls to first
  mention; repeat clicks cycle mentions.
- v1 does **not** render file contents (read-only viewer deferred to v2).

## Section C — Bottom decision bar

- Fixed bottom bar: `[Reject] ——— [Request revisions] [Approve]` (Reject
  isolated left; continue-actions right).
- Bar shows live summary: "3 notes · 1 message will be sent".
- Right rail becomes purely conversational (notes + Send message). Sent-state
  confirmation replaces the bar content after submit.
- Bottom over top: decisions read as the end of a review; a top bar invites
  approving before reading.

## Section D — scaffold.sh: slug fix + spec layout

- **Slug:** acronym-aware kebab-casing — dash only at `lowercase→Upper` and
  `UPPER→Upper+lower` boundaries. `AOGrcIntegration` → `ao-grc-integration`,
  `UIFormControls` → `ui-form-controls`. Kebab input passes through.
- **Layout:** all specs at **git root**, mirroring repo structure: working in
  `apps/web` → `<root>/specs/apps/web/<slug>/`; at root or cross-cutting →
  `<root>/specs/<slug>/`. Nearest-package detection is kept but used to compute
  the relative path, not to nest `specs/` inside the package.
- No auto-migration of existing co-located specs; SKILL.md notes `git mv`.

## Out of scope

- Read-only file viewer in the Files tab
- Steer-mode live chat (still deferred)
- Auto-migration of existing specs
- Any change to hook/steer protocol semantics

## Sequencing

1. **D** — slug fix + layout (ships alone as `fix:`)
2. **C** — bottom bar (self-contained template change)
3. **A+B together** — directory mode + sidebar rework are entangled
