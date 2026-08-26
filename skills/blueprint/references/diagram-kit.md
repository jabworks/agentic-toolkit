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
- Arrowheads via one shared `<marker>`:

```html
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 z" fill="var(--subtle)"/>
  </marker>
</defs>
<!-- usage: <line ... stroke="var(--subtle)" marker-end="url(#arrow)"/> -->
```

- Every relationship line gets a label. An unlabeled arrow is a guess the
  reader has to make.

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
