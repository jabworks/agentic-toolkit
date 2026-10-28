---
created: 2026-10-28 09:23:24
branch: main
repo: jabworks/agentic-toolkit (root)
task: claude-directory-submission
continues-from: none
workstream: condux-distribution-and-traction
---

## Immediate next steps

1. **Harvey:** submit condux at claude.ai/directory/manage (needs a paid plan). condux 2.42.2 is tagged (`condux--v2.42.2`) and carries the icon (`plugins/condux/icon.png`, wired via `"icon": "./icon.png"` in `dist/plugins/condux/.claude-plugin/plugin.json`). The icon locks at the first portal save. If the portal objects, most likely to the code hooks module `skills/workflow/hooks/mod/register.tsx`, bring back its exact message and decide then (agreed: no lean variant up front).
2. Finish the third-party-reference cleanup that #204 missed: `skills/session-handoff/SKILL.md:137` and `skills/toolkit-foundry/SKILL.md:8` still say "Adapted from softaworks/agent-toolkit". `skills/toolkit-failure-archaeology/SKILL.md:85` mentions the "softaworks origin" as history, so decide whether to keep it. Then sync, bump session-handoff and toolkit-ops (patch), and run `node --test`.
3. Docket #115, the highest-risk open item: check whether Codex (0.165+) reads `when_to_use`. Load a condux skill in Codex and see what text the model gets. If it's missing, fold `when_to_use` into `description` for the Codex channel, reusing the transform in `scripts/build-opencode.mjs`.
4. On the next condux/concord release, check whether Codex still errors with exit 1 after the plugin update. Codex 0.154 added live plugin reload, which may retire memory `project_codex_hook_root_var.md`.

## Blockers

| Blocker | Context | Workaround tried |
|---|---|---|
| Can't merge PRs | The auto-mode classifier denies `gh pr merge` ("Merge Without Review") | Harvey merges by hand. A `gh pr merge` permission rule would lift it |

## Current State Summary

Everything is merged and released; `main` is clean at `08504b6`. This session shipped:
- **#197:** `statusMessage` names on every hook (condux 2.41.1, concord 0.6.2). Codex 0.162+ shows these as titles in its hooks menu.
- **The `composition.test.mjs` fix:** gitignored dist entries no longer fail the test.
- **#200:** Codex-safe checkpoints (condux 2.42.0). The checkpoint menu always goes in the final message as plain text.
- **#201:** a link from Q4 to openai/codex#39895. That issue is still unfixed as of 0.165.
- **#202:** the README pitch, plus two stale installer paths fixed.
- **#204:** third-party references stripped from the shipped surface, and `homepage` added (condux 2.42.1).
- **#206:** the condux directory icon (2.42.2).

## Important Context

- **Workflow preference (saved to memory `feedback_batch_prs.md`):** one branch and one PR per session. Docket-only edits ride along with the next change and never get their own PR.
- **Codex `request_user_input` doesn't block.** The App Server docs say pending questions are cleared at turn end, and `autoResolutionMs` can auto-answer them. That's why checkpoints repeat the menu as plain text.
- **"gating hook without .catch" is inventory, not a finding.** `claude plugin validate` prints it for every gating hook, and `scripts/validate-plugins.sh` filters it out.
- **Root `plugin.json` plus hooks is still broken on Codex.** openai/codex#39895 is ours, filed 2026-08-21. Its 13 cross-references are other plugin authors working around it, not fixes. Keep the "never both" rule.
- **Name check:** "condux" doesn't collide with anything in software. The only established brand is Condux International (cable tools, since 1886). Run a USPTO search (classes 9/42) only if the brand is ever going to get paid investment.
- **The icon** is drawn with ImageMagick `-draw` primitives. Its SVG renderer drops strokes, so don't use it. The source command is in the session transcript, and the final file is `plugins/condux/icon.png`.
- **Local ignore:** `.session-handoff/` is ignored through `.git/info/exclude`, at Harvey's choice. It's not in `.gitignore`.

## Decisions made

| Decision | Rationale |
|---|---|
| Keep the condux conflict check but describe it generically | It prevents two SessionStart routers fighting. `conflicts.json` keeps the package names so detection still works |
| Remove all third-party credits from the shipped surface | Harvey: "we matured enough". Leave history (specs/, CHANGELOG, dated eval records) as is |
| Icon: two-ring C on a primary-brown tile, heavier strokes | The most recognizable option at 64 px; Harvey picked it over the git-branch, gauge and half-moon versions |
| Don't commit the generated `tsconfig.json` | Claude Code writes it on every dev load (3bff3dd). The test now skips gitignored entries instead |

## Deferred / out of scope

- **#114:** evaluate `claude plugin eval` and `/skill-doctor` against `scripts/eval-invocations.mjs`.
- **#116:** concord capturing turns the user interrupts, via the Codex `Interrupt` hook.
- **#118:** traction. The quirk post on root `plugin.json` disabling hooks, the other listings (Codex, agent-plugins.org, skills.sh, awesome lists), and a ~15 s condux demo GIF that needs Harvey's screen recording.
