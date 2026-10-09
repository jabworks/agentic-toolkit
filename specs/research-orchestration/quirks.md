# Quirks — research-orchestration

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | scout can write anywhere, not only its notes file | Claude Code `tools:` cannot path-restrict Write; Codex workspace-write sandbox | medium | partial |
| Q2 | Codex has no scout until the agent installer is re-run | upgrading condux on Codex | low | yes |
| Q3 | Cursor always runs the sequential fallback | Cursor has no named agents (cursor-channel Q7) | low | yes |
| Q4 | Named search and fetch tools may be intercepted, deferred, or absent | host differences; plugins that hook tool calls | low | yes |
| Q5 | deep-research and condux:research compete for the same asks on Claude Code | both installed; overlapping descriptions | low | partial |

## Q1 — Write is not path-restricted

**Discovered:** 2026-10-07 (design)

**Symptom:** a misbehaving scout could edit project files.
**Trigger:** any scout dispatch; the Claude Code agent `tools:` list grants Write wholesale, and Codex workspace-write covers the whole workspace.
**Cause:** neither host restricts Write to a path.
**Mitigation:** partial — the contract limits writes to the notes path given in the brief, and the lead's plan records that path so a stray write is visible in the diff.

## Q2 — Codex scout needs a re-install

**Discovered:** 2026-10-07 (design)

**Symptom:** `/condux:research` on Codex runs the sequential fallback after a condux upgrade.
**Trigger:** Codex plugins cannot bundle agents, so custom agents are TOML files written by `install-codex-agents.mjs`.
**Cause:** the installer derives agents from `agents/*.md`, but only when it is run.
**Mitigation:** yes — the fallback says once that no scout agent was found, and the release notes name the re-install.

## Q3 — Cursor is always sequential

**Discovered:** 2026-10-07 (design)

**Symptom:** research on Cursor is slower and has no parallel scouts.
**Trigger:** any run on Cursor.
**Cause:** Cursor has no named-agent surface (cursor-channel Q7).
**Mitigation:** yes — same artifacts and citation check, announced once.

## Q4 — Search and fetch tools vary by host

**Discovered:** 2026-10-07, while researching this design: the context-mode plugin intercepted `WebFetch` and redirected it to its own fetch tool.

**Symptom:** a scout that names a specific tool fails or gets redirected.
**Trigger:** host differences, or plugins that hook tool calls.
**Cause:** tool names are not portable across hosts and setups.
**Mitigation:** yes — the scout contract says to use whatever search and fetch tools the host exposes, and the quality baseline records its tool environment.

**Re-checked 2026-10-09 (docket #99):** context-mode does **not** block scouts. Since its PR #834 (2026-06-21, upstream issue #794), the WebFetch redirect is skipped whenever the hook payload carries `agent_id`/`agent_type`, so any subagent fetches directly. With context-mode 1.0.166 enabled, a scout's single WebFetch returned page content both interactively and under the runner's headless `claude -p --plugin-dir` setup — no denial, no hook message. Each run had a control: context-mode's MCP server reported `connected`, and the lead's own WebFetch in the same session was redirected. On Claude Code, WebFetch is a *deferred* tool inside the scout: it loads the schema with `ToolSearch` (`select:WebFetch`) first, which the allowlist already grants. The 2026-10-08 smoke-check failure that disabled context-mode for the baseline did not reproduce, and its transcripts were not kept, so its cause is unknown.

## Q5 — Overlap with deep-research

**Discovered:** 2026-10-07 (design)

**Symptom:** on Claude Code with both installed, a research ask may load either skill.
**Trigger:** overlapping trigger descriptions.
**Cause:** deep-research's description is broad ("researching a topic across multiple sources").
**Mitigation:** partial — condux's description is dev-tuned and the routing hook points at `/condux:research`; deep-research still runs when named.
