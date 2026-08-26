# Quirks — Discovery Presentation

## Q1 — Creating the design file at §1 silently invalidates draft-plan's gate

**Severity:** high
**Discovered:** 2026-08-26 (during design, before implementation)

`draft-plan` gates on a signed-off design by globbing
`.condux/designs/*<slug>*.md`. That works today only because of an accident of
timing: the file exists *because* the user signed off, so its existence is a
faithful proxy for approval.

Creating the file at §1 breaks the proxy without breaking the glob. An
abandoned discovery — user walks away after §2 — leaves a file that satisfies
the gate, and `draft-plan` will plan against an unfinished design while
reporting that the soft gate passed. Nothing errors; the failure is silent and
looks like success.

**Mitigation:** frontmatter `status: in-progress` → `signed-off`, flipped at
Step 7. `draft-plan` reads the value instead of the file's existence. Any
future consumer of `.condux/designs/` must read the status too — existence is
no longer meaningful on its own.

**Verified during planning: there are three consumers, not one.**
`skills/discovery/SKILL.md:21` (the existing-design check — benign, and
improved: an in-progress design *should* offer resume),
`skills/draft-plan/SKILL.md:22` (the gate), and
`skills/subagent-execution/agents/planner.md:23` — the last of which was
missed by this design. The planner agent is told the globbed design is "your
source of truth… do not re-derive or second-guess design decisions already
settled there", so an in-progress design would be planned from as if settled.
All three now read `status`.

The general lesson is worth more than the fix: **a proxy that holds by
coincidence of timing gives no signal when the timing changes.** Nothing about
the glob broke; it kept returning a hit, and the hit simply stopped meaning
what every reader assumed it meant.

---

## Q2 — plan-review's markdown renderer escapes all HTML, by design

**Severity:** medium
**Discovered:** 2026-08-26

The obvious way to put a blueprint diagram in front of the reader with zero
clicks is to inline its SVG into the design markdown. It does not work:
`renderBlocks()` runs `esc()` on every path, and `safeHref()` additionally
blocks `javascript:`, `data:` and `vbscript:` hrefs.

This is not an oversight to route around — it is the renderer's security
boundary, and it is shared by plan review, design review and spec preview. Any
SVG passthrough must be a deliberate, narrow change to that boundary, made on
its own terms rather than as a side effect of a presentation fix.

**Consequence for this design:** diagrams are *linked* from the design doc, not
embedded. One click stands between the reader and the picture.

**And the same escaping caused a second problem, found during planning.** The
renderer maps a bare `---` to `<hr>` and has no frontmatter handling anywhere
(verified: zero matches in the server and the template). So the `status` field
this design adds renders as a horizontal rule, a stray `status: …` paragraph
and a second rule — at the top of the surface the design makes primary.
Resolved by `stripFrontmatter()`, which skips a block at position 0 only, is
applied at the `renderBlocks` call so `st.md` stays raw for the revision diff,
and removes content rather than passing it through — so it does not touch the
escaping boundary described above.

---

## Q3 — A noun-shaped trigger cannot see a design that has no nouns

**Severity:** medium
**Discovered:** 2026-08-26

Blueprint asked "UI surface or data model involved?". The design in this spec
has neither — its subjects are a terminal output shape and a markdown file —
and it still needed a flow diagram badly enough that the reader asked for one
explicitly.

The general shape of the bug: a trigger keyed on *what a feature contains*
cannot fire for a feature whose contents are unusual, even when the artifact
would obviously help. A trigger keyed on *what question the reader is trying to
answer* has no such blind spot, because the question is asked regardless of
what the feature is made of.

Worth remembering when writing any trigger contract, not just this one.

---

## Q4 — Two homes for one fact is how an explanation goes missing

**Severity:** medium
**Discovered:** 2026-08-26 (pass two — recorded here while the evidence is fresh)

`technical-spec`'s templates give the same fact two homes: `api.md` carries a
`Key Types / Schemas` block that is a bare `interface` with no annotation
guidance at all, and `fields.md` carries a separate table *with* a Description
column.

The reported symptom — "I either had to search for the explanation or it was
non-existent" — is the predictable result. The explanation frequently does
exist; it is just never on the type the reader is looking at. Neither file is
wrong on its own, which is why this survived.

Out of scope for pass one; recorded so pass two starts from the cause rather
than the symptom.
