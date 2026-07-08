---
name: toolkit-change-control
description: Use when deciding whether a change to jabworks/agentic-toolkit is done and safe to ship — classifying the change, picking the version bump, and gating on the publish checklist (mirror synced, both manifests paired, marketplace entry, node --test green, house-style commit). Triggers include "is this skill shipped", "am I done shipping this skill/plugin", "ready to publish", "what version do I bump", "did I register this plugin".
---

# Toolkit Change Control

## Purpose

Gate every change to this toolkit through classification → checklist → evidence, so
"shipped" always means the same verifiable thing.

## When to use

- Before declaring any skill/plugin change done, published, or shipped.
- Choosing a version bump, or wondering whether one is needed at all.
- Deciding what a given change is allowed to touch.

## When not to use

- End-of-dev-task check for ordinary coding work → condux `preflight` / `finalize`.
- The mechanics of scaffolding/registering a NEW skill → `plugin-foundry` (this skill
  gates; that skill builds).
- Diagnosing why something already shipped is broken → `toolkit-debugging-playbook`.

## Inputs required

- `git status` / `git diff` of the working tree.
- The change's intent (new skill, edit, fix) from the user or conversation.

## Procedure

### 1. Classify the change

| Class | Touches | Version bump |
|---|---|---|
| New standalone skill | `skills/<n>/`, `dist/plugins/<n>/**`, marketplace.json | new plugin at 1.0.0 |
| New bundle-member skill | `skills/<n>/`, `dist/plugins/<bundle>/skills/<bundle>/<n>/`, bundle manifests | bundle minor |
| Skill edit | `skills/<n>/` + its dist mirror (via sync) | owning plugin patch (minor if new capability) |
| Manifest-only fix | both `dist/plugins/<p>/.{claude,codex}-plugin/plugin.json` | patch |
| Marketplace-only fix | `.claude-plugin/marketplace.json` | none (no version field there) |
| Doc-only fix | README.md / CLAUDE.md / skill README.md | none, unless the doc ships inside a plugin (then patch) |
| Dist-only resync | `dist/` via `scripts/sync.sh` | none — but ask WHY it drifted first |

**Rules that override everything:** `skills/` is the only editable skill source;
`dist/` skill trees are generated (edit manifests only). Version bumps go in **both**
plugin.json manifests, kept identical — installed caches only refresh on a version
change (git `a4f4aa8`).

### 2. Run the publish checklist (all must pass)

```bash
bash scripts/sync.sh            # 1. mirror is current
node --test                     # 2. parity + invariants + manifests green
for m in dist/plugins/*/.claude-plugin/plugin.json \
         dist/plugins/*/.codex-plugin/plugin.json; do
  jq . "$m" >/dev/null || echo "BAD JSON: $m"                 # 3. spot-check all
done
jq -r '.plugins[].name' .claude-plugin/marketplace.json       # 4. entry present
```

5. Version bumped in both manifests (if the class requires it).
6. Commit — only if the user asked: `feat:`/`fix:`/`chore:` prefix, `-s` signoff,
   no `Co-Authored-By` trailer.

### 3. Say what the evidence shows — nothing more

"Shipped" requires all checklist items with command output. Anything less is
"authored but not shipped" — say which items remain.

## Evidence required

Command output for every checklist claim. A clean `node --test` proves mirror parity
and manifest validity; it does NOT prove the skill's content is correct or that its
description triggers well (see `toolkit-skill-standards`).

## Output artifact

A short ship/no-ship verdict listing each checklist item as pass/fail with the command
that proved it.

## Common traps

- Marking done at "SKILL.md written." History: technical-spec existed unregistered
  until a follow-up commit (`66a71eb`). Registration is part of done.
- Bumping the version in marketplace.json — there is no version field there.
- Editing one manifest and not its twin (`ba69d2b` corrected a displayName that had
  been edited unevenly across the pair).
- Trusting the pre-commit hook to sync — it's developer-local; fresh clones don't have
  it (install via `bash scripts/install-hooks.sh`).

## Bad behavior this prevents

Declaring a skill "shipped" with no marketplace entry — exactly how technical-spec
shipped invisible to `/plugin install` until `66a71eb` retrofitted the entry. The
checklist makes that state unclaimable.

## Related skills

`plugin-foundry` (the build steps this skill gates), `toolkit-skill-standards`
(content quality bar), `toolkit-debugging-playbook` (when a shipped thing misbehaves),
`git-commit` (crafting the commit itself).

## Provenance and maintenance

Re-verify volatile claims with:
- `node --test` — the gate itself
- `jq -r '.plugins[].name' .claude-plugin/marketplace.json` — registration reality
- `grep -h '"version"' dist/plugins/<p>/.claude-plugin/plugin.json dist/plugins/<p>/.codex-plugin/plugin.json` — pair equality

Last generated: 2026-07-08
Known uncertainty:
- Whether marketplace `category` values beyond "development" are meaningful to any
  installer is unverified — every entry currently uses "development".
