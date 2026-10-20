# condux-mod — Tech Spec

> A Claude Code mod inside the condux plugin: a live, read-only plan and progress board plus a status line, so condux's working state stays in view in the terminal and the desktop app.

**Last updated:** 2026-10-20
**Commit:** PR #190
**Status:** draft

## Contents

| File | Answers |
|---|---|
| [PRD](prd.md) | why the mod exists, for whom, and what it deliberately does not do |
| [Decisions](decisions.md) | why it is nested, read-only and chrome-led, and what was rejected |
| [API](api.md) | the command, status entry and parsed types |
| [Fields](fields.md) | how each plan and ledger field becomes something on screen |
| [Implementation](implementation.md) | the planned files, data flow and patterns |
| [Quirks](quirks.md) | what will bite you, and whether it is mitigated |
| [Verification](verification.md) | what was checked live, how, and what is still unproven |

## Changelog
- 2026-10-20 (PR #190): Initial spec from the signed-off design
- 2026-10-20 (PR #190): Added verification.md (the broken-module and Codex checks) and updated Q11
- 2026-10-20 (PR #190): Synced api.md and implementation.md to what PR 1 built; added Q13 and Q14
