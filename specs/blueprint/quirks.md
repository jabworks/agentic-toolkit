# blueprint — Quirks

- **Headless / SSH hosts:** `xdg-open`/`open` may be absent or a no-op. The
  skill must not fail — write the files, print absolute paths, and continue.
- **Non-git repos:** `.condux/` falls back to CWD (workflow bootstrap rule);
  blueprint inherits that and says so once.
- **Frontmatter grammar:** SKILL.md frontmatter must pass the canonical
  grammar (no single quotes, `--fix` on violation) — Codex's parser is strict
  even where Claude's is lenient.
- **`when_to_use` folding:** OpenCode/Cursor channels fold `when_to_use` into
  `description`; merged text must stay ≤ 1024 chars.
- **routing.md token budget:** the SessionStart payload is ~390 tokens; adding
  blueprint must not bloat it — one list mention, no prose paragraph.
- **Boundary collisions:** hosts may also carry a `design` canvas skill,
  Figma MCP, dataviz, or third-party taste skills that claim mockup requests.
  The trigger contract must name these as not-for boundaries in both
  directions (blueprint = structural clarity at design time; those = aesthetic
  or host-specific surfaces).
- **Wireframe discipline drift:** the failure mode of HTML mockups is quietly
  becoming styled UI. The kit must state the discipline as hard rules
  (grayscale palette only, system font stack, no brand colors, no imagery)
  so outputs stay unambiguous wireframes.
