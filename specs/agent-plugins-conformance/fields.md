# Manifest field mapping

Root `plugin.json` is generated from `.claude-plugin/plugin.json`. The spec
schema is **closed** — only these fields may appear:

| Root plugin.json | Source (.claude-plugin/plugin.json) | Notes |
|---|---|---|
| `$schema` | constant | `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json` |
| `name` | `name` | must match `^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$`, ≤64, no `--`/`..` — all 11 names already comply |
| `version` | `version` | semver recommended, not enforced |
| `description` | `description` | |
| `author` | `author` | object; only name/email/url keys allowed |
| `repository` | `repository` | plain string |
| `license` | `license` | SPDX recommended |
| `keywords` | `keywords` | string array |

Never emitted: `skills` (spec has no such field — discovery is by fixed
location), `interface` (codex-only), `hooks` (not a spec component),
`homepage` (no source field today), `extensions` (reserved for
client-specific data; empty today).

## mcp.json (docket)

| Field | Value |
|---|---|
| `$schema` | `https://agent-plugins.org/schemas/1.0.0/mcp.schema.json` |
| `mcpServers.docket.type` | `stdio` (required by spec; Claude's `.mcp.json` omits it) |
| `mcpServers.docket.command` | `node` (one token, resolved by platform rules) |
| `mcpServers.docket.args` | `["${PLUGIN_ROOT}/server/mcp-server.mjs"]` |

`${CLAUDE_PLUGIN_ROOT}` (Claude) vs `${PLUGIN_ROOT}` (spec) is the reason
the two files coexist.
