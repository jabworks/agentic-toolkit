# Implementation

## The five registration surfaces

| Writer | Registers | State before this work |
|---|---|---|
| `plugins/condux/install.mjs` | OpenCode plugin key · `[features] hooks` · delegates to the two below | `--uninstall` reverses the OpenCode key only |
| `skills/subagent-execution/references/install-codex-agents.mjs` | the four Codex specialist agents | no `--uninstall` |
| `skills/plan-review/references/install-codex-hook.sh` | Codex Stop hook | no `--uninstall` |
| `skills/remember/references/install-codex-hook.sh` | concord's 3 hook events · `[features] hooks` | **working `--uninstall`** — the pattern to copy |
| `skills/record/server/install.sh` | Codex MCP TOML table · OpenCode JSON key | no `--uninstall` |

## Files to change

**New — plugin-root documents** (mirrored to `dist/` by `sync_plugin_files`, no
new sync step, same as #19):

- `plugins/condux/UNINSTALL.md`
- `plugins/docket/UNINSTALL.md`
- `plugins/concord/UNINSTALL.md`

**Modified — installers gaining `--uninstall`:**

- `skills/plan-review/references/install-codex-hook.sh`
- `skills/record/server/install.sh`
- `skills/subagent-execution/references/install-codex-agents.mjs`
- `plugins/condux/install.mjs` — delegate to the first and third instead of
  reporting `skipped` with paths to remove by hand

**Modified — guards:**

- `tests/plugin-files.test.mjs` — both #19 front-door tests key on the literal
  `INSTALL.md`; widen to cover `UNINSTALL.md` (buried-procedure placement, and
  cited-path resolution)
- `tests/script-safety.test.mjs` — the existing home for installer behaviour,
  including concord's uninstall idempotence after the `remember` rename

**Follow-on, do not forget:** each modified installer is a declared entry in
`scripts/supply-chain-allowlist.json`; the new documents are prose in `plugins/`,
which #16 taught the checker to scan. Run `node scripts/check-supply-chain.mjs`
before finalize — a new `bash … --uninstall` invocation line in a document is an
`INVOKES-SCRIPT` finding unless its target is declared.

## Pattern to follow

concord's `install-codex-hook.sh` is the reference for every script gaining the
flag: parse `--uninstall` into a `MODE` variable, share steps 0 (detect) and the
final report between modes, branch only at the register/reverse step. Do not add
a second script, a second detect block, or a second report format.

## Guards

- **Round-trip per installer, in a sandbox:** install → uninstall → registration
  gone, `[features] hooks` **still set**, unrelated config bytes untouched.
- **Idempotence:** a second `--uninstall` reports `skipped`, exit 0.
- **Malformed config refusal:** unchanged from install — refuse rather than
  overwrite, with the user's bytes intact.
- **Delegation:** condux's front door calls each delegate's `--uninstall` rather
  than editing their targets; a missing delegate reports `skipped`.
- **Front-door placement and citation resolution** for `UNINSTALL.md`, via the
  widened #19 tests.

Each guard is triggered to fail before it passes, by mutation rather than
assertion — the standard this repo has held since #18.

## Phasing

1. `--uninstall` on the three installers that lack it, each with its round-trip
   test. Independent of each other.
2. condux's front door delegates; its `skipped`-with-paths branch goes away.
3. The three UNINSTALL.md documents.
4. Widen the #19 guards; supply-chain check; version bumps.

## Versioning

Touches shipped plugin files for all three plugins, so all three bump. Machinery
plus a new user-facing document is a **minor** for condux (new capability:
uninstall actually works), and a minor for docket and concord likewise, since
each gains a removal path it did not have. Confirm through
`toolkit-change-control` at ship time rather than assuming — #19 was reclassified
from minor to patch at that gate.
