# @jabworks/condux

## 0.17.2

### Patch Changes

- [#128](https://github.com/jabworks/agentic-toolkit/pull/128) [`d620749`](https://github.com/jabworks/agentic-toolkit/commit/d620749ddf3f621a41649ede27a9d11c4e3b3078) Thanks [@vi-hieu](https://github.com/vi-hieu)! - technical-spec: claim the record-the-decision-rationale space explicitly — recording decisions for the future is spec work even when phrased as remembering (docket [#56](https://github.com/jabworks/agentic-toolkit/issues/56), the technical-spec↔remember seam)

## 0.17.1

### Patch Changes

- [#125](https://github.com/jabworks/agentic-toolkit/pull/125) [`c7db3ff`](https://github.com/jabworks/agentic-toolkit/commit/c7db3ff3d2653e9293b3341912a37d281c1083cb) Thanks [@vi-hieu](https://github.com/vi-hieu)! - discovery: announce the preview URL the annotate server actually printed instead of a hardcoded `http://127.0.0.1:7777` — manual mode binds a free port (docket [#63](https://github.com/jabworks/agentic-toolkit/issues/63))

- [#126](https://github.com/jabworks/agentic-toolkit/pull/126) [`2f29e61`](https://github.com/jabworks/agentic-toolkit/commit/2f29e6143a5954d7d142e5dca71a1ccb1db9ab97) Thanks [@vi-hieu](https://github.com/vi-hieu)! - workflow + draft-plan: widen the trigger contracts against the null-route error mode (docket [#57](https://github.com/jabworks/agentic-toolkit/issues/57)) — workflow now claims any dev task at any size (tests, CI/config, docs edits, one-liners), draft-plan names its `.condux/plans/` artifact and routes design-less plan requests to its own soft gate

## 0.17.0

### Minor Changes

- [#122](https://github.com/jabworks/agentic-toolkit/pull/122) [`43753b5`](https://github.com/jabworks/agentic-toolkit/commit/43753b53d6acd61cab8d8f4315db43bd5c019af9) Thanks [@vi-hieu](https://github.com/vi-hieu)! - technical-spec's concern-file templates are layered: every file opens with a
  scannable summary table and carries its reasoning underneath. decisions.md
  drops the four ADR prose headings for Decided/Because one-liners with a
  mandatory alternatives table; quirks.md gets Symptom/Trigger/Cause/Mitigation
  with canonical `## Q<n> — Title` headings; api.md types annotate every field
  inline (the type says what a field means, fields.md says what happens to it);
  implementation.md's data flow becomes a numbered list; index.md's Contents
  becomes a File/Answers table, pre-shaped by the scaffold.

## 0.16.0

### Minor Changes

- [#120](https://github.com/jabworks/agentic-toolkit/pull/120) [`a2273f3`](https://github.com/jabworks/agentic-toolkit/commit/a2273f3891a757c93a982785af8fc07a0d26ddad) Thanks [@vi-hieu](https://github.com/vi-hieu)! - discovery builds its design doc section by section in a live browser preview
  instead of writing it at sign-off. Step 3 gains a fixed card shape — position
  marker, one-line intent, evidence, recommendation, named decision — with a
  one-screen density budget, and the section list is announced up front. The
  design file carries a `status` frontmatter field that draft-plan and the
  planner agent read, so an unfinished discovery no longer satisfies their gate.
  blueprint now fires on the question a section turns on rather than on whether
  the feature has a UI surface, links its artifacts into the running preview
  instead of opening a tab, and both kits require labels specific enough to
  disagree with.

## 0.15.1

### Patch Changes

- [`cca86f7`](https://github.com/jabworks/agentic-toolkit/commit/cca86f77a8b99dfdbfdd474d16511e833d26b6a6) Thanks [@vi-hieu](https://github.com/vi-hieu)! - blueprint announces its mode at delivery and offers the flip (promote to
  render / back to wireframe) — the default is visible and reversible, never
  silent.

## 0.15.0

### Minor Changes

- [`1d1c39f`](https://github.com/jabworks/agentic-toolkit/commit/1d1c39f47abdf228514ad3ecbc83071d29072c41) Thanks [@vi-hieu](https://github.com/vi-hieu)! - blueprint speaks the surface-kit design language: two modes (schematic
  wireframe on neutral tokens, full-language render) over one shared skeleton,
  promotion by style-block swap; diagrams re-skinned in tokens; ships
  token-core.css (byte-guarded copy of the shared core).

## 0.14.2

### Patch Changes

- [#115](https://github.com/jabworks/agentic-toolkit/pull/115) [`f3a4e47`](https://github.com/jabworks/agentic-toolkit/commit/f3a4e4754a5e0a0d29e0bc6152e77160e407e378) Thanks [@vi-hieu](https://github.com/vi-hieu)! - Trigger-eval corpus: seed `disallowed` assertions on the adjacency seams

  The bundled condux skills (`discovery`, `draft-plan`, `subagent-execution`,
  `technical-spec`) now declare which sibling skills must never win their most
  collision-prone queries — the "resume" space that discovery and session-handoff
  share, and the doc-creation space that draft-plan and technical-spec share.

  This is test-fixture data used by the toolkit's routing eval, not runtime
  behaviour: nothing an OpenCode user does changes, and no skill's trigger
  contract moved. It ships because `evals/` is part of the bundled skill tree.

## 0.14.1

### Patch Changes

- [#110](https://github.com/jabworks/agentic-toolkit/pull/110) [`aa041fb`](https://github.com/jabworks/agentic-toolkit/commit/aa041fbb1375d0cb8a4dea04bdd7b344c559dc7f) Thanks [@vi-hieu](https://github.com/vi-hieu)! - plan-review: pair the ? button against the theme toggle in the nav rail

  `kit.css` gave `.kit-controls > .kit-theme` a `flex: 1 1 auto`, so the theme
  group grew to fill whatever width its wrapper had. Three of the four surfaces
  host the group in a flex row where the wrapper is already content-sized, so
  nothing stretched and the rule looked correct. plan-review hosts it at the top
  of `.nav`, which is block flow — the wrapper spans the full sidebar, the group
  stretched across it, and the `?` button landed at the far edge instead of
  against "Auto".

  The growth was opt-in behaviour written as the default, and its only real
  consumer was the style guide's rail, which asks for it through its own
  `.themebar` class. The default is now `flex: none` — content-sized, so the
  pairing holds in either kind of host — and the guide opts back in locally.

  Also moves plan-review's rail spacing from `.kit-theme` onto `.kit-controls`:
  flex centres the margin box, so a bottom margin on the group alone rode it
  ~6px above the `?` it is meant to sit beside.

  Closes docket [#52](https://github.com/jabworks/agentic-toolkit/issues/52).

## 0.14.0

### Minor Changes

- [#106](https://github.com/jabworks/agentic-toolkit/pull/106) [`da8a147`](https://github.com/jabworks/agentic-toolkit/commit/da8a147a838aec2353ecfdd2e61b8e780edefee9) Thanks [@vi-hieu](https://github.com/vi-hieu)! - plan-review becomes a manuscript (surface-kit D10)

  The last of the four surfaces in the surface-kit redesign. The document now
  leads the page: the graph-paper background is gone, headings carry a
  typographic spine of space and rule, and every highlight is numbered with the
  same ordinal its note carries in the review column — so the two columns read as
  one artifact rather than two lists side by side.

  The review column recedes to marginalia, with category carried as colour on the
  ordinal and the label. `paint()` now renders the thread in document order rather
  than insertion order, which is what keeps the two numberings in agreement, and
  exposes the category as `data-cat` so the colour is reachable from CSS.

  Also closes two defects on this surface:

  - **docket [#48](https://github.com/jabworks/agentic-toolkit/issues/48)** — `--hl` / `--hl-active` were dark-first with a bare
    `prefers-color-scheme` override and no `[data-theme]` blocks, so on a light
    system clicking Dark inverted the page and left the annotation highlight
    light. This was the last surface still carrying that defect; the assertion
    that guards it now runs over all four.
  - **docket [#50](https://github.com/jabworks/agentic-toolkit/issues/50)** — printing rendered the plan in a ~151px column. Hiding `.nav`
    and `.chat` for print left their grid tracks behind, so `.main` auto-placed
    into the first one; and because `.main` is the scroll container, print was
    clipped to a single screenful. The shell now collapses for print.

## 0.13.3

### Patch Changes

- [#104](https://github.com/jabworks/agentic-toolkit/pull/104) [`3b0dfe3`](https://github.com/jabworks/agentic-toolkit/commit/3b0dfe3a0153f2eed28444eb35f2783a5d72260e) Thanks [@vi-hieu](https://github.com/vi-hieu)! - plan-review: write the feedback file atomically

  `annotate-server.js` wrote the decision with a plain `writeFileSync`, which is
  `open(O_CREAT|O_TRUNC)` followed by `write()` — two syscalls. A reader polling
  for the file could win that gap and read a created, still-empty file. Both the
  steer-mode and manual-mode writes now go through a temp file plus `renameSync`,
  which is atomic on POSIX: a reader sees either the previous file or the complete
  new one, never a truncated one. Falls back to a direct write if rename fails.

## 0.13.2

### Patch Changes

- [#97](https://github.com/jabworks/agentic-toolkit/pull/97) [`90a08dd`](https://github.com/jabworks/agentic-toolkit/commit/90a08ddd22c5e8f7a0117bb2e1b3e38e7912df49) Thanks [@vi-hieu](https://github.com/vi-hieu)! - The shared design core gains a categorical colour ramp (`--cat-1` … `--cat-8`
  plus `--cat-other`), so charts can tell series apart by identity rather than by
  label alone. The bundled plan-review surface carries the new tokens; nothing it
  renders changes appearance.

## 0.13.1

### Patch Changes

- [#91](https://github.com/jabworks/agentic-toolkit/pull/91) [`de1e1b9`](https://github.com/jabworks/agentic-toolkit/commit/de1e1b96fd1f2cdb328ff3ef548a9be0f09d2b7f) Thanks [@vi-hieu](https://github.com/vi-hieu)! - Make the keyboard layer discoverable, and stop surfaces restating what the kit owns

  The `?` overlay shipped with no way to find it — a keyboard layer nobody can
  discover is a keyboard layer nobody uses. `kit.js` now places a `?` button beside
  every theme group, so the affordance arrives on all four surfaces at once rather
  than being added four times.

  It wraps the theme group and the button in a `.kit-controls` flex box rather than
  inserting a bare sibling: a surface may host its chrome in a flex row or in block
  flow, and in block flow a sibling drops onto its own line. The wrapper makes the
  pairing hold either way.

  Also fixes a segmented control that was rendering its middle button fully
  rounded. The cause was a surface restating skin the kit already owns — a local
  `border-radius` at specificity (0,1,1) applied to all three buttons, while
  `.kit-theme button:first-child/:last-child` at (0,2,1) squared off only the outer
  two, leaving the middle one as the button nothing overrode.

## 0.13.0

### Minor Changes

- [#89](https://github.com/jabworks/agentic-toolkit/pull/89) [`75b56f2`](https://github.com/jabworks/agentic-toolkit/commit/75b56f26dd52ebd2b7023e9dabf26fc56b23fd68) Thanks [@vi-hieu](https://github.com/vi-hieu)! - Surface Kit: share the state and behaviour layers across every HTML surface

  `scripts/check-tokens.mjs` was a byte-exact inliner for one region — the colour
  core. It now carries three: `tokens:core`, `kit:css` and `kit:js`. That is what
  lets four artifacts which may not share a runtime dependency still share source,
  each one still shipping fully self-contained with no egress.

  The colour core gains 38 tokens — type, space, radius, motion and elevation —
  so the surfaces agree on more than colour. Type, space, radius and motion are
  theme-invariant and live in the base block only; elevation is restated per theme,
  because a shadow tuned for the dark ground reads as dirt on cream. A third theme
  state joins the two: `[data-theme]` now overrides the OS preference, persisted in
  `localStorage`.

  `kit.css` adds focus-visible rings, a skip link, `prefers-reduced-motion`, a print
  stylesheet that repoints the tokens so a dark page does not print as blank, and
  the empty / loading / error patterns none of the surfaces had. `kit.js` adds theme
  persistence, a keyboard layer with a `?` overlay built from the live binding
  registry, copy-to-clipboard and URL state — every behaviour feature-detected, so a
  surface without the hooks is unaffected.

  This release is deliberately additive: the scale is defined but not yet adopted,
  so no surface restructures. Per-surface layout follows separately.

## 0.12.1

### Patch Changes

- [#87](https://github.com/jabworks/agentic-toolkit/pull/87) [`4aba2a5`](https://github.com/jabworks/agentic-toolkit/commit/4aba2a5c1883c0c7fba312eeab185f669bee42b4) Thanks [@vi-hieu](https://github.com/vi-hieu)! - Reconcile trigger-eval oracles with the routing payload's own doctrine.

  `blueprint`: two negatives ("build the settings page from the approved design",
  "implement this Figma design as a React component") asserted `expected_skill: null`,
  which contradicts _every implementation request starts at `/condux:workflow`_. The
  model answered `workflow` and the corpus scored it a miss.

  `test-first-development`: eight positives lost to `workflow` in one run of three for
  the same reason — `routing.md` lists the skill among those that execute _within_
  workflow, never instead of it. Nine cases now carry `accept: ["workflow"]`, and the
  bug-shaped one also accepts `root-cause-analysis`. The four cases where the skill is
  genuinely the sole right answer — questions about the practice, and ownership of an
  existing failing test — stay strict, so the corpus keeps its discriminating power.

  No routing behaviour changes; these are test fixtures.

## 0.12.0

### Minor Changes

- [#85](https://github.com/jabworks/agentic-toolkit/pull/85) [`a0cf2c5`](https://github.com/jabworks/agentic-toolkit/commit/a0cf2c53c14e83a05d1518ea6827e3a71ea5a6cc) Thanks [@vi-hieu](https://github.com/vi-hieu)! - Add the `blueprint` skill — dependency-free design-time visuals: grayscale
  HTML wireframes for UI screens and flows, inline-SVG diagrams for data models,
  flows, architecture, and state machines. Loaded by `discovery` at the propose
  step, citable from `draft-plan` task cards, and triggerable standalone
  ("mock this up", "visualize the data model"). Also updates the workflow
  routing payload and skill table to carry the new member.

## 0.11.0

### Minor Changes

- [`5513b83`](https://github.com/jabworks/agentic-toolkit/commit/5513b83e9c0eaa5971aa681edfc3643ec73fdd75) Thanks [@vi-hieu](https://github.com/vi-hieu)! - OpenCode now enforces `/workflow` as the entry point, matching Claude Code and Codex.

  Both other hosts get this from a `SessionStart` hook that injects
  `skills/workflow/hooks/routing.md`. OpenCode has no equivalent hook, so until
  now routing there fell back to catalog inference alone — the ~80% path the
  hook exists to replace (docket [#38](https://github.com/jabworks/agentic-toolkit/issues/38)).

  The plugin's `config` hook now pushes `routing.md` onto `config.instructions`
  instead. Verified empirically against a live OpenCode install (`opencode
debug config`, v1.14.48): a config-hook mutation to `instructions` reaches
  the fully resolved config, the same mechanism already proven by this
  package's `skills.paths` registration — unlike `tools`, which is folded into
  `permission` before the hook runs and silently drops any hook-side mutation.

  This is a deliberate cost tradeoff, not a free win: `SessionStart` fires once
  per session start/clear/compact, but `instructions` is ambient — re-injected
  every turn, permanently, in the same channel as the user's own AGENTS.md
  (~390 tokens/turn for `routing.md`). Chosen anyway for routing-enforcement
  parity with the other two hosts.

  `condux-doctor`'s OpenCode probe now also checks that the installed package
  ships `skills/workflow/hooks/routing.md`, so a broken install is reported as
  broken instead of silently missing the enforcement.

### Patch Changes

- [`5513b83`](https://github.com/jabworks/agentic-toolkit/commit/5513b83e9c0eaa5971aa681edfc3643ec73fdd75) Thanks [@vi-hieu](https://github.com/vi-hieu)! - Four skill-contract gaps surfaced by the [#37](https://github.com/jabworks/agentic-toolkit/issues/37) sibling-miss triage are fixed (docket [#39](https://github.com/jabworks/agentic-toolkit/issues/39)).

  **root-cause-analysis** now claims declarative bug reports, not just
  questions — "checkout crashes on empty cart" is a bug report even without a
  question mark, the same passive-voice-to-user-phrasing move that fixed
  test-first-development in 2.17.2.

  **subagent-execution**'s when_to_use now names model selection for a
  dispatched agent explicitly — the skill already owned this in its body
  (`references/spawn-rules.md`), but the contract never said so, so "which
  model should the coder agent get" missed.

  **remember** (Concord) no longer attracts open-ended retrospective
  questions — "what mistakes did past sessions make", "what did the audit
  leave open", "has this happened before" in an unrelated project. Its
  contract now says explicitly: a session log, not a mistake ledger or audit
  index. A toolkit mistake in this project is still `toolkit-failure-archaeology`.

  **The "sdd the plan" eval stimulus** was genuinely ambiguous between
  spec-driven development and subagent-driven execution — reworded to "spawn
  the agents for this plan" rather than resolving the ambiguity in either
  skill's contract.

  **git-operations' enumerated situation list** (submodules, bisect) was left
  unchanged, by decision: the skill's own "Out of scope" section already
  excludes both by name pending a dedicated history-rewriting skill, so the
  miss is an intentional guard, not a gap.

## 0.10.2

### Patch Changes

- [`e5403d1`](https://github.com/jabworks/agentic-toolkit/commit/e5403d177672bebd631203c3bd1058d5967829c3) Thanks [@vi-hieu](https://github.com/vi-hieu)! - Eval-corpus triage for the condux member skills (docket [#37](https://github.com/jabworks/agentic-toolkit/issues/37), family A): seven
  cases gain `accept` alternates where the sibling the router actually chose is
  doctrinally correct — preflight/finalize/release on "ship it", preflight ↔
  live-verification on post-implementation "verify it", spec-browser on loading a
  spec, workflow on stimuli that are genuinely plain implementation requests.
  Each carries a `note` recording the rationale.

  No trigger contract changed. `workflow` chosen over a downstream condux skill
  deliberately stays a miss — those misses are the eval's power to detect drift
  toward the entry point, and they are the evidence for which downstream
  contracts are too weak to win.

- [`6c9829b`](https://github.com/jabworks/agentic-toolkit/commit/6c9829bff170d9c45a73497c98a2ca04e7c79ddd) Thanks [@vi-hieu](https://github.com/vi-hieu)! - test-first-development now claims the two things it already owned but never advertised.

  **Advisory questions about the practice.** "should I tdd ui components" missed
  0/3 in two independent variance bands — never once routed, the most stable miss
  in the corpus. The contract said "trigger when the user explicitly asks for
  tests-first", so a question about _whether_ to read as a question, not a
  request, and the router declined. But deciding when tests-first applies is this
  skill's whole opt-in design. The contract now says so, mirroring `workflow`'s
  "also the operating manual" clause.

  **Requests to change a passing-by-editing test, in user phrasing.** The rule was
  already there — "whenever an existing test spec is about to be edited to make it
  pass" — but written from the agent's side in passive voice, describing a state
  the agent is about to enter. The router only ever sees a user message, so
  matching it required a two-step inference it made about a third of the time.
  Named in user phrasing now: just fix the test, update the failing test to match
  the new behavior.

  No exclusion clause was added, deliberately. Across 582 cases, nothing wrongly
  routed _to_ this skill in either band — zero false positives — so a "not for
  ordinary test work" clause would have bought nothing measurable (docket [#37](https://github.com/jabworks/agentic-toolkit/issues/37)).

## 0.10.1

### Patch Changes

- [#81](https://github.com/jabworks/agentic-toolkit/pull/81) [`7c0bdab`](https://github.com/jabworks/agentic-toolkit/commit/7c0bdab1d07f734a2e6d67048602c172804cc327) Thanks [@vi-hieu](https://github.com/vi-hieu)! - subagent-deployment now triggers on the fan-out being asked for, not on the work happening to be independent.

  Independence is a precondition, not a trigger. A plain implementation request —
  "fix these three unrelated failing tests" — is a dev task and goes to
  `/workflow`, which loads this skill if the tier warrants it. What reaches
  `subagent-deployment` directly is a request that already names the mechanism:
  in parallel, fan out, dispatch these together, kick off explorer and researcher.

  Stated in the trigger contract and restated in the body, because the router's
  "every dev task starts here, other skills execute within it, not instead of it"
  only resolves the collision if the other side agrees (docket [#32](https://github.com/jabworks/agentic-toolkit/issues/32)).

## 0.10.0

### Minor Changes

- [#79](https://github.com/jabworks/agentic-toolkit/pull/79) [`71b50e8`](https://github.com/jabworks/agentic-toolkit/commit/71b50e88e8c0746e43695e8fabb69ee6b1142dd0) Thanks [@vi-hieu](https://github.com/vi-hieu)! - technical-spec now scaffolds a purpose slot, and the artifact contract states which direction a reference may point.

  Every new spec's `index.md` opens with an HTML comment prompting for the
  one-line `> …` note that `spec-browser`'s catalog shows as the spec's
  description. The prompt is a comment rather than visible placeholder text
  because a placeholder generates into the catalog looking like content; a
  comment is invisible in every rendered view and the catalog skips it, so an
  unfilled spec still reads as an honest "no description" (docket [#33](https://github.com/jabworks/agentic-toolkit/issues/33)).

  `workflow`'s artifact contract gains the rule that was missing behind six dead
  citations: durable content may not depend on ephemeral content. A committed
  file may not cite a path inside `.condux/` — promote the design or verification
  report into the spec directory and cite the committed path, or, when the
  artifact is already gone, name what survives instead (docket [#34](https://github.com/jabworks/agentic-toolkit/issues/34), [#35](https://github.com/jabworks/agentic-toolkit/issues/35)).

## 0.9.1

### Patch Changes

- [#68](https://github.com/jabworks/agentic-toolkit/pull/68) [`8688e5b`](https://github.com/jabworks/agentic-toolkit/commit/8688e5b8dc5567f9756547a1ded33822bbda37e7) Thanks [@vi-hieu](https://github.com/vi-hieu)! - Flat bundle layout ripple: the condux-doctor now resolves its plugin root at
  `../..` (bundles ship skills flat for Agent Plugins conformance) and the
  workflow Codex hooks reference `skills/plan-review/...` instead of
  `skills/condux/plan-review/...`. No behavior change on OpenCode installs —
  the bundled skills tree was already flat there.

## 0.9.0

### Minor Changes

- [#59](https://github.com/jabworks/agentic-toolkit/pull/59) [`c86da1a`](https://github.com/jabworks/agentic-toolkit/commit/c86da1a4af9d7f9624b0dd55109555dbd020787e) Thanks [@vi-hieu](https://github.com/vi-hieu)! - plan-review: directory mode's sidebar is now a doc-site tree — collapsible folders (collapsed except the active doc's ancestors, note counts rolled up), a filter matching doc names and headings, breadcrumb, and prev/next navigation. Single-file plan review is unchanged (docket [#22](https://github.com/jabworks/agentic-toolkit/issues/22)).

## 0.8.2

### Patch Changes

- [#57](https://github.com/jabworks/agentic-toolkit/pull/57) [`504dff2`](https://github.com/jabworks/agentic-toolkit/commit/504dff2caf39cd9e7c25957b1821ee0b7861cbe8) Thanks [@vi-hieu](https://github.com/vi-hieu)! - plan-review: directory mode docs said "every top-level `*.md`"; the server walks the whole tree (grouped by folder, `index.md` first, dotdirs skipped). Prose now matches the code (docket [#24](https://github.com/jabworks/agentic-toolkit/issues/24)).

## 0.8.1

### Patch Changes

- [#54](https://github.com/jabworks/agentic-toolkit/pull/54) [`80d46ac`](https://github.com/jabworks/agentic-toolkit/commit/80d46ac16e9b39813daf3bd6e8445e0c8ca46279) Thanks [@vi-hieu](https://github.com/vi-hieu)! - Adopt the shared colour core in the plan-review template.

  The bundled skills now carry the canonical 32-token palette between
  `tokens:core` markers, checked against `scripts/tokens/core.css` by
  `scripts/check-tokens.mjs`. No behaviour change on the OpenCode side — the
  template renders the same colours it did before, with `--mono` widened to the
  union of both font stacks (all local-or-fallback lookups, nothing fetched).

## 0.8.0

### Minor Changes

- [#52](https://github.com/jabworks/agentic-toolkit/pull/52) [`6233a26`](https://github.com/jabworks/agentic-toolkit/commit/6233a26a2ea0277698edadb75bd2f9d9e10658e0) Thanks [@vi-hieu](https://github.com/vi-hieu)! - Catch the npm bundle up with three releases that shipped to the marketplace without one.

  The bundled skills gained real behaviour over condux 2.12.0–2.14.0, and none of it reached OpenCode users because no changeset was written:

  - **Conflicting-library warning** — `condux-doctor` detects a competing skill library (superpowers) across host plugin registrations and loose skills directories, and reports `warn` with the removal command rather than running it. Ships `conflicts.json` (the registry) and `conflicts.mjs` (its reader), shared with the installer so the table naming another project's skills exists once.
  - **`--uninstall` on the bundled installers** — `plan-review/references/install-codex-hook.sh` and `subagent-execution/references/install-codex-agents.mjs` can now reverse what they registered. The Codex Stop hook is removed by matching its command string, never by array position, so a sibling plugin's entries in the same `hooks.json` survive; agent TOMLs are derived from `.md` frontmatter so a rename cannot desync install from uninstall.
  - **Shared host state is never cleared** — `[features] hooks = true` has three writers and no owner, so no uninstaller touches it. It is reported as `warn` naming the other riders instead of being silently left behind.

  No source change here beyond the changeset itself: `packages/condux-opencode/skills/` is generated by `scripts/build-opencode.mjs` and has been current in the repo since each merge. Only the published package was behind.

## 0.7.0

### Minor Changes

- [#32](https://github.com/jabworks/agentic-toolkit/pull/32) [`400f346`](https://github.com/jabworks/agentic-toolkit/commit/400f34693832728ff0b503673b61c1a99e7f66f0) Thanks [@vi-hieu](https://github.com/vi-hieu)! - Bundle `condux-doctor`, the plugin's health check, into the OpenCode package. It answers "is condux actually working on this host?" — probing the SessionStart routing hook by _running_ it (Claude Code's JSON envelope, Codex's raw payload), resolving plan-review's Codex Stop hook without executing it, checking the OpenCode registration and the four specialist agent definitions, and comparing the installed version against the local marketplace clone. Offline and read-only.

  Running the hook is the point. `session-start.mjs` fails open by design: if its payload is missing it exits 0 and prints nothing, so every static check passes while condux's routing rule is silently absent. Only executing it tells you that `/workflow` stopped being the entry point.

## 0.6.0

### Minor Changes

- [#26](https://github.com/jabworks/agentic-toolkit/pull/26) [`7aff528`](https://github.com/jabworks/agentic-toolkit/commit/7aff528b1a811f65e5404a70a12361e99d87eb91) Thanks [@vi-hieu](https://github.com/vi-hieu)! - Ship condux's routing rule as a SessionStart hook so `/workflow` is reached as the entry point rather than inferred from the skill catalog. Catalog inference sits at roughly 80%, and the misses are condux's own siblings winning the query — `root-cause-analysis` on a crash report, `draft-plan` on "write the plan" — which no description change can fix without taking their trigger space. The payload is prose in `skills/workflow/hooks/routing.md` (~390 tokens): it names workflow as the entry point, lists the siblings that execute within it, and states what should _not_ be routed, so questions and code reading still answer directly.

  The hook is wired on Claude Code and Codex. OpenCode has no session-hook surface, so for this package the files ship as payload only — the routing rule is inert there until OpenCode gains one.

### Patch Changes

- [#28](https://github.com/jabworks/agentic-toolkit/pull/28) [`f03051c`](https://github.com/jabworks/agentic-toolkit/commit/f03051c3004459dda76d714b260479faf00b51de) Thanks [@vi-hieu](https://github.com/vi-hieu)! - Trim ~1,100 characters of duplicated prose out of the condux skills' frontmatter. Hosts hold every installed skill's `description` and `when_to_use` in context permanently (Codex budgets this at 2% and silently shortens descriptions once you exceed it), so frontmatter that repeats what the skill body already says is paid for on every turn of every session.

  Ten skills lost procedure text that was already present verbatim in their bodies — `live-verification`'s light/dark and claim→evidence→verdict detail, `workflow`'s tier-confirmation restatement, `plan-review`'s no-egress note, `test-first-development`'s spec-rewrite rule (which has its own body section). Every trigger phrase and all nine guarded cross-references are unchanged, and `subagent-execution`'s "agents must be pre-defined, never inject a system prompt into a general-purpose one" rule was moved into its body rather than dropped — it existed only in frontmatter.

  Measured, not assumed: three eval runs per catalog put the edited skills at 163/184 → 165/184 and the whole corpus at 423/470 → 425/470, well inside the ±0.8–1.8pp confidence interval. A single-run comparison had shown a scary −7, which turned out to be noise — an untouched skill swung 3 points between runs.

## 0.5.2

### Patch Changes

- [#24](https://github.com/jabworks/agentic-toolkit/pull/24) [`603a6c1`](https://github.com/jabworks/agentic-toolkit/commit/603a6c175080cef0c175ebfbffe6b27eb31d0fed) Thanks [@vi-hieu](https://github.com/vi-hieu)! - Fix the code-review skill's frontmatter, which strict YAML parsers rejected. Its `when_to_use` was a single-quoted scalar containing bare apostrophes ("that's plan-review"), and YAML requires `''` inside single quotes — so the first apostrophe closed the scalar and the rest failed to parse. Hosts with a strict parser (Codex) refused to load the skill outright; lenient ones (Claude Code) accepted it, which is why it shipped. The bundled skills are now enforced against a canonical frontmatter grammar — every line is `key: value`, values are plain when safe and double-quoted otherwise, single quotes banned — backed by a real strict YAML parse in CI.

## 0.5.1

### Patch Changes

- [#20](https://github.com/jabworks/agentic-toolkit/pull/20) [`2cc080d`](https://github.com/jabworks/agentic-toolkit/commit/2cc080d3485089b8c310655859ae032cda16b299) Thanks [@vi-hieu](https://github.com/vi-hieu)! - The CP-1 checkpoint menu is now contractually complete: workflow requires every option — including "Spawn specialist agents" (subagent-execution) and "Dispatch independent tasks in parallel" (subagent-deployment) — to be presented at every plan-ready checkpoint, and draft-plan's sign-off step carries the same requirement when the sign-off prompt doubles as the what-next menu. Implement-yourself-by-default shapes the recommendation marker, never which options appear.

## 0.5.0

### Minor Changes

- [#16](https://github.com/jabworks/agentic-toolkit/pull/16) [`627d95f`](https://github.com/jabworks/agentic-toolkit/commit/627d95ff96442040f99d39baa7178a4558d1cad1) Thanks [@vi-hieu](https://github.com/vi-hieu)! - From the 2026-08-04 re-eval: annotate-server gains `--no-reject` so discovery's design review is genuinely accept-or-fix (the Reject verdict was only hidden in directory mode — file-mode design review showed a button the agent had no branch for, and clicking it killed the server). Also trigger-contract fixes: code-review, plan-review, discovery, technical-spec, and live-verification frontmatter gained mutual "not for X" guards and restored trigger phrasing. Both flow into the bundled OpenCode skills.

## 0.4.1

### Patch Changes

- [#14](https://github.com/jabworks/agentic-toolkit/pull/14) [`3d3a0d9`](https://github.com/jabworks/agentic-toolkit/commit/3d3a0d90874b159570e20ac3b06103441d8b77f8) Thanks [@vi-hieu](https://github.com/vi-hieu)! - Correct the theme-check order in `live-verification` to light mode first, then dark. The gate is unchanged — a themed change is not verified until both have been seen — only the order it walks them in.

## 0.4.0

### Minor Changes

- [#11](https://github.com/jabworks/agentic-toolkit/pull/11) [`4da895c`](https://github.com/jabworks/agentic-toolkit/commit/4da895cdedb80f650e3738f934759fd8e7b6978c) Thanks [@vi-hieu](https://github.com/vi-hieu)! - Add the `live-verification` skill to the bundle (13 skills, up from 12). It runs after `finalize` on changes with a runnable surface: resolve the run target, enumerate the change's claims, drive the real UI or endpoint dark-mode-first, and report claim → evidence → verdict. It assumes no driving tool is installed and reports what it could not verify rather than inferring a result from the code.

  Also tightens trigger contracts across the bundle so adjacent skills disambiguate each other mutually — `preflight` and `finalize` now both point at `live-verification`, and `root-cause-analysis` hands off toolkit-distribution symptoms to `toolkit-debugging-playbook`.

## 0.3.1

### Patch Changes

- [#9](https://github.com/jabworks/agentic-toolkit/pull/9) [`f9f7c98`](https://github.com/jabworks/agentic-toolkit/commit/f9f7c988a16fcc094ce7bf81581d7e300d7d4ee4) Thanks [@vi-hieu](https://github.com/vi-hieu)! - Ship the MIT LICENSE file with the package. The manifest has declared `"license": "MIT"` since 0.1.0, but no license text was ever included — npm showed the SPDX identifier with nothing granting the rights behind it.

## 0.3.0

### Minor Changes

- [#6](https://github.com/jabworks/agentic-toolkit/pull/6) [`c1739cc`](https://github.com/jabworks/agentic-toolkit/commit/c1739cc87576a3458d953aa546de0b4ccb58bd0d) Thanks [@vi-hieu](https://github.com/vi-hieu)! - Bundle the condux skills in the plugin and auto-register them on OpenCode.

  `@jabworks/condux` now ships the 12 condux workflow skills and registers them on
  `config.skills.paths` via its `config` hook, so `plugin: ["@jabworks/condux"]` is
  the whole install — no separate `npx skills add` step for condux. The bundled
  tree is the byte-identical condux subset of `dist/opencode/skills/`, generated by
  `scripts/build-opencode.mjs`. Registration is idempotent and never disturbs a
  user-provided `skills.paths` entry; OpenCode dedupes by skill name, so a skill
  you install yourself still wins. The plan-review listener now also finds its
  annotate server in the bundled skills.

## 0.2.0

### Minor Changes

- [#4](https://github.com/jabworks/agentic-toolkit/pull/4) [`56184d7`](https://github.com/jabworks/agentic-toolkit/commit/56184d7602e2fc7058c1776d040de691a4ff6f0e) Thanks [@vi-hieu](https://github.com/vi-hieu)! - Carry agent tool restrictions across to OpenCode.

  The generator dropped each agent's `tools:` allowlist, so all four injected
  agents ran with OpenCode's defaults — `bash`, `edit`, and `write` enabled. That
  made `explorer` and `researcher` capable of editing files and running shell
  commands despite their prompts stating they never do, and let `planner` run a
  shell.

  Claude allowlists now translate into OpenCode `permission` denials: `explorer`
  and `researcher` deny `bash` and `edit`, `planner` denies `bash`, and `coder`
  stays unrestricted. Only the mutation and execution gates cross over — read-side
  tools keep OpenCode's defaults, since several allowlists omit `Grep`/`Glob` while
  the prompts still direct the agent to search.

  The restriction has to be expressed as `permission`, not the deprecated `tools`
  map: OpenCode folds `tools` into permissions while parsing the config file, which
  finishes before plugin `config` hooks run, so a `tools` map injected from a plugin
  is silently inert.

## 0.1.1

### Patch Changes

- [#2](https://github.com/jabworks/agentic-toolkit/pull/2) [`fdb11b4`](https://github.com/jabworks/agentic-toolkit/commit/fdb11b42c4a8af973c43ec6af9cc3a0873c01efc) Thanks [@vi-hieu](https://github.com/vi-hieu)! - Publish with npm provenance attestations.

  `publishConfig.provenance` is now `true`, so releases carry a signed provenance
  attestation linking the tarball to the workflow run and commit that produced it.
  The release workflow already had everything this needs — `id-token: write`, npm
  ≥11.5.1, and OIDC trusted publishing with no `NPM_TOKEN` — but the opt-in was
  missing, and 0.1.0 (published by hand before that workflow existed) has no
  attestation at all.
