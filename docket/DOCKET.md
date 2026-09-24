# AGENTIC-TOOLKIT DOCKET

**Open items only.** Closed items move to `archive/<year>.md` with their
verification records. The id space is shared across open and archive and ids
are never reused — a "#N" in a commit subject refers to these numbers (this
docket is the tracker). When an item ships: stamp it ✅ with the date and
verification status, then move the entry to the archive in the same action.
Stale open markers cost real sessions — closing means moving.

## Committed

### 84. Build PRD authoring into condux — prd.md concern file, authored by discovery (follow-up to #83) (2026-09-17)

**Why.** #83 evaluated the spec-related skills and signed off a shape on 2026-09-17: the PRD is a `prd.md` concern file in the technical-spec tree, authored by discovery's goal round as a §0 requirements card, written at sign-off, and read by the workflow router and preflight's drift check. No new skill. The whole design, its rejected alternatives, the touch list and five edge-case rules are in `specs/prd-authoring/` — start from `index.md`; do not re-derive.

**The build, one PR** (`specs/prd-authoring/implementation.md` has the file table):

1. technical-spec — `prd.md` template in `references/templates.md` (six sections, summary table first: problem · users · goals and non-goals · success metrics · scope · open questions), the SKILL.md layout block, `when_to_use` gains "save this PRD", "write up the requirements". `scaffold.sh` stays untouched.
2. discovery — Step 1 ingests an external PRD, the existing-design check reads an in-tree one, Step 2 covers the six sections, Step 3 opens with the §0 card, Step 7's write-back adds `prd.md`; `references/design-template.md` and `references/spec-integration.md` follow; `when_to_use` gains "write a PRD", "product requirements", "what are we building and why".
3. workflow router load list and preflight drift table — one row each.
4. Trigger eval cases in the discovery and technical-spec `evals/trigger_eval.json`: positives for the new phrases, a negative that a PRD ask on a trivial change stays out of discovery.
5. condux minor bump, bump commit last, `--write-changelog`, and a **minor** changeset for `@jabworks/condux`.

**Done when.** The suite is green, the five quirks in `specs/prd-authoring/quirks.md` are flipped from `no` to their shipped state, and one real discovery run on this repo produces a `prd.md` that the drift check then reads.

#### Status 2026-09-19 — promoted to Committed and built; held open for the end-to-end run

Harvey said go on 2026-09-19. Built as PR #162: technical-spec carries the `prd.md` template, discovery authors it as a §0 requirements card and writes it at sign-off, the workflow router loads it for new-feature tasks, and preflight's drift table reads its scope and non-goals. `tests/prd-authoring.test.mjs` pins the wiring (seen failing 8 of 8 without the skill edits). condux 2.32.0, minor changeset for the npm channel. Quirks Q1–Q5 flipped to mitigated. Two departures from the #83 design are recorded in `specs/prd-authoring/decisions.md`: goals are drift-checked only on a feature-completing task, and a requirements-only request may sign off at §0.

**Still open, by Harvey's choice:** the last done criterion — one real discovery run on this repo producing a `prd.md` that the drift check then reads. It needs a person answering a goal round, so it waits for the next real LARGE task rather than a staged one. The trigger eval run for the new phrases is also not yet run (model-billed; offered, not started). Close #84 when the first real `prd.md` lands.

#### Status 2026-09-20 — fully released; the eval did run; the closing run moves to another repo

Three corrections to the block above, which was written mid-flight:

- **The trigger eval ran.** Three trials after the change: 92.8% ± 1.9pp, in band, zero disallowed violations, all four new phrases 3/3. Report and per-case table in `skills/toolkit-research-frontier/references/eval-prd-authoring-2026-09-19.md`.
- **Three departures, not two.** `specs/prd-authoring/decisions.md` bolds all three: the requirements-only sign-off path, the narrowed goals comparison, and scope drift meaning the *Out* column. The third was found in code review of PR #162 and recorded there, but the count was never updated.
- **The npm channel is verified.** `@jabworks/condux@0.25.0` published from Version Packages PR #163; confirmed 2026-09-20 by `npm view` with both release workflows green. All four distribution channels now carry the feature.

**The criterion is unchanged and this item stays open.** Harvey said on 2026-09-20 that he will do the closing discovery run on a different repo, not this one. Two consequences for whoever picks this up: that repo is not to be read without his explicit say-so, and any evidence promoted into `specs/prd-authoring/verification/` must be synthesized rather than copied, since this repo is public. He brings the evidence out; do not go looking for it.

#### Status 2026-09-22 — half the criterion observed in a real run on pocket-haven; no prd.md, by a signed-off opt-out

Harvey asked on 2026-09-22 for the session logs and pocket-haven's spec tree to be checked. A real LARGE discovery ran there on 2026-09-21, for an evaluation item on that repo's own backlog, and signed off. Only structure and decisions are recorded here; none of its content is copied.

| Behaviour #84 needs | Observed | How |
|---|---|---|
| §0 card before §1 | yes | §0 is the first section of the signed-off design, §1 follows it |
| §0 outside the `§n of N` count | yes | the header counts four sections, and §0 is not among them |
| `## §0 · requirements` written on acknowledgment | yes | stamped `AGREED 2026-09-21` |
| The six headings, verbatim and in order | yes | Problem · Users · Goals and non-goals · Success metrics · Scope · Open questions |
| Goal round asked in one batch | not verified | that part ran before a `/clear`; the transcript holding it was not found |
| `prd.md` written at sign-off | no — opted out | the design's own deliverable section, signed off, declines the spec write-back: the work was a review whose deliverable was a research document, with no contracts or fields to record |
| Drift check reads the `prd.md` | no | there is no `prd.md` to read |

**Not a skill miss.** `skills/discovery/references/spec-integration.md` makes the write-back default-on with an opt-out, and the opt-out was taken and signed off. The authoring half of the feature now has real-run evidence. The persisting half does not.

**One design question it raised, not yet decided.** The opt-out's reason ("no contracts or fields") argues against `api.md` and `fields.md`, but the write-back is all or nothing, so declining it also dropped a PRD that had real content. That content now lives only in the other repo's gitignored working state. Whether that is wrong turns on whether a review should get a PRD at all: `specs/prd-authoring/decisions.md` scopes PRDs to features, and a review is not one, which would make §0 running on a non-feature LARGE task the odd part rather than the lost file.

**Still open.** The next real *feature* run on a repo that keeps the spec write-back closes this item: a `prd.md` in `specs/<slug>/`, then one task whose preflight drift check reads its row.


## Someday

### 65. toolkit-debugging-playbook applied-but-cold — evaluate for a routing nudge next period (2026-08-28)

Its period-1 rewrite shipped 2026-08-06 (`400f346`); on 2026-08-20 a user turn
stating its literal remit ("the skill for visual mockups almost never fire")
still missed (`specs/trigger-reliability/period-2-report.md`). No lexical room
left. Per the routing-nudge convention (toolkit-skill-standards), a nudge needs
a measured suppressed-class verdict and a live trigger surface to condition on —
period 3 should decide whether "being inside the toolkit repo" qualifies.

**2026-08-28 — the measurement stands; the default remedy is gone (#69 closed).**
The nudge mechanism this item would have used was retired (session-handoff
2.0.0; D2 retired), and #69 declined it as house doctrine. So this item is
*not* blocked and *not* dead: period 3 still evaluates whether
toolkit-debugging-playbook is suppressed-class. What changed is the disposal —
a verdict is now a finding to report, and shipping a nudge against it needs
both a measured verdict and Harvey's explicit sign-off on the ongoing token
cost. Do not treat a verdict here as authorising a hook.

### 67. Replace third-party remember plugin with our own memory stack on Claude Code? (2026-08-28)

The suppressor in `specs/trigger-reliability/` Q1 is
`claude-plugins-official/remember`'s SessionStart digest. The D2 nudge counters
it without touching it; owning the memory stack (concord already owns Codex)
would let digest and skills cooperate instead. Deliberately deferred at design
time — decision, not implementation, is the next step.

**2026-08-28 — brief written, awaiting ratification:**
`specs/trigger-reliability/memory-stack-decision.md`. Four options (keep /
replace / defer-with-criterion / upstream request) with the parity cost of a
replacement itemized. Recommends **defer against a pre-registered period-3
fire-rate criterion**: ≥40% keeps the third-party stack and closes this item,
<15% triggers the port. Two findings the brief rests on — the plugin exposes
**no config knob** that makes its digest conditional or demotable (the cheap
path is closed on evidence), and docket #64's harness extension proved **no
remedy can be pre-verified in-eval**, so live period-3 data is the only
instrument either option has. Filing an upstream request for a demotable digest
is recommended in parallel regardless of the verdict. Three questions need
Harvey's answer before ratification — see the brief's closing section.

**2026-08-28 — ratified; stays open.** All three questions answered (recorded in
the brief's Ratification section). (1) Losing model-summarized prose is **not**
acceptable, so a port must carry summarization concord does not have — Option B
is strictly more expensive than the scope table priced, and the `< 15%` branch
is a bigger commitment than it read. Recommendation unchanged: defer. (2) The
criterion is evaluated at **period 3 by accumulated sessions**, not a fixed
date, keeping the series like-for-like with periods 1 and 2 (D5). (3) The
upstream request is approved and drafted at
`specs/trigger-reliability/upstream-request.md` — **not yet filed**, pending
Harvey's read. This item closes when the period-3 criterion fires, or earlier if
upstream accepts.

**2026-08-28 (same day) — the criterion is void; the port has no automatic
trigger.** Harvey removed the session-handoff SessionStart hook (2.0.0), and the
criterion measured that nudge's efficacy. The brief's threshold table is kept as
the record of what was pre-registered and must not be applied; a replacement
written after removing the instrument would not be pre-registered, so none was
written. Period 3 now measures whether suppression persists unremediated
(~9% is the period-2 comparison), and the port becomes a judgement call on that
evidence rather than a threshold firing. With our own remedy withdrawn, the
upstream request is the only live path that can close this item without a port —
it is now the highest-value open thread here, and it is still unfiled.

**2026-08-29 — the upstream path is closed too; this item has no automatic
closing condition left.** Harvey declined to file the request: *"I don't really
want to make them change anything."* Ratified as **D7** — `remember` is not
malfunctioning, and D3's boundary (we do not modify a third party's plugin)
extends to not asking them to modify it either. The draft stays in
`specs/trigger-reliability/upstream-request.md`, restatused as declined and
never filed; `memory-stack-decision.md` carries the reversal of its answer 3.

Both closing conditions the ratification named are now void — the criterion
(voided 2026-08-28) and upstream acceptance (declined 2026-08-29). #67 closes
only on Harvey's judgement at period 3, weighing the measured suppression rate
against a port that must carry summarization concord does not have. Option B is
the entire remaining decision space.

Standing position, so no future session re-derives it: the toolkit ships **no**
countermeasure for the suppression class, deliberately, and will not acquire one
by asking. Explicit invocation is the supported path. Do not reopen the upstream
option without Harvey — see D7's "what would reopen this".

#### Status 2026-09-14 — period 3 is not yet mineable like-for-like

Accumulation check since the period-2 cut (2026-08-27), under D5's corpus
rules: 30 in-scope Claude Code sessions (agentic-toolkit 14, terminus 16;
the 261 `-tmp` sessions are eval harness) and **0** in-scope Codex sessions
(58 rollouts: 54 corporate — vedge-ui-v2 42, maestro-api-gateway 9,
lightweight-bff 3, never read — and 4 synthetic blueprint trial dirs). Period
2 ran on 113 sessions with 66 resume-shaped turns; 30 sessions projects to
~17 resume-shaped turns, too few for a rate that compares to ~9%. The period-2
miner (local scratch under `.condux/scratch/`, never committed) re-runs by editing
its `FROM`/`TO` window. No verdict and no port decision until the corpus is
comparable; a thin interim read is possible but would have to be labelled
non-comparable.

### 74. C2 — edge-triggered "you skipped the router" reminder for condux on OpenCode (follow-up to #72, gated on its measurement) (2026-09-01)

The enforcement half of the #72 research (`specs/trigger-reliability/opencode-routing-research.md` §4 C2), deliberately left out of the C0 + C1 ship: it catches the actual miss — an edit starting in a main session where `workflow` was never loaded — instead of hoping the session-start reminder stuck.

**Shape (oh-my-openagent's category-skill-reminder, with condux semantics).** `tool.execute.after` on the `skill` tool marks the session *routed* when `workflow` loads; `tool.execute.before` on `edit` / `write` / `patch` / `bash` in an unrouted main session sets a one-shot pending flag; `experimental.chat.messages.transform` splices one synthetic `<system-reminder>` ("an edit is starting and `workflow` was never loaded — load it now, or say the user asked to skip") before the latest user text. Fires at most once per session, never on subagents (reuse #72's name-or-parent discriminator), ~80 tokens when it fires, zero otherwise. Soft — it reminds, it does not block: a hard variant (throw in `tool.execute.before`) would fight users who legitimately said "just do it", and condux's doctrine is soft gates. Stable fallback if `messages.transform` misbehaves: append the reminder to `output.output` of the *next* tool result (opencode-workspace's pattern).

**Gate.** Do not build until the OpenCode measurement docket has a C1 number; if C1 alone lands the `workflow` fire rate near the Claude Code band, C2 is not worth a second experimental hook. Condux minor + npm changeset when it ships; condux-doctor learns the new contract.

**Update 2026-09-02 (#73 closed — the gate has its number, and it argues against building).** On `opencode/big-pickle`, C1 routes implementation tasks at 88.9% (vs 82.9% for the 0.20.0 instructions channel; `specs/trigger-reliability/opencode-routing-measurement.md`), and the residual misses are empty-cwd phrase-not-task cases, operating-manual questions, and cross-skill scoring — none of which an edit-time reminder addresses. C2 stays unbuilt unless a paid-model arm (Harvey's spend call) shows a materially lower task-routing rate that edit-time enforcement could recover.

### 75. diagram-check: decorative lines read as unlabeled edges (2026-09-08)

Every stroked `<line>` is an edge to `skills/blueprint/references/diagram-check.mjs`, so a separator (a divider inside an entity, a title rule) reports `unlabeled-edge`. Raised as a Minor in the 2.29.0 code review; not yet bitten. Candidate rule: a line with no marker that lies fully inside one node, or spans a boundary's full width, is decoration. Decide when a real diagram trips it — a rule invented before the case is a guess.

### 79. diagram-check: a halo narrower than its label is not a finding (2026-09-10)

Seen while calibrating for #76 (2026-09-10): 8 of the 16 edge labels across three real diagrams are wider than the stroke-less halo rect drawn behind them, by 1 to 19 units (widest: a 21-character label at 139 units over a 120 halo). Invisible in those three because no edge crosses those labels; the halo exists for the moment one does, and a narrow one lets the crossing edge show through the label's ends. The kit now sizes halos from the same budget as the label (characters × 11 × 0.6, plus 4px each side); the checker has no rule. Candidate: for each free text, the nearest stroke-less rect whose box contains the text's anchor point is its halo, and a halo that does not contain the text box past the 1-unit tolerance reports `halo-narrower-than-label`. Decide when a real diagram shows the edge poking through — same doctrine as #75: a rule invented before the case is a guess. Evidence table in specs/blueprint/verification/2026-09-10-font-size-calibration/report.md.

### 82. diagram-check: a label or halo inside a boundary title strip is not a finding (2026-09-10)

Found redrawing the reporting specimen in the D9 language (2026-09-10, specs/blueprint/verification/2026-09-10-visual-language/report.md, "Also seen"): the `HTTP · effective composition JSON` halo spans y 285.75–300.75 while the frontend boundary's title strip ends at y 288 — a 2.25-unit overlap. The kit's Boundaries rule says no label or halo ever lands in the strip band (a halo punches a `var(--card)` hole through the tint), but the checker has no notion of a strip: it is a stroke-less rect, which the checker treats as decoration and ignores. The overlap is inherited from the 2026-09-08 routing geometry and invisible at render scale, so it shipped as-is. Candidate rule: a stroke-less rect whose top edge coincides with a boundary rect's top edge and whose width equals the boundary's is that boundary's strip; any text box or halo intersecting it reports `label-in-title-strip`. Wait for a case where the overlap is visible before adding the rule — same doctrine as #75 and #79.

### 85. diagram-check: an edge that crosses a label claims it, so the crossing is reported as the wrong defect (2026-09-22)

Found on 2026-09-22 sweeping every committed diagram for #75. In `specs/discovery-presentation/section-loop.html`, the step-7 sign-off arrow (x=535, y 288→388) ran straight through the dashed return path's label ("you read the design whole here — …", box 282–718 × 294–305), visibly splitting it in a headless render. The checker printed `unlabeled-edge` on the return path and nothing about the crossing.

**Cause.** Each free label is attributed to exactly one edge, the nearest (`distBoxToSegment`), and `edge-through-label` skips an edge's own label, because a label drawn on its own edge over a halo legitimately touches it. A neighbour that crosses a label is at distance 0, so it wins the label: the crossing is exempted as "own", and the edge the label belonged to is reported as unlabeled instead.

**Candidate rule.** An edge that crosses a label with no halo behind it is `edge-through-label` even when it is the nearest, and attribution then falls to the next-nearest edge. That needs the checker to recognise a label's halo, which is exactly what #79's candidate rule defines (the nearest stroke-less rect containing the text's anchor), so build the two together.

**The case exists.** Unlike #75, #79 and #82, this one has already tripped on a real diagram. The same PR that filed this item moved the label below the return run (x 290, y 328), so the committed diagram no longer shows it; the geometry above is the case.

### 88. Native-change awareness: one detector so workflow, finalize, live-verification and release know a change needs a rebuild (2026-09-22)

Found 2026-09-22 in the mobile eval (`skills/toolkit-research-frontier/references/eval-mobile-2026-09-22.md`, A1). This is the cross-cutting mobile gap.

**Which paths change the binary.** On an Expo app: `modules/**`, the `plugins`, `permissions` and `version` fields of `app.json`/`app.config.*`, native dependencies in `package.json`, and the generated `android/`/`ios/` trees. No skill knows this.

**What each skill gets wrong without it.**
- **workflow.** Tier inference scores a one-line Kotlin edit SMALL. It actually costs a multi-minute Gradle build, a reinstall and a new APK.
- **finalize.** The gates come from AGENTS.md and, on a typical Expo project, are JS-only. It still prints "Ready to commit" over uncompiled Kotlin.
- **live-verification.** It can drive a stale dev client.
- **release.** `eas update` cannot carry the change. Under `runtimeVersion.policy: appVersion`, a version bump also cuts installed builds off from OTA.

**Field specimen.** The agent wrote itself a memory note after a stale dev client left persistent device state (an immutable notification channel) wrong: after a native change, rebuild the dev client and clear its app data before trusting it.

**Fix direction.** One detector: a path list plus an AGENTS.md override, with one home for the fact. Report it the way finalize reports `Env`: never blocking, always visibly run.

#### Status 2026-09-24 — prior art surveyed; design is two-tier

See `skills/toolkit-research-frontier/references/mobile-prior-art-survey-2026-09-24.md` §2.

**Expo already has both halves.**
- The mechanism is the **fingerprint**: `npx @expo/fingerprint fingerprint:generate`/`fingerprint:diff` and `runtimeVersion.policy: "fingerprint"`. `expo:eas-simulator` already uses it to decide when a build can be reused.
- The semantic rule is in `expo:eas-update`: "new native build when a change adds or modifies native code or native configuration".

**Design.**
- **Core, always present.** The path list, extended with config plugins, autolinked modules and SDK upgrades.
- **Precise tier.** A fingerprint diff whenever `expo-updates` or `@expo/fingerprint` is present.
- **Vocabulary.** Report in Radon's three rungs: JS reload, process restart, native rebuild.

### 89. live-verification has no native-app path — the agent built its own emulator playbook, and 9 of 11 runs left no report (2026-09-22)

Found 2026-09-22 in the mobile eval (`skills/toolkit-research-frontier/references/eval-mobile-2026-09-22.md`, A2).

**The body is browser-shaped.**
- Step 1 resolves a URL.
- Step 3 checks hover, Tab and Escape.
- Failure handling assumes a DOM.
- Evidence is console/network, with no `adb logcat`.
- The verdict template allows only ✓/✗.

**Routing is not the problem.** Mobile phrasings ("check it on the emulator", "verify it on my phone") routed to it in every trial of the router stratum.

**What the sessions show.**
- Right after the skill loaded, the agent's next move was to read its own memory file of emulator gotchas: 11 bullets, "each of these cost a failed attempt".
- Across the sessions, 223 of 950 Bash calls invoke `adb`, 167 take screencaps, and 210 Reads open a PNG.
- 227 Bash calls prefix a platform-tools PATH export, because adb was on the owner's interactive shell PATH only.
- The device-only verdict ("unchecked: the emulator has no haptics; goes to the phone") was invented in the field.
- Nine of the eleven verification runs have screenshots and no report. The two with reports are exactly the two where the skill loaded.
- Once, the user picked the recommended "verify live" option at CP-3, and the skill never loaded.

**Fix direction.** Add a platform branch to Steps 1, 3 and 4:
- A rebuild precondition (see #88).
- The project's own emulator and dev-client scripts first.
- An adb recipe: deep-link launch, `input tap`/`swipe`/`motionevent`, screencap, and a `logcat -d` error sweep.
- Stale-UI rules.
- A first-class `device-only` verdict that feeds a phone checklist.

Separately, a CP-3 "Verify it live" choice must load the skill. Hand platform mechanics to `expo:expo-dev-client` / `expo:eas-simulator` when they are installed.

#### Status 2026-09-24 — prior art surveyed; build as a three-rung ladder

See `skills/toolkit-research-frontier/references/mobile-prior-art-survey-2026-09-24.md` §1.

**Prior art.**
- `callstack/agent-device` is the most adopted device driver (MIT, about 540k npm downloads a month). Its skills already state our contract: findings come only from the running app, a blocked run reports the next command to try, and it never auto-installs.
- `mobile-next/mobile-mcp` is the MCP-only option, and the one that can read logcat and the iOS unified log.

**Design, under the no-plugin-deps ladder.**
1. **Core, in the skill's own files.** An adb/simctl recipe, a `logcat -d` sweep, the stale-UI and PATH rules, and a `device-only` verdict.
2. **Preferred driver.** agent-device or mobile-mcp when detected.
3. **Expo projects.** Defer build and install mechanics to `expo:expo-dev-client`/`expo:eas-simulator` when installed.

Recommend agent-device in the README, but never require it.

**Ours to write, since nobody else covers them:** the logcat sweep, uiautomator staleness, and the report template.

### 90. release treats an Expo app as a GitHub repo — wrong version file, no versionCode, OTA stranding unmentioned (2026-09-22)

Found 2026-09-22 in the mobile eval (`skills/toolkit-research-frontier/references/eval-mobile-2026-09-22.md`, A3).

**What goes wrong.**
- **Machinery detection falls through to git tag + `gh release`** whenever AGENTS.md has no release section.
- **The version guard reads the wrong file.** It reads "the manifest/package version". An Expo app's truth is `app.json` `expo.version`, and in the observed project the tags followed it while `package.json` lagged behind.
- **The dry-run misses two consequences.** `android.versionCode` must bump on every store upload. With `runtimeVersion.policy: appVersion`, a version bump cuts every installed build off from OTA.
- **"Deploying … out of scope" routes nowhere.** For an app, store submission and `eas update` *are* the release.

**Routing makes it worse.** In the router stratum, "ship v0.2.0 to the Play Store closed test" routed to `release` in every trial. "push this JS change over the air" went to `null` in every trial. In a closed catalog that is correct, because `expo:eas-update` owns OTA in a real install.

**Fix direction.** Add an Expo machinery row. It should:
- Detect `app.json` + `eas.json`.
- Read the version from the app config.
- Flag the versionCode and runtimeVersion effects in the dry-run.
- Hand store and OTA work to `expo:eas-app-stores` / `expo:eas-update`.

condux keeps the tag ceremony.

#### Status 2026-09-24 — prior art surveyed; version-source check first

See `skills/toolkit-research-frontier/references/mobile-prior-art-survey-2026-09-24.md` §3.

**The version-source correction.** Expo recommends `cli.appVersionSource: "remote"`. Under it:
- EAS holds only the build number (`versionCode`/`buildNumber`) and ignores the app-config values.
- `expo.version` stays in the app config, so this item's tag premise holds.

**What the release row must do.**
- Read `eas.json` first.
- Never bump `versionCode` in `app.json` under `remote`.
- Note that local Gradle/Xcode builds need `eas build:version:sync`.

**Ours to write.** Nobody names the `appVersion`-policy OTA stranding warning.

**Covered elsewhere.** Store and OTA mechanics are well covered by `expo:eas-app-stores`/`expo:eas-update`. Outside Expo, release is unowned.

### 91. coding-directive assumes Next.js and the DOM — expo-router route exceptions missing, React/toolchain rows web-only (2026-09-22)

Found 2026-09-22 in the mobile eval (`skills/toolkit-research-frontier/references/eval-mobile-2026-09-22.md`, A6).

**The export exceptions name only Next.js.** They list `page.tsx`, `layout.tsx` and `*.config.*`, but not the expo-router routes under `app/**` (`_layout.tsx`, `+not-found.tsx`, `+html.tsx`, `+api.ts`). A route written to the directive gets a named export and does not render. The observed project's AGENTS.md restates the exception by hand, so nothing broke there. A fresh Expo repo would hit it.

**`references/react.md` assumes the DOM.**
- `<button>` carries `type`; React Native uses `Pressable`.
- jsx-a11y; React Native uses `accessibilityRole` and `accessibilityLabel`.
- Keyboard and Escape parity; mobile needs back-button behaviour, screen-reader order and 48dp touch targets.

**`references/formatting-and-toolchain.md` assumes a web stack.**
- "`lib` includes DOM" hides a real class of mobile bug: DOM-assuming helpers that type-check and crash on device.
- There is no `expo/tsconfig.base` variant.

**Fix direction.** Add the expo-router exceptions, plus a small React Native/Expo delta, either as a reference file or as rows in the existing files.

#### Status 2026-09-24 — prior art surveyed

See `skills/toolkit-research-frontier/references/mobile-prior-art-survey-2026-09-24.md` §5.

- **The export exception has an authoritative source:** `expo:expo-router` `references/route-structure.md`, which says "every file should export a default component" and keeps `app/` to routes and `_layout` only.
- **Special files:** nobody names `+not-found`, `+html` or `+native-intent`, so cite the Expo docs.
- **DOM → React Native delta:** `expo-web-to-native`'s false-friends table is the model; write our own.
- **Touch targets:** 44pt/48dp plus `hitSlop`.
- **Counter-example:** vercel `react-best-practices` has the same web-shaped defect (zero React Native mentions, DOM-only rules). It doubles as a list of rules to fence off on native.

### 92. workflow and expo-overview both say "load first" — let the platform router ride along like house style does (2026-09-22)

Found 2026-09-22 in the mobile eval (`skills/toolkit-research-frontier/references/eval-mobile-2026-09-22.md`, A4).

**The contest.**
- condux's SessionStart hook says every implementation request starts at `/workflow`.
- `expo:expo-overview` (from `expo@claude-plugins-official`) says "Load this skill first — before writing code" in any repo with an `expo` dependency.
- condux wins the race, so expo-overview's shared rules are lost, e.g. `npx expo install` rather than a raw package-manager add, and SDK-pinned docs.

**What the sessions show.**
- The owner had to stop work to go looking for mobile skills.
- After installing them, the expo leaf skills fired twice. `eas-app-stores` fired inside a condux MEDIUM flow, complementary, with no conflict.
- Some never fired despite matching work: `eas-update` (11 `eas update` invocations after the install), `expo-dev-client` and `expo-router`. `vercel-react-native-skills` fired 0 times.

**Fix direction.** Generalize workflow rule 6 ("house style rides along") to cover platform routers. After tier confirmation, when the project carries a platform plugin's marker (e.g. an `expo` dependency), load that router, so the two layers compose instead of competing. This is a companion pairing, not a twin, so `condux-doctor/conflicts.json` is the wrong registry. Related: the researcher agent's chain (MCP → Context7 → docs) has no installed-skill rung.

**Open question.** Is the EXTREMELY_IMPORTANT routing framing suppressing domain triggers? That is unproven, and in trigger-reliability territory. Measure it with `eval-invocations.mjs` in a scratch fixture that has the expo plugin installed, never in a real project's tree.

#### Status 2026-09-24 — prior art surveyed; "rides along" confirmed compatible

See `skills/toolkit-research-frontier/references/mobile-prior-art-survey-2026-09-24.md` §4.

**Why "rides along" works with expo-overview.**
- expo-overview's "load first" is description-only. The Expo plugin's hooks are telemetry, so condux wins by mechanism.
- Its only skip condition is a user naming a leaf skill, so loading it after tier confirmation is not a skip.
- Scope its "Trust the leaf skill … Don't improvise" to domain steps.

**Plan for the unconditional-trigger case too.** Software Mansion's react-native-best-practices says "MUST USE before writing, reviewing, or debugging ANY code" in any React Native or Expo project. The same rides-along clause absorbs it as a companion.

### 93. condux contract erodes on long runs — tiers self-assigned, bypass recommended on LARGE, checklist never ticked, coders skip house style (2026-09-22)

Found 2026-09-22 in the mobile eval (`skills/toolkit-research-frontier/references/eval-mobile-2026-09-22.md`, B3–B6). These are platform-neutral defects, surfaced by a greenfield project run over a week. Each could be split out when picked up.

- **Multi-day erosion (B3).** One session ran four days with no compaction.
  - On its first day it asked 6 questions and loaded 7 skills over 145 tool calls.
  - On its last two days it asked 2 questions and loaded 3 skills over 386 tool calls and 13 commits.
  - Seven backlog tasks ran with no CP menus and no preflight, with tiers self-assigned from a bare "sure" ("I infer MEDIUM").
  - Gates still ran. A fresh session kept the full contract.
  - Candidate: treat "pick the next docket item" as a new task that re-enters `/workflow`.
- **The recommendation was the bypass (B4).** On work that had just grown to LARGE, the recommended option was "Sign off here, write the plan", which skips discovery. The user overrode it. On LARGE the recommended option must be discovery.
- **The plan checklist is never ticked on the implement-yourself path (B5).**
  - One plan shows 0/13 boxes ticked while its progress ledger says PLAN COMPLETE.
  - Another shows 0/10 after it shipped.
  - preflight loaded and did not flag either.
  - Only subagent-execution owns ticking. Give it to CP-2 or preflight, or drop the checklist from the inline path.
- **Coders skip house style (B6).** 4 of 9 coder subagents in the kickoff made 60 edits without loading coding-directive. Coder briefs should require the load, or inline the enforced tier.

## Loose threads
