# Contracts

## Codex hook payload

Verified against the codex-rs source (`codex-rs/hooks/`, `codex-rs/config/src/hook_config.rs`),
not inferred from a binary scan. An earlier `strings` probe suggested
`rollout_path` was the payload field; it is not — that is Codex's *internal*
name. The hook payload uses `transcript_path`.

**Delivery:** JSON, written to the hook process's **stdin**.

**SessionStart payload fields** (`hooks/src/events/session_start.rs`):

| Field | Use |
|---|---|
| `session_id` | `state.json` keying |
| `transcript_path` | **the transcript to read — load-bearing** |
| `cwd` | project-root resolution |
| `hook_event_name` | dispatch |
| `model`, `permission_mode`, `source` | unused by Concord |

`source` is one of `startup`, `resume`, `clear`, `compact`, and can be filtered
with a `matcher` on the group. Concord registers no matcher — recall should be
injected on all four, and re-injecting after a `compact` is a feature.

**Supported events** (`HookEventsToml`): `PreToolUse`, `PermissionRequest`,
`PostToolUse`, `PreCompact`, `PostCompact`, `SessionStart`, `SessionEnd`,
`UserPromptSubmit`, `SubagentStart`, `SubagentStop`, `Stop`.

`SessionEnd` exists and is **input-only** — it produces no output. The earlier
open question ("does SessionEnd fire?") is resolved: it is a first-class event.

`SubagentStart` / `SubagentStop` are separate events carrying `agent_id` and
`agent_type`. Concord does not register them, so subagent sessions never enter
`state.json` at all; the subagent skip in the reader is defence in depth.

**Robustness rule:** never assume a field is present. `transcript_path` missing →
fall back to `rollout_path` → fall back to no-op. A hook that throws must never
break the user's session; all handlers exit 0 on internal error and log to a
side file.

## Hook wiring

`hooks/codex-hooks.json` in the plugin, following the existing pattern in
`dist/plugins/condux/hooks/codex-hooks.json`:

- `SessionStart` → `recall.mjs` (also performs catch-up)
- `UserPromptSubmit` → `capture.mjs --prompt`
- `SessionEnd` → `capture.mjs --session-end`

Paths use `${PLUGIN_ROOT}`. Installation into `~/.codex/hooks.json` plus the
config.toml experimental flag follows
`skills/plan-review/references/install-codex-hook.sh`.

## SessionStart recall contract

**Output:** plain text on stdout. Codex collects trimmed stdout as additional
model context (`hooks/src/events/session_start.rs` → `append_additional_context`),
so no JSON envelope is needed. A JSON form exists
(`hookSpecificOutput.additionalContext`) but buys nothing here.

The handler sets `additionalContextLimit: 8000` — comfortably above the ~3000
char budget, so the cap never bites in normal operation while still bounding a
pathological `pinned.md`.

**Composition,** in order: `pinned.md` → global `notes.md` → `recent.md` →
today's buffer/day file.

**Budget:** ~2–4k chars total. Truncation is **oldest-first**, and
`pinned` + `global` are exempt — they always survive the budget; `recent` and
today absorb all trimming. If the exempt tiers alone exceed the budget, emit
them anyway and note the overflow.

**Silence on empty:** if no memory exists, emit nothing. No banner, no headers,
no "(no memories yet)" noise.

## Explicit remember contract

Invoked by the user in-session ("remember that …"). The agent writes directly —
no subprocess, no LLM call, no cost.

**Routing:** project facts → `<git-root>/.concord/pinned.md`; user preferences
and working patterns → global `notes.md`. Routed on phrasing; when genuinely
ambiguous, ask rather than guess, since a misrouted project fact is exactly the
leak D6 forbids.

**Entry format:** one fact per entry, dated, append-only.

## state.json

```jsonc
{
  "rollouts": { "<session_id>": { "path": "...", "line": 412 } },
  "lastConsolidated": "2026-07-29T02:18:00Z"
}
```

Positions are line numbers, not byte offsets — rollouts are append-only JSONL, so
lines are stable and byte offsets are not worth the encoding hazard. All writes
atomic (tmp + rename).
