---
"@jabworks/condux": minor
---

Carry agent tool restrictions across to OpenCode.

The generator dropped each agent's `tools:` allowlist, so all four injected
agents ran with OpenCode's defaults — `bash`, `edit`, and `write` enabled. That
made `explorer` and `researcher` capable of editing files and running shell
commands despite their prompts stating they never do, and let `planner` run a
shell.

Claude allowlists now translate into OpenCode `permission` denials: `explorer`
and `researcher` deny `bash` and `edit`, `planner` denies `bash`, and `coder`
stays unrestricted. Only the mutation and execution gates cross over — read-side
tools keep OpenCode's defaults, since several allowlists omit `Grep`/`Glob` while
the prompts still direct the agent to search.

The restriction has to be expressed as `permission`, not the deprecated `tools`
map: OpenCode folds `tools` into permissions while parsing the config file, which
finishes before plugin `config` hooks run, so a `tools` map injected from a plugin
is silently inert.
