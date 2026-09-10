# Diagram Kit

Reference for `/blueprint`. Hand-authored inline SVG — no Mermaid, no CDN, no
renderer dependency. Every diagram is a self-contained HTML file that renders
from `file://`. Diagrams have one look — no wireframe/render split — and it is
the house language: paste `token-core.css` (sibling of this file) at the top
of the `<style>` block, verbatim.

## Shared Conventions

- Canvas: `<svg viewBox="0 0 W H" font-size="13" style="max-width:100%">`
  sized to content; the page wraps it in the wireframe kit's `.frame` shell
  (either mode's). The `font-size` is the base every text inherits — see
  Sizing below.
- Palette is token roles, referenced with `var(--…)` (CSS variables work in
  inline SVG attributes): fills `var(--card)` / `var(--muted)`, strokes
  `var(--border)`, edges `var(--subtle)`, text `var(--foreground)`. Node fills
  and strokes come from the categorical set instead — see Visual Language.
- Accent: categorical colour is identity, never emphasis. `--primary` stays
  the one accent, for the one thing the diagram is about (the new entity, the
  changed edge): a 2.5px `var(--primary)` stroke and a `var(--primary-text)`
  title over the node's role tint — never more than one accent use. Semantic
  tokens (`--success`, `--warning`, `--destructive`, `--info`) are state only,
  never role — a persistence-green node and a success-green node in one
  diagram read as the same claim.
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
  a little tight for semibold titles): at 16px a 23-character title needs
  more than a 210 box, and when it doesn't fit the box grows — the checker
  reports `text-overflows-box`, never a smaller font.
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

## Visual Language

Three channels, one meaning each: **colour is role**, **mark is kind**, **dash
is protocol**. Two nodes in the same colour make a claim — that they play the
same part in the system — so colour is never picked for looks.

### Roles

Fixed slots. A role always gets the same categorical token, in every diagram of
every design, because a per-diagram choice is decoration and a fixed table is a
language.

| Role | Slot | Applies to |
|---|---|---|
| frontend runtime | `--cat-4` | UI services, widget hosts, client-side stores |
| API / service | `--cat-2` | backend services, gateways, resolvers |
| persistence | `--cat-3` | databases, caches, object stores |
| external system | `--cat-7` | third parties, upstream sources, providers |
| messaging / queue / bus | `--cat-8` | brokers, streams, topics |
| actor / user | `--cat-6` | people and devices in flow diagrams |
| batch / scheduler | `--cat-5` | jobs, cron, pipelines |
| unassigned | `--cat-other` | anything the design has not named yet |

- Tint recipe, verbatim, as attributes on the tag:
  `fill="var(--cat-N)" fill-opacity="0.10" stroke="var(--cat-N)"`.
  Never move the stroke into a `.class` rule — the checker reads `stroke` off
  the tag, and a class-styled node reads as a halo and vanishes from the check.
- At most five roles per diagram. A sixth means the diagram is answering two
  questions (same rule as "Choosing the Shape") — split it, or fold the tail
  roles into `--cat-other`.
- No new tokens. `--cat-1` … `--cat-8` and `--cat-other` are the whole set;
  there is no muted variant, and inventing one crosses into the token core
  every surface inherits.
- Opaque role fills are banned: body text loses contrast, worst on the dark
  ground. `fill-opacity="0.10"` is the recipe, not a starting point.

### Kinds

| Kind | Body | Mark | Border |
|---|---|---|---|
| service | rounded `<rect>` (`rx="6"`) | none | solid |
| store | rounded `<rect>` | `mark-store` | solid |
| external system | rounded `<rect>` | `mark-external` | dashed `6 4` |
| UI surface | rounded `<rect>` | `mark-ui` | solid |
| actor / user | pill `<rect>` (`rx` = height / 2) | `mark-actor` | solid |
| queue / bus | rounded `<rect>` | `mark-queue` | solid |
| batch / scheduler | rounded `<rect>` | `mark-batch` | solid |
| boundary | dashed `<rect>` behind its members | title strip | dashed `6 4` |

- **Invariant: a node's body is exactly one stroked `<rect>`.** Everything else
  on it — halo, title strip, glyph — is a stroke-less `<rect>` or a `<use>`.
  The checker reads `stroke` from the tag and treats a stroke-less rect as
  decoration, so the one stroked rect *is* the node's footprint: a second
  stroked rect inside it reclassifies the node as a boundary, and a body drawn
  as a cylinder, hexagon or ellipse is invisible to the check — a false
  `clean`, not a clever shape.
- No footprint-changing geometry. Kind is carried by the mark and the border,
  never by a new body shape.

### Marks

Paste this into the `<defs>` beside the arrow marker. `<defs>` content is never
walked by the checker, so a mark path is a glyph; the same path drawn in the
body of the svg is read as an unlabeled edge.

```html
<g id="mark-store"><path d="M1,4 a8,3 0 1,0 16,0 a8,3 0 1,0 -16,0 M1,4 V13 a8,3 0 0,0 16,0 V4" fill="none" stroke="currentColor" stroke-width="1.3"/></g>
<g id="mark-external"><path d="M3,12 L15,3 M7,3 h8 v8" fill="none" stroke="currentColor" stroke-width="1.3"/></g>
<g id="mark-ui"><path d="M1,1 h16 v13 h-16 z M1,5 h16" fill="none" stroke="currentColor" stroke-width="1.3"/></g>
<g id="mark-actor"><path d="M9,2 a3,3 0 1,0 0.01,0 M2,15 a7,5 0 0,1 14,0" fill="none" stroke="currentColor" stroke-width="1.3"/></g>
<g id="mark-queue"><path d="M1,3 h12 M3,8 h12 M5,13 h12" fill="none" stroke="currentColor" stroke-width="1.3"/></g>
<g id="mark-batch"><path d="M2,8 a7,7 0 1,0 14,0 a7,7 0 1,0 -14,0 M9,4 V8 h4" fill="none" stroke="currentColor" stroke-width="1.3"/></g>
```

- Every glyph is drawn on an 18×16 grid. Six marks for eight kinds: a service
  has no mark (it is the unmarked default) and a boundary uses its title strip.
- Placement: `<use href="#mark-store" x="…" y="…" width="18" height="16"
  style="color:var(--cat-N)"/>`, 14px in from the node's top-left — `x` =
  node `x` + 14, `y` = node `y` + 12, the two extra pixels of headroom keeping
  the glyph clear of the `rx="6"` corner. `currentColor` picks up the
  `style="color:…"`, so a mark is always its node's role colour.
- A `<use>` has no footprint the checker can see, so a mark never collides
  with anything. It can still collide visually: keep the node's title clear of
  the glyph's 18px column.

### Edges

| Edge means | Stroke width | Dash |
|---|---|---|
| synchronous call (HTTP, gRPC, GraphQL) | 1.5 | solid |
| in-process hand-off within a boundary | 1 | solid |
| asynchronous message or event (queue, stream, topic) | 1.5 | `6 4` |
| file, batch, or adapter protocol transfer | 1.5 | `2 3` |

- Stroke is always `var(--subtle)`. Colour never goes on an edge: colour is
  role identity, and two channels on one line reads as noise.
- Everything from Layout and Routing still holds — the shared arrowhead, one
  haloed `--mono` 11px label per segment, orthogonal paths, distinct ports. A
  two-way edge adds `marker-start`; flow diagrams keep their hop numbers.
- Halo fill is `var(--card)`, everywhere (Layout and Routing rule 5).
  Boundaries in this language are unfilled — only the title strip is tinted —
  so the ground under every label is the frame's card surface.

### Boundaries

- Body: a dashed `<rect>` in the boundary's role colour,
  `fill="none" stroke="var(--cat-N)" stroke-dasharray="6 4" rx="4"`, drawn
  behind its members.
- Title strip: a stroke-less tinted `<rect>` at the top of the boundary, full
  width, **48 tall**, `fill="var(--cat-N)" fill-opacity="0.10" rx="4"`. It has
  no stroke, so the checker reads it as decoration, not a nested node.
- Title inside the strip: `font-size="14" font-weight="600"
  letter-spacing="0.04em"` in `var(--cat-N)`, 24px in from the boundary's left
  edge, baseline at strip top + 30. A title strip makes a region scannable
  zoomed out; a bare corner label reads at close range only.
- Members start **≥ 45px below the strip's bottom edge** — boundary top + 93.
  Labels and their halos need only clear the band: halo top ≥ strip bottom.
  A halo in the strip punches a `var(--card)` hole through the tint, so a
  corridor that would put one there moves down, never the strip.

### Legend

An HTML block under the `<svg>`, still inside `.frame` — never inside the svg,
where the checker scans it and stroked swatches become nodes. At most four
rows (role, kind, edge, accent), and only entries the diagram actually
contains: a legend row you cannot point at in the drawing is the five-role cap
failing out loud. The block below is the legend for the worked fragment at the
end of this section — three roles, three kinds, two edges, the accent.

```html
<div class="legend">
  <div><b>role</b><span><span class="sw" style="background:var(--cat-4);opacity:.35;border:1px solid var(--cat-4)"></span> frontend runtime</span><span><span class="sw" style="background:var(--cat-2);opacity:.35;border:1px solid var(--cat-2)"></span> API / service</span><span><span class="sw" style="background:var(--cat-8);opacity:.35;border:1px solid var(--cat-8)"></span> messaging</span></div>
  <div><b>kind</b><span><span class="sw" style="border:1px solid var(--border);border-radius:4px"></span> service</span><span><svg width="18" height="16"><use href="#mark-store" width="18" height="16"/></svg> store</span><span><svg width="18" height="16"><use href="#mark-queue" width="18" height="16"/></svg> queue / bus</span></div>
  <div><b>edge</b><span><i class="ln" style="border-top:1.5px solid var(--subtle)"></i> sync call</span><span><i class="ln" style="border-top:1.5px dashed var(--subtle)"></i> async message</span></div>
  <div><b>accent</b><span><span class="sw" style="border:2.5px solid var(--primary);border-radius:4px"></span> the one thing this diagram is about</span></div>
</div>
<style>
.legend { display: grid; gap: var(--space-2); font-family: var(--mono); font-size: var(--text-xs); color: var(--muted-foreground); margin-top: var(--space-4); }
.legend b { color: var(--foreground); margin-right: var(--space-3); display: inline-block; width: 6ch; }
.legend span { margin-right: var(--space-4); display: inline-flex; align-items: center; gap: 6px; }
.legend .sw { display: inline-block; width: 14px; height: 14px; }
.legend .ln { display: inline-block; width: 28px; height: 0; }
</style>
```

- The kind swatches `<use>` the same mark ids: one inline `<svg>` per row
  entry, resolving against the `<defs>` in the diagram above it (same
  document, so the fragment reference works).
- A CSS border cannot carry an SVG dash array, so an edge swatch approximates:
  `6 4` is `dashed`, `2 3` is `dotted`. At 28px they read the same. Add the
  `2 3` row only when the diagram has a file / batch / adapter edge in it.

### A worked fragment

Two boundaries, four nodes, two protocols. Gutters are 72+, every edge is
orthogonal and leaves a 50% port, every label is haloed and clear of both strip
bands, and every node body is one stroked rect.

```html
<!-- needs the arrow marker and the mark <defs> above. viewBox 0 0 692 352 -->
<rect x="20" y="20" width="280" height="312" rx="4" fill="none" stroke="var(--cat-4)" stroke-dasharray="6 4"/>
<rect x="20" y="20" width="280" height="48" rx="4" fill="var(--cat-4)" fill-opacity="0.10"/>
<text x="44" y="50" font-family="var(--sans)" font-size="14" font-weight="600" letter-spacing="0.04em" fill="var(--cat-4)">FRONTEND RUNTIME</text>
<rect x="392" y="20" width="280" height="312" rx="4" fill="none" stroke="var(--cat-2)" stroke-dasharray="6 4"/>
<rect x="392" y="20" width="280" height="48" rx="4" fill="var(--cat-2)" fill-opacity="0.10"/>
<text x="416" y="50" font-family="var(--sans)" font-size="14" font-weight="600" letter-spacing="0.04em" fill="var(--cat-2)">BACKEND REPORTING API</text>
<!-- members start at y=116, 48 below the strip that ends at y=68 (45 is the floor) -->
<rect x="44" y="116" width="232" height="56" rx="6" fill="var(--cat-4)" fill-opacity="0.10" stroke="var(--cat-4)"/>
<text x="160" y="150" text-anchor="middle" font-family="var(--sans)" font-size="14" font-weight="600" fill="var(--foreground)">Filter + query planner</text>
<rect x="44" y="252" width="232" height="56" rx="6" fill="var(--cat-4)" fill-opacity="0.10" stroke="var(--cat-4)"/>
<use href="#mark-store" x="58" y="264" width="18" height="16" style="color:var(--cat-4)"/>
<text x="160" y="286" text-anchor="middle" font-family="var(--sans)" font-size="14" font-weight="600" fill="var(--foreground)">Frontend catalogs</text>
<!-- the accent: role tint kept, 2.5px primary stroke, primary-text title -->
<rect x="416" y="116" width="232" height="56" rx="6" fill="var(--cat-2)" fill-opacity="0.10" stroke="var(--primary)" stroke-width="2.5"/>
<text x="532" y="150" text-anchor="middle" font-family="var(--sans)" font-size="14" font-weight="600" fill="var(--primary-text)">Reporting query API</text>
<rect x="416" y="252" width="232" height="56" rx="6" fill="var(--cat-8)" fill-opacity="0.10" stroke="var(--cat-8)"/>
<use href="#mark-queue" x="430" y="264" width="18" height="16" style="color:var(--cat-8)"/>
<text x="532" y="286" text-anchor="middle" font-family="var(--sans)" font-size="14" font-weight="600" fill="var(--foreground)">Export queue</text>
<!-- sync call: 1.5 solid, right 50% port to left 50% port, label 4px above -->
<path d="M 276 144 H 416" fill="none" stroke="var(--subtle)" stroke-width="1.5" marker-end="url(#arrow)"/>
<rect x="306" y="129" width="81" height="15" fill="var(--card)"/>
<text x="346" y="140" text-anchor="middle" font-family="var(--mono)" font-size="11" fill="var(--muted-foreground)">POST /query</text>
<!-- async message: 1.5 dashed 6 4, bottom 50% port to top 50% port -->
<path d="M 532 172 V 252" fill="none" stroke="var(--subtle)" stroke-width="1.5" stroke-dasharray="6 4" marker-end="url(#arrow)"/>
<rect x="465" y="205" width="134" height="15" fill="var(--card)"/>
<text x="532" y="216" text-anchor="middle" font-family="var(--mono)" font-size="11" fill="var(--muted-foreground)">queue: report.ready</text>
```

Three roles, two kinds marked, one accent — the `### Legend` block above is
this fragment's legend, verbatim.

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
   `<rect>` in `var(--card)` — the frame ground every diagram sits on — drawn
   behind the text —
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

Visual Language on this family: the title bar carries the tint of the entity's
*owning* role (`fill="var(--cat-N)" fill-opacity="0.10"`, and `stroke="var(--cat-N)"`
on both rects), and the kind mark sits 14px in from the title bar's top-left —
so a reader sees which service owns which table before reading a field name.
The bar and the body are siblings, never nested: a bar drawn *inside* the body
rect makes the checker read the whole entity as a boundary.

An accented entity (the diagram's one accent) keeps its role tint and swaps its
strokes to 2.5px `var(--primary)` and its title text to `var(--primary-text)`.

## 2. Request / Data Flow

Actors and stores as boxes on one horizontal band; numbered edges show
sequence. Number every hop (`1. POST /orders`, `2. validate`, `3. INSERT`) —
the numbers are what make it a flow rather than a topology.

Visual Language on this family: actors on the band are pill rects
(`rx` = height / 2) in `--cat-6` with `mark-actor`, stores are rounded rects
with `mark-store` in their owning role's slot, and the hop numbers stay — kind
and colour say *what* each box is, the numbers still say *when*.

## 3. Architecture (boxes-and-arrows)

The family the Visual Language section is written for — it uses every channel:
services, stores, externals, UI surfaces, queues and batch jobs from the kinds
table; boundaries (network, process, trust) as large dashed rects with a title
strip; edges dashed by protocol and labeled with the protocol or payload
(`HTTP`, `queue: order.created`). Take every rule and both fences from there.

## 4. State Machine

States as rounded rects, transitions as labeled arrows, initial state marked
with a filled dot and an arrow, terminal states with a double border (nested
`<rect>` inset by 3px). Every transition label is the *event* that causes it,
not a description of the target state.

Visual Language on this family: no role colour and no marks — a state is not a
component, so a categorical fill would claim a kinship that does not exist.
Neutral bodies (`var(--card)` / `var(--border)`), `--primary` on the one state
the diagram is about, and semantic tokens where a state *is* a state
(`--success` on settled, `--destructive` on failed).

## Choosing the Shape

| The question being asked | Shape |
|---|---|
| What entities exist and how do they relate? | Entity / data-model |
| What happens, in what order, when X occurs? | Request / data flow |
| What services exist and what talks to what? | Architecture |
| What states are legal and what moves between them? | State machine |

When a design raises two of these questions, draw two diagrams — a diagram
answering two questions at once answers neither legibly.
