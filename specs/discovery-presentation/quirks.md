# Quirks — Discovery Presentation

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | Creating the design file at §1 silently invalidates draft-plan's gate | an abandoned discovery leaving a file the glob accepts | high | yes — frontmatter `status`, read by all three consumers |
| Q2 | plan-review's markdown renderer escapes all HTML, by design | inlining SVG, or frontmatter reaching the renderer | medium | partial — diagrams linked not embedded; `stripFrontmatter()` for the status block |
| Q3 | A noun-shaped trigger cannot see a design that has no nouns | a feature whose contents are unusual | medium | yes — the question-shaped trigger (decision 3) |
| Q4 | Two homes for one fact is how an explanation goes missing | reading a type whose field meanings live in fields.md | medium | yes — pass two's two-homes rule |

## Q1 — Creating the design file at §1 silently invalidates draft-plan's gate

**Discovered:** 2026-08-26 (during design, before implementation)

**Symptom:** an abandoned discovery — user walks away after §2 — leaves a file
that satisfies the gate, and `draft-plan` plans against an unfinished design
while reporting that the soft gate passed. Nothing errors; the failure is
silent and looks like success.
**Trigger:** creating the design file at §1 while consumers gate on globbing
`.condux/designs/*<slug>*.md`.
**Cause:** the glob worked only by an accident of timing — the file existed
*because* the user signed off, so existence was a faithful proxy for approval.
Moving creation to §1 breaks the proxy without breaking the glob.
**Mitigation:** yes — frontmatter `status: in-progress` → `signed-off`,
flipped at Step 7; consumers read the value instead of the file's existence.
Verified during planning: there are **three** consumers, not one —
`skills/discovery/SKILL.md:21` (the existing-design check — benign, and
improved: an in-progress design *should* offer resume),
`skills/draft-plan/SKILL.md:22` (the gate), and
`skills/subagent-execution/agents/planner.md:23`, the last of which was missed
by this design: the planner agent is told the globbed design is "your source
of truth… do not re-derive or second-guess design decisions already settled
there", so an in-progress design would have been planned from as if settled.
All three now read `status`, and any future consumer of `.condux/designs/`
must too — existence is no longer meaningful on its own.

The general lesson is worth more than the fix: **a proxy that holds by
coincidence of timing gives no signal when the timing changes.** Nothing about
the glob broke; it kept returning a hit, and the hit simply stopped meaning
what every reader assumed it meant.

## Q2 — plan-review's markdown renderer escapes all HTML, by design

**Discovered:** 2026-08-26

**Symptom:** inlined SVG renders as escaped text; and the `status` frontmatter
this design adds rendered as a horizontal rule, a stray `status: …` paragraph
and a second rule — at the top of the surface the design makes primary.
**Trigger:** putting raw HTML through the renderer, or letting frontmatter
reach it.
**Cause:** `renderBlocks()` runs `esc()` on every path, and `safeHref()`
additionally blocks `javascript:`, `data:` and `vbscript:` hrefs — the
renderer's security boundary, shared by plan review, design review and spec
preview, not an oversight to route around. Separately, the renderer maps a
bare `---` to `<hr>` and has no frontmatter handling anywhere (verified: zero
matches in the server and the template).
**Mitigation:** partial — diagrams are *linked* from the design doc, not
embedded; one click stands between the reader and the picture, and any SVG
passthrough must be a deliberate, narrow change to that boundary, made on its
own terms rather than as a side effect of a presentation fix. The frontmatter
half is closed: `stripFrontmatter()` skips a block at position 0 only, is
applied at the `renderBlocks` call so `st.md` stays raw for the revision diff,
and removes content rather than passing it through — so it does not touch the
escaping boundary.

## Q3 — A noun-shaped trigger cannot see a design that has no nouns

**Discovered:** 2026-08-26

**Symptom:** no diagram offered for a design that needed one badly enough that
the reader asked for it explicitly.
**Trigger:** a feature whose contents are unusual — this spec's design has no
UI surface and no data model; its subjects are a terminal output shape and a
markdown file.
**Cause:** blueprint's trigger asked "UI surface or data model involved?" — a
trigger keyed on *what a feature contains* cannot fire for a feature whose
contents are unusual, even when the artifact would obviously help.
**Mitigation:** yes — the trigger is now keyed on *what question the reader is
trying to answer* (decision 3), which has no such blind spot: the question is
asked regardless of what the feature is made of.

Worth remembering when writing any trigger contract, not just this one.

## Q4 — Two homes for one fact is how an explanation goes missing

**Discovered:** 2026-08-26 (pass two — recorded here while the evidence is fresh)

**Symptom:** "I either had to search for the explanation or it was
non-existent" — the explanation frequently does exist; it is just never on the
type the reader is looking at.
**Trigger:** reading a type in `api.md` whose field meanings live in
`fields.md`'s Description column.
**Cause:** `technical-spec`'s templates gave the same fact two homes: `api.md`
carries a `Key Types / Schemas` block that is a bare `interface` with no
annotation guidance at all, and `fields.md` carries a separate table *with* a
Description column. Neither file is wrong on its own, which is why this
survived.
**Mitigation:** yes — out of scope for pass one and recorded so pass two
starts from the cause rather than the symptom; pass two's two-homes rule
closed it (the type says what a field means, the table says what happens to
it).
