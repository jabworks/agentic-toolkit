# Agent Plugins conformance

Every dist plugin is a spec-conformant Agent Plugin
([agent-plugins.org](https://agent-plugins.org) 1.0.0): root `plugin.json`
(generated), skills as immediate children of `skills/`, docket MCP via root
`mcp.json`. Loadable in Cursor and any spec client without changes; Claude
Code / Codex behavior unchanged.

Origin: docket #29 (2026-08-14), follow-on to the Cursor channel (#27).

| Concern | File |
|---|---|
| Choices + rationale | [decisions.md](decisions.md) |
| Manifest field mapping | [fields.md](fields.md) |
| Generator, flattening, tests | [implementation.md](implementation.md) |
| Spec constraints + gotchas | [quirks.md](quirks.md) |
