# Incident ledger — jabworks/agentic-toolkit

Evidence rule: every entry cites commit hashes from this repo. Append new entries at
the bottom; never rewrite or delete existing ones — append corrections instead.

Entry template:

```text
## <short name> (<date if known>)
Symptom:      what was observed
Wrong path:   what a reasonable person tried first (if known)
Root cause:   what it actually was
Evidence:     commit hash(es)
Doctrine:     the rule this produced
Encoded in:   which test/skill/doc now prevents recurrence
```

---

## Hand-sync drift era (pre-automation)

Symptom:      `dist/plugins/` repeatedly diverged from `skills/` between releases.
Wrong path:   remembering to `cp -r` by hand after every edit.
Root cause:   manual mirroring with no enforcement.
Evidence:     a35a433 ("automate skills→dist sync with scripts/sync.sh and pre-commit hook").
Doctrine:     dist/ is generated; sync is scripted; drift is test-enforced, not remembered.
Encoded in:   scripts/sync.sh, tests/dist-mirror.test.mjs, local pre-commit hook
              (install via scripts/install-hooks.sh — NOT present on fresh clones).

## condux plugin-level agents/ blind spot

Symptom:      edited agent definitions didn't take effect for installed condux users.
Wrong path:   "sync ran cleanly, so everything shipped."
Root cause:   sync.sh mirrored skill trees only; the plugin-level
              dist/plugins/condux/agents/ dir (which the host tool actually loads)
              was never copied, so it silently served stale agent defs.
Evidence:     6ba6572 ("fix(sync): mirror plugin-level condux agents/ dir").
Doctrine:     "skills synced" ≠ "everything synced" — every out-of-tree mirror target
              needs its own sync step AND its own test.
Encoded in:   sync.sh special case for subagent-execution/agents;
              tests/skill-invariants.test.mjs (agents-mirror test).

## Unquoted YAML description

Symptom:      systematic-debugging skill misbehaved on load.
Root cause:   YAML `description` containing special characters was unquoted.
Evidence:     a13e094 ("quote YAML description in systematic-debugging skill, v1.3.1").
Doctrine:     quote YAML strings; a broken frontmatter is a broken skill.
Encoded in:   toolkit-skill-standards procedure step 2. NOTE: the invariant test
              regex-parses frontmatter and would NOT catch this class — open gap,
              tracked in toolkit-research-frontier.

## Asymmetric manifest edit

Symptom:      wrong displayName shipped in technical-spec's manifests.
Root cause:   the two plugin.json files were edited separately and unevenly.
Evidence:     ba69d2b ("update displayName in plugin manifests").
Doctrine:     the manifests are a PAIR — edit together, keep name/version/skills
              identical.
Encoded in:   tests/manifest-parity.test.mjs (added 2026-07-08),
              plugin-foundry Common Mistakes table.

## Missed marketplace registration

Symptom:      technical-spec plugin existed on disk but couldn't be installed.
Root cause:   authoring finished without adding the marketplace.json entry.
Evidence:     66a71eb ("register technical-spec in marketplace") — a retrofit commit.
Doctrine:     registration is part of "done," not a follow-up.
Encoded in:   plugin-foundry step 4; toolkit-change-control publish checklist;
              tests/skill-invariants.test.mjs (marketplace paths resolve).

## Monorepo plan-path revert + GNU grep portability

Symptom:      per-package plan saving broke expectations; `grep -oP` failed on macOS.
Wrong path:   shipping the layout change before validating it across environments.
Root cause:   premature design + GNU-only flag (BSD grep has no -P).
Evidence:     b782719 (the change) → dc1e221 (the same-day revert + sed replacement).
Doctrine:     centralized docs/plans/ stands; portable tools only (sed over grep -P).
Encoded in:   this ledger ("do not re-fight"); dc1e221 itself as precedent.

## Stale plugin cache served a fixed bug

Symptom:      users still hit a bug that was already fixed in the repo.
Wrong path:   debugging the "broken" fix.
Root cause:   Codex plugin cache still held pre-fix 1.3.4; caches refresh only on a
              version change.
Evidence:     a4f4aa8 ("re-release as 1.3.5 — 1.3.4 cache was stale");
              related 063ae88 (tmp-file collision prefix).
Doctrine:     bump version on ANY shipped content change; never treat the installed
              copy as source of truth.
Encoded in:   plugin-foundry Version Bump section; toolkit-debugging-playbook
              symptom table.

## Absorbed plugin: technical-spec standalone → condux bundle

Symptom:      (not a failure — a settled restructuring recorded to prevent confusion)
              no dist/plugins/technical-spec exists despite skills/technical-spec.
Evidence:     b63f01b ("absorb technical-spec into condux bundle, v1.5.0");
              4c3df61 (doc correction reaffirming the boundary).
Doctrine:     a skill's dist target can move between standalone and bundle; the
              skills/ source stays put; sync auto-detects the target.
Encoded in:   scripts/sync.sh target detection; toolkit-orientation procedure step 2.

## Mid-session rename invalidated fresh audit findings

Symptom:      an audit finding ("CLAUDE.md contradicts disk") became wrong within
              hours — the doc edit was the leading edge of an in-flight rename.
Root cause:   test-first → test-first-development and root-cause-debugging →
              root-cause-analysis renamed while an audit session was running.
Evidence:     0b88ab2 ("rename skills → root-cause-analysis + test-first-development",
              2026-07-08); prior rename wave a605be9 (v2.0.0).
Doctrine:     re-verify inventory claims immediately before acting; `git log -1` +
              `git status` before every edit batch in long sessions.
Encoded in:   toolkit-orientation (docs trust order),
              distillation/02_expert_distillation_notes.md (audit trail).

## Test suite popped browser windows on every run

Symptom:      Chrome kept opening with http://127.0.0.1:<random-port> during
              normal repo work on WSL (Windows-side popups, invisible to
              Linux process checks).
Wrong path:   first blamed headless eval judge sessions loading the user's
              chrome-devtools-mcp plugin — plausible, partially isolated
              (c277174), but the popups recurred after that fix.
Root cause:   plan-review's annotate-server.js unconditionally exec'd
              xdg-open on startup, and tests/annotate-server.test.mjs spawns
              the server twice per `node --test` — two popups per suite run,
              ~15 runs that day.
Evidence:     ac3fe76 ("plan-review server gains --no-open"); c277174 (the
              earlier partial/mistaken attribution, itself a valid judge
              isolation fix).
Doctrine:     servers spawned by tests must never open UI — any auto-open
              behavior needs an off switch, and the test suite uses it.
              Also: on WSL, verify side effects on the WINDOWS side too;
              Linux ps cannot see interop-launched processes.
Encoded in:   annotate-server.js --no-open flag; both test spawn sites pass
              it; plan-review SKILL.md documents it for headless/CI use.

## Publish-surface dry-run caught silent frontmatter death on day one

Symptom:      session-handoff had been shipping with EMPTY metadata — its
              frontmatter failed YAML parsing, so hosts silently dropped every
              field (description, when_to_use, all triggering). Invisible to
              the regex-based tests, which happily extracted the fields.
Wrong path:   none — scripts/validate-plugins.sh flagged it on its very first
              local run (the C4 dry-run built 2026-07-09).
Root cause:   unquoted when_to_use containing 'Trigger phrases: "…"' — ": " is
              illegal inside a YAML plain scalar. Same class as a13e094.
Evidence:     the 2026-07-09 C4 commit (fix + red-green test); precedent a13e094.
Doctrine:     quote any frontmatter value containing ": "; the official
              validator is the real YAML oracle — regex tests are not.
Encoded in:   tests/manifest-parity.test.mjs (unquoted-colon check, red-green
              proven); scripts/validate-plugins.sh + ci.yml release-dry-run.

---

Categories with NO evidenced incident as of 2026-07-08 (stated per the no-fabrication
rule): a marketplace entry pointing at a deleted path; a skill shipped with frontmatter
over budget; a lost/overwritten skill file.
