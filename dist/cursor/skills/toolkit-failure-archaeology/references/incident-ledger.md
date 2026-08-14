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
Doctrine:     a single centralized plan dir stands (per-package is settled-no);
              portable tools only (sed over grep -P). The dir has since moved
              docs/plans/ → .condux/plans/ — centralization is the doctrine, the
              path is not.
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

## Checkpoint menu eroded at runtime while the SKILL.md stayed correct

Symptom:      post-planning approval prompts increasingly omitted the two
              subagent options; workflow's CP-1 table on disk listed all five
              rows the whole time. Owner noticed the drift before any audit
              did (2026-08-04).
Wrong path:   none pursued, but the same-day 30-skill re-eval — static content
              review + transcript mining for trigger defects — walked straight
              past it: the content was correct and the skill *did* fire.
Root cause:   draft-plan's sign-off step defined no option list, so when its
              prompt doubled as the what-next menu the option set was
              improvised — and implement-yourself-by-default biased the
              improvisation toward dropping the subagent rows. A merged
              sign-off/CP-1 prompt meant CP-1's defined menu never rendered.
Evidence:     2cc080d ("CP-1 must always present the full menu"); the
              2026-08-04 re-eval report (35 findings, zero about this).
Doctrine:     a prescribed menu is contract, not suggestion — mark option sets
              exhaustive and defend them against doctrine bias on BOTH sides
              of any prompt-merging seam. Audits must check contract
              adherence in transcripts, not just content and firing.
Encoded in:   workflow CP-1 "the menu is the full menu" + red-flags row;
              draft-plan step 4; toolkit-skill-standards procedure step 7;
              toolkit-debugging-playbook symptom row; health-campaign Front E.

## Mechanism declared dead after checking the wrong output location

Symptom:      transcript-mining audit reported "concord capture inert: ~46
              codex rollouts, one 304-byte manual note" — an ERROR-severity
              finding that led the maintenance queue (2026-08-04).
Wrong path:   the finding itself. The miner (and the re-eval before it)
              checked only ~/.codex/concord/ — concord's GLOBAL tier, which
              holds manual notes by design.
Root cause:   per-repo capture writes to <git-root>/.concord/ in each
              project; all three codex-active projects had live, healthy
              stores (syncs minutes old, tier promotions logged). Measurement
              looked where the auditor assumed output lived, not where the
              skill's own paths contract says it lives.
Evidence:     4ba3ac6 (the diagnosis commit — its real payload is the
              codex-exec session_id fallback found WHILE disproving the
              finding); skills/remember/lib/paths.mjs (the contract).
Doctrine:     verify the negative — before declaring a mechanism dead, read
              its contract for where output should live and look there.
              "Nothing at X" indicts nothing unless X is the write target.
Encoded in:   health-campaign Front E measurement rule; this entry.

## Fourth frontmatter break — the anti-footgun was the footgun (2026-08-05)

Symptom:      Codex refused to load condux 2.9.1: "invalid YAML: did not find
              expected key at line 3 column 299" on code-review's SKILL.md.
              Claude Code loaded the same file without complaint.
Wrong path:   reading it as a one-off typo and just fixing the file. It is the
              FOURTH instance of the class (cff6133 → a13e094 → d754c63 → this)
              and the SECOND in code-review specifically.
Root cause:   `when_to_use` was a single-quoted scalar containing bare
              apostrophes ("that's plan-review"). YAML needs `''` inside single
              quotes, so the first apostrophe closed the scalar. The value was
              quoted BECAUSE of a13e094's doctrine ("quote YAML strings") — the
              rule meant to prevent this class produced this instance. The
              reported "line 3" is the 3rd line of the frontmatter body; Codex
              counts from after the opening `---`.
Why every guard missed it, individually:
              - tests/manifest-parity.test.mjs skipped quoted values outright:
                `if (/^['"]/.test(value)) continue; // quoted — safe`. False.
              - skill-invariants.test.mjs measures budgets; it never parses.
              - scripts/validate-plugins.sh is NOT a YAML oracle (see the
                correction below) and exits 0 when the claude CLI is absent.
              - ci.yml's release-dry-run was continue-on-error anyway.
              - the gap was documented as open for ~7 weeks (a13e094's entry,
                toolkit-research-frontier open problem 2) and deferred.
Evidence:     cff6133, a13e094, d754c63 (the prior three); this fix commit.
Doctrine:     "quote it" is not a rule a human can apply reliably — narrow the
              GRAMMAR instead. Frontmatter is `key: value` only; values are
              plain-when-safe or double-quoted JSON; single quotes are banned
              outright. And: a documented open gap in a class that has already
              shipped twice is not a backlog item, it is an incident waiting on
              a date.
Encoded in:   scripts/check-frontmatter.mjs (+ `--fix`), gating node --test,
              scripts/sync.sh (before AND after the build) and the pre-commit
              hook; tests/frontmatter-canonical.test.mjs (all four historical
              breaks as fixtures); tests/frontmatter-yaml.test.mjs (strict
              `yaml` parse, FAILS rather than skips when the dep is missing);
              toolkit-skill-standards procedure step 3.

## Correction (2026-08-05) to "Unquoted YAML description" and "Publish-surface dry-run caught silent frontmatter death"

Both entries above credit `scripts/validate-plugins.sh` / `claude plugin
validate` as "the real YAML oracle." That is false, and believing it is part of
why the 2026-08-05 break shipped. Verified 2026-08-05 by reintroducing the
break into a scratch copy of dist/plugins/condux and running the validator:
it printed "✔ Validation passed". It validates plugin.json; Claude's own
frontmatter parser is lenient, so it cannot detect frontmatter that only a
strict parser (Codex) rejects.

The real oracles are tests/frontmatter-canonical.test.mjs and
tests/frontmatter-yaml.test.mjs. Per the append-only rule the entries above are
left as written.

## `--target` stranded six releases the tag push had already created (2026-08-06)

Symptom:      seeding the new plugin release channel pushed all 12 tags, then
              failed to create 6 of the 12 GitHub releases: `! Failed to create
              release, "workflow" scope may be required`. Re-running created
              nothing — the tool read an existing tag as a finished release.
Wrong path:   taking gh's hint literally and refreshing the token with the
              `workflow` scope. The token needed no new scope: the same
              `gh release create`, same tag, same commit, succeeds with
              `--target` omitted (verified by running both forms back to back).
Root cause:   two defects. `--target <sha>` makes GitHub re-point the tag ref,
              and a token without `workflow` may not create or update a ref
              whose commit touches `.github/workflows/` — 627d95ff does, which
              is why exactly the older-commit releases failed. The flag was
              redundant from the start: the script pushes the tag first, so the
              tag already names the commit. Second, `tagged` was treated as
              `released` although they are two calls and the second can fail
              alone, which made the failure unrecoverable by re-running.
Evidence:     a1a5929 (introduced), 7435f09 → a28606f (fix + tests). The same
              merge's workflow run 31076910513 failed before any of this, at
              `actions/setup-node`: `package-manager-cache` defaults to true
              and looked for pnpm in a job that installs no dependencies —
              the trap ci.yml already documents on its release-dry-run job.
Doctrine:     never pass a flag that re-points a ref you have already pushed.
              And: when an operation is two calls, the first one's completion
              is not evidence about the second — track them separately, or the
              partial failure has no recovery path.
Encoded in:   scripts/release-plugins.mjs (no `--target`; `--repair` selects
              tags whose release is missing); tests/release-plugins.test.mjs
              (asserts `--target` never returns, drives a fake gh via
              RELEASE_PLUGINS_GH); .github/workflows/plugin-release.yml
              (`package-manager-cache: false`); skills/release/SKILL.md.

---

Categories with NO evidenced incident as of 2026-07-08 (stated per the no-fabrication
rule): a marketplace entry pointing at a deleted path; a skill shipped with frontmatter
over budget; a lost/overwritten skill file.
