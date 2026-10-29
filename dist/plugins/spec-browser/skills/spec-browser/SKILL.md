---
name: spec-browser
description: "Use when there are many tech specs under specs/ and you need to navigate them as one doc site, generate a catalog agents can reference, or answer \"what specs do we have / where is the spec for X\". Triggers include \"browse specs\", \"spec index\", \"list all specs\", \"spec site\", \"navigate specs\". Reach for this once a repo accumulates several specs and a single spec folder view (technical-spec's own preview) is no longer enough — you want the whole specs/ tree at once, plus a plain-markdown catalog for agents that have no search plugin. Not for an approve/revise decision on one plan; use plan-review."
argument-hint: "[specs-root]"
effort: low
---

# /spec-browser

Turn a growing `specs/` tree into (1) a plain-markdown **catalog** any agent
can read or grep, and (2) a **browsable doc site** across every spec, reusing
plan-review's renderer and folder-grouped navigation. No external services,
no plugins, no build step.

## Two outputs, two audiences

| Output | Audience | Form |
|---|---|---|
| `specs/index.md` | agents + humans | one markdown table: spec title, purpose, path |
| plan-review viewer | humans | live doc site over the whole `specs/` tree |

The catalog is the portable, dependency-free way for an agent to discover and
reference specs — read or `grep` one file. It is deliberately not tied to any
search MCP, so it works in plain Claude Code, Codex, or any compatible agent.

## Steps

### 1. Build / refresh the catalog

Locate this skill's generator and run it against the specs root (default
`specs`):

```bash
node <path-to>/spec-browser/references/build-index.js [specs-root]
```

It walks the tree, treats every directory containing an `index.md` as a spec,
extracts the title (`# heading`) and purpose (first `>` note or first line),
and writes `<specs-root>/index.md`. Re-run it whenever specs are added or
renamed — it overwrites the catalog in place.

### 2. Browse the tree (optional)

To read/annotate the whole set in the browser, launch the plan-review server
in directory mode against the specs root — it now recurses the tree and groups
the Contents nav by spec folder, with `index.md` (the catalog) as the landing
page:

This step needs the **condux plugin's plan-review skill installed** — the
server ships with it, not with spec-browser. Step 1 (the catalog) works
without it.

```bash
# find the server shipped with the plan-review skill
find ~/.claude ~/.codex ~/.agents -name annotate-server.js -path '*plan-review*' 2>/dev/null | head -1
node /path/to/plan-review/references/annotate-server.js specs
```

If the `find` prints nothing, plan-review isn't installed — say so and offer
the catalog (`specs/index.md`) instead of silently skipping the browse step.

Same annotation UI as plan/spec review: notes land in
`specs/review.feedback.md`. This is browsing, not a decision gate — no
approve/deny polling needed unless you want it.

## Notes

- The catalog is a generated artifact — the header marks it "do not edit by
  hand." Editing a spec means editing that spec's own files, then re-running
  step 1.
- Pairs with `technical-spec` (which writes individual specs) — this skill is
  the index over all of them. For a single spec, use plan-review's directory
  mode (technical-spec's old standalone preview is retired); use spec-browser
  when you have many.
- Keep `specs/index.md` committed so agents in a fresh checkout can reference
  the catalog without running anything.
