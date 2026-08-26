# Plugin doctor — Quirks

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | A doctor cannot prove the host invoked a hook | reading a green board as "the hook fired" | medium | partial — strongest observable proposition, limitation stated in the report |
| Q2 | Two registered scripts mutate if probed naively | executing concord's hooks as an execution probe | high | yes — module-load probe instead of invocation |
| Q3 | The marketplace clone is a snapshot, not the truth | offline version comparison against a stale clone | low | yes — every version row carries the clone's last-commit date |
| Q4 | Scope divergence is not probed | one plugin installed at different versions per scope | medium | no — deliberate gap; first thing to add back if it bites |
| Q5 | Trigger boundary vs `toolkit-debugging-playbook` | "my skill isn't triggering"-class prompts | low | yes — explicit "not for" lines and eval cases both directions |
| Q6 | docket's machinery exists at two depths, not one | probing `server/docket.mjs` assuming a single copy | medium | yes — skill-relative path probed first, answering copy reported |
| Q7 | Setting `features.hooks` is not the same as Codex having restarted | reading the flag row as "hooks are live" | low | partial — the row claims only that the flag is set |
| Q8 | condux's front door is reachable on one channel only | writing a registration step only into the front door | medium | yes — sub-installers stay inside the skill trees |
| Q9 | Plugin-level files are not reached by the skill-tree copy | adding a plugin-level file without a sync case | medium | partial — `plugin-files.test.mjs` guards the known set; a new file class must be declared |

## Q1 — A doctor cannot prove the host invoked a hook

**Symptom:** a green board while a hook still does not fire this session.
**Trigger:** reading the report as "the hook fired".
**Cause:** nothing a child process can read tells it whether Claude Code or Codex actually ran a `SessionStart` hook — the hook's output goes into the model's context, not to disk.
**Mitigation:** partial — known limitation, accepted at sign-off. The doctor proves the strongest observable proposition: the registration parses, its path resolves, and running the registered script produces the host's wire format. If that holds and the hook still does not fire, the fault is host-side — and the doctor's report is the evidence you take to that conclusion, rather than the thing that misses it. Stated in the report, not left implied: the summary line says probes are static-plus-executable, so nobody reads a green board as "the hook fired".

## Q2 — Probes must not mutate

**Symptom:** an execution probe that writes to the memory store.
**Trigger:** running concord's registered scripts naively — executing a registered script is the point of the probe, but concord has no safely-executable entry point.
**Cause:** `capture.mjs` writes to the memory store, and `recall.mjs` — assumed read-only at design time — is not either: it runs catch-up over trailing rollouts and calls `writeState` before emitting anything.
**Mitigation:** yes — concord's execution step is a module load instead: `node --check` on both bin scripts, plus importing `lib/paths.mjs` and asserting its exported resolver is callable. That exercises concord's real module graph without touching the store. docket's `mcp-server.mjs` is safe — an `initialize` round-trip mutates nothing, and it is exactly what `install.sh` already does.

Any future probe added to this convention has to answer "what does this write?" before it earns an execution step.

## Q3 — The marketplace clone is a snapshot, not the truth

**Symptom:** "you are up to date" while the marketplace has moved on.
**Trigger:** an offline version comparison against a clone the host has not fetched recently.
**Cause:** `~/.claude/plugins/marketplaces/<marketplace>/` is a git clone updated when the host last fetched, so any offline comparison is a claim about that snapshot.
**Mitigation:** yes — the doctor reports the clone's last commit date on every version row, so "you are up to date" is always qualified by "as of <date>". Installed *newer* than the clone is normal on this machine — the repo is the source. That is `done`, not a warning.

## Q4 — Scope divergence is not probed

**Symptom:** "it works in one repo and not the other" — one plugin appearing several times with different versions and install paths.
**Trigger:** `installed_plugins.json` records entries per scope (`project` with a `projectPath`, or user-level).
**Cause:** the doctors do not read it (decided at preflight, 2026-08-06): the version row already answers "am I current?", the check would cost the same twenty-odd lines in each of three doctors that deliberately share no code, and the file is an undocumented host internal.
**Mitigation:** no — a deliberate gap. First thing to add back if the divergence bites in practice.

## Q5 — Trigger boundary vs `toolkit-debugging-playbook`

**Symptom:** two skills answering adjacent questions collide on the same prompt.
**Trigger:** prompts in the shared territory — "my skill isn't triggering" and kin.
**Cause:** the subjects genuinely abut — the doctor diagnoses the installed harness on this machine; the playbook diagnoses the repo's distribution machinery.

| | doctor | playbook |
|---|---|---|
| Subject | the installed harness on this machine | the repo's distribution machinery |
| Needs the repo | no | yes |
| Output | per-probe verdict + fix | a diagnosis narrative |
| Typical prompt | "is condux actually working here", "check my plugins" | "why isn't my skill triggering", "dist drift", "plugin not showing up" |

**Mitigation:** yes — each side carries explicit "not for" lines pointing at the other, and the boundary gets eval cases in both directions — including the genuinely ambiguous "my skill isn't triggering", which routes to the **playbook** unless the user says the plugin was recently installed or reinstalled.

## Q6 — docket's machinery exists at two depths, not one

**Symptom:** a stale plugin install can leave the two copies out of sync, and only the one a given caller resolves will be exercised.
**Trigger:** probing `<skill-base>/server/docket.mjs` — the path `record`'s SKILL.md documents — on the assumption it resolves in one tree only.
**Cause:** `sync.sh` copies `skills/record/server/` twice — once as part of the skill tree (`…/skills/docket/record/server/`) and once to the plugin root (`…/docket/server/`, which `.mcp.json` points at). Checked against a real marketplace install: both copies are present. The design assumed the skill-relative path resolved only in the `npx skills add` tree; there is no documentation bug to fix.
**Mitigation:** yes — each `doctor.mjs` lives **inside its own skill directory**, so `<skill-base>/doctor.mjs` resolves identically in all distribution trees (no doctor goes in a plugin-level directory). When a doctor needs sibling machinery it does not own, it searches an ordered candidate list and reports which copy answered — with the documented, record-relative path probed **first**, so the rung-2 verdict is about the path agents are actually told to run.

## Q7 — Setting `features.hooks` is not the same as Codex having restarted

**Symptom:** the flag row reads green while hooks are not live in the current session.
**Trigger:** reading the flag row as "hooks are live".
**Cause:** the probe reads `[features] hooks` from `config.toml`; nothing on disk records whether Codex has been restarted since it was written, and a running Codex does not re-read the file.
**Mitigation:** partial — the row is honest about a narrower claim than it looks: *the flag is set*, not *hooks are live in the current session*. After `--fix` or a fresh install writes it, the detail says a restart is required; on a later run the row reads plainly. The same shape as Q1 — the doctor proves the strongest observable proposition and names what it cannot see, rather than inferring.

## Q8 — condux's front door is reachable on one channel, its sub-installers on all

**Symptom:** an npx user has no front door — `plugins/condux/INSTALL.md` and `install.mjs` are plugin-level, so they ship to the marketplace only.
**Trigger:** writing a registration step only into the front door.
**Cause:** `npx skills add` installs from top-level `skills/` and never sees plugin-level files.
**Mitigation:** yes — the asymmetry is deliberate and is the reason the front door wraps rather than absorbs: the two sub-installers stay inside `plan-review` and `subagent-execution`, where every channel reaches them and where their own SKILL.md files already document them. An npx user does not need a front door — they have the two scripts, which is what they had before.

The practical consequence for anyone editing this: **the front door cannot be the only place a registration step is written down.** Anything it learns to do that npx users also need must live in, or be delegated to, a skill tree.

## Q9 — Plugin-level files are not reached by the skill-tree copy

**Symptom:** a new plugin-level file added without a sync case never reaches `dist/`, and the install channel serves whatever was there before — nothing fails loudly.
**Trigger:** adding a file under `plugins/<name>/` and assuming the skill-tree sync carries it.
**Cause:** `plugins/condux/` needs its own `sync.sh` case and its own mirror test — the `6ba6572` blind-spot class the decisions file already names, and the reason `plugin-files.test.mjs` exists: condux's README was hand-written straight into `dist/` before that guard, and docket shipped with no LICENSE.
**Mitigation:** partial — `plugin-files.test.mjs` guards the known plugin-level set byte-for-byte; a genuinely new plugin-level file class still has to be declared before any guard sees it.
