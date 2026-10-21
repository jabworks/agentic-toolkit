# Verification — condux-mod

What was checked live, how, and what is still unproven. Dates are 2026-10-20; the Claude Code build was 2.1.300 and Codex was 0.163.0.

| Claim | Result | Evidence |
|---|---|---|
| A command hook and a nested function-hooks module coexist in one `hooks.json` | verified | A scratch plugin with both: the command hook wrote its marker file and the module answered its own command. Then the real `condux`: `claude plugin validate`, `claude plugin test` and a headless `claude -p "/condux"` all pass |
| A module that throws while loading leaves the session working | verified | See "Broken module" below |
| Codex is unaffected by the `modules` key | partly verified | See "Codex" below; the routing hook firing in Codex is not yet proven |
| The mod only reads | verified | The validator's "calls" list for the module names `$.fs.exists`, `$.fs.list`, `$.fs.read`, `$.clock`, `$.session.cwd`, `$.state`, `$.ui` and `$.command.register`; no `$.fs.write`, `$.process` or `$.prompt`. A source-scan test pins it in CI, which has no `claude` CLI |

## Broken module

A copy of the generated plugin with `register` replaced by a function that throws, loaded with `--plugin-dir` next to an unmodified copy, each given the same one-line prompt.

| | Working module | Broken module |
|---|---|---|
| Run completes with the model's answer | yes | yes (`OK`) |
| Routing payload from the `SessionStart` hook present | yes | yes |
| `condux:*` skills listed at session init | 21 | 21 |
| What the user sees | nothing | one dim transcript line: `hooks module did not load: BOOM: this module is broken on purpose`, from the plugin `condux` |

So a failing module fails open: the skills and the routing hook are untouched, and the failure is a log line, not a blocked session.

## Codex

Method: a scratch `CODEX_HOME` (never the real `~/.codex`), this repository added as a local marketplace, `condux` installed from the working tree, whose `hooks/hooks.json` carries `modules`.

- **Verified.** The plugin lists and installs without error, the installed tree holds both `hooks/hooks.json` and `hooks/codex-hooks.json`, and a `codex exec` run starts its thread and turn with no plugin, manifest or hook error before it fails on the missing credential.
- **Verified from existing state.** The real Codex configuration keys condux's hook state to `hooks/codex-hooks.json`, the file the Codex manifest names. So Codex reads that override and not `hooks.json`, which is why a new key in `hooks.json` cannot reach it.
- **Not verified.** That the routing `SessionStart` hook still fires in an authenticated Codex session with the new `hooks.json`. `codex debug prompt-input` does not run session hooks, and an unauthenticated `exec` reports no hook events, so neither could show it. One step settles it after the release: update condux in Codex, start a session in a repository, and check that the routing rule still arrives.

## Not tested

- A session with mods switched off in settings: the module is simply not loaded and the hook and skills are unaffected, but this was not run.
- Windows paths in a live session (the path helpers are unit-tested for them).
- A plan worked in a git worktree (Q10).
