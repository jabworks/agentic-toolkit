# Fields — composition.json schema

```json
{
  "plugins": {
    "<plugin-name>": {
      "bundle": true,                    // optional; absent = standalone
      "skills": ["workflow", "..."],     // bundles only; standalone implies [<plugin-name>]
      "pluginDirs": {                    // optional; repo-relative src → dest under dist/plugins/<name>/
        "skills/workflow/hooks": "hooks"
      },
      "marketplace": {
        "description": "..."             // required; the ratified-divergent marketplace text
      }
    }
  },
  "catalogs": {                          // one entry per generated table block;
    "readme-skills":      { "rows": [{ "skill": "session-report", "blurb": "..." }] },
    "readme-condux":      { "rows": [{ "skill": "workflow", "blurb": "..." }] },
    "readme-toolkit-ops": { "rows": [{ "skill": "toolkit-orientation", "blurb": "..." }] },
    "claude-md-skills":   { "rows": [{ "entry": "`condux` (plugin)", "blurb": "..." }] }
  }
}
```

README turned out to carry three skill tables (Skills, Condux, Toolkit Ops) —
all three are generated blocks, not just the Skills table the design named.
Blocks are code (`BLOCKS` in generate-catalogs.mjs owns each block's file,
header, and row renderer); rows are data. README rows declare `skill` (the
link is derived — that derivation is the registration); the CLAUDE.md block
declares raw `entry` cells because entries carry formatting like
"`concord` (plugin)".

## How each field is consumed

| Field | sync.sh | marketplace.json | doc catalogs |
|---|---|---|---|
| `plugins.<p>` key | dist target root | `plugins[].name` | presence check: every plugin needs ≥1 catalog row |
| `bundle` + `skills` | `skills/<s>` → `dist/plugins/<p>/skills/<p>/<s>` | — | — |
| standalone (no `skills`) | `skills/<p>` → `dist/plugins/<p>/skills/<p>` | — | — |
| `pluginDirs` | `<src>` → `dist/plugins/<p>/<dest>` | — | — |
| `marketplace.description` | — | `plugins[].description` verbatim | — |
| `catalogs.readme-*` | — | — | README marker block rows (3 blocks) |
| `catalogs.claude-md-skills` | — | — | CLAUDE.md marker block rows |

Constants projected by the generator, not declared: `author` (Hieu Vi),
`category` ("development"), `source` (`./dist/plugins/<name>`), marketplace
`name`/`owner` header.

## Validation (composition.mjs, fails the build)

- Every `skills/<name>` directory on disk belongs to exactly one plugin.
- Every declared skill and pluginDir source exists on disk.
- Every plugin has a non-empty `marketplace.description`.
- Every plugin is represented by ≥1 row across the README-family blocks (its
  own name or a member skill) AND a backticked name in the claude-md block.
- No two plugins claim the same skill or the same dest; no pluginDir dest
  collides with a plugin-level file name.
- Every catalog row has a non-empty blurb, and README-family `skill` values
  must be declared skills.
