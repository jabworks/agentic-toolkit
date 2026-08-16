# uninstall-convention — Tech Spec

**Last updated:** 2026-08-12
**Commit:** d415723 (design stage — pre-implementation)
**Status:** draft

The removal half of the toolkit's ease-of-install convention. An
agent-followable `UNINSTALL.md` at each plugin root (condux, docket, concord)
over `--uninstall` machinery that lives in the installer that did the writing,
plus one policy ruling: an uninstaller reverses only what it exclusively owns,
so shared host state is never cleared. Docket #2 (the documented procedure) and
#17 (condux's machinery gap), designed together because the shared-flag question
is policy, not machinery.

## Contents

- [decisions.md](decisions.md) — the shared-state rule, where machinery lives, shape-follows-#19, rejected alternatives
- [api.md](api.md) — the `--uninstall` contract per installer, report grammar, delegation
- [quirks.md](quirks.md) — the stale flag, `.bak` after a second install, re-run behaviour, what is deliberately preserved
- [implementation.md](implementation.md) — the five registration surfaces, files to change, guards, phasing

## Changelog
- 2026-08-12 (d415723): Initial spec from a signed-off design. The design itself
  was working state and is gone — this spec and PR #51 are the surviving record
  (docket #34)
