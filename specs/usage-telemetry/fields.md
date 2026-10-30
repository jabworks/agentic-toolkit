# Fields — usage-telemetry

Store format version 1. `skills/usage-trace/lib/schema.mjs` enforces this table, and session-report reads the store from this document, never from that code.

Files: `<store>/events/YYYY-MM.jsonl`, or `.jsonl.gz` for closed months, one JSON event per line, placed by event timestamp. A reader must accept both forms for one month.

| Rule | Detail |
|---|---|
| Absent, not zero | A field a host lacks is left out |
| Hashes | `h:` plus the first 16 hex characters of HMAC-SHA256 over the raw value, keyed with `<store>/salt`: `project`, `file`, `branch`, `pr`, `agent`, and any custom name |
| Repeated `api_call` | One response can appear several times with growing `output`. Readers keep the largest per `id` |
| Unknown `v` | Readers must not interpret it |

## Common to every event

| Field | Meaning |
|---|---|
| `v`, `id`, `type`, `ts` | Version, stable ID, event type, ISO timestamp |
| `host` | `claude`, `codex`, or `usage-trace` |
| `session`, `project` | Session ID, hashed working directory |
| `project_name` | Raw path, allowlisted projects only |

## By type

| Type | Fields |
|---|---|
| `session` | `version`, `entrypoint`, `branch`; or `permission_mode` on a change |
| `api_call` | `model`, `effort`, `input`, `output`, `cache_read`, `cache_write`, `thinking_ms`, `skill`, `plugin`, `mcp_server`, `mcp_tool`, `agent`, `sidechain`, `api_error` |
| `tool_call` | `call`, `tool`, `file`, `skill`, `agent`, `sidechain` |
| `tool_result` | `call`, `outcome` (`ok`, `error`, `denied`), `denial_kind`, `duration_ms` |
| `turn` | Prompt: `prompt_chars`, `prompt_source`, `interrupted`, `prompt_text` (allowlisted only). Timing: `duration_ms`, `message_count` |
| `context` | `kind` (`compact`), `pre_tokens`, `context_window` |
| `subagent` | `agent_type`, `model` |
| `outcome` | `pr`; or running totals `lines_added`, `lines_removed` (take the last per session); or `merged`, `ci`, `merge_ms`, `reverted` |
| `limit` | `five_hour`, `seven_day` (percent used), `source` |
| `coverage` | `files`, `events`, `unknown` (label to count), `failures` |

`tool_call` and `tool_result` are separate events joined on `call`, because a result can land in a later ingestion run than its call. This adds `tool_result` to the event list agreed in Decision 2.
