---
name: plan-review
description: Render a plan in a local browser for inline annotation, then return an approve / request-revisions / deny decision to the agent. Auto-captured via a Claude Code ExitPlanMode or Codex Stop hook, or run manually on a markdown file or spec directory.
when_to_use: "When the agent finishes planning and you want to review or annotate before it implements, or on /plan-review for a markdown plan or spec directory. Also owns its machinery — steer-mode loops, the live spec preview, and installing or troubleshooting the ExitPlanMode / Codex Stop hooks. Phrases: \"let's review the plan\", \"walk me through the plan\", \"annotate the plan\". Not for cataloging a whole specs tree (spec-browser); not for the implemented diff (code-review)."
---

# /plan-review

Interactive plan review. The agent's plan opens in a local browser; you select
any text to attach an inline comment, chat with the agent, then submit a decision.
The decision flows back to the agent — **Approve** lets it proceed, **Request
Revisions** sends your notes back so it revises and re-presents, and **Reject**
tells it not to implement — reconsider whether the feature should be built.

Inspired by [Plannotator](https://github.com/backnotprop/plannotator), rebuilt
in-house so it carries **no third-party runtime dependency** and makes **no
network calls** — safe for strict environments.

## Ways in

### Auto — ExitPlanMode hook (the real workflow)

Ships with the condux plugin, auto-registered — every `ExitPlanMode` opens the
review UI and blocks until you decide (Approve / Request Revisions / Reject).
Standalone installs wire the same hook by hand.
Full install + troubleshooting: `references/hooks-install.md`.

### Auto — Codex Stop hook

Codex has no `ExitPlanMode` interception point, so review runs off Codex's
experimental `Stop` hook instead — same review UI, same three decisions.
Ships with the condux plugin's Codex manifest; standalone installs run
`install-codex-hook.sh` once.
Full install + troubleshooting + decision tables: `references/hooks-install.md`.

### Manual — on any file or spec directory

```bash
node /PATH/TO/plan-review/references/annotate-server.js <plan-or-spec.md>
node /PATH/TO/plan-review/references/annotate-server.js <spec-dir>
```

Serves the file, writes your decision to `<file>.feedback.md`, and stays running
(Ctrl+C to stop). Pass `--no-open` to skip the automatic browser launch (used by
the test suite; also right for headless/CI runs). Use this for ad-hoc review of a spec or a written plan when you
are not in plan mode. After submitting, read `<file>.feedback.md` to action it.

**Directory mode** reviews a whole spec folder (e.g. `specs/wan-config/` from
the `technical-spec` skill): every `*.md` in the tree appears in a doc-site
sidebar — collapsible folders (`index.md` first, dotdirs skipped), a filter
over doc names and headings, breadcrumb and prev/next — notes are tagged with their source file, edits to any file live-reload (with a
per-file revision diff), and the decision lands in `<dir>/review.feedback.md`
grouped by file. Works in manual and `--steer` modes; this is also the live
preview surface for `technical-spec` (its old preview server is retired).

### Steer — agent-invoked loop (any agent, no hook needed)

When you want the review to actually **drive an agent** outside Claude's
`ExitPlanMode` / Codex `Stop` hooks — e.g. an agent that wrote a plan to a file
and wants you to gate it — run the server in `--steer` mode. The server is
**long-lived**: launch it once, and one browser tab stays open for the whole
review while the agent loops.

```bash
# 1. Launch once, in the background (default port 7777; override with --port).
node /PATH/TO/plan-review/references/annotate-server.js <plan.md> --steer &

# 2. Each round: block until you submit a decision (long-poll).
curl -s http://127.0.0.1:7777/api/decision
#   → {"decision":"Request Revisions","feedback":"<markdown>","feedbackFile":"<abs>.feedback.md"}
```

The agent runs the **iterative loop** off that decision:

1. Launch the server (step 1) — the review tab opens and stays open.
2. `GET /api/decision` — blocks until you decide; returns the decision JSON.
3. Branch on `decision`:
   - **Approve** → stop looping, implement the plan (use `feedback` as notes). The server exits.
   - **Request Revisions** → edit `<plan.md>` **in place**; the open tab live-reloads the new plan over SSE (orphaned notes auto-clear). **Go to 2.**
   - **Reject** → stop; do not implement — reconsider whether to build this, or surface the blocker. The server exits.

Same steering the hooks give you, available to any agent that can run a command
and read a file — at the cost of the agent orchestrating the loop itself rather
than a hook blocking inline. Because the server is long-lived, **the same tab
reflects every revision** — no new tab per round. The decision is also written to
`<plan.md>.feedback.md` as a record each round.

## The review surface

Three-pane layout over a decision bar: sidebar (Contents outline + Files list)
on the left, the rendered plan centered, and a Review rail on the right for
notes/messages. Select text to annotate (category + note), or message the
agent directly; decide via `[Reject] ——— [Request revisions] [Approve]` at the
bottom. Revisions live-reload with a diff banner; no third-party deps or
network egress (Node stdlib server + self-contained HTML).
Full UI walkthrough + guarantees: `references/ui.md`.

## Files

| File | Role |
|---|---|
| `references/annotate-server.js` | Local server. `--hook` (Claude ExitPlanMode), `--codex-stop` (Codex Stop), `<file> --steer` (agent-invoked blocking loop), or `<file|dir>` alone for manual mode. A directory argument reviews every `*.md` in the tree. `--no-reject` hides the Reject verdict for accept-or-fix reviews (discovery's design stage passes it; directory mode implies it). |
| `references/install-codex-hook.sh` | Registers the Codex `Stop` hook in `~/.codex` and enables the hooks feature flag. |
| `references/plan-review-template.html` | Self-contained review UI (renderer + annotation surface). |

## Related skills

- `draft-plan` — produces the plan this skill reviews.
- `technical-spec` — persists decisions/API/quirks; this server (directory mode) is its live preview + review surface.
