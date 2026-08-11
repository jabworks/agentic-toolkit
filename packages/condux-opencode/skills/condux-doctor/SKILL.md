---
name: condux-doctor
description: "Health check for the condux plugin on the host it is installed on. Runs the SessionStart routing hook on both hosts and checks each one's wire format, confirms Codex's hooks feature flag is enabled and plan-review's Stop hook resolves, checks the OpenCode npm registration and its bundled agents and skills, verifies the four specialist agent definitions shipped, and compares the installed version against the local marketplace clone. Offline; read-only unless --fix. Checking whether condux itself works on this machine: is condux working, the routing rule stopped appearing, /workflow is not being reached, did the SessionStart hook fire, check my condux install, the specialist agents are missing. Run it after installing or updating the plugin. Not for routing a dev task (that is workflow); not for diagnosing this repo's own build or dist drift (that is toolkit-debugging-playbook)."
argument-hint: "[--host claude|codex|opencode] [--fix]"
---

# /condux-doctor

Answers one question: **is condux actually working on this host?**

```bash
node <skill-base>/doctor.mjs                    # every host, every probe
node <skill-base>/doctor.mjs --host codex       # one host
node <skill-base>/doctor.mjs --quiet            # only what is not fine
node <skill-base>/doctor.mjs --fix              # run the installer, then re-probe
```

Exit 0 when nothing is broken, 1 when something is, 2 when the doctor cannot
find condux's own hooks.

`--fix` performs no registration itself — it runs condux's plugin-level
`install.mjs` and probes again, so idempotency, backups and atomic writes stay
in one place. If the installer fails, the report says how it failed rather than
re-probing in silence, and the re-probe still decides the exit code. Without an
installer beside the plugin (an `npx skills add` tree has none), it says so and
changes nothing.

## Reading the report

One row per probe: `host  status  detail`, fix on an indented continuation
line. `done` works · `broken` needs the fix · `absent` is not there and not a
failure · `skipped` deliberately needs nothing. Only `broken` affects the
exit code.

## What it probes

- **The SessionStart routing hook, by running it.** Claude Code must get a
  `hookSpecificOutput` envelope carrying non-empty context; Codex must get
  the raw routing payload. Each host's manifest must use its own root
  variable — `${CLAUDE_PLUGIN_ROOT}` or `${PLUGIN_ROOT}`, never the other.
- **Codex's `features.hooks` flag**, before anything else on that host. A
  plugin manifest can declare hooks; nothing in a plugin can enable them. With
  the flag off, the manifest parses, every path resolves, and no hook fires —
  which this doctor scored `done` until it learned to read the flag. It proves
  the flag is set, not that Codex has restarted since.
- **plan-review's Codex Stop hook** — resolved, never executed. It blocks a
  turn for up to four days waiting on a human by design.
- **OpenCode** — `@jabworks/condux` in the plugin array, and when a local
  copy exists, that it ships its bundled `agents/` and `skills/`.
- **The four specialist agents** — `coder`, `explorer`, `planner`,
  `researcher`. They live in a plugin-level directory reached by its own sync
  step, which is exactly the mirror that drifted once before.
- **Version** — installed against the local marketplace clone, with that
  clone's own last-fetch date printed beside it. Never fetches.

## Why running the hook matters

`session-start.mjs` fails open on purpose: if its payload is missing it exits
0 and prints nothing, because a hook that breaks the session is worse than a
hook that does nothing. Every static check passes in that state. Only
executing it reveals that condux's routing rule is silently absent — which is
the difference between `/workflow` being the entry point and being a lucky
guess from the catalog.

## What it cannot prove

That the host *invoked* the hook. Nothing readable from a child process says
whether Claude Code or Codex loaded a registration this session. If every
probe is green and the routing rule still never appears, the fault is
host-side and this report is the evidence.

## Boundaries

Routing an actual dev task is `workflow`. Problems with this *repo's* build —
dist drift, a manifest that will not parse, a skill that will not trigger —
belong to `toolkit-debugging-playbook`: that one needs the source tree, this
one needs only the install.
