# Toolkit Ops

The skills for operating [jabworks/agentic-toolkit](https://github.com/jabworks/agentic-toolkit)
itself — orientation, authoring standards, change control, and the evidenced record of
everything that has gone wrong here before.

This bundle is unusual: it is about *one specific repo*. If you are not working on the
toolkit, you almost certainly want `condux` instead. It ships as a plugin because
working on the toolkit from a fresh session is itself a task that needs its context
loaded, and because the doctrine in these files is what keeps the other plugins from
regressing.

The design bet is that **a rule with an incident behind it survives; a rule without one
gets argued away**. Nearly everything here cites a commit.

---

## Install

**Claude Code**

```bash
/plugin marketplace add jabworks/agentic-toolkit
/plugin install toolkit-ops@jabworks-agentic-toolkit
```

**Codex**

```bash
codex plugin marketplace add jabworks/agentic-toolkit
codex plugin add toolkit-ops@jabworks-agentic-toolkit
```

---

## The 8 skills

| Skill | What it does |
|---|---|
| `toolkit-orientation` | Landing with no context: which tree is editable, how bundles nest, which files are generated, where not to write. |
| `toolkit-foundry` | The canonical checklist for creating, registering, and syncing a new skill or plugin. |
| `toolkit-skill-standards` | Authoring standards for SKILL.md — trigger contracts, frontmatter grammar, the artifact-location contract, the dependency ladder, the health-check convention. |
| `toolkit-change-control` | Is this change done and safe to ship? Classifies it, picks the version bump, gates on the publish checklist. |
| `toolkit-debugging-playbook` | Symptom → first discriminating command → root cause, for when a skill will not trigger or a plugin will not show up. |
| `toolkit-failure-archaeology` | The incident ledger: what broke, what the wrong path was, what commit proves it, what doctrine it produced. |
| `toolkit-plugin-reference` | Manifest field semantics for both hosts, including which fields are host-specific and why. |
| `toolkit-research-frontier` | Open questions and eval results — what is measured, what is guessed, what is next. |

---

## The two rules that produce most of the others

**`dist/` is generated.** Edit `skills/`, run `scripts/sync.sh`, never hand-edit the
mirror. Every out-of-tree mirror target needs its own sync step *and* its own test —
the one that had neither drifted silently for weeks.

**A guard that vanishes with its tool is not a guard.** The frontmatter oracle fails
rather than skips when its dependency is missing, because a skipped check reads exactly
like a passing one in CI output.

---

## Source and license

Source of truth is [`skills/`](https://github.com/jabworks/agentic-toolkit/tree/main/skills)
in [jabworks/agentic-toolkit](https://github.com/jabworks/agentic-toolkit) — this
directory is a generated install mirror. File issues against the main repo.

MIT — see [LICENSE](./LICENSE).
