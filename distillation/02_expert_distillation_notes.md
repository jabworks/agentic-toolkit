# 02 — Expert distillation notes

Inputs: Phase 1 capability map (distillation/01), direct manifest sweeps this session,
git archaeology at HEAD 0b88ab2. Everything here is grounded in a file, command output,
or commit hash from THIS repo; items that could not be evidenced say so.

## 1. Expert heuristics

- **Trigger contract = description + `when_to_use`, together.** 14/20 skills carry
  trigger conditions in `when_to_use`, not the description (owner-ratified 2026-07-08).
  Before judging "this description doesn't say when to trigger," read both fields.
  Only when description is the *sole* trigger field must it start with "Use when…".
- **If `skills/<name>` and its dist target differ by anything, treat it as a shipped
  bug.** Resync with `bash scripts/sync.sh <name>`; verify with `node --test`
  (tests/dist-mirror.test.mjs). Never hand-patch `dist/` skill trees. (The one thing
  legitimately edited under `dist/` is the pair of plugin.json manifests — they have no
  `skills/` source.)
- **A SKILL.md outgrowing a single scan moves material into `references/`** — never trim
  content that's actually needed. Every condux skill already follows this shape.
- **New skill trigger overlapping an existing one → merge or sharply disambiguate.**
  Check against all 20 existing descriptions AND their when_to_use fields. Known hot
  zones: subagent-deployment↔subagent-execution ("named agents"), plan-review↔
  spec-browser ("spec directory"), preflight↔finalize ("am I done"/quality gate).
- **Budgets before prose**: description ≤ 500 chars, frontmatter ≤ 1024 chars
  (enforced: tests/skill-invariants.test.mjs). Current headroom is real —
  test-first-development sits at fm 503/1024, the largest is spec-browser at 624.
- **Bundle skills respect their router.** condux members route through /workflow's
  tiers rather than inviting standalone bypass; any new bundle documents its own entry
  contract the same way.
- **Version bumps live in the paired plugin.json manifests, not marketplace.json.**
  Marketplace entries carry no version field (verified: all 8 entries). Bump BOTH
  manifests on any plugin content change — a stale installed cache is only invalidated
  by a version bump (commit a4f4aa8).
- **Read skills from `skills/<name>/SKILL.md`, never the installed/plugin cache.**
  The cache lags the repo (a4f4aa8: Codex served a pre-fix 1.3.4 after 1.3.4 shipped).
- **Re-verify inventory claims immediately before acting on them.** This repo changes
  under long sessions: commit 0b88ab2 renamed two skills *mid-audit* today, invalidating
  a finding made two hours earlier. `git log -1` + `git status` before editing.
- **An absent result from a compressed/multi-target listing is not evidence of
  absence.** A multi-path `find` this session silently dropped `docs/plans/` (11 files)
  from its output. Confirm surprising absences with a single-target command.
- **Commits (when asked): `feat:`/`fix:`/`chore:` prefix, `-s` signoff, no
  Co-Authored-By.** Only commit when the user asks.

## 2. Red-flag patterns

| Phrase / situation | What must be checked before trusting it |
|---|---|
| "should work" | Run the actual gate: `node --test` (and `node --check` for JS refs). |
| "basically the same as an existing skill" | Diff description + when_to_use against the named sibling; state the one discriminating trigger, or merge. |
| "just copy the other skill's structure" | Which one? condux-nested (`dist/plugins/condux/skills/condux/<n>/`) and standalone (`dist/plugins/<n>/skills/<n>/`) mirror to different places. |
| "quick skill" / "temporary skill" | No such tier exists. Full pipeline (scaffold→manifests→marketplace→sync→test) or don't ship. |
| "I'll sync dist later" | Sync is one command, and the auto-sync pre-commit hook is developer-local — on a fresh clone it does not exist. Run `bash scripts/sync.sh` now. |
| "skip the marketplace entry for now" | 66a71eb: technical-spec shipped unregistered and needed a follow-up commit. Registration is part of "done." |
| "close enough to the naming convention" | kebab-case + dir==frontmatter-name are test-enforced; run `node --test tests/skill-invariants.test.mjs`. |
| "the description is fine as-is" | Check budgets, trigger contract (description or when_to_use), and the collision hot zones above. |
| "dist looks fine, didn't diff it" | `node --test tests/dist-mirror.test.mjs` — byte parity, not eyeballs. |
| "verified" (no command shown) | Not verified. Show command + output or downgrade the claim. |
| "CLAUDE.md/README says so" | Docs lag disk by hours here (0b88ab2 day: three docs updated in-commit, one — README:138 validate.sh — stale since eb2b5b5). Disk wins. |
| "the installed plugin behaves differently than the repo copy" | Stale plugin cache. Bump version in both manifests and reinstall (a4f4aa8). |
| "both manifests are the same, I only edited one" | 7/8 plugin pairs disagreed on `skills` path form until this mission; ba69d2b fixed displayName asymmetrically. Diff the pair. |

## 3. Decision trees

### Is this new skill ready to ship?

```text
1. Does an existing skill already cover this trigger space (check description AND
   when_to_use of all 20+)? → yes: extend/merge, stop.
2. Frontmatter: name kebab-case == dir name; description ≤500; total ≤1024;
   trigger contract present ("Use when…" or when_to_use)? → no: fix first.
3. Long material in references/, SKILL.md scannable? → no: restructure.
4. Dist target scaffolded, then `bash scripts/sync.sh <name>` run,
   `node --test` green (dist-mirror proves byte parity)? → no: not shipped.
5. Both .claude-plugin/plugin.json AND .codex-plugin/plugin.json present, valid
   (jq .), pair-consistent (name/version/skills)? → no: not shipped.
6. Registered in .claude-plugin/marketplace.json with a resolving ./dist/plugins/…
   source? → no: not shipped (66a71eb).
7. Description leads with trigger terms a user would actually type? → no: rewrite.
8. Committing? feat:/fix:/chore: + -s, no Co-Authored-By — and only if asked.
```

### Where does a new skill live?

```text
Dev-workflow tier skill (routed by /workflow)        → condux bundle
Toolkit-maintenance / meta skill (this repo itself)  → toolkit-ops bundle (new)
General-purpose, independently installable           → standalone plugin
In all cases: source in skills/<name>/, mirror per bundle nesting.
```

### Which file do I edit for X?

```text
Skill behavior/content        → skills/<name>/** then sync
Plugin metadata/version       → BOTH dist/plugins/<p>/.{claude,codex}-plugin/plugin.json
Marketplace listing           → .claude-plugin/marketplace.json (no version field here)
Claude hook wiring (condux)   → convention: hooks/hooks.json (no manifest field)
Codex hook wiring (condux)    → manifest `hooks` field + hooks/codex-hooks.json (95425c8)
```

## 4. Historical lessons (git-evidenced only)

| Symptom | Wrong path | Root cause | Evidence | Current doctrine / where encoded |
|---|---|---|---|---|
| condux agents stale after edits | "sync ran, we're fine" | sync.sh never copied plugin-level `agents/` | 6ba6572 | sync.sh special-case + dedicated invariant test |
| Recurring mirror drift | hand `cp -r` per change | no automation | a35a433 | scripts/sync.sh + (local) pre-commit hook + dist-mirror test |
| Skill failed to parse | — | unquoted YAML description | a13e094 | quote YAML strings; budgets test catches absence, not YAML validity (gap noted §5) |
| Wrong displayName shipped | fixed one manifest, then the other | manifests edited asymmetrically | ba69d2b | edit the pair together; parity test added this mission |
| Plugin invisible in marketplace | "authored = shipped" | registration forgotten | 66a71eb | registration in ship checklist (plugin-foundry + decision tree above) |
| macOS grep breakage + premature path change | ship first, portability later | GNU-only `grep -P`; unvalidated monorepo layout | dc1e221 | portable tools (sed); revert fast when a change outruns its design |
| Fix shipped but users still see bug | debug the "broken" fix | stale plugin cache served old version | a4f4aa8 | version-bump-to-invalidate; never trust installed copy as source |
| Invariants known but unenforced | rely on discipline | no tests | eb2b5b5 (tests arrived 2026-07, after all of the above) | node --test in CI (ci.yml) |

No evidenced incident found for: a marketplace entry pointing at a deleted path, or a
skill shipped with frontmatter over budget. Saying so per the no-fabrication rule.

## 5. Missing expert checks (state before this mission → action)

1. **Manifest pair parity** — nothing compares a plugin's two manifests. Live damage:
   5 Claude manifests lack `interface` (condux, git-commit, git-operations,
   session-report, spec-browser — verified by grep -L this session); 7/8 pairs disagree
   on `skills` path form (verified by jq sweep); session-report's two descriptions list
   different feature sets. → **Action this mission**: normalize, then add
   `tests/manifest-parity.test.mjs` (new file).
2. **Trigger-collision detection** — not mechanically checkable today. → **Action**:
   collision review encoded in skill-authoring standards + per-skill trigger evals
   (Phase 4) + trigger matrix (distillation/03). Candidate future automation noted in
   research-frontier skill.
3. **Sync automation on fresh clones** — the pre-commit hook lives only in `.git/hooks/`
   (374B, unversioned); plugin-foundry claims "the pre-commit hook syncs automatically"
   unconditionally. → **Action**: add versioned `scripts/install-hooks.sh`, correct
   plugin-foundry's claim.
4. **Multi-bundle sync** — scripts/sync.sh and tests/dist-mirror.test.mjs hardcode
   condux as the only bundle; a second bundle's skills would be silently SKIPped by both
   (verified by reading both files). → **Action**: generalize both to any
   `dist/plugins/<p>/skills/<p>/<name>` bundle (required by the approved toolkit-ops
   packaging).
5. **YAML validity of frontmatter** — the invariant test regex-parses fields and would
   not catch a13e094-class quoting bugs. → **Flagged** in research-frontier (a real YAML
   parse would need a dep or a stricter hand parser; not added this mission).
6. **Docs catalog completeness** — no check that every marketplace plugin appears in
   README/CLAUDE.md. → **Action**: fix the current gaps (authorized); automation left
   as a frontier item.

Last generated: 2026-07-08 (HEAD 0b88ab2)
