# Docket

A project backlog that lives in your repo, not in a tab you forgot to open.

Open items sit in `docket/DOCKET.md` — one file you can skim end to end. Closed items
move to `docket/archive/<year>.md` with the record of how they were verified. Ids are
integers, shared across open and archive, and never reused, so `#12` in a commit
subject means the same thing forever.

The design bet is that **a backlog an agent can edit correctly is worth more than a
backlog with a nice UI**. Everything is committed markdown, so it diffs, reviews, and
travels with the branch — and the two operations that actually corrupt a backlog (id
allocation and the close-and-move) go through a CLI instead of hand-editing.

---

## Install

**Claude Code**

```bash
/plugin marketplace add jabworks/agentic-toolkit
/plugin install docket@jabworks-agentic-toolkit
```

**Codex**

```bash
codex plugin marketplace add jabworks/agentic-toolkit
codex plugin add docket@jabworks-agentic-toolkit
```

**OpenCode / other hosts** — `npx skills add https://github.com/jabworks/agentic-toolkit/tree/main/dist/opencode/skills -a opencode`

---

## The 3 skills

| Skill | What it does |
|---|---|
| `record` | Item-level work: add with the next free id, append status updates, split, and close — stamping ✅ and moving to the archive in one action. Also captures deferred ideas mid-conversation ("later", "someday"). |
| `groom` | Whole-backlog passes: the stale sweep, the id-space integrity check, and "what should I work on next". Reports and recommends; never edits items itself. |
| `docket-doctor` | Is docket actually working on this host? Probes the MCP registration on every host, the CLI fallback, and the installed version. |

The split is by trigger shape, not by feature: one skill for "do something to item #7",
one for "look at the whole board". Mixing them is what makes a backlog tool guess.

---

## Closing means moving

The failure this tool exists to prevent is the stamped item still sitting in the open
file. A `— ✅ DONE` marker that never moved reads as open work, and the next session
spends real time scoping something that already shipped.

So closing is one operation: stamp, record the verification, relocate to the archive.
`docket.mjs close <id>` does all three, or the `docket_close` MCP tool does. Never by
hand — that is where half-moves come from.

---

## Machinery

The skills work with nothing installed: they fall back to
`node <skill-base>/server/docket.mjs`, which needs only Node. Registering the bundled
MCP server removes the per-operation shell prompts, and `server/install.sh` (or the
agent-followable `server/INSTALL.md`) does that for Codex and OpenCode — Claude Code
gets it from the shipped `.mcp.json` automatically.

`docket.mjs browse` renders the whole board to a self-contained HTML file with no
network access, and `--serve` live-reloads it.

Already have a root `BACKLOG.md`? It is the same contract in older clothes. Every
operation works on it in place, and migration is offered once, never forced.

---

## Source and license

Source of truth is [`skills/`](https://github.com/jabworks/agentic-toolkit/tree/main/skills)
in [jabworks/agentic-toolkit](https://github.com/jabworks/agentic-toolkit) — this
directory is a generated install mirror. File issues against the main repo.

MIT — see [LICENSE](./LICENSE).
