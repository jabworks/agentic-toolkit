---
name: concord-doctor
description: "Health check for the concord memory plugin on the host it is installed on. Probes both Codex registration paths — the hooks.json the installer writes and the plugin manifest a Codex plugin install uses — checks all three hook events resolve to scripts that still exist, that the experimental hooks feature is enabled, that the memory store is readable, and compares the installed version against the local marketplace clone. Never runs a hook: both of them write."
when_to_use: "Checking whether concord itself works on this machine: is concord capturing, memory stopped being recalled at session start, nothing from last session came back, did the concord hooks get wired, check my concord install. Run it after installing or updating the plugin and after any Codex upgrade. Not for recalling or storing a memory (that is remember); not for diagnosing this repo's own build or dist drift (that is toolkit-debugging-playbook)."
argument-hint: "[--host claude|codex|opencode] [--fix]"
---

# /concord-doctor

Answers one question: **is concord actually working on this host?**

```bash
node <skill-base>/doctor.mjs                    # every probe
node <skill-base>/doctor.mjs --host codex       # the only host that matters
node <skill-base>/doctor.mjs --quiet            # only what is not fine
node <skill-base>/doctor.mjs --fix              # run the installer, then re-probe
```

Exit 0 when nothing is broken, 1 when something is, 2 when the memory skill is
not beside this doctor.

`--fix` performs no registration itself — it runs the memory skill's
`references/install-codex-hook.sh` and probes again, so idempotency, the
refusal to overwrite malformed `hooks.json`, and the matcher that leaves other
plugins' hooks alone all stay in one place. Nothing broken, nothing to install:
`--fix` is a no-op. The installer verifies by calling this doctor back without
`--fix`, so the two never ping-pong. If the installer itself fails — its own
verify step exits 1 when a registration it wrote does not answer — that is said
out loud before the re-probe, so a run that repaired nothing never reads as one
that did.

## Reading the report

One row per probe: `host  status  detail`, fix on an indented continuation
line. `done` works · `broken` needs the fix · `absent` is not there and not a
failure · `skipped` deliberately needs nothing. Only `broken` affects the exit
code.

Claude Code and OpenCode always report `skipped`: concord is Codex-only by
design, so nothing is registered there and nothing is wrong.

## What it probes

- **Both Codex registration paths.** `references/install-codex-hook.sh` writes
  absolute command paths into `<CODEX_HOME>/hooks.json`; a Codex *plugin*
  install wires the same three events from the manifest instead. Either one
  counts, and the report names which.
- **That the registered paths still exist.** This is the probe that earns its
  keep: the installer records absolute paths, so a plugin update moves the
  scripts and leaves the registration pointing into a version directory that
  is gone.
- **All three events** — `SessionStart`, `UserPromptSubmit`, `SessionEnd`.
  Partial registration is `broken`, not `done`: the three share one idempotent
  sync, and losing one loses exactly-once capture.
- **The experimental hooks feature** — registered hooks with
  `features.hooks` off do nothing at all.
- **The memory store** — present, readable, writable.
- **Version** — installed against the local marketplace clone, with that
  clone's own last-fetch date. Never fetches.

## Why no hook is ever run

Both entry points write. `capture.mjs` appends to the memory store, and
`recall.mjs` — which looks read-only — runs catch-up over trailing rollouts
and calls `writeState` before emitting anything. A doctor that ran them would
alter the memory it is inspecting.

The execution step is a module load instead: both scripts are parsed, and
`lib/paths.mjs` is imported and checked for its resolver. That exercises the
real module graph and touches nothing.

## What it cannot prove

That Codex *invoked* the hooks. If every probe is green and memory still never
comes back, the fault is host-side — check that Codex was restarted and the
hooks were trusted after install.

## Boundaries

Storing or recalling an actual memory is `remember`. Problems with this
*repo's* build belong to `toolkit-debugging-playbook`: that one needs the
source tree, this one needs only the install.
