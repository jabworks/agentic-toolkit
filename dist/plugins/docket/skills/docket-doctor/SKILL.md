---
name: docket-doctor
description: "Health check for the docket plugin on the host it is installed on. Probes every registration docket depends on — the shipped .mcp.json on Claude Code, the config.toml table on Codex, the opencode.json key on OpenCode, the mcp.json entry on Cursor — runs an initialize round-trip against whichever server path each one actually names, confirms the bundled CLI fallback resolves, and compares the installed version against the local marketplace clone. Offline, and read-only unless --fix. Checking whether docket itself works on this machine: is docket working, check my docket install, the docket MCP tools stopped appearing, verify the registration, why did docket_add vanish. Run it after installing or updating the plugin and on a second machine. Not for diagnosing this repo's own build, sync, or dist drift (that is toolkit-debugging-playbook); not for backlog work itself (record, groom)."
argument-hint: "[--host claude|codex|opencode|cursor] [--fix]"
---

# /docket-doctor

Answers one question: **is docket actually working on this host?**

```bash
node <skill-base>/doctor.mjs                    # every host, every probe
node <skill-base>/doctor.mjs --host codex       # one host
node <skill-base>/doctor.mjs --quiet            # only what is not fine
node <skill-base>/doctor.mjs --fix              # run the installer, then re-probe
```

Exit 0 when nothing is broken, 1 when something is, 2 when the doctor cannot
find docket's own machinery.

## Reading the report

One row per probe: `host  status  detail`, with the fix on an indented
continuation line when there is one.

| Status | Means |
|---|---|
| `done` | Registered and the thing it registers answered |
| `broken` | Registered but non-functional — needs the fix on the next line |
| `absent` | Not there: no such host, or an optional registration was never made. **Not a failure** — the skills fall back to the bundled CLI, one rung down |
| `skipped` | Present and deliberately needs nothing here |

Only `broken` affects the exit code. A machine with just Codex installed
reports three `absent` hosts and is healthy.

Cursor is the most likely `absent` on a WSL box: Cursor runs Windows-side with
its own home, so `~/.cursor` may not exist in the Linux filesystem at all even
though Cursor is working. The row says so rather than guessing Windows paths.

## What it probes

- **Per host** — the registration parses, the path it names exists, and that
  server answers a JSON-RPC `initialize` with `"name":"docket"`. A
  registration that was written but does not answer is a failure to report,
  not a success.
- **The CLI fallback** — rung 2 of the dependency ladder. The path
  `record`'s SKILL.md documents is probed first, since that is what an agent
  will actually run when the MCP server is absent.
- **Version** — installed against the local marketplace clone, with the
  clone's own last-fetch date printed beside it. Never fetches; a stale
  comparison is reported as stale rather than hidden.

## What it cannot prove

That the host *invoked* anything. Nothing readable from a child process says
whether Claude Code, Codex, OpenCode, or Cursor loaded a registration this session. The probes
are static-parse plus execution, which is the strongest observable claim —
if every probe is green and docket still does not work, the fault is
host-side, and this report is the evidence for that conclusion.

One known blind spot: **a Cursor server disabled in the UI still reports
`done`.** Cursor's server config has no `enabled` field — the Customize
sidebar toggle and `agent mcp disable` write a local approved list, not
`mcp.json` — so there is nothing in the probed file to read. OpenCode's
`enabled: false` *is* checked, because OpenCode puts it in the config.

`--fix` never reimplements registration: it runs docket's own `install.sh`,
where the idempotency, backups, and never-touch-unrelated-config guarantees
already live, then re-probes. If the installer itself fails — or bash is not
there to run it — that is said out loud before the re-probe, so a run that
repaired nothing never reads as one that did.

## Boundaries

Backlog work — adding, closing, grooming — belongs to `record` and `groom`.
Problems with this *repo's* build (dist drift, a skill that will not trigger,
a manifest that will not parse) belong to `toolkit-debugging-playbook`: that
one needs the source tree, this one needs only the install.
