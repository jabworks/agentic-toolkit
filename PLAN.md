# plan-review — Interactive Planning Skill

## Goal

A self-contained, in-house interactive plan-review surface for agentic coding.
Capture a plan, annotate it in a local browser, send structured feedback back to
the agent. Inspired by [Plannotator](https://github.com/backnotprop/plannotator)
as a **design reference** — reimplemented in-house, no third-party runtime
dependency, because the toolset targets a company with a strict 3rd-party policy.

## Locked scope

- **One skill:** `plan-review` (the `html-artifacts` skill is folded in — the HTML
  surface *is* the rendered plan).
- **Two capture paths:**
  - **Auto** — a Claude Code `ExitPlanMode` hook captures the plan and opens the UI.
  - **Manual** — `/plan-review <markdown-file>` for ad-hoc review.
- **Feedback loop:** annotate → approve / request-revisions / deny → written to a
  feedback file the agent reads back → agent revises.

## Hard constraints (company policy)

- **No egress.** Server binds `127.0.0.1` only. No CDN, no Google Fonts, no paste
  / short-link service. Markdown renderer (`marked.min.js`) is **vendored** into
  the repo; font is a system monospace stack (or inlined). Fully auditable.
- **No third-party runtime deps.** Node stdlib only for the server (mirrors
  `technical-spec/preview-server.js`).

## Out of scope

Diff / PR / MR review, the standalone `html-artifacts` skill, the sharing/paste
service, Perforce/Jujutsu, Obsidian/Bear, multi-agent breadth beyond Claude Code
+ Codex.

## Task cards

1. **Cleanup** — remove `html-artifacts`, revert `code-review` SKILL.md, drop dist
   orphans. _(done)_
2. **`references/plan-review-template.html`** — single-file Terminus UI dark theme;
   annotation UI (section comment, approve/revise/deny, pending list, submit);
   vendored renderer; `{{PLACEHOLDER}}` tokens.
3. **Markdown renderer** — hand-rolled ~55-line renderer embedded in the template
   instead of a vendored `marked.min.js` blob. Smaller, fully readable, more
   auditable — a better fit for the compliance story than a minified dependency.
4. **`references/annotate-server.js`** — mirror `technical-spec/preview-server.js`:
   `'use strict'`, stdlib only, template from `__dirname`, SSE live-reload via
   `fs.watch`, `listen(0, '127.0.0.1')`; `POST /api/feedback` → `<plan>.feedback.md`.
5. **Hook folded into the server (`--hook`)** — instead of a separate hook script.
   Reads the `ExitPlanMode` payload on stdin, blocks until you decide, then returns
   a synchronous `hookSpecificOutput` decision (Approve→`allow`, Revise/Deny→`deny`
   with feedback as the reason). One auditable file; plus `settings.json` wiring docs.
6. **`SKILL.md` rewrite** — honest: two entry paths, feedback loop, no-egress note,
   hook setup. Drop unimplemented claims.
7. **Resync + register** — into condux bundle, update README/manifests, version bump.
8. **Verify** — server smoke tests, hook dry-run, skill loads in Claude Code + Codex.

## Verification

- `node --check` on every script; server smoke test (GET template, SSE event on
  file change, POST feedback → file written).
- Hook dry-run: feed a sample `ExitPlanMode` payload, confirm plan file + server launch.
- No-egress audit: `grep` the template for `http(s)://` → zero external hosts.
- Skill loads via local marketplace install (Claude Code) and `npx skills add` (Codex).
