# 01 — Repo capability map

Evidence basis: direct reads + `node --test` runs on 2026-07-08 at HEAD `0b88ab2`, plus a
read-only audit sweep (frontmatter measurements, manifest diffs, git archaeology). Facts
below are labeled **observed** (verified directly this session) unless marked otherwise.

## 1. Project purpose — confirmed

Personal agentic toolkit (`jabworks/agentic-toolkit`) shipping skills for Claude Code +
Codex (and 40+ agents via `npx skills add`). Two distribution channels read two trees:
`npx skills add` installs from top-level `skills/`; the plugin marketplace
(`/plugin install …@jabworks-agentic-toolkit`) installs from `dist/` via
`.claude-plugin/marketplace.json`. Confirmed against README.md and on-disk layout.

## 2. Main subsystems — observed

- `skills/<name>/` — 20 skill sources, all with SKILL.md (no empty scaffolds anywhere;
  `find -type d -empty` clean in both trees).
- `dist/plugins/<name>/` — 8 plugins, each with BOTH `.claude-plugin/plugin.json` and
  `.codex-plugin/plugin.json`:
  adapting-skills 1.2.0, condux 2.0.0, git-commit 1.0.0, git-operations 1.0.0,
  plugin-foundry 1.2.0, session-handoff 1.5.0, session-report 1.4.1, spec-browser 1.0.0.
  (Versions live in plugin.json — marketplace.json entries carry NO version field.)
- condux bundle: `dist/plugins/condux/` = `.claude-plugin/`, `.codex-plugin/`, `agents/`
  (4 agent defs, canonical source `skills/subagent-execution/agents/`), `hooks/`
  (`hooks.json` + `codex-hooks.json`), `skills/condux/<name>/` (13 bundled skills).
- `.claude-plugin/marketplace.json` — 8 entries, every `source` resolves; per-entry
  fields actually used: `name`, `description`, `author`, `source`, `category`.
- `.claude/` at repo root — contains only `settings.local.json`. **`.claude/skills/`
  does not exist** (the directive's premise that it holds installed third-party skills
  is not current reality; the write-ban on it still holds trivially).
- `docs/plans/` — 11 design/plan docs (2026-07-01 … 2026-07-04). Root `PLAN.md` is the
  old plan-review design doc (superseded by the shipped skill; candidate for archiving
  into docs/plans/ — root is read-only for this mission, so flagged only).
- `spec/skills-spec.md` — 83-byte pointer stub to <https://agentskills.io/specification>.

## 3. Verification commands actually available — observed, run this session

- `node --test` — 11 tests, all passing at HEAD (run twice this session, incl. after
  the rename commit). Files: `tests/dist-mirror.test.mjs` (1: byte-parity of every skill
  with a dist target, condux-nesting aware), `tests/skill-invariants.test.mjs` (4:
  frontmatter budgets desc≤500/fm≤1024, kebab-case name == dir name, marketplace +
  plugin.json paths resolve, condux plugin-level `agents/` mirror, plan-review template
  no-egress), `tests/plugin-manifests.test.mjs` (2: plugin.json required fields +
  `./`-prefixed skills path; marketplace.json required fields), `tests/scaffold.test.mjs`
  (2: technical-spec scaffold.sh behavior), `tests/annotate-server.test.mjs` (2:
  plan-review server manual + directory modes).
- `bash scripts/sync.sh [name]` — mirrors `skills/` → dist target; auto-detects condux
  vs standalone; SKIPs skills with no dist target; special-cases
  `subagent-execution/agents` → `dist/plugins/condux/agents`.
- CI (`.github/workflows/ci.yml`): `node --check` on every `skills/**/*.js` +
  `node --test`, on push to main and all PRs. **`node --test` IS automated in CI.**
- `.git/hooks/pre-commit` (374B, developer-local, NOT version-controlled): runs
  `bash scripts/sync.sh` then `git add dist/`. A fresh clone does not have it — CI is
  the only universal drift net.
- Manual spot-checks: `jq . <manifest>`, `diff -r skills/<name>
  dist/plugins/<name>/skills/<name>` (or the condux-nested path).
- The invariant test does **NOT** enforce the "starts with Use when..." rule (only
  budgets + name shape) — deliberate or gap, needs owner ruling (see §7).

## 4. Skill-authoring workflow — verified against skills/plugin-foundry/SKILL.md

Canonical sequence (confirmed real): scaffold both trees → write SKILL.md → write both
plugin manifests → register in marketplace.json → `bash scripts/sync.sh <name>` →
commit (`feat:`/`fix:`/`chore:`, `-s`, no Co-Authored-By).

**Defects found IN plugin-foundry itself (fix targets for Phase 3):**

1. Its marketplace-entry template shows `strict` and `skills` and `keywords` fields and
   omits `author` — the real marketplace.json entries use exactly
   `name/description/author/source/category`. Template does not match reality.
2. Its "Version Bump" section says update `version` in `.claude-plugin/marketplace.json`
   — no marketplace entry carries a version; versions live in the paired plugin.json
   manifests (and per the owner's standing rule, bump on any plugin content change).
3. Step numbering jumps 3 → 5 (no step 4).
4. The checklist omits the `node --test` gate that CLAUDE.md mandates before commit.
5. It claims "the pre-commit hook syncs automatically" without noting the hook is
   developer-local; on a fresh clone that safety net silently doesn't exist.

## 5. condux bundle — verified (disk-confirmed tiering at HEAD 0b88ab2)

13 bundled skills: workflow (tier router), discovery, draft-plan,
test-first-development, subagent-deployment, subagent-execution, finalize, code-review,
preflight, root-cause-analysis, plan-review, technical-spec, using-condux.
NOTE: `test-first` → `test-first-development` and `root-cause-debugging` →
`root-cause-analysis` were renamed **mid-session** in commit 0b88ab2 (2026-07-08);
CLAUDE.md + README rows were updated in the same change. Disk, docs, and tests agree
at HEAD. condux differs from single-purpose plugins: one marketplace entry, skills
nest at `dist/plugins/condux/skills/condux/<name>/`, plugin-level `agents/` + `hooks/`,
and new members must respect /workflow's tiered routing rather than standalone bypass.

## 6. Critical docs of record — observed

README.md (public install/catalog), CLAUDE.md (session guidance + invariants),
skills/plugin-foundry/SKILL.md (authoring runbook), skills/using-condux/SKILL.md
(workflow philosophy), tests/ (executable doctrine — the invariants CLAUDE.md cites).

## 7. Known stale docs / contradictions — observed

- **README.md:138** — claims "`scripts/validate.sh` (run in CI) fails if it drifts";
  `scripts/validate.sh` does not exist anywhere; CI runs `node --check` + `node --test`.
- **README.md skill tables** — missing spec-browser, git-commit, git-operations
  (3 of 8 marketplace plugins undocumented in the catalog README).
- **CLAUDE.md skills table** — same three missing; also spec-browser absent from the
  condux row's skill list (correct — it's standalone — but it appears nowhere).
- **CLAUDE.md invariant vs practice**: "description … starts with 'Use when…'" — 14/20
  skills don't; condux-style skills carry trigger conditions in a separate
  `when_to_use` frontmatter field instead, and the invariant test deliberately skips
  the prefix check. Doctrine mismatch needing an owner ruling (question for Hiếu).
- **plugin-foundry SKILL.md** — teaches a marketplace schema + version-bump location
  that don't match reality (§4). Highest-leverage doc defect: it's the authoring
  runbook every new skill flows through.
- **Manifest parity**: all 8 codex manifests carry `interface`; only 4 claude manifests
  do (missing on condux, git-commit, git-operations, session-report). session-report's
  two manifests describe different feature lists. condux codex manifest carries `hooks`
  while claude relies on convention discovery of `hooks/hooks.json` (by design —
  commit 95425c8 — not a bug, but undocumented anywhere).
- README.md and CLAUDE.md are **read-only** for this mission — their defects are
  flagged here + in the uncertainty register, not fixed.

## 8. Known failure modes — from git history (real, evidenced)

- Mirror blind spot: `6ba6572` — sync.sh never copied condux plugin-level `agents/`;
  agent edits silently shipped stale. Now guarded by a dedicated invariant test.
- Hand-sync drift era ended by `a35a433` — sync.sh + local pre-commit hook created
  specifically because manual `cp -r` mirroring kept drifting.
- YAML frontmatter breakage: `a13e094` — unquoted `description` broke parsing; fix
  quoted it and bumped the plugin version.
- Manifest field error: `ba69d2b` — wrong `displayName` fixed asymmetrically across the
  two manifests (early parity wobble).
- Missed marketplace registration: `66a71eb` — technical-spec existed but wasn't
  registered; later absorbed into condux (`b63f01b`), which is why no standalone
  technical-spec plugin exists today.
- Premature change reverted: `dc1e221` — write-plan monorepo path change rolled back;
  also fixed `grep -P` (GNU-only) → `sed` for macOS portability.
- Stale plugin cache: `a4f4aa8` — Codex served a stale 1.3.4; forced re-release as
  1.3.5. Doctrine: version-bump to invalidate caches; "installed copy" ≠ "repo copy".
- Invariants codified late: `eb2b5b5` — tests added 2026-07 after the above incidents.

## 9. Current highest-risk live problems — assessed from §3–§8

1. **plugin-foundry teaches wrong schema** — every future skill inherits its errors.
2. **Cross-agent manifest parity unenforced** — no test compares the paired manifests;
   4/8 claude manifests already missing `interface`; session-report descriptions
   diverged. (Whether claude-side `interface` is even meaningful needs confirmation.)
3. **Trigger-space collisions ungoverned** — strongest: subagent-deployment vs
   subagent-execution; also plan-review vs spec-browser ("spec directory" space),
   preflight vs finalize ("am I done"/quality-gate space). No collision check exists.
4. **Zero trigger evals** — no `evals/` anywhere; triggering quality is unmeasured.
5. **"Use when" doctrine mismatch** (§7) — the stated invariant is 30% true in practice.
6. **Local-only pre-commit sync hook** — fresh clones lack the auto-sync; CI catches
   drift only after push; plugin-foundry overstates the safety net.
7. **README/CLAUDE.md catalog staleness** — 3 shipped plugins invisible in docs.

## 10. Skills the repo clearly needs but doesn't have — candidates

(Consolidation-friendly: each could be a skill or a section — count is Hiếu's call.)

- Zero-context repo orientation + architecture contract (two-tree model, manifest
  pairing, condux nesting, what's authoritative vs generated).
- Symptom→triage debugging playbook (skill doesn't trigger / plugin doesn't show up /
  dist looks stale / stale installed cache — grounded in §8 incidents).
- Publish-readiness gate ("shipped" = source + mirror byte-identical + both manifests
  + marketplace entry + `node --test` green + committed with house style).
- Failure archaeology (the §8 incident ledger, kept in references/).
- Claude↔Codex plugin/manifest reference (field-by-field, hooks wiring, `interface`
  semantics, cache-bust-by-version-bump).
- Skill-authoring standards (description/trigger craft, `when_to_use` convention,
  progressive disclosure, collision avoidance) — the taste layer plugin-foundry lacks.
- Docs-of-record maintenance (append corrections, catalog rows for new plugins).
- Research frontier + hardest-problem campaign (per directive, shaped by Hiếu's answers).

## 11. Premature or redundant skill ideas — do NOT build

- Any re-statement of scaffold/register/sync mechanics → plugin-foundry owns it;
  cross-reference only.
- A manual dist-diff "verification skill" that re-derives what `node --test` already
  enforces → encode "run node --test" instead.
- A separate skill-lifecycle/versioning skill forked from plugin-foundry's version
  table → extend plugin-foundry in place.
- Anything overlapping adapting-skills' "adapt external template to Harvey's stack"
  trigger space → disambiguate explicitly or extend it.
- A new "sync my skills" skill — sync.sh + tests + plugin-foundry cover it.

## 12. Questions the repo cannot answer — for Hiếu

1. Hardest live maintenance problem right now (candidates in §9 — which bites most?).
2. Target shape: full 12–18 new skills per directive, or consolidated fewer/denser?
3. Packaging: new meta-skills as one bundled plugin (condux-style), standalone
   plugins, or folded into/around plugin-foundry?
4. "Use when" doctrine: rewrite the 14 non-conforming descriptions, or bless the
   `when_to_use` convention and amend the invariant wording (CLAUDE.md is owner-land)?
5. May this mission touch README.md/CLAUDE.md after all (both have real defects), or
   keep them flag-only per the directive's write scope?

Last generated: 2026-07-08 (HEAD 0b88ab2)
