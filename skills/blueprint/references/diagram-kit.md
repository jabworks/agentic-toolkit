# Diagram Kit

Reference for `/blueprint`. Hand-authored inline SVG — no Mermaid, no CDN, no
renderer dependency. Every diagram is a self-contained HTML file that renders
from `file://`.

## Shared Conventions

- Canvas: `<svg viewBox="0 0 W H" style="max-width:100%">` sized to content;
  the page wraps it in the same `.frame` shell as the wireframe kit.
- Palette mirrors the wireframe discipline: fills `#fff`/`#f0f0f0`, strokes
  `#777`, text `#222`, the `#5b7c99` accent for the one thing the diagram is
  about (the new entity, the changed edge) — never more than one accent use.
- Text: `font-family: -apple-system, "Segoe UI", Roboto, sans-serif`, 13–14px
  labels, 11px annotations. If a label doesn't fit its box, the box grows —
  never shrink the font below 11px.
- Arrowheads via one shared `<marker>`:

```html
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 z" fill="#777"/>
  </marker>
</defs>
<!-- usage: <line ... stroke="#777" marker-end="url(#arrow)"/> -->
```

- Every relationship line gets a label. An unlabeled arrow is a guess the
  reader has to make.

## 1. Entity / Data-Model

One `<g>` per entity: title bar + field rows. Keys marked `PK` / `FK`; edge
labels carry cardinality (`1..*`, `0..1`).

```html
<g transform="translate(40,40)">
  <rect width="200" height="24" fill="#f0f0f0" stroke="#777"/>
  <text x="100" y="17" text-anchor="middle" font-weight="600">orders</text>
  <rect y="24" width="200" height="72" fill="#fff" stroke="#777"/>
  <text x="8"  y="41">id  PK</text>
  <text x="8"  y="61">user_id  FK</text>
  <text x="8"  y="81">status</text>
</g>
<!-- edge: users 1..* orders -->
<line x1="240" y1="80" x2="340" y2="80" stroke="#777" marker-end="url(#arrow)"/>
<text x="290" y="72" text-anchor="middle" font-size="11">1..*</text>
```

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
