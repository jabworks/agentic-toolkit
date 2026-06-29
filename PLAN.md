# Plannonator Skill Set Plan

## Context

The user wants to bring their own **plannonator skill set** (plan review, code review, HTML artifact annotation) to the toolkit repo, not relying on the external `plannotator` repo or binary. This means implementing plan review, code review with feedback loop, and HTML artifact annotation as skills within the toolkit repo, using the existing skill framework (markdown files, scaffold scripts, preview servers, etc.).

## Approach

1. **Create a `plan-review` skill** in `skills/plan-review/SKILL.md` for annotating plans, specs, and markdown before implementation, and sending feedback to the agent (approve/revisions/deny).
2. **Enhance the existing `code-review` skill** in `skills/code-review/SKILL.md` to support PR/MR review, commenting on diffs, suggesting code, and sending structured feedback to the agent for revision.
3. **Create a `html-artifacts` skill** in `skills/html-artifacts/SKILL.md` for annotating rendered HTML artifacts, using the `tech-spec` skill's live HTML preview server (`preview-server.js`) as a base.
4. **Integrate these skills** into the toolkit's existing workflow (e.g., `condux` bundle, `write-plan`, `technical-spec` skills).

## Files to Modify / Create

- `skills/plan-review/SKILL.md` (new)
- `skills/code-review/SKILL.md` (enhance to support PR/MR review and feedback loop)
- `skills/html-artifacts/SKILL.md` (new)
- `skills/plan-review/references/` (new directory for plan review scripts/templates)
- `skills/html-artifacts/references/` (new directory for HTML artifact scripts/templates)
- Potentially update `dist/plugins/condux/plugin.json` or `skills/using-condux/SKILL.md` to reference the new skills

## Reuse

- `skills/technical-spec/SKILL.md` for live HTML preview workflow and scaffold script patterns (`preview-server.js`, `scaffold.sh`)
- `skills/write-plan/SKILL.md` for plan presentation and approval workflow
- `skills/code-review/SKILL.md` (existing) for diagnostic report and severity categorization
- `references/templates.md` and `references/plan-template.html` from `technical-spec` or `write-plan` for HTML and markdown templates

## Steps

- [ ] Step 1: Create `skills/plan-review/SKILL.md` with annotation and feedback loop workflow
- [ ] Step 2: Enhance `skills/code-review/SKILL.md` to support PR/MR review, inline comments, and feedback to agent
- [ ] Step 3: Create `skills/html-artifacts/SKILL.md` with live HTML preview and annotation support
- [ ] Step 4: Add reference scripts (like `preview-server.js` and `annotate-server.js`) in the `references/` directories for `plan-review` and `html-artifacts` skills
- [ ] Step 5: Update `skills/using-condux/SKILL.md` or `dist/plugins/condux/` to include the new skills in the condux bundle or workflow

## Verification

- Test the `plan-review` skill by proposing a plan and annotating it with feedback
- Test the enhanced `code-review` skill by reviewing a local diff or PR URL and sending feedback
- Test the `html-artifacts` skill by generating HTML artifacts and using the live preview with annotation support
- Verify that the skills integrate with existing `write-plan`, `technical-spec`, and `condux` workflows without conflicts