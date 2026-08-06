# Plugin doctor — Quirks

## A doctor cannot prove the host invoked a hook

Known limitation, accepted at sign-off. Nothing a child process can read
tells it whether Claude Code or Codex actually ran a `SessionStart` hook this
session — the hook's output goes into the model's context, not to disk.

What the doctor proves is the strongest observable proposition: the
registration parses, its path resolves, and running the registered script
produces the host's wire format. If that holds and the hook still does not
fire, the fault is host-side — and the doctor's report is the evidence you
take to that conclusion, rather than the thing that misses it.

Stated in the report, not left implied: the summary line says probes are
static-plus-executable, so nobody reads a green board as "the hook fired".

## Probes must not mutate

Executing a registered script is the point of the probe, but two of them have
side effects if run naively:

- **concord has no safely-executable entry point.** `capture.mjs` writes to
  the memory store, and `recall.mjs` — assumed read-only at design time — is
  not either: it runs catch-up over trailing rollouts and calls `writeState`
  before emitting anything. Neither hook is ever invoked. The execution step
  is a module load instead: `node --check` on both bin scripts, plus
  importing `lib/paths.mjs` and asserting its exported resolver is callable.
  That exercises concord's real module graph without touching the store.
- **docket `mcp-server.mjs`** is safe: an `initialize` round-trip mutates
  nothing, and it is exactly what `install.sh` already does.

Any future probe added to this convention has to answer "what does this write?"
before it earns an execution step.

## The marketplace clone is a snapshot, not the truth

`~/.claude/plugins/marketplaces/<marketplace>/` is a git clone updated when
the host last fetched. An offline version comparison is therefore a claim
about that snapshot. The doctor reports the clone's last commit date on every
version row, so "you are up to date" is always qualified by "as of <date>".

Installed *newer* than the clone is normal on this machine — the repo is the
source. That is `done`, not a warning.

## Scope divergence is not probed

`installed_plugins.json` records entries per scope (`project` with a
`projectPath`, or user-level), so one plugin can appear several times with
different versions and install paths — a real cause of "it works in one repo
and not the other".

The doctors do not read it (decided at preflight, 2026-08-06). The version row
already answers "am I current?", the check would cost the same twenty-odd
lines in each of three doctors that deliberately share no code, and the file
is an undocumented host internal. First thing to add back if the divergence
bites in practice.

## Trigger boundary vs `toolkit-debugging-playbook`

The two skills answer adjacent questions and would collide without a
deliberate split:

| | doctor | playbook |
|---|---|---|
| Subject | the installed harness on this machine | the repo's distribution machinery |
| Needs the repo | no | yes |
| Output | per-probe verdict + fix | a diagnosis narrative |
| Typical prompt | "is condux actually working here", "check my plugins" | "why isn't my skill triggering", "dist drift", "plugin not showing up" |

Each side carries explicit "not for" lines pointing at the other, and the
boundary gets eval cases in both directions — including the genuinely
ambiguous "my skill isn't triggering", which routes to the **playbook**
unless the user says the plugin was recently installed or reinstalled.

## docket's machinery exists at two depths, not one

The design assumed `<skill-base>/server/docket.mjs` — the path `record`'s
SKILL.md documents — resolves only in the `npx skills add` tree. Checked
against a real marketplace install: it resolves there too. `sync.sh` copies
`skills/record/server/` twice — once as part of the skill tree
(`…/skills/docket/record/server/`) and once to the plugin root
(`…/docket/server/`, which `.mcp.json` points at). Both copies are present in
an installed plugin.

There is no documentation bug to fix. What follows for the doctors:

- Each `doctor.mjs` lives **inside its own skill directory**, so
  `<skill-base>/doctor.mjs` resolves identically in all distribution trees.
  No doctor goes in a plugin-level directory.
- When a doctor needs sibling machinery it does not own, it searches an
  ordered candidate list and reports which copy answered — with the
  documented, record-relative path probed **first**, so the rung-2 verdict is
  about the path agents are actually told to run.
- The duplicate copy is worth knowing about for a different reason: a stale
  plugin install can leave the two out of sync, and only the one a given
  caller resolves will be exercised.
