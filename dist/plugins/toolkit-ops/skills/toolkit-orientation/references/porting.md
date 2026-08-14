# Porting this toolkit's system to a new repo

Scenario: stand up another skill toolkit (e.g. a company fork) using this repo
as the reference implementation. **Path A — fork and re-derive — is the
recommended route** for one or two toolkits; genericizing toolkit-ops into a
parameterized meta-bundle (Path B) only pays off at three or more.

Everything below is sorted by what actually transfers. The one-line summary:
**the machinery and the doctrine port; the facts and the history never do.**

## Layer 1 — Ports verbatim (copy, adjust paths, empty the data)

- `scripts/eval-triggers.mjs` — reads any repo's `skills/*/SKILL.md` +
  `evals/trigger_eval.json`; fully repo-agnostic (judge-model flag, `--runs`
  CI statistics, limit-resilient batching).
- `scripts/collision-scan.mjs` — port the tool AND its lesson: lexical
  scanning was **falsified** as a collision detector here (5% recall vs a
  preregistered ≥80%); detection stays empirical via eval runs. Empty the
  `EMPIRICAL_PAIRS` registry — it is this repo's data.
- `scripts/validate-plugins.sh` — any Claude Code plugin toolkit; re-derive
  the expected-warning contract from the new repo's manifest doctrine.
- `scripts/install-hooks.sh` + the `local-hooks` warn-only test pattern — if
  the new repo has a sync step at all.
- The eval corpus format — `{query, should_trigger, expected_skill, accept?,
  kind?}`, ≥20 queries per skill including should-NOT-trigger negatives and
  sibling-seam cases tested from both sides.
- Test patterns: docs-catalog (registry↔docs consistency), manifest-parity
  (only if manifests ship in pairs), dist-mirror + reverse-orphan (**only if
  the layout is mirrored — a single-tree toolkit skips these entirely, and
  simpler is correct**).
- The **generated-channel pattern**: one build script owns its output trees
  outright (`rm -rf` then rebuild — `build-opencode.mjs` owns three), and its
  drift test re-runs the same transforms in memory and diffs against disk, so
  a stale commit fails CI instead of shipping.
  `scripts/build-opencode.mjs` + `tests/opencode-dist.test.mjs` are the
  reference pair. Port that shape.

  **Amended 2026-08-14 by the Cursor channel** — the first channel added after
  this file was written, and so the only worked test of its advice. The shape
  held verbatim: `build-cursor.mjs` + `cursor-dist.test.mjs` is the same pair
  with a different output dir. But the line "the transform inside it is host
  doctrine to re-derive per host, not code to reuse" was too strong. Cursor's
  needed transform turned out **identical** to OpenCode's (both hosts route on
  `description` alone, so both need `when_to_use` folded in), so the transform
  was extracted — `build-cursor.mjs` imports `transformSkill` and
  `copyTransformed` and owns only its output location. Corrected rule:
  **re-derive the transform as doctrine, then share the implementation when two
  hosts land on the same answer — but keep one output tree per host regardless**,
  so either can diverge later without touching the other
  (`specs/cursor-channel/decisions.md`). Sharing the tree is the coupling that
  bites; sharing the function is not.

## Layer 2 — Ports as doctrine (re-instantiate against the new repo's facts)

- The seven-skill taxonomy: orientation / change-control / skill-standards /
  debugging-playbook / failure-archaeology / plugin-reference /
  research-frontier. Re-derive each; do not copy bodies — a single-tree
  toolkit loses all mirror-discipline content, and that loss is a feature.
- Trigger-contract doctrine: description starts "Use when…" OR a
  `when_to_use` field; description ≤500 chars, frontmatter ≤1024. Scope every
  meta-skill's description to the NEW repo's name — that scoping is the
  anti-collision guard, and it is exactly why this bundle cannot be installed
  elsewhere as-is.
- Publish-checklist shape; version bumps in BOTH manifests on any shipped
  change (installed caches refresh only on version change); pair-parity
  thinking; "docs lag disk — disk wins"; red-flag tables; preregister success
  criteria before building any detector; ledgers are append-only.
- The audit playbook itself (this repo's `distillation/`, phases 0–7):
  capability map → expert notes → author → trigger evals → transfer eval →
  three independent reviews → fixer → uncertainty register. The process is
  fully repo-agnostic and is how this bundle was built.
- Release discipline: no port needed — install the `release` plugin; its
  router (AGENTS.md override → changesets → toolkit → generic GitHub) already
  handles any repo. Cut baseline tags early so future releases diff cleanly.
  If the new toolkit also publishes npm packages, run those on changesets +
  OIDC trusted publishing (this repo's `.github/workflows/release.yml` ports
  near-verbatim) and keep them in a `packages/` workspace — one versioning
  scheme per artifact kind, never one scheme stretched across both.

## Layer 3 — Never ports (start empty, or re-earn)

- Incident-ledger entries and their commit hashes. The new ledger starts with
  the entry template and an explicit "no evidenced incidents yet" — the
  no-fabrication rule is the whole value of the artifact.
- Campaign metrics (routing percentages, flaky lists) and empirical collision
  pairs — measure the new corpus, never inherit numbers.
- The `interface`-parity doctrine — verify against the new toolkit's host
  targets before adopting (it exists here because both manifests ship; a
  claude-only or codex-only toolkit has no pair to keep in parity).
- Every fact table in `toolkit-plugin-reference` — re-verify per host with
  `claude plugin validate` and the official docs. Copying verified-elsewhere
  claims is how stale doctrine is born.

## Path A checklist — one pass

1. Decide **how many channels, and mirrored vs single-tree, FIRST** — it
   determines which tests and sync machinery exist at all. One channel needs
   none of it; each additional host adds a generated tree, a transform, and a
   drift test. This repo reached four (npx / marketplace / OpenCode / Cursor)
   plus an npm package incrementally, and every channel added after the first
   cost more in doc drift than in code. Cursor priced that precisely: the
   builder, the sync wiring and the drift test landed in one session, while the
   doc sweep across the meta-skills became its own follow-up ticket. **Budget
   the doc sweep into the channel, not after it** — and grep the whole repo for
   the old channel count (`three channels`, `three distributions`) as the last
   step of adding one.
2. Copy Layer 1; adjust paths; empty the data registries.
3. Re-derive the seven meta-skills with `adapting-skills` + this bundle open
   as reference; scope every description to the new repo's name.
4. Write the new repo's CLAUDE.md invariants and catalogs; wire the
   docs-catalog test so they can't silently drift.
5. Author evals per skill; run `eval-triggers.mjs --runs 3` for an honest
   baseline (mean ± CI); record it in the new repo's campaign file.
6. Start the ledger empty; the first entry arrives when reality provides one.
7. Install `release`; cut baseline tags for every plugin on day one.

Last generated: 2026-07-09 (Layer 1 generated-channel entry and checklist step 1
amended 2026-08-14 by the Cursor channel — the first port-shaped change made
after this file was written)
Known uncertainty:
- Written from a two-toolkit vantage point (this repo + one corp fork
  prototype); Path B (a parameterized meta-bundle) is unbuilt by choice —
  revisit at the third toolkit.
