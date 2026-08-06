# Release

Cut a release without guessing which mechanism this repo uses — and without a
force-push in the recovery path.

The skill detects the machinery first: an `AGENTS.md` release section always wins,
then changesets, then this toolkit's own plugin channel, then a plain GitHub tag and
release. Detection matters because the failure mode is specific — hand-tagging a
changesets repo forks the changelog, and it looks fine until the next publish.

The design bet is that **the dry run is the safety, and it costs one screen**. Every
route prints the full plan — machinery, version, commits, generated notes, exact
commands, rollback per step — and then asks once. One yes runs the sequence.

---

## Install

**Claude Code**

```bash
/plugin marketplace add jabworks/agentic-toolkit
/plugin install release@jabworks-agentic-toolkit
```

**Codex**

```bash
codex plugin marketplace add jabworks/agentic-toolkit
codex plugin add release@jabworks-agentic-toolkit
```

**OpenCode / other hosts** — `npx skills add https://github.com/jabworks/agentic-toolkit/tree/main/dist/opencode/skills -a opencode`

---

## Guards, all before anything runs

| Guard | Why |
|---|---|
| Working tree clean | a release built from uncommitted state is unreproducible |
| HEAD is an ancestor of main | published tags on dead branches haunt forever |
| Test gate green | the project's own command, not an assumption |
| Version matches the manifest | a tag that disagrees with the package is worse than no tag |
| Tag does not already exist | locally *and* on the remote |
| `gh` authenticated | fail here, not halfway through |

`--force` is banned. History rewrites are banned. A bad tag is deleted and re-cut, or
fixed forward with the next patch — never overwritten in place.

---

## Boundaries

Deciding *which* version to bump is `toolkit-change-control` — that gates, this
executes. Committing the work is `git-commit`. Undo and recovery are `git-operations`.

---

## Source and license

Source of truth is [`skills/`](https://github.com/jabworks/agentic-toolkit/tree/main/skills)
in [jabworks/agentic-toolkit](https://github.com/jabworks/agentic-toolkit) — this
directory is a generated install mirror. File issues against the main repo.

MIT — see [LICENSE](./LICENSE).
