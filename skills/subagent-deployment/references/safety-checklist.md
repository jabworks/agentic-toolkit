# Parallel Dispatch Safety Checklist

The one place this logic lives. `subagent-deployment`,
`subagent-driven-development`, and `spawn-rules.md` all point here instead
of restating it.

## Is it safe to dispatch these together?

```
□ Read-only combination? (explorer + explorer, researcher + researcher, or
  explorer + researcher)
  → Always safe. Nothing writes, nothing to conflict. Skip the rest of
    this checklist.

□ Any task in the group uses coder (or planner writing a doc)?
  → All of the following must hold:
    □ Every write-capable task in the group writes to different files
      than every other task in the group
    □ No task depends on another task's output
    □ No task needs another task's file to exist first
    □ You (the controller) can integrate every result without conflicts

If any box is unchecked → that group runs sequentially, not together.
```

## Constructing the batch

- Issue every cleared dispatch in the **same message** — one Agent tool call
  per task, all in one response. Multiple calls in one message run
  concurrently; one call per response runs sequentially, regardless of
  intent.
- Each dispatch prompt is self-contained — no dispatch should assume the
  agent has seen any other task in the batch, or your session's history.
- Never dispatch two tasks together just because they're both quick — the
  checklist is about safety (file/dependency conflicts), not speed.

## Known limitation

No filesystem isolation (no git worktrees) backs this — safety rests
entirely on the disjoint-files check above, not on the environment
enforcing it. This is a deliberate, accepted tradeoff, not an oversight: two
agents genuinely writing to different files carries no real conflict risk
at the filesystem level; the residual risk is agents running overlapping
git commands against the same `.git` concurrently, which none of condux's
current dispatch prompts do (no task is asked to commit — committing is
always a separate, explicit, controller-only step per this repo's own
convention).

## Model selection

Same tiering as sequential dispatch — see
`subagent-driven-development/references/spawn-rules.md` → Model Selection.
Parallelizing doesn't change which model tier a given task needs; it only
changes how many run at once.
