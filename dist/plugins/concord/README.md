# Concord

Continuous memory for Codex. Sessions end; what you established in them shouldn't.

Concord captures each session from its rollout file, ages it through tiers, and injects
the relevant slice back at the next session start. You do not ask it to remember — it
already did. You only reach for it explicitly when you want something pinned, or when a
question reaches past the slice that was injected.

The design bet is that **capture has to be exactly-once and unattended, or it is
worthless**. Three hooks share one idempotent operation — sync the rollout forward from
its recorded position — so ordering does not matter, double-firing does not duplicate,
and a session killed hard is recovered at the next start rather than lost.

---

## Install

**Codex** — this plugin is Codex-only by design; the memory it captures is the Codex
rollout format.

```bash
codex plugin marketplace add jabworks/agentic-toolkit
codex plugin add concord@jabworks-agentic-toolkit
```

Then wire the hooks and enable Codex's experimental hooks feature:

```bash
bash <skill-base>/references/install-codex-hook.sh
```

It registers, then verifies what it registered, and reports one row per host —
Claude Code and OpenCode included, named as `skipped` rather than left out.
`references/INSTALL.md` is the same procedure written out for an agent to follow by
hand when bash is not available.

Start at [INSTALL.md](INSTALL.md) if you would rather not hunt for either — it carries
the host table and points at both.

Restart Codex and trust the hooks when prompted. `concord-doctor` tells you whether all
of that actually took, and `concord-doctor --fix` re-runs the installer for you.

---

## The 2 skills

| Skill | What it does |
|---|---|
| `remember` | The memory itself: pin a fact, answer "what did we do last time", search past sessions, and explain the tiers and files. |
| `concord-doctor` | Is concord actually capturing on this host? Probes both Codex registration paths, all three hook events, the feature flag, and the store. `--fix` delegates the repair to the installer. |

---

## How memory ages

| Tier | Holds |
|---|---|
| buffer | the session being written right now |
| daily | today's sessions, still full-text |
| recent | the last stretch, compressed |
| archive | everything older, heavily compressed |

Explicitly pinned facts are never auto-compressed. Everything lives under
`${CODEX_HOME:-~/.codex}/concord/`, with per-project buckets keyed by git root — a
non-git directory gets its own bucket rather than polluting a neighbour's.

---

## Why three hooks for one job

`SessionStart` recalls and catches up, `UserPromptSubmit` syncs forward, `SessionEnd`
syncs and promotes tiers. All three call the same sync, which reads the rollout from a
recorded offset and appends only what is new.

That is what makes the design survive reality: hooks fire in an order you do not
control, some fire twice, and a crashed session fires no `SessionEnd` at all. An
append-from-offset operation is correct under all three conditions, where a
"capture the session now" operation is correct under none of them.

---

## Source and license

Source of truth is [`skills/`](https://github.com/jabworks/agentic-toolkit/tree/main/skills)
in [jabworks/agentic-toolkit](https://github.com/jabworks/agentic-toolkit) — this
directory is a generated install mirror. File issues against the main repo.

MIT — see [LICENSE](./LICENSE).
