# Spec Browser

Once a repo has more than a handful of specs, `specs/` stops being navigable. This turns
the whole tree into one doc site, and generates a plain-markdown catalog that any agent
can read without a search plugin.

Two outputs, deliberately:

- **A markdown index** — committed, greppable, and readable by an agent that has no
  browser and no MCP server. This is the one that answers "where is the spec for X"
  during a task.
- **A folder-grouped doc site** — a self-contained HTML file for humans, reusing the
  plan-review renderer so specs look the same wherever you read them.

The design bet is that **the agent-readable artifact matters more than the pretty one**,
and that a catalog which is not committed will not be there when it is needed.

---

## Install

**Claude Code**

```bash
/plugin marketplace add jabworks/agentic-toolkit
/plugin install spec-browser@jabworks-agentic-toolkit
```

**Codex**

```bash
codex plugin marketplace add jabworks/agentic-toolkit
codex plugin add spec-browser@jabworks-agentic-toolkit
```

**OpenCode / other hosts** — `npx skills add https://github.com/jabworks/agentic-toolkit/tree/main/dist/opencode/skills -a opencode`

---

## No external services

No plugins, no network, no hosted anything. The site is one HTML file that opens from
disk, which is also what makes it safe to point at specs that describe a private system.

---

## Boundaries

Reviewing one plan and returning approve / revise / deny is `plan-review`. Writing and
maintaining a single spec is condux's `technical-spec`. This is for the case where the
tree itself has become the problem.

---

## Source and license

Source of truth is [`skills/`](https://github.com/jabworks/agentic-toolkit/tree/main/skills)
in [jabworks/agentic-toolkit](https://github.com/jabworks/agentic-toolkit) — this
directory is a generated install mirror. File issues against the main repo.

MIT — see [LICENSE](./LICENSE).
