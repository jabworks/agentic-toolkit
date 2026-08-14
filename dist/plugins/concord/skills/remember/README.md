# Concord

Continuous memory for Codex. Captures each session, ages it into tiers, and
injects the relevant slice back at the start of the next one.

Clean-room and MIT. On Claude Code, memory is handled by other tooling — Concord
ships hooks for Codex only.

## How it works

Three Codex hooks all run the *same* operation — sync the rollout forward from
its recorded position — and differ only in what they do afterwards:

| Hook | Does |
|---|---|
| `SessionStart` | catch-up, then emit budgeted recall on stdout |
| `UserPromptSubmit` | sync, folding in the previous turn |
| `SessionEnd` | sync, then promote tiers |

The rollout file Codex already writes is the single source of truth. No hook
captures content handed to it in the payload, because that content is in the
rollout too and capturing both would double-count every message. Position
tracking makes each sync exactly-once, so hook ordering and repeated calls are
both harmless.

**Crash resilience without locks.** A hard-killed session never fires
`SessionEnd` — but its rollout is already on disk. The next `SessionStart`
replays any rollout whose recorded position trails the file. That is why there
are no lock files, no cooldowns, and no per-tool-call write storms.

## Tiers

```
.concord/                      (git root; gitignored)
  buffer.md                    current session
  days/YYYY-MM-DD.md           per-day detail
  recent.md                    derived view of the last 7 days
  archive.md                   older
  pinned.md                    explicit remembers — never auto-compressed
  state.json                   rollout positions

${CODEX_HOME:-~/.codex}/concord/global/notes.md    cross-project preferences
```

Entries are filed under the date they happened, so a session running past
midnight lands in both days rather than being misfiled into one.

`recent.md` is regenerated from the day files on every promotion, never appended
to — so it cannot drift or duplicate. Don't edit it.

Non-git directories get a bucket under `${CODEX_HOME:-~/.codex}/concord/projects/<slug>/`,
a sibling of the global tier rather than a child of it: project memory must
never end up inside the cross-project layer.

## Install

Install the plugin, then wire the hooks — Codex hooks are experimental and
opt-in:

```bash
bash references/install-codex-hook.sh
```

That merges the three hooks into `~/.codex/hooks.json` and sets
`[features] hooks = true` in `~/.codex/config.toml`. Restart Codex afterwards and
approve the trust prompt.

## Privacy

Everything is local; nothing is transmitted.

`.concord/` holds **verbatim** prompts and tool output, so it can contain
anything that crossed a session. It is created self-ignoring — a `.gitignore`
containing `*` is written into the directory itself on first use — so it cannot
be committed by a stray `git add -A`, and your repo's own `.gitignore` is never
touched. That happens in code rather than by instruction, because the hooks
create the directory on the first session, before any agent has read a skill file.

If you already keep a hand-tuned `.gitignore` in there, it is left alone.

The global tier is for user preferences and working patterns only, never project
facts. That boundary is the whole reason a cross-project layer is safe to have.

## Troubleshooting

Nothing injected usually means the hooks aren't wired — check both
`~/.codex/hooks.json` and the `[features] hooks = true` flag, and confirm Codex
was restarted.

Hook failures never surface in the session, by design: a memory plugin that can
wedge Codex is worse than no memory plugin. They're logged to
`.concord/logs/hook.log`.

## Not yet

Deterministic aging only. LLM compression of older tiers (via `codex exec`) is
Phase 2, so `archive.md` grows until then.
