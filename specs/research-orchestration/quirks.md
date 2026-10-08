# Quirks — research-orchestration

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | scout can write anywhere, not only its notes file | Claude Code `tools:` cannot path-restrict Write; Codex workspace-write sandbox | medium | partial |
| Q2 | Codex has no scout until the agent installer is re-run | upgrading condux on Codex | low | yes |
| Q3 | Cursor always runs the sequential fallback | Cursor has no named agents (cursor-channel Q7) | low | yes |
| Q4 | Named search and fetch tools may be intercepted or absent | host differences; plugins such as context-mode redirect WebFetch | medium | yes |
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

## Q5 — Overlap with deep-research

**Discovered:** 2026-10-07 (design)

**Symptom:** on Claude Code with both installed, a research ask may load either skill.
**Trigger:** overlapping trigger descriptions.
**Cause:** deep-research's description is broad ("researching a topic across multiple sources").
**Mitigation:** partial — condux's description is dev-tuned and the routing hook points at `/condux:research`; deep-research still runs when named.
