# Edge cases and failure modes

## Q1 — Project-root resolution

| Situation | Resolution |
|---|---|
| Plain git repo | `<git-root>/.concord/` |
| Git **worktree** | Resolve to the **main** worktree root, so branches share one memory. `git rev-parse --path-format=absolute --git-common-dir` gives the shared `.git`; the main root is its parent. |
| Not a git repo | Per-cwd bucket under the global dir — never silently dropped |
| `cwd` missing from payload | No-op, log to side file |

Rationale for main-worktree: continuity matters most exactly when switching
between worktrees on one feature. Per-worktree isolation would lose it there.

## Q2 — Subagent rollouts

Codex subagent sessions carry `agent_nickname` / `agent_role` in `session_meta`.
**Skipped** — a single explorer run emits hundreds of tool calls that would swamp
the buffer and dominate consolidation, and its conclusions already surface in the
parent session's messages.

The reader **records that a subagent rollout was seen and skipped** (count in
`state.json`), so enabling capture later is a config flip rather than a rewrite.

## Q3 — Rollout parsing hazards

Carried over from `skills/session-report/analyze-codex.mjs`, which already
handles these:

- `session_meta` is the first record and sets identity for the rest of the file.
- Events can be timestamped **before** the session's own `session_meta.timestamp`
  — do not assume monotonic ordering when bucketing by day.
- Tool calls live under `response_item` (`custom_tool_call`,
  `custom_tool_call_output`, `tool_search_call`), while messages live under
  `event_msg` (`user_message`, `agent_message`). Both must be walked.
- `session_meta` never carries a `model` field.
- A truncated final line is normal for a live session — parse line-by-line and
  discard unparseable lines silently rather than failing the file.

## Q4 — Consolidation failure modes

| Failure | Behavior |
|---|---|
| `codex` not on PATH | Deterministic truncation; drop a marker so the next live agent session compresses properly |
| `codex exec` non-zero / times out | Same as above. Never retry in-hook. |
| Parent killed mid-consolidation | Atomic writes (tmp + rename) mean tiers are never half-written; the buffer is simply not yet promoted and gets caught next run |
| Two sessions consolidating at once | Last atomic rename wins; positions in `state.json` make the work idempotent |

**Invariant:** consolidation never destroys data it has not successfully written
elsewhere. Promotion is copy-then-truncate, never move.

## Q5 — Hook safety

A hook that throws must never break the session. Every handler wraps its body,
exits 0 unconditionally, and logs failures to `<.concord>/logs/` rather than
stderr. A memory plugin that can wedge Codex is worse than no memory plugin.

## Q6 — Recall budget overflow

If `pinned` + global alone exceed the budget, emit them and note the overflow —
the exempt tiers are exempt. Unbounded growth of `pinned.md` is a real risk over
months; surfacing the overflow is the signal to prune.

## Q7 — Privacy

The **project** tier is the sensitive one, not the global tier. `.concord/`
holds verbatim prompts and tool output captured automatically from the rollout —
whatever crossed the session, including anything pasted into it. The global tier
by contrast only ever receives what the user explicitly asks to be remembered,
so its contents are curated by construction.

`.concord/` is therefore made **self-ignoring in code**: `ensureStore()` writes a
`.gitignore` containing `*` into the directory on first use, so nothing in it can
be committed and the repo's own `.gitignore` is untouched. An existing
`.gitignore` there is never overwritten.

This is deliberately not left to a SKILL.md bootstrap step. The hooks create the
directory on the very first session, before any agent has read a skill file or
been asked to remember anything — so the realistic failure is a `git add -A`
committing a session transcript to a company remote. Nothing about that may
depend on an agent remembering a housekeeping step.

Memory files are local-only and never transmitted. The global tier's
project-fact prohibition (D6) remains, but it guards leakage between repos, not
secret capture.
