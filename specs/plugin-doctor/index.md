# Plugin doctor — Tech Spec

**Last updated:** 2026-08-11
**Commit:** 0011ac6 + condux's conflict probe (docket #18), implemented
**Status:** draft
**Docket item:** #1, extended by #9 and #18

A per-plugin health check for the three plugins with machinery beyond skill
files — condux, concord, docket. Each ships its own `doctor.mjs` and a doctor
skill, runs from the installed plugin's own files with no repo clone, probes
every registration that plugin depends on across Claude Code / Codex /
OpenCode, and reports `done` / `broken` / `absent` / `skipped` / `warn` per
host with the fix printed. The standing form of docket `INSTALL.md`'s one-shot
verify step, and the second toolkit-wide convention after ease-of-install.

## Contents

- [decisions.md](decisions.md) — per-plugin vs shared vs standalone, naming, probe depth, offline stance, rejected alternatives
- [api.md](api.md) — `doctor.mjs` CLI contract, output grammar, exit codes, the convention other plugins adopt
- [fields.md](fields.md) — the probe matrix: what each probe reads and what maps to which status
- [quirks.md](quirks.md) — what a doctor cannot prove, stale-clone semantics, the trigger boundary, path-resolution asymmetry
- [implementation.md](implementation.md) — file layout across the three trees, sync surface, tests, phasing

## Changelog

- 2026-08-11 (docket #18): condux's doctor and installer gained a conflict
  probe, and the report grammar gained a fifth status, `warn` — registered and
  working, but something else on the machine competes with it. It exists
  because the previous four could not carry the case: a competing library is
  not `broken` (condux installed correctly, and the installer's verify beat
  keys its exit code on `broken`) and reporting it `done` would be a lie. The
  one registry entry is `superpowers`, the library condux is derived from,
  verified against an installed 6.2.0: both register a `SessionStart` hook on
  the same matcher, so the agent follows whichever router it read last. The
  probe reports the removal command and does not run it — reversing another
  vendor's registration is outside what this installer registered (api,
  fields). Running the probe live corrected it once: skill directories are
  full of symlinks into shared trees, and a dangling one is not an installed
  skill — the first version counted 14 dead links as a conflict. condux
  2.13.0, suite 223 → 235.
- 2026-08-10 (docket #9, implemented): two things changed against the design as
  written. `doctor.mjs` now honours `$CODEX_HOME` — it did not, while both
  sub-installers and the new installer do, so the installer's verify beat would
  have probed a different directory than the one it had just written to and
  reported a pass for the wrong config. And `--uninstall` deliberately leaves
  `features.hooks` set, because concord and plan-review ride the same flag;
  clearing it on condux's way out would break them. condux 2.12.0, suite
  215 → 223.
- 2026-08-10 (docket #9, design stage): condux gains a plugin-level front door
  (`plugins/condux/INSTALL.md` + `install.mjs`) and its doctor gains `--fix`,
  so all three plugins can now repair as well as diagnose (api, decisions).
  The front door **wraps** the two installers already living inside
  `plan-review` and `subagent-execution` rather than absorbing them — forced
  by channel topology, since `plugins/` never reaches the `npx skills add`
  tree (decisions, quirks). Two corrections surfaced while designing it: the
  docket entry's host table was stale (the Codex Stop hook ships in the plugin
  manifest, so its script matters only on npx), and the Codex `features.hooks`
  flag was an unprobed input — with it off, the manifest resolves, no hook
  fires, and the doctor scored the row `done`. A flag probe is folded into the
  same item (api, decisions, quirks).
- 2026-08-06 (docket #8): concord gained an installer, so `--fix` is no longer
  docket-only — its doctor delegates to
  `skills/remember/references/install-codex-hook.sh` (api, decisions). The
  delegation is mutual and acyclic: that installer's verify beat calls the
  doctor back with `--host codex --quiet` and never `--fix`. condux keeps
  printing its fix until #9. Both doctors now report a failed installer rather
  than re-probing in silence (decisions) — docket 0.3.1, concord 0.4.0.
- 2026-08-06 (implementation): three drift decisions, all corrections to
  design-time assumptions caught by checking. (1) `<skill-base>/server/…`
  **does** resolve in a marketplace install — sync copies docket's machinery
  to two depths, so there was no documentation bug to fix (quirks). (2)
  concord's `recall.mjs` is **not** read-only — it runs catch-up and calls
  `writeState`, so no concord hook is ever executed and the execution step is
  a module load instead (quirks, fields). (3) `absent` covers an unmade
  optional registration as well as a missing host, since the ladder says the
  skill still works a rung down (api).
- 2026-08-06: Initial spec from a signed-off design. The design itself was
  working state and is gone — this spec is the whole surviving record (docket #34)
