# Adapting Skills

Take a generic skill or a template and make it fit *this* stack, these conventions,
this way of working — instead of leaving the generic version to be quietly ignored.

Also the reverse direction: bringing an existing skill up to the jabworks authoring
standards — tightening its trigger contract, adding eval cases, fixing the structure
that made it fire on the wrong prompts.

> **Opinionated by construction.** The priors in this skill are one person's stack and
> preferences. That is the point — a skill full of hedged, stack-neutral advice adapts
> nothing. If you use this, fork it and replace the priors with your own; the *shape*
> is the reusable part, not the contents.

---

## Install

**Claude Code**

```bash
/plugin marketplace add jabworks/agentic-toolkit
/plugin install adapting-skills@jabworks-agentic-toolkit
```

**Codex**

```bash
codex plugin marketplace add jabworks/agentic-toolkit
codex plugin add adapting-skills@jabworks-agentic-toolkit
```

**OpenCode / other hosts** — `npx skills add https://github.com/jabworks/agentic-toolkit/tree/main/dist/opencode/skills -a opencode`

---

## Boundaries

Creating, registering, and syncing a *toolkit* skill is `toolkit-foundry`. Reviewing
this toolkit's own SKILL.md files against the standards is `toolkit-skill-standards`.
This skill is for adapting skills and scaffolding output in any project.

---

## Source and license

Source of truth is [`skills/`](https://github.com/jabworks/agentic-toolkit/tree/main/skills)
in [jabworks/agentic-toolkit](https://github.com/jabworks/agentic-toolkit) — this
directory is a generated install mirror. File issues against the main repo.

MIT — see [LICENSE](./LICENSE).
