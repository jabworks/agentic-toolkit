---
name: blueprint
description: "Produce dependency-free visual clarity artifacts at design time — grayscale HTML wireframes for UI screens and flows, and inline-SVG system diagrams (data models, flows, architecture, state machines) for backend work. During /discovery when the feature has a UI surface or a data model, from /draft-plan task cards, or standalone on \"mock this up\", \"wireframe this screen\", \"visualize the data model\", \"sketch the architecture\", \"diagram the flow\". Not for aesthetic or brand direction, editable design canvases or Figma, charts from real data, or generating code from a mockup."
argument-hint: "[surface or model to visualize — optional; defaults to the current design context]"
---

# /blueprint

Make the design visible before it's built. Wireframes tell a frontend dev what
goes where and why; system diagrams tell a backend dev what talks to what.
Structure, never style.

## Usage

```
/blueprint checkout flow
/blueprint orders data model
/blueprint            # infers surfaces from the design being discussed
```

## How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│                         BLUEPRINT                                │
├──────────────────────────────────────────────────────────────────┤
│  Step 1: ASSESS SURFACES                                         │
│  What does the feature touch?                                    │
│    - UI screens or flows        → wireframe family               │
│    - Data models, services,     → diagram family                 │
│      flows, state machines                                       │
│    - Both                       → both families                  │
│                                                                  │
│  Step 2: PRODUCE                                                 │
│  One self-contained HTML file per screen / flow state / diagram. │
│  Wireframes follow references/wireframe-kit.md.                  │
│  Diagrams follow references/diagram-kit.md.                      │
│  No external assets, no CDN, no fonts beyond the system stack.   │
│                                                                  │
│  Step 3: DELIVER                                                 │
│  Open in the browser (xdg-open / open). If neither works         │
│  (headless, SSH), print the absolute paths and continue —        │
│  never fail on delivery.                                         │
│                                                                  │
│  Step 4: LINK                                                    │
│  Reference the files from the design doc or task card that       │
│  motivated them, so the visual target travels with the design.   │
└──────────────────────────────────────────────────────────────────┘
```

## The Two Families

**Wireframes (UI clarity).** Grayscale boxes with real content hierarchy and
annotation callouts. A wireframe answers: what elements exist, how they group,
what order they read in, what happens on each state (empty, loading, error,
populated). Multiple states of one flow are separate files, named for the
state. The full discipline — hard rules plus a copyable base-CSS block — is in
`references/wireframe-kit.md`.

**System diagrams (BE clarity).** Hand-authored inline SVG for four shapes:
entity/data-model, request/data flow, architecture boxes-and-arrows, and state
machines. A diagram answers: what entities or services exist, what relates to
what, what direction data moves, what states are legal. Skeletons and
label conventions are in `references/diagram-kit.md`.

Pick per surface, not per request — a feature with a settings page and a new
`preferences` table gets a wireframe *and* an entity diagram.

## Where Files Go

Write to `<git-root>/.condux/designs/<YYYY-MM-DD>-<feature>/mockups/<name>.html`,
beside the feature's design doc. `.condux/` is gitignored working state,
created on demand at the git root — before the first write, check it's
ignored (`git check-ignore -q .condux/ || echo "not ignored"`) and offer to
add it to `.gitignore` if it isn't. Not a git repo → fall back to CWD and say
so once. Standalone invocations with no design doc use the same path with the
request's kebab-case subject as `<feature>`.

**Citation direction:** these files are ephemeral. A committed file — a spec,
a changelog, a backlog item — may never cite a `.condux/` path; promote the
mockup into the spec directory first and cite the committed copy.

## Inside the Workflow

- **/discovery** loads this skill at the propose step when the feature has a
  UI surface or a data model — the mockups render the proposal, and the
  signed-off design doc links the chosen ones. Side-by-side option *picking*
  stays with discovery's own mockup-picker.
- **/draft-plan** task cards may cite mockup paths so an implementer sees the
  visual target for their task.
- Standalone asks ("mock this up", "visualize the data model") run the same
  three steps without the discovery context.

## What Does NOT Happen

```
✗ Brand styling, palettes, typography choices, premium polish — structure only
✗ Colors beyond grayscale (one muted annotation accent is the ceiling)
✗ External dependencies — no Mermaid CDN, no image generation, no Figma
✗ Code generation from the mockup (that's implementation's job, later)
✗ Charts of real data (that's a dataviz concern, not a design mockup)
✗ Editing the mockups after design sign-off without saying so
```
