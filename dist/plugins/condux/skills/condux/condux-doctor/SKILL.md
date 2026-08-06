---
name: condux-doctor
description: Health check for the condux plugin on the host it is installed on. Probes the SessionStart routing hook on Claude Code and Codex by running it and checking the wire format each host expects, confirms plan-review's Codex Stop hook resolves, checks the OpenCode npm registration and its bundled agents and skills, verifies the four specialist agent definitions shipped, and compares the installed version against the local marketplace clone. Offline and read-only.
when_to_use: "Checking whether condux itself works on this machine: is condux working, the routing rule stopped appearing, /workflow is not being reached, did the SessionStart hook fire, check my condux install, the specialist agents are missing. Run it after installing or updating the plugin. Not for routing a dev task (that is workflow); not for diagnosing this repo's own build or dist drift (that is toolkit-debugging-playbook)."
argument-hint: "[--host claude|codex|opencode]"
---

# /condux-doctor

Answers one question: **is condux actually working on this host?**

```bash
node <skill-base>/doctor.mjs                    # every host, every probe
node <skill-base>/doctor.mjs --host codex       # one host
node <skill-base>/doctor.mjs --quiet            # only what is not fine
```

Exit 0 when nothing is broken, 1 when something is, 2 when the doctor cannot
find condux's own hooks.

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
