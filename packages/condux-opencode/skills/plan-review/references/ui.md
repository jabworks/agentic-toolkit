# Review Surface UI

## The review surface

A three-pane layout over a **decision bar**: a left sidebar with two tabs —
**Contents** (heading outline with per-section note counts; in directory mode,
each document is a top-level node with its headings nested, click to switch
docs) and **Files** (paths the plan touches, parsed from inline code and
fences, badged **exists**/**new** against the repo; click jumps to the first
mention, repeat clicks cycle) — the centered rendered plan (middle), and a
**Review** rail (right) holding your notes and messages. The decisions live in
a fixed bar along the bottom — `[Reject] ——— [Request revisions] [Approve]` —
with a live summary of what rides along ("3 notes · 1 message will be sent").

```
┌──────────────────────────────────────────────────────────────────┐
│  Step 1  RENDER     Plan renders centered in the browser, w/ TOC. │
│  Step 2  ANNOTATE   Select text → a toolbar opens above it. Pick  │
│                     a category (Comment / Issue / Question /       │
│                     Suggestion / Nitpick) → the note input opens.  │
│                     Or message the agent in the Review rail.       │
│  Step 3  DECIDE     Bottom bar: Approve / Request Revisions /     │
│                     Reject — with a note/message count summary.    │
│  Step 4  RETURN     Decision + notes (each tagged with its        │
│                     category and quoting its anchor) go back.     │
└──────────────────────────────────────────────────────────────────┘
```

Selecting text opens a floating **annotation toolbar** anchored above the
selection (it flips below when there's no room). It starts as a category
**menubar**; choosing a category expands it to reveal the note input and
Save/Cancel. Saving highlights the text and anchors the note; clicking a
highlight or a note cross-links the two. The page live-reloads when the plan
file changes on disk (SSE + `fs.watch`).

When the agent **revises** the plan, the tab doesn't silently swap the text: a
banner reports the change (`+adds / -dels lines`) with a **View changes** toggle
that shows a unified line diff (old vs. new, folding long unchanged runs), and
the now-orphaned notes clear so the next round starts clean. Submitting a
decision **clears your notes immediately** and replaces the decision bar's
content with a confirmation that states what the agent does next
(implement / revise / rework).

## Guarantees (why it passes review)

- **No egress.** Server binds `127.0.0.1` only; the HTML template embeds its own
  markdown renderer and uses a system monospace font — no CDN, no web fonts, no
  paste/share service. Audit: `grep -rE 'https?://' references/*.html` returns nothing.
- **No dependencies.** `annotate-server.js` is Node stdlib only.
- **Auditable.** One stdlib server + one self-contained HTML file. The UI is
  styled after the **Terminus UI** design system (Button, Badge, Card, Textarea,
  Popover) — adapted as vanilla CSS tokens + classes, no React, no bundle.
