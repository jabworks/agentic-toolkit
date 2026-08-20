# blueprint — Decisions

- **Condux bundle member, not a standalone plugin.** Cross-plugin dependencies
  are banned (docket #6), so a standalone plugin would degrade the discovery
  integration to "load if installed". Bundle membership guarantees presence at
  the phase the skill exists for. Growing discovery's `mockup-picker.md` in
  place was also rejected: a reference file cannot trigger standalone and
  cannot serve draft-plan.
- **Name: `blueprint`.** Structural by definition — covers UI wireframes and
  system diagrams alike, and signals clarity-not-aesthetics. Candidates
  rejected: `mockup` (FE-only connotation), `sketch` (vague), `visual-draft`.
- **Clarity-first fidelity, single mode.** Wireframe discipline is enforced:
  grayscale, boxes, annotations, no brand styling. Aesthetic direction is
  explicitly out of scope — that is the boundary against taste-style skills,
  the `design` canvas, and Figma. No hi-fi mode in v1.
- **Dependency-free (ladder rung 1).** Self-contained HTML + hand-authored
  inline SVG. No Mermaid CDN, no image generation, no host-specific renderers.
  Works identically on Claude Code, Codex, OpenCode, Cursor.
- **Two output families, chosen by task surface.** UI wireframes when a UI is
  touched; system visuals (ER / flow / architecture / state) when a data model
  or service topology is touched; both when both.
- **`mockup-picker.md` and `choice-server.js` stay in discovery.** Option
  picking is discovery's UX; moving them would break single-skill npx installs
  of discovery. Blueprint produces files; discovery's picker can point at them.
- **Entry points: three.** Loaded by discovery at propose/sign-off; citable
  from draft-plan task cards; standalone trigger via condux-style
  `when_to_use` ("mock this up", "visualize the data model", "sketch the
  architecture") wired into workflow's table and the `routing.md` hook payload.
- **Trigger-eval cases ship with the skill** (routing-oracle corpus) — the
  motivating defect was a mockup skill that almost never fired.
