# Implementation

## Files

- `skills/preflight/SKILL.md` — main change (~35 lines):
  - new checklist item in the PREFLIGHT box (after EDGE CASES HANDLED,
    before NO REGRESSIONS)
  - new **Drift Check** section: spec-dir lookup, per-concern comparison
    (api.md → contracts touched, fields.md → mappings, quirks.md → edge
    cases honored, implementation.md → files/patterns followed), findings
    table, three-way decision
  - Output block: `□ Spec drift ✓/✗/N/A` line + table shape
- `skills/workflow/SKILL.md` — one line in the spec-companion paragraph:
  drift is checked at preflight
- `skills/technical-spec/SKILL.md` — one lifecycle line: specs written at
  discovery are drift-checked at preflight
- `skills/preflight/evals/trigger_eval.json` — ~4 new cases: e.g.
  "does the code still match the spec", "check for spec drift"
  (expected: preflight) + one should-NOT case that belongs to
  technical-spec ("update the spec with what we built")
- mirror: `bash scripts/sync.sh preflight` (+ workflow, technical-spec)
- version: condux 2.4.0 → **2.5.0** in both
  `dist/plugins/condux/.claude-plugin/plugin.json` and
  `.codex-plugin/plugin.json` (minor — new behavior)

## Patterns to follow

- Match preflight's existing box-diagram style and its Output block format
- Follow the workflow router's exact spec-lookup wording (don't invent a
  second lookup dialect)
- Trigger contract stays within budget: description ≤ 500 chars,
  frontmatter ≤ 1024 (enforced by `skill-invariants.test.mjs`)
- `node --test` must stay green (27 tests); dist mirror byte-for-byte
