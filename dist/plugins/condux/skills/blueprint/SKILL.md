---
name: blueprint
description: Produce dependency-free visual clarity artifacts at design time — HTML wireframes and full renders for UI screens and flows in the house design language (surface-kit tokens), and inline-SVG system diagrams (data models, flows, architecture, state machines) for backend work.
when_to_use: During /discovery when a section turns on what entities exist, what happens in what order, what talks to what, what states are legal, or what goes where on a screen; from /draft-plan task cards; or standalone on "mock this up", "wireframe this screen", "visualize the data model", "sketch the architecture", "diagram the flow". Not for aesthetic or brand direction, editable design canvases or Figma, charts from real data, or generating code from a mockup.
argument-hint: "[surface or model to visualize — optional; defaults to the current design context]"
---

# /blueprint

Make the design visible before it's built. Wireframes tell a frontend dev what
goes where and why; system diagrams tell a backend dev what talks to what.
Structure first — and everything speaks the house design language (the
surface-kit token core), so a mockup already looks like it belongs to the
product family.

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
│  Step 1: ASSESS THE QUESTION                                     │
│  What is the reader trying to answer?                            │
│    - What goes where on a screen → wireframe family              │
│    - What exists / what happens  → diagram family                │
│      / what talks to what /                                      │
│      what states are legal                                       │
│    - Two of these               → one artifact each              │
│                                                                  │
│  Step 2: PRODUCE                                                 │
│  One self-contained HTML file per screen / flow state / diagram. │
│  Wireframes follow references/wireframe-kit.md — wireframe mode  │
│  by default; render mode when structure is signed off or the     │
│  user asks for fidelity. Diagrams follow references/             │
│  diagram-kit.md. All styling from references/token-core.css.     │
│  No external assets, no CDN, no font files.                      │
│                                                                  │
│  Step 3: DELIVER                                                 │
│  Standalone: open in the browser (xdg-open / open). If neither   │
│  works (headless, SSH), print the absolute paths and continue —  │
│  never fail on delivery.                                         │
│  Inside /discovery: open NOTHING. Link the file from the design  │
│  doc and let the running preview reload — see Inside the         │
│  Workflow.                                                       │
│  Either way, always state which mode was produced                │
│  and offer the flip: "wireframe mode — say 'promote to render'   │
│  for the full house look" (or the reverse). The mode is never    │
│  chosen silently.                                                │
│                                                                  │
│  Step 4: LINK                                                    │
│  Reference the files from the design doc or task card that       │
│  motivated them, so the visual target travels with the design.   │
└──────────────────────────────────────────────────────────────────┘
```

## The Two Families

**Wireframes and renders (UI clarity).** Two modes over one shared skeleton,
both in the house tokens. *Wireframe mode* (default) is schematic — dashed
grouping, neutral roles only, annotation callouts — and answers: what elements
exist, how they group, what order they read in, what happens on each state
(empty, loading, error, populated). *Render mode* unlocks the full language
(accent, semantic and categorical colour, elevation, motion) to show how the
settled structure will look; promotion is a style-block swap, the skeleton
never changes. Multiple states of one flow are separate files, named for the
state. The full discipline — hard rules plus copyable mode CSS blocks — is in
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

- **/discovery** loads this skill at the propose step when a section's decision
  turns on one of the five questions below — not when the feature "has" a UI
  surface or a data model. That noun test has a blind spot: a design whose
  subjects are, say, a terminal output shape and a markdown file contains
  neither, and still needs a flow diagram. A question test has no such gap,
  because the reader asks the question regardless of what the feature is made of.

  | The question the section turns on | Shape |
  |---|---|
  | What entities exist and how do they relate? | entity / data-model |
  | What happens, in what order, when X occurs? | request / data flow |
  | What services exist and what talks to what? | architecture |
  | What states are legal and what moves between them? | state machine |
  | What goes where on a screen, and in what order does it read? | wireframe |

  **Inside discovery, deliver by linking — never by opening.** The reader
  already has the design preview open (discovery launches it at §1 and it
  live-reloads on every write). Add the mockup's path to the design doc and the
  link appears there. A tab per section is the interruption this avoids;
  standalone invocations keep opening on deliver. Side-by-side option *picking*
  stays with discovery's own mockup-picker.
- **/draft-plan** task cards may cite mockup paths so an implementer sees the
  visual target for their task.
- Standalone asks ("mock this up", "visualize the data model") run the same
  three steps without the discovery context.

## What Does NOT Happen

```
✗ Palettes or typography outside the shared token core — the house language
  is the ceiling, render mode included; blueprint is not a brand playground
✗ Chromatic colour in wireframe mode (neutral roles + the annotation accent)
✗ External dependencies — no Mermaid CDN, no image generation, no Figma
✗ Code generation from the mockup (that's implementation's job, later)
✗ Charts of real data (that's a dataviz concern, not a design mockup)
✗ Labels generic enough to fit another feature — see the specificity rule in
  both kits; a box the reader can't disagree with isn't evidence
✗ Opening a browser tab while running inside /discovery
✗ Editing the mockups after design sign-off without saying so
```
