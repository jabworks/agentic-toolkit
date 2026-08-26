# Quirks — Edge cases and failure modes

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | Project identity is not one thing | worktrees, non-git dirs, payloads missing `cwd` | medium | yes — explicit resolution per situation, main-worktree shared |
| Q2 | Subagent rollouts would swamp the buffer | capturing a session with `agent_nickname` in `session_meta` | low | yes — skipped, but counted so enabling later is a config flip |
| Q3 | Rollout parsing hazards | assuming monotonic timestamps, one record shape, or a complete final line | medium | yes — carried over from `analyze-codex.mjs`, which handles all of them |
| Q4 | Consolidation fails in four distinct ways | no `codex`, non-zero exec, killed mid-run, concurrent runs | medium | yes — truncation fallback, atomic writes, idempotent positions |
| Q5 | A throwing hook can wedge Codex | any handler error | high | yes — wrap, exit 0 unconditionally, log to a side file |
| Q6 | Recall budget overflow by the exempt tiers | months of `pinned.md` growth | low | partial — emitted anyway, overflow surfaced as the prune signal |
| Q7 | The project tier captures whatever crossed the session | `git add -A` in the first session, before any skill file is read | high | yes — `.concord/` is self-ignoring in code |

## Q1 — Project-root resolution

**Symptom:** memory written to the wrong bucket, or split across worktrees of one feature.
**Trigger:** sessions in git worktrees, non-git directories, or hook payloads missing `cwd`.
**Cause:** project identity is not one thing; each situation needs an explicit resolution.
**Mitigation:** yes —

| Situation | Resolution |
|---|---|
| Plain git repo | `<git-root>/.concord/` |
| Git **worktree** | Resolve to the **main** worktree root, so branches share one memory. `git rev-parse --path-format=absolute --git-common-dir` gives the shared `.git`; the main root is its parent. |
| Not a git repo | Per-cwd bucket under the global dir — never silently dropped |
| `cwd` missing from payload | No-op, log to side file |

Rationale for main-worktree: continuity matters most exactly when switching between worktrees on one feature. Per-worktree isolation would lose it there.

## Q2 — Subagent rollouts

**Symptom:** a single explorer run emitting hundreds of tool calls that swamp the buffer and dominate consolidation.
**Trigger:** capturing Codex subagent sessions — they carry `agent_nickname` / `agent_role` in `session_meta`.
**Cause:** a subagent's conclusions already surface in the parent session's messages, so capturing its raw activity is double-counting at enormous volume.
**Mitigation:** yes — subagent rollouts are **skipped**, and the reader records that one was seen and skipped (count in `state.json`), so enabling capture later is a config flip rather than a rewrite.

## Q3 — Rollout parsing hazards

**Symptom:** mis-bucketed events, missed tool calls, or a parser failing on a live session's file.
**Trigger:** parsing rollouts on naive assumptions — monotonic ordering, one record shape, a complete final line.
**Cause:** the format's actual shape, carried over from `skills/session-report/analyze-codex.mjs`, which already handles it:

- `session_meta` is the first record and sets identity for the rest of the file.
- Events can be timestamped **before** the session's own `session_meta.timestamp` — do not assume monotonic ordering when bucketing by day.
- Tool calls live under `response_item` (`custom_tool_call`, `custom_tool_call_output`, `tool_search_call`), while messages live under `event_msg` (`user_message`, `agent_message`). Both must be walked.
- `session_meta` never carries a `model` field.
- A truncated final line is normal for a live session — parse line-by-line and discard unparseable lines silently rather than failing the file.

**Mitigation:** yes — the list above is the contract.

## Q4 — Consolidation failure modes

**Symptom:** the summarizer is missing or fails, the parent dies mid-consolidation, or two sessions consolidate at once.
**Trigger:** consolidation under degraded or concurrent conditions.
**Cause:** consolidation shells out to an external CLI and can run from any session.
**Mitigation:** yes —

| Failure | Behavior |
|---|---|
| `codex` not on PATH | Deterministic truncation; drop a marker so the next live agent session compresses properly |
| `codex exec` non-zero / times out | Same as above. Never retry in-hook. |
| Parent killed mid-consolidation | Atomic writes (tmp + rename) mean tiers are never half-written; the buffer is simply not yet promoted and gets caught next run |
| Two sessions consolidating at once | Last atomic rename wins; positions in `state.json` make the work idempotent |

**Invariant:** consolidation never destroys data it has not successfully written elsewhere. Promotion is copy-then-truncate, never move.

## Q5 — Hook safety

**Symptom:** a hook error wedging the Codex session.
**Trigger:** any handler throwing.
**Cause:** hooks run in the session's critical path.
**Mitigation:** yes — every handler wraps its body, exits 0 unconditionally, and logs failures to `<.concord>/logs/` rather than stderr. A memory plugin that can wedge Codex is worse than no memory plugin.

## Q6 — Recall budget overflow

**Symptom:** `pinned` + global alone exceed the recall budget.
**Trigger:** unbounded growth of `pinned.md` over months — a real risk.
**Cause:** the exempt tiers are exempt: consolidation never compresses them (D4), so nothing shrinks them automatically.
**Mitigation:** partial — emit them anyway and note the overflow; surfacing the overflow is the signal to prune.

## Q7 — Privacy

**Symptom:** a `git add -A` committing a session transcript to a company remote.
**Trigger:** the very first session in a repo — the hooks create `.concord/` before any agent has read a skill file or been asked to remember anything.
**Cause:** the **project** tier is the sensitive one, not the global tier: `.concord/` holds verbatim prompts and tool output captured automatically from the rollout — whatever crossed the session, including anything pasted into it. The global tier by contrast only ever receives what the user explicitly asks to be remembered, so its contents are curated by construction.
**Mitigation:** yes — `.concord/` is made **self-ignoring in code**: `ensureStore()` writes a `.gitignore` containing `*` into the directory on first use, so nothing in it can be committed and the repo's own `.gitignore` is untouched. An existing `.gitignore` there is never overwritten. This is deliberately not left to a SKILL.md bootstrap step — nothing about it may depend on an agent remembering a housekeeping step.

Memory files are local-only and never transmitted. The global tier's project-fact prohibition (D6) remains, but it guards leakage between repos, not secret capture.
