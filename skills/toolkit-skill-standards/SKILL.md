---
name: toolkit-skill-standards
description: Use when writing or reviewing a SKILL.md for jabworks/agentic-toolkit — frontmatter budgets, the trigger contract ("Use when…" description or when_to_use field), progressive disclosure into references/, and keeping a new description out of existing skills' trigger space. Triggers include "review this skill description", "write the frontmatter", "does this collide with an existing skill", "where should this content live".
---

# Toolkit Skill Standards

## Purpose

The content bar every SKILL.md in this repo must clear: budgets, trigger contract,
structure, and collision discipline.

## When to use

- Drafting or rewriting any SKILL.md frontmatter or body in this repo.
- Reviewing a proposed skill before it ships.
- A description "feels fine" but the skill under- or mis-triggers.

## When not to use

- Scaffolding/registering/syncing mechanics → `toolkit-foundry`.
- Adapting an externally-sourced skill template to Harvey's stack → `adapting-skills`
  (then return here for this repo's frontmatter/mirror requirements).
- Triage of a live triggering bug → `toolkit-debugging-playbook` first; it routes back
  here when the cause is wording.

## Inputs required

- The draft SKILL.md (or the skill name to review).
- The current library inventory: `ls skills/` + each sibling's description AND
  `when_to_use` (both fields form the trigger contract).

## Procedure

1. **Budgets (test-enforced):** description ≤ 500 chars; total frontmatter ≤ 1024;
   `name` kebab-case and identical to the directory name. Check:
   `node --test tests/skill-invariants.test.mjs`.

2. **Trigger contract (owner-ratified 2026-07-08):** the contract is
   description + `when_to_use` together.
   - Standalone skills / no `when_to_use`: description MUST start with "Use when…"
     and lead with trigger terms a user would actually type.
   - condux-style skills: description states what it does; `when_to_use` carries the
     trigger conditions ("Trigger when…"). Both fields count against the 1024 budget.
   - Quote YAML strings containing `:` or special chars — an unquoted description once
     broke a skill outright (`a13e094`).

3. **Front-load trigger terms.** Most important phrases first; include the literal
   words users type ("sync dist", "am I done", "browse specs"). Workflow summaries
   belong in the body, not the description.

4. **Collision scan (manual, mandatory).** Read every sibling description +
   `when_to_use`. If the new skill's trigger space overlaps, either merge into the
   sibling or add explicit mutual disambiguation — both skills name each other, the
   way subagent-deployment ("not for executing an ordered plan — that's
   subagent-execution") and subagent-execution ("not for ad-hoc independent tasks —
   that's subagent-deployment") do. Known hot zones to check against: the subagent
   pair, plan-review↔spec-browser ("spec directory"), preflight↔finalize ("am I
   done"), toolkit-foundry↔adapting-skills (skill creation vs adaptation).

5. **Progressive disclosure.** SKILL.md = concise runbook readable in one scan:
   purpose, when (not) to use, procedure, traps, related skills. Long archaeology,
   catalogs, templates, ledgers → `references/`. Executable helpers → `scripts/` or
   references (see plan-review's `references/annotate-server.js`).

6. **Every skill with a plausible sibling overlap must state when NOT to use it**
   and name that sibling instead. Keep unrelated skills concise; do not invent a
   false alternative merely to fill a section.

## Evidence required

For "the description is fine": show budget numbers and the collision scan result
(which siblings were checked, why no overlap). For "this collides": quote the
overlapping phrases from both skills.

## Output artifact

A pass/fail review with specific rewrites, or ship-ready frontmatter.

## Common traps

- Judging only the `description` and missing that 14+ skills carry their triggers in
  `when_to_use` — you'll "fix" something that isn't broken.
- Trimming needed procedure to fit a scan instead of moving it to `references/`.
- Writing the description about what the skill DOES instead of when it's NEEDED —
  models trigger on user-moment language, not feature lists.

## Bad behavior this prevents

Shipping a second "sync my skills" skill next to toolkit-foundry because the author
never read the sibling descriptions. Three skills in this repo (preflight,
subagent-execution, test-first-development) shipped with no machine-visible trigger
contract at all until the 2026-07-08 audit added their `when_to_use` fields — the
collision scan + trigger-contract check makes both failure shapes visible before ship.

## Related skills

`toolkit-foundry` (mechanics after content passes), `toolkit-change-control` (ship
gate), `adapting-skills` (external templates first — and the owner of these
standards applied to skills in *other* projects), `toolkit-debugging-playbook`
(live trigger failures).

## Provenance and maintenance

Re-verify volatile claims with:
- `node --test tests/skill-invariants.test.mjs` — budgets/name enforcement
- `grep -l 'when_to_use' skills/*/SKILL.md` — which skills use the two-field contract

Last generated: 2026-07-08
Known uncertainty:
- How each host tool weights `description` vs `when_to_use` for auto-triggering is
  unverified — treat front-loading BOTH fields as the safe default.
