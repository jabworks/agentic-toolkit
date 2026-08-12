# API

## `--uninstall` contract

Every installer that registers anything accepts `--uninstall`, and the flag is a
**mode of the same script**, not a separate file — it reuses that script's detect
and report machinery (concord's precedent, `install-codex-hook.sh:48`).

```
<installer> --uninstall            reverse what this installer registered
<installer> --uninstall --dry-run  report what would change, write nothing
```

`--dry-run` composes with `--uninstall` wherever the installer already supports
it. An installer that does not support `--dry-run` for install does not gain it
here.

## Report grammar

Unchanged from the install convention — one row per host, never omitting a host:

| Status | Means |
|---|---|
| `done` | the registration was present and has been removed |
| `skipped` | nothing to remove here, by design or because it was already gone |
| `absent` | the host is not installed on this machine |
| `failed` | removal was attempted and did not succeed — exit non-zero |
| `warn` | something worth saying that is not a failure (e.g. shared state left set) |

A second `--uninstall` run reports `skipped`, never `failed`. Idempotence is the
same requirement install already carries.

The shared `[features] hooks` flag is reported as `warn` on Codex whenever it is
still set after removal, naming the other plugins that ride it. It is never
counted as a failure and never affects the exit code.

## Delegation

`plugins/condux/install.mjs --uninstall` invokes each sub-installer's own
`--uninstall` rather than reversing their writes itself:

| Delegate | Reverses |
|---|---|
| `subagent-execution/references/install-codex-agents.mjs` | the four Codex specialist agent definitions |
| `plan-review/references/install-codex-hook.sh` | the Codex Stop hook |

`install.mjs` continues to own only what it wrote directly: the OpenCode plugin
key. A delegate that is missing from the tree (`npx skills add` ships bare skill
trees) reports `skipped` with the reason, matching how the install path already
probes for them.

## Exit codes

`0` when every host reached a terminal non-`failed` state. Non-zero when any host
reports `failed`. A `warn` row never changes the exit code — the same keying the
install verify beat uses.

## Out of contract

- Removing the plugin from a host's marketplace or plugin registry. Named in the
  documents, performed by the host.
- Deleting user data: `.concord/` memory files, `docket/` backlog trees.
