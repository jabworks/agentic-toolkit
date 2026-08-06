# Coding Directive

The jabworks house style, written so code comes out matching it the first time instead
of being corrected into it afterwards.

Two tiers, kept deliberately separate:

- **Enforced** — the rules that already live in configs (TypeScript, ESLint/oxlint,
  Prettier/oxfmt, Stylelint). These are not opinions; a tool fails the build over them,
  and the skill's job is to state them before the code is written rather than after.
- **Judgment** — naming, error handling, React component anatomy, monorepo boundaries,
  Tailwind usage. No tool checks these. Each carries a confidence marker, so "this is
  the convention" and "this is a preference worth arguing with" never look alike.

> **Personal by design.** This encodes one team's choices. Fork it and change the
> contents; the two-tier split and the confidence markers are the transferable part.

---

## Install

**Claude Code**

```bash
/plugin marketplace add jabworks/agentic-toolkit
/plugin install coding-directive@jabworks-agentic-toolkit
```

**Codex**

```bash
codex plugin marketplace add jabworks/agentic-toolkit
codex plugin add coding-directive@jabworks-agentic-toolkit
```

**OpenCode / other hosts** — `npx skills add https://github.com/jabworks/agentic-toolkit/tree/main/dist/opencode/skills -a opencode`

---

## The rule above all the rules

Codebase mimicry wins. If the file you are editing does something differently and
consistently, match the file — a directive that makes one function look imported from
another project is worse than the inconsistency it fixed. Repo config beats this skill;
this skill beats defaults.

---

## Boundaries

What a lint rule means in general is documentation, not this. Why a specific command or
flag is banned *here* is `toolkit-failure-archaeology` — those bans have incidents
behind them. Running the gates is condux's `finalize`.

---

## Source and license

Source of truth is [`skills/`](https://github.com/jabworks/agentic-toolkit/tree/main/skills)
in [jabworks/agentic-toolkit](https://github.com/jabworks/agentic-toolkit) — this
directory is a generated install mirror. File issues against the main repo.

MIT — see [LICENSE](./LICENSE).
