# 03 — Trigger matrix (toolkit-ops bundle vs the existing library)

Eval corpus: `skills/toolkit-*/evals/trigger_eval.json` (150 queries total across 7
files, post-review fixes). Semantics: `should_trigger` = some skill in the library should handle the
query; `expected_skill` = which one (null when nothing should trigger). Each file
emphasizes its own skill's hits, messy/typo variants, sibling-routing cases, and
clear negatives.

Manual invocation: all seven are bundle members of `toolkit-ops` — invocable by name
(e.g. via the Skill tool / `/toolkit-orientation`) and safe for automatic model
invocation (none mutate anything by themselves; change-control and playbook only ever
run read-only verification commands unless the user directs a fix).

## toolkit-orientation

- Should trigger: "how is this repo organized", "what is dist for", "which files are
  generated", "where should I not write", "readme disagrees with the folder".
- Should NOT trigger: any question about a different repo ("orient me in
  maestro-api-gateway"), generic formatting tasks.
- Sibling conflicts: `plugin-foundry` (creation vs comprehension — foundry owns "add
  a skill", orientation owns "explain the layout"); `toolkit-plugin-reference`
  (manifest FIELD questions go to reference; tree/role questions stay here).
- False-positive avoidance: description scopes to "landing in jabworks/agentic-toolkit"
  and layout vocabulary; no action verbs like create/publish/fix.
- Auto-invocation: safe (pure knowledge).

## toolkit-change-control

- Should trigger: "is this shipped", "what do I bump", "did I register this",
  "skip the marketplace for now" (triggers to BLOCK), "retire a skill".
- Should NOT trigger: "am I done with this react feature" (→ condux `preflight`),
  "run typecheck lint tests" (→ `finalize`), generic semver questions.
- Sibling conflicts: `preflight`/`finalize` own end-of-DEV-task gating — this skill's
  description says "a change to jabworks/agentic-toolkit" to stay in the publish
  domain; `plugin-foundry` builds, this gates (both descriptions now say so).
- False-positive avoidance: trigger terms are publish/ship/register/bump — absent
  from ordinary coding tasks.
- Auto-invocation: safe (verification commands are read-only).

## toolkit-skill-standards

- Should trigger: "review this description", "does this collide with plugin-foundry",
  "SKILL.md or references", "when_to_use or Use when", budget questions.
- Should NOT trigger: PR descriptions, docstrings, code lint — the description says
  "a SKILL.md for jabworks/agentic-toolkit".
- Sibling conflicts: `adapting-skills` (external template → Harvey's stack comes
  FIRST, then this skill for this repo's bar — both descriptions cross-reference);
  `toolkit-debugging-playbook` (live trigger failures triage there first; it routes
  back here when wording is the cause); `plugin-foundry` (mechanics after content).
- False-positive avoidance: nouns are frontmatter/description/references — authoring
  vocabulary, not runtime vocabulary.
- Auto-invocation: safe.

## toolkit-debugging-playbook

- Should trigger: "skill isn't triggering" (incl. typo'd "skil not trigering"),
  "plugin not showing up", "dist out of date", "installed differs from repo",
  "manifest fails to parse", "agents stale".
- Should NOT trigger: app/site bugs ("react app crashes", "nginx 502") — those go to
  condux `root-cause-analysis` or nowhere; the description scopes to "a skill or
  plugin from jabworks/agentic-toolkit".
- Sibling conflicts: `root-cause-analysis` is the general debugging skill — the
  strongest cross-bundle adjacency in the library. Disambiguator: subject of the bug
  (this toolkit's artifacts vs the user's project code). Both evals test the seam.
- False-positive avoidance: symptom phrases name toolkit artifacts (skill, plugin,
  dist, manifest) rather than generic "bug/error/crash".
- Auto-invocation: safe (diagnostic commands only).

## toolkit-failure-archaeology

- Should trigger: "has this happened before", "why do we do it this way", "add this
  incident", "did we ever try X", history questions with commit hashes.
- Should NOT trigger: general postmortems for other systems, `git blame`/bisect
  mechanics (→ `git-operations` for git situations).
- Sibling conflicts: `toolkit-debugging-playbook` (live symptom now vs precedent
  lookup — playbook links here for "has this happened before");
  `git-operations` (running git commands vs interpreting this repo's history).
- False-positive avoidance: past-tense/history vocabulary ("happened before",
  "story", "ledger") — no live-bug verbs.
- Auto-invocation: safe (read-only git archaeology; ledger writes only on request).

## toolkit-plugin-reference

- Should trigger: field-level schema questions ("what fields does plugin.json
  need", "claude vs codex manifest", "is strict real", "where does hooks go",
  "what is defaultPrompt").
- Should NOT trigger: MCP manifests, package.json — different schemas entirely.
- Sibling conflicts: `plugin-foundry` (DOING registration vs KNOWING the schema —
  "add the entry" routes to foundry, "what's the entry format" routes here);
  `toolkit-change-control` (bump POLICY there, version FIELD location here — the
  seam is noted in both).
- False-positive avoidance: named after the artifacts (plugin.json,
  marketplace.json); trigger phrases are interrogative schema questions.
- Auto-invocation: safe (pure reference).

## toolkit-research-frontier

- Should trigger: "what should we improve next", "toolkit roadmap", "run the health
  campaign", "is X already enforced", proposals to add checks (to verify against the
  assets list before building).
- Should NOT trigger: roadmaps for user projects, external tech research.
- Sibling conflicts: `toolkit-skill-standards` (improving ONE skill's wording vs
  improving the LIBRARY's tooling); `toolkit-debugging-playbook` (fixing a failing
  test now vs deciding what checks to build next).
- False-positive avoidance: description scopes to "improvement work on
  jabworks/agentic-toolkit itself".
- Auto-invocation: safe.

## Cross-library seams verified in the evals

- toolkit-change-control ↔ condux preflight/finalize: "done?" in the publish domain
  vs the dev-task domain (both eval files carry the opposing cases).
- toolkit-debugging-playbook ↔ condux root-cause-analysis: toolkit artifact vs
  project code.
- toolkit-skill-standards ↔ adapting-skills ↔ plugin-foundry: content bar vs
  stack adaptation vs mechanics — each names the others.
- All 7 descriptions lead with "Use when … jabworks/agentic-toolkit" scoping, which
  is the main guard against leaking into general dev-task trigger space.

## Known residual risks (carried to the uncertainty register)

- "is manifest parity enforced now" could defensibly route to plugin-reference or
  frontier (eval says frontier — assets/openness questions live there).
- "make this skill trigger better" (standards) vs "skill isn't triggering" (playbook)
  differ only in problem-vs-improvement framing; a weaker model may swap them. Both
  routes lead to cross-references, so the cost of a miss is one hop.
- No eval has been executed against a real model yet (campaign phase A3 — open).

## Post-review adjustments (fixer pass, same day)

- "explain the two install channels" relabeled orientation → plugin-reference (the
  stronger textual owner; orientation covers channels only at tree level).
- archaeology gained a cross-repo negative + a change-control collision case;
  frontier gained a cross-repo negative + an archaeology collision case, and two
  skill-internal-vocabulary queries ("front A", "phase A3") were replaced with
  natural phrasing.
- change-control's description now leads with "am I done shipping this skill/plugin"
  to disambiguate from condux preflight's bare "am I done?".

Last generated: 2026-07-08
