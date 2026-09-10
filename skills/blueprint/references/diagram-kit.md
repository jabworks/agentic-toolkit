# Diagram Kit

Reference for `/blueprint`. Hand-authored inline SVG — no Mermaid, no CDN, no
renderer dependency. Every diagram is a self-contained HTML file that renders
from `file://`. Diagrams have one look — no wireframe/render split — and it is
the house language: paste `token-core.css` (sibling of this file) at the top
of the `<style>` block, verbatim.

## Shared Conventions

- Canvas: `<svg viewBox="0 0 W H" style="max-width:100%">` sized to content;
  the page wraps it in the wireframe kit's `.frame` shell (either mode's).
- Palette is token roles, referenced with `var(--…)` (CSS variables work in
  inline SVG attributes): fills `var(--card)` / `var(--muted)`, strokes
  `var(--border)`, edges `var(--subtle)`, text `var(--foreground)`. The one
  accent is the `--primary` family — for the one thing the diagram is about
  (the new entity, the changed edge) — never more than one accent use.
- Text: `--sans` for titles, `--mono` for everything that is data — field
  rows, cardinalities, edge labels (D2). 13–14px labels, 11px annotations
  in `var(--muted-foreground)`. If a label doesn't fit its box, the box
  grows — never shrink the font below 11px.
- Sizing: the base size goes on the `<svg>` tag (`font-size="13"`), every
  other size as a `font-size` attribute on the `<text>` itself. Never a
  `text { font-size }` rule in `<style>` — in the browser it overrides every
  `font-size` attribute in the diagram, so the sizes you wrote are not the
  sizes that render. The checker resolves sizes the way the browser does but
  sees only attributes, a bare `text` rule and `.class` rules; a text it
  cannot size is read at the browser's 16px and reported on stderr. Budget
  width at 0.6 em per character (exact for mono, generous for regular sans,
  a little tight for semibold titles): a 23-character title needs more than
  a 210 box, and when it doesn't fit the box grows — the checker reports
  `text-overflows-box`, never a smaller font.
- Arrowheads via one shared `<marker>`:

```html
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 z" fill="var(--subtle)"/>
  </marker>
</defs>
<!-- usage: <line ... stroke="var(--subtle)" marker-end="url(#arrow)"/> or
     <path ... stroke="var(--subtle)" marker-end="url(#arrow)"/> — the marker
     works the same on both elements. -->
```

- Every relationship line gets a label. An unlabeled arrow is a guess the
  reader has to make.

## Layout and Routing

1. *Grid first.* Assign every node a column and a row before drawing anything.
   Column pitch is box width plus a gutter of at least 72; row pitch is box
   height plus a gutter of at least 72. Gutters are edge corridors — wide
   enough for a label with its halo and two staggered edges. Boundaries wrap
   whole column/row spans and are drawn behind their members.
2. *Edges are orthogonal paths.* `<path d="M … H … V … H …">` with the shared
   arrow marker (it works on `<path>` exactly as on `<line>`). Never a
   diagonal. An edge leaves the side of its source that faces the target and
   enters the facing side of the target.
3. *Ports.* Each side of a box has three ports, at 25%, 50% and 75% of its
   length. Two edges on the same side take different ports — edges never
   share a port, so parallel edges never stack.
4. *Corridors only.* A segment may run only through gutters and across
   boundaries, never through a box's footprint. If a third box sits in the
   straight corridor between source and target, either move it to another row
   or column (preferred — rearranging is free before the drawing exists) or
   dog-leg through the adjacent gutter.
5. *Labels.* One label per segment, on the edge's longest free segment,
   `--mono` 11px: on a horizontal segment it sits 4px above the line, on a
   vertical segment it is centred on the line over its halo.
   Every label gets a halo so a crossing edge stays legible: a stroke-less
   `<rect>` in the fill the label sits on (`var(--background)` on open
   canvas, `var(--muted)` inside a filled boundary) drawn behind the text —
   the checker ignores stroke-less rects, so the halo is never mistaken for a
   node. Size the halo from the same budget as the label — characters × 11 ×
   0.6, plus 4px each side — a halo narrower than its label lets the crossing
   edge show through the ends. Two labels never share a corridor position:
   stagger by 14px or move one to another segment.
6. *Fan-in is a smell.* More than four edges into one box, or more than three
   edges in one gutter, means the diagram is answering two questions — split
   it (same rule as "Choosing the Shape").
7. *Check before delivering.* Run
   `node /PATH/TO/blueprint/references/diagram-check.mjs <file>` (the
   `/PATH/TO/` idiom is the one `plan-review` uses for its scripts — the
   skill's install location). A finding is a defect in the drawing, never a
   tolerance to argue with: fix, re-run, deliver only `clean`. If `node` is
   unavailable, say the check was skipped — never silently.

   | Code | Meaning |
   |---|---|
   | `edge-through-box` | an edge segment crosses a node rect it doesn't attach to |
   | `label-over-label` | two text boxes intersect |
   | `label-over-box` | a text box straddles the border of a node it doesn't belong to |
   | `text-overflows-box` | a node's own text is wider or taller than the node |
   | `edge-through-label` | an edge crosses a text box that isn't its own label |
   | `unlabeled-edge` | no text within 24px of the edge |
   | `text-outside-canvas` | text escapes the viewBox |

   Two boxes on different rows and columns, joined by a three-segment path
   with one haloed label and distinct ports:

   ```html
   <!-- orders → invoices: leave the right side at the 50% port, run the gutter,
        enter the left side at its 25% port. Label centred on the vertical segment, haloed. -->
   <path d="M 240 92 H 300 V 180 H 340" fill="none" stroke="var(--subtle)" marker-end="url(#arrow)"/>
   <rect x="262" y="120" width="76" height="14" fill="var(--background)"/>
   <text x="300" y="131" text-anchor="middle" font-size="11" fill="var(--muted-foreground)">1..* invoices</text>
   ```

## The Specificity Rule

Every label must name something real from *this* design — a path, a command, a
field, a state, a status value, an endpoint. **If a label would be equally true
of a different feature, it is too vague.**

A diagram is evidence for a decision. A box the reader cannot disagree with
carries no information, so it cannot be evidence — and "generic enough to fit
any feature" is the single most common reason a produced artifact turns out not
to help anyone.

| Too vague | Specific |
|---|---|
| `Design Doc` | `.condux/designs/<date>-<slug>.md` |
| `Preview` | `plan-review --steer` |
| `Gate` | `signed-off → plan proceeds` |
| `Status` | `status: in-progress` |
| `saves` | `5. append agreed §` |

The rule bites hardest early, when the specifics are not settled yet — which is
the correct time for it to bite. A diagram drawn before there is anything
concrete to put in it is decoration, and should not be drawn.

## 1. Entity / Data-Model

One `<g>` per entity: title bar + field rows. Keys marked `PK` / `FK`; edge
labels carry cardinality (`1..*`, `0..1`).

```html
<g transform="translate(40,40)">
  <rect width="200" height="24" fill="var(--muted)" stroke="var(--border)" rx="3"/>
  <text x="100" y="17" text-anchor="middle" font-weight="600">orders</text>
  <rect y="24" width="200" height="72" fill="var(--card)" stroke="var(--border)"/>
  <text x="8"  y="41">id  PK</text>
  <text x="8"  y="61">user_id  FK</text>
  <text x="8"  y="81">status</text>
</g>
<!-- edge: users 1..* orders -->
<line x1="240" y1="80" x2="340" y2="80" stroke="var(--subtle)" marker-end="url(#arrow)"/>
<text x="290" y="72" text-anchor="middle" font-size="11" fill="var(--muted-foreground)">1..*</text>
```

An accented entity (the diagram's one accent) swaps its title-bar fill to
`var(--primary-muted)`, its strokes to `var(--primary)`, and its title text to
`var(--primary-text)`.

## 2. Request / Data Flow

Actors and stores as boxes on one horizontal band; numbered edges show
sequence. Number every hop (`1. POST /orders`, `2. validate`, `3. INSERT`) —
the numbers are what make it a flow rather than a topology.

## 3. Architecture (boxes-and-arrows)

Services as rounded rects (`rx="6"`), external systems as rects with a dashed
stroke (`stroke-dasharray="4 3"`), boundaries (network, process, trust) as a
large dashed `<rect>` behind its members with the boundary name in the top-left
corner. Edges labeled with protocol or payload (`HTTP`, `queue: order.created`).

## 4. State Machine

States as rounded rects, transitions as labeled arrows, initial state marked
with a filled dot and an arrow, terminal states with a double border (nested
`<rect>` inset by 3px). Every transition label is the *event* that causes it,
not a description of the target state.

## Choosing the Shape

| The question being asked | Shape |
|---|---|
| What entities exist and how do they relate? | Entity / data-model |
| What happens, in what order, when X occurs? | Request / data flow |
| What services exist and what talks to what? | Architecture |
| What states are legal and what moves between them? | State machine |

When a design raises two of these questions, draw two diagrams — a diagram
answering two questions at once answers neither legibly.
