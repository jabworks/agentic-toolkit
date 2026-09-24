# Mobile-development eval — 2026-09-22

How the toolkit serves mobile app work, measured on one real greenfield app
project: Expo, React Native, expo-router, a Kotlin local module, local Gradle
builds, `eas update`, an Android emulator. The project is private and is not
named here. Three lenses, run 2026-09-22:

1. **Transcript mine**: every Claude Code session of that project, over its
   first week (Front E method, all five categories).
2. **Content audit**: every shipping skill a mobile session touches, read
   against the project's AGENTS.md, README and tech spec.
3. **Router stratum**: 45 generic mobile queries, each paired with a web twin
   copied verbatim from the live corpus, 3 trials on the band's model.

**Headline.** Routing is not where mobile hurts. Mobile phrasings reach the
right skill at the same rate as their web twins. The losses are in the skill
bodies: they are web-shaped, and on a mobile project the agent has to
improvise past them. One cluster runs through four skills: no skill knows that
a native change needs a rebuild. Second, the project surfaced six
platform-neutral condux contract defects. The most serious: `workflow` cannot
load in a repo with no commits, and the agent made an unrequested commit to
force it.

Baseline fact: before this eval, `skills/` held zero mobile vocabulary. A
word-bounded grep for android, ios, emulator, expo, adb, logcat, gradle, eas
and simulator finds nothing outside research reports. The trigger corpus had
one mobile-adjacent case, and it is about web breakpoints.

## Method and coverage

- **Sources.** Seven working sessions and 15 subagent transcripts over one
  week, plus seven stub sessions with no user turns.
- **How fires were detected.** `Skill` tool_use blocks, their tool_result
  (launch or error), `<command-name>` slash commands, and `Read`/`cat` of a
  `SKILL.md`. That last source matters: the greenfield kickoff loaded its
  skills by `cat` (B1). No session compacted.
- **Verify the negative.** Each "didn't happen" was checked at the contract's
  own output location in the project's working state (the condux
  verification, plans, progress and designs dirs).
- **Coverage limits.**
  - Claude Code only: the project has no Codex sessions.
  - Some of its work ran on a second machine whose transcripts were not
    available.
  - The router harness shows only this toolkit's catalog, so collisions with
    the installed `expo@claude-plugins-official` plugin cannot appear in
    lens 3. Lens 1 is the only evidence on that seam.
- **Load-bearing claims re-verified by hand, not taken from the mining pass.**
  - B1: the Skill tool_result reads `Shell command failed for pattern "```!…"`,
    and `git status` exits 128 outside a repo.
  - A2: verification dirs with and without `report.md`.
  - B2: 5 CP-1 rows against the 4-option cap.
  - B3: per-day question and skill counts.
  - B5: checkbox counts in the plan files.
  - A2 counts (adb, screencaps, PATH exports, PNG reads) recounted from the
    raw transcripts.
  - A3: the app config version, `runtimeVersion.policy: appVersion`, and
    which file the tags follow.
  - A4: expo-overview's "Load this skill first".

## Lens 3 — router stratum

`--corpus` replay of 83 cases: 45 mobile cases and 38 web twins. Model
`claude-haiku-4-5-20251001`, batch 12, 3 trials, 0 failed batches.

- **Twins carry the live corpus's own oracle**, so each pair is scored on one
  yardstick. Every twin's `expected` was checked against its stratum at build
  time.
- **The mobile queries are generic phrasings** of the requests seen in the
  mined sessions, with project specifics removed.
- **The JSON beside this file is the frozen corpus** (`source` =
  `mobile:<stratum>` or `web:<stratum>`).

| stratum | mobile | per-trial | web twins | per-trial |
|---|---|---|---|---|
| live-verification | 6.0/6 | 6 / 6 / 6 | 6.0/6 | 6 / 6 / 6 |
| root-cause-analysis | 4.7/7 | 0 / 7 / 7 | 3.3/5 | 0 / 5 / 5 |
| blueprint | 4.0/4 | 4 / 4 / 4 | 4.0/4 | 4 / 4 / 4 |
| workflow | 7.0/7 | 7 / 7 / 7 | 5.0/5 | 5 / 5 / 5 |
| discovery | 2.3/3 | 1 / 3 / 3 | 2.3/3 | 1 / 3 / 3 |
| release | 2.0/3 | 2 / 2 / 2 | 3.0/3 | 3 / 3 / 3 |
| finalize, preflight, code-review, session-handoff | 4.0/4 | 4 / 4 / 4 | 4.0/4 | 4 / 4 / 4 |
| test-first-development, coding-directive, record | 6.0/6 | 6 / 6 / 6 | 6.0/6 | 6 / 6 / 6 |
| null | 5.0/5 | 5 / 5 / 5 | 2.0/2 | 2 / 2 / 2 |
| **all** | **41.0/45 (91.1%)** | 35 / 44 / 44 | **35.7/38 (93.9%)** | 31 / 38 / 38 |

How to read it:

- **The 91.1 vs 93.9 gap is composition, not routing.** Stratum by stratum,
  every pair scores the same except release. Trial 1 routed *every*
  root-cause-analysis case to `workflow`, mobile and web alike (12 → 0). The
  mobile side has 7 RCA cases to the web side's 5, so it absorbs more of that
  one trial.
- **That whole-trial flip is platform-neutral.** It has the same shape as the
  2026-09-19 band's RCA row (18 / 17 / 5). It is a known RCA↔`workflow`
  boundary, not a mobile finding. An earlier run of this stratum, on a draft
  corpus that still carried project-specific wording, gave the same picture:
  91.9% vs 94.7%, the flip in trial 3, every pair equal except release.
- **The harness headline hides this.** It reads `92.4% ± 27.6pp`, which is two
  clean trials plus that flip.
- **The one mobile-specific miss is correct in context.** "push this JS change
  over the air to the preview channel" → `null` in 3/3 trials. The catalog is
  closed to this toolkit. In a real install `expo:eas-update` owns OTA, so
  `null` here is the layering A4 proposes, not a reach gap.
- **The case that goes wrong is a hit.** "ship v0.2.0 to the Play Store closed
  test" routes to `release` 3/3, which knows only git tags and GitHub releases
  (A3). Correct routing into a web-shaped body is the pattern of this whole
  eval.
- **Disclosure.** The twins are in-distribution: they come from the corpus the
  descriptions were tuned against. The mobile phrasings are out of
  distribution, and they still match. That strengthens the result. Trigger
  text is written as intent ("verify", "mock up", "crashes"), and intent
  transfers.

## A. Mobile-specific gaps

Ranked by impact. **High** means following the skill as written does the wrong
thing on mobile. **Medium** means the skill is silent, so the agent improvises.

### A1. High — no skill knows a native change needs a rebuild

Some paths change the binary: `modules/**`, the `plugins`, `permissions` and
`version` fields of `app.json`/`app.config.*`, native dependencies in
`package.json`, and the generated `android/`/`ios/` trees. Four skills are
blind to this:

- **workflow.** Tier inference counts files and boundaries. A one-line Kotlin
  edit scores SMALL, but it costs a multi-minute Gradle build, a reinstall and
  a new APK.
- **finalize.** Its gates come correctly from AGENTS.md, and on this project
  they are JS-only (tsc, eslint, prettier, vitest). It still prints "Ready to
  commit" for uncompiled Kotlin.
- **live-verification.** It can drive a stale dev client.
- **release.** `eas update` cannot carry a native change. With
  `runtimeVersion.policy: appVersion`, a version bump also cuts every
  installed build off from OTA.

Field specimen: the agent wrote itself a memory note after a stale dev client
left persistent device state wrong (a notification channel, which Android
makes immutable). The rule it recorded: after a native change, rebuild the dev
client and clear its app data before trusting it.

Fix: one shared detector (a path list plus an AGENTS.md override), reported
the way finalize reports its `Env` line. It never blocks and is visibly
running.

### A2. High — live-verification has no native path; the agent built its own

- **The body is browser-shaped end to end.**
  - Step 1 resolves a URL.
  - Step 3 checks hover, Tab and Escape.
  - Failure handling assumes a DOM.
  - Evidence is console/network, with no `adb logcat`.
  - The verdict template allows only ✓/✗; `unchecked` exists only in the
    fallback.
- **What the agent did after loading it.** Its next calls read its own memory
  file of emulator gotchas (11 bullets, "each of these cost a failed attempt")
  and searched for how to launch the dev client by deep link over adb.
- **Across the sessions** (recounted from the raw transcripts, subagents
  included):
  - Of 950 Bash calls, 223 invoke `adb` and 167 take a screencap.
  - 210 `Read`s open a PNG.
  - 227 of the 950 (24%) start with `export PATH=…platform-tools`, because adb
    was on the owner's interactive shell PATH only.
- **Wrong turns:**
  - A stale `uiautomator dump` read as current.
  - Taps landing on the launcher after a force-stop.
  - A misfired scripted tap that triggered an unintended in-app action.
- **The device-only verdict was invented in the field.** "unchecked: the
  emulator has no haptics; goes to the phone" covers haptics, Doze, frame rate
  and background timing.
- **Nine of eleven verification runs left no report.** The eleven verification
  dirs hold 4 to 31 screenshots each. Only the two where the skill loaded
  contain a `report.md`.
- **The skill failed to load when chosen.** Once, the user picked the
  recommended "verify live" option at CP-3, and live-verification never
  loaded.
- **Prediction corrected.** The content audit predicted "check it on the
  emulator" had no lexical anchor. Measured: 6/6/6. The gap is the body, not
  the trigger.

Fix:

- A platform branch in Steps 1, 3 and 4. For mobile: a rebuild precondition
  (A1), the project's own emulator/dev-client scripts first, the adb recipe
  (deep-link launch, tap/swipe/`motionevent`, screencap, `logcat -d` sweep),
  stale-UI rules, and a first-class `device-only` verdict that feeds a phone
  checklist.
- A CP-3 "Verify it live" pick must load the skill.

### A3. High — release treats an Expo app as a GitHub repo

- **Machinery detection falls through to git tag + `gh release`** whenever
  AGENTS.md has no release section.
- **The version guard reads the wrong file.** It reads "the manifest/package
  version". An Expo app's truth is `app.json` `expo.version`: in this project
  the tags followed the app config while `package.json` lagged behind.
- **Store and OTA consequences are missing.** `android.versionCode` must bump
  per store upload, and a version bump strands OTA under `appVersion`; the
  dry-run never mentions either.
- **"Deploying … out of scope" routes nowhere.** For an app, store submission
  and `eas update` *are* the release.
- **Routing makes it worse** (lens 3): "ship … to the Play Store" lands here.
- **The one mobile-aware touch:** the single observed fire offered to attach
  the APK to the release.

Fix: an Expo machinery row. It detects `app.json` + `eas.json`, reads the
version from the app config, flags the versionCode and runtimeVersion effects,
and hands store/OTA work to `expo:eas-app-stores` / `expo:eas-update`. condux
keeps the tag ceremony.

### A4. Medium-High — two routers both claim "load first"; the platform one loses

- **The contest.** condux's SessionStart hook says every implementation
  request starts at `/workflow`. `expo:expo-overview` says "Load this skill
  first — before writing code" in any repo with an `expo` dependency.
- **condux wins the race, so expo-overview's shared rules are lost.** Examples:
  `npx expo install` rather than a raw package-manager add, and SDK-pinned
  docs.
- **The toolkit's missing coverage cost the owner a detour.** They stopped
  work partway through the project to go looking for mobile skills to
  install.
- **After install, expo leaf skills fired twice.** `eas-app-stores` fired
  inside a condux MEDIUM flow, complementary with no conflict, and
  `expo-animation` fired once.
- **Some never fired despite matching work.** `eas-update` (11 `eas update`
  invocations after the install, retries included), `expo-dev-client`,
  `expo-router`, and `vercel-react-native-skills` fired 0 times.
- **Unproven hypothesis:** the EXTREMELY_IMPORTANT routing framing crowds out
  domain triggers. This is the retired-nudge territory of the
  trigger-reliability workstream. Test it, don't assert it.

Fix: generalize workflow rule 6 ("house style rides along") to "the platform
router rides along". After tier confirmation, when an `expo` dependency
exists, load expo-overview, and have live-verification and release delegate
platform steps to the named expo leaf skills when installed. This is a
companion pairing, not a twin. `condux-doctor/conflicts.json` ("run one or the
other") is the wrong registry for it.

### A5. Medium — native targets never settle how a change will be observed

- **The owner was the verification loop.** Before an emulator existed, the
  owner relayed device errors back to the agent over several turns, and
  questioned whether the on-device spikes were worth their ceremony. The agent
  agreed two of them were not.
- **The emulator came only when the owner asked for one.**
- **Nobody decided local vs cloud build up front.** It came up only after a
  slow cloud build.

Fix: for native targets, discovery/draft-plan settle the verification surface
(emulator, dev client, device-only claims) and the build loop (local vs cloud)
at design time.

### A6. Medium — coding-directive assumes Next.js and the DOM

- **High in principle, mitigated here.** The default-export exceptions name
  Next.js `page.tsx`/`layout.tsx`, not expo-router routes (`_layout.tsx`,
  `+not-found.tsx`, `+html.tsx`, `+api.ts`). A route written to the directive
  gets a named export and does not render. The project's AGENTS.md restates
  the exception, so no harm was observed. A new Expo repo without that line
  would hit it.
- **The React reference assumes the DOM:** `<button type>`, jsx-a11y, and
  keyboard/Escape parity. RN uses `Pressable`, accessibility props, back
  behaviour and 48dp targets.
- **The toolchain reference assumes a web stack.** `lib` includes DOM, which
  hides a real class of mobile bug that the project's spec records: helpers
  that assume the DOM type-check and then crash on device. There is no
  `expo/tsconfig.base` variant.

Fix: add the expo-router exceptions, plus a small RN/Expo delta file or rows.

### A7. Medium — smaller body gaps

- **root-cause-analysis.** No mobile evidence sources (logcat, redbox,
  tombstones) and no mobile staleness classes (dev client older than the
  diff, OTA vs embedded bundle, Fast Refresh). Both observed fires were
  correct. One locked-screen bug skipped it and went straight to a plan.
- **preflight.** The edge cases are server-shaped. The app lifecycle is
  missing: backgrounding, process death, a permission revoked, Doze, GL
  context loss. The project's spec had to record these as quirks, because
  the checklist never raised them.
- **session-handoff.**
  - The snapshot records Docker, the dev-server port and migrations.
  - The build state is missing: which APK is installed, whether a rebuild is
    pending, the last OTA channel, the emulator. That matters most when
    handing off across machines, and this project does so routinely; the
    binary does not travel with git.
  - It otherwise held up well: 8 fires, carrying work between two machines.
- **blueprint.**
  - The wireframe kit is desktop-shaped: a 1100px frame and
    sidebar-collapse examples. It has no phone frame, safe areas, tab bar,
    bottom sheet or gesture callouts.
  - It fired once, for an SVG state diagram.
  - It drew zero phone wireframes across about 12 UI tasks.
- **subagent-execution agents.** The researcher's chain skips installed
  skills, although the owner's global rule is MCP → skill → docs. The explorer
  does not know `android/`/`ios/` are generated.
- **adapting-skills.** "`type: module` everywhere" would break Expo's CJS Metro
  and Babel configs. There is no mobile stack row.
- **code-review.** Security and performance dimensions are web/backend only.
  A mobile lens is missing: manifest permissions, `EXPO_PUBLIC_` values in the
  bundle, JS-thread work in gestures, GL disposal. Low: the generic dimensions
  still catch logic bugs.

## B. Contract defects this project surfaced (platform-neutral)

A greenfield project run over a week exposed condux defects that have nothing
to do with mobile.

### B1. High — `workflow` cannot load in a repo with no commits; the agent committed to force it

- **The failing block.** `skills/workflow/SKILL.md:21` is a ```` ```! ````
  live-context block (`git status --short`, `git log --oneline -5`). With no
  `.git` it exits 128, and with no commits `git log` fails. Claude Code then
  refuses the whole skill ("Shell command failed for pattern …").
- **The unrequested commit.** In the kickoff session the load failed twice.
  The agent ran `git init` and then **`git commit --allow-empty -m "chore:
  initialize repository"`**, which nobody asked for, only to satisfy the
  skill.
- **The fallback.** In the next session it failed twice more, and the agent
  `cat`-ed workflow, discovery, subagent-deployment, draft-plan and
  technical-spec from the plugin cache. The entire kickoff ran on cat'd text.
  That is also why two apparent routing misses in that session are false.
- **Scope.** It is the only `` ```! `` block in `skills/`, and it hits every
  new-project kickoff.
- **Fix.** Fail open: `git status --short 2>/dev/null || echo "(no git repo
  yet)"` and `git log --oneline -5 2>/dev/null || true`. Add a fixture test
  that loads the live context in a non-git dir. The doctrine is the same as
  `condux-hooks.test.mjs`'s fail-open assertion on `session-start.mjs`.

### B2. Medium-High — CP-1 has five rows; AskUserQuestion takes four

- **Confirmed by construction.** `workflow/SKILL.md`'s CP-1 table has 5
  options; the tool caps at 4.
- **Observed.**
  - Two CP-1 menus merged the two agent rows into "Use agents", which is
    exactly the erosion `2cc080d` fixed.
  - Four other menus kept both agent rows and pushed "Revise the plan" into
    Other.
  - One CP-3 was replaced by a custom menu with no "Verify it live" or "Code
    review" row.
- **Fix.** Put the four-slot shape in the skill itself: say explicitly that
  Revise travels as Other, or split CP-1 into two questions.

### B3. Medium — the contract erodes over a multi-day session

- **Session.** One session ran four days with no compaction.
  - On its first day it asked 6 questions and loaded 7 skills over 145 tool
    calls.
  - On its last two days it asked 2 questions and loaded 3 skills over 386
    tool calls and 13 commits.
- **What went missing.** Seven backlog tasks ran with no CP menus and no
  preflight, with tiers self-assigned from a bare "sure" ("I infer MEDIUM",
  "each as a SMALL task").
- **What held.** The gates still ran, so quality held. The process did not. A
  fresh session later kept the full contract on both of its tasks.
- **Fix.** "Pick the next docket item" is a new task: re-enter `/workflow`, or
  nudge a handoff per item.

### B4. Medium — soft gates weakened by the agent's own recommendation

- **The bypass was the recommendation.** On work that had just grown to
  LARGE, the recommended option was "Sign off here, write the plan", which
  skips discovery. The user overrode it, and the discovery that followed ran
  every section to sign-off.
- **The kickoff had no sign-offs.** The greenfield discovery had no
  per-section sign-off, and the tier was never confirmed. The cat fallback
  (B1) likely compounded this.
- **Fix.** On LARGE the recommended option is discovery. The bypass is never
  the recommendation.

### B5. Medium — the plan checklist is never ticked on the implement-yourself path

- **Two unticked plans.**
  - One plan shows 0/13 boxes ticked, while its progress ledger says "PLAN
    COMPLETE".
  - Another shows 0/10 ticked after it shipped, and it has no ledger.
- **Nobody catches it.** preflight loaded and did not flag it. Only
  subagent-execution owns ticking; the one fully ticked plan was ticked by
  hand.
- **Fix.** Give CP-2 or preflight ownership of ticking, or drop the checklist
  from the inline path.

### B6. Medium-Low — subagents skip house style

- **Coders.** 4 of 9 coder subagents in the kickoff made 60 edits without
  loading coding-directive.
- **Researchers.** Researcher briefs had to override the lockfile step on a
  project with no code yet.
- **Fix.** Coder briefs require the coding-directive load, or inline the
  enforced tier.

### B7. Low — finalize guessed a command before reading AGENTS.md

It ran `pnpm typecheck` (`Command "typecheck" not found`) before the
project's actual type-check script, and recovered 12 s later. Otherwise its
gate order matched AGENTS.md.

## What held up

- **session-handoff** carried work between two machines through committed
  handoffs, 8 times.
- **docket works MCP-first:** `docket_add` ×15, `docket_close` ×4, `docket_next`
  answering "what's next". Trigger audits must not score MCP use as a missed
  `record`/`groom`.
- **`expo:eas-app-stores` fired inside a condux flow with no conflict.** The
  predicted release↔expo collision was not observed.
- **Genuine abandonment: none.** Every plan started was finished or is in
  flight.
- **Correctly generic, no change needed:** discovery, draft-plan, plan-review,
  technical-spec, subagent-deployment, record, groom, git-commit, and the
  coder agent. test-first-development gets only a Low note: add native, GL and
  gesture code to "poor candidates", and name the pure-domain lever.

## Predictions vs observations

| Content-audit prediction | Observed | Verdict |
|---|---|---|
| "check it on the emulator" has no anchor in live-verification | 6/6/6 in lens 3 | wrong: the gap is the body (A2) |
| release collides with expo-overview / eas-app-stores | eas-app-stores fired inside a condux flow, complementary | not observed |
| "mock up the shop screen" collides with image-gen/Figma | 4/4/4 to blueprint (closed catalog) | untestable here; needs an invocation run |
| native changes go unnoticed | the agent's own "rebuild and clear the dev client" memory note | confirmed in the field (A1) |

## Limitations

- **Router strata are small** (1 to 7 cases). Read them as paired
  comparisons, not as rates.
- **Lens 3 cannot see cross-plugin collisions.** The next measurement for A4
  is `scripts/eval-invocations.mjs --cwd <fixture>`, run with the expo plugin
  installed. It should be a scratch fixture, never a real project's tree:
  headless agents write auto-memory and transcripts keyed on the cwd.
- **The mine is one project and one owner**, and Claude-only.

## Filed

All filed 2026-09-22 under Someday.

| docket | finding |
|---|---|
| #86 | B1: workflow cannot load in a repo with no commits |
| #87 | B2: CP-1 has five options, the tool takes four |
| #88 | A1: native-change detector for workflow, finalize, live-verification and release |
| #89 | A2: live-verification native-app path, plus the CP-3 no-load |
| #90 | A3: release on Expo apps |
| #91 | A6: coding-directive expo-router exceptions and DOM assumptions |
| #92 | A4: platform router rides along (rule 6), plus the researcher's installed-skill rung |
| #93 | B3–B6: the contract-erosion cluster |

**Not filed; they stay in this report.**

- **A5:** discovery and draft-plan settle the verification surface and build
  loop for native targets.
- **A7:** RCA mobile evidence sources, preflight app lifecycle,
  session-handoff build state, blueprint phone frame, adapting-skills
  `type: module`, code-review mobile lens.
- **B7:** finalize guessed a command before reading AGENTS.md.

File them when one of them bites, or fold them into the item they sit next
to (for example, blueprint's phone frame the next time a mobile UI design
needs wireframes).

## Replay

```sh
node scripts/eval-triggers.mjs --corpus skills/toolkit-research-frontier/references/eval-mobile-2026-09-22.json --runs 3 --out <report.md>
```

The per-stratum table above is not a harness feature. It was computed from
the JSON's `runs` arrays with `isHit` from `scripts/trigger-eval-score.mjs`,
grouped by `source`. If paired strata become a habit, the split belongs in
the score module with a test (see the eval-report-semantics rule), not in a
one-off script.

## Appendix — raw harness output

Final-run tables are final-run only by design; the paired table above
aggregates all three trials.

Trials: 3 · per-run: 79.5% / 98.8% / 98.8% · mean **92.4% ± 27.6pp** (95% CI,
t-dist) · flaky cases: 16. Final run: 82/83 = 98.8%. Disallowed: 0 cases carry
it.

| expected | accuracy | per-trial |
|---|---|---|
| root-cause-analysis | 8.0/12 | 0 / 12 / 12 |
| discovery | 4.7/6 | 2 / 6 / 6 |
| release | 5.0/6 | 5 / 5 / 5 |
| live-verification | 12.0/12 | 12 / 12 / 12 |
| blueprint | 8.0/8 | 8 / 8 / 8 |
| workflow | 12.0/12 | 12 / 12 / 12 |
| finalize | 2.0/2 | 2 / 2 / 2 |
| preflight | 2.0/2 | 2 / 2 / 2 |
| code-review | 2.0/2 | 2 / 2 / 2 |
| test-first-development | 4.0/4 | 4 / 4 / 4 |
| coding-directive | 4.0/4 | 4 / 4 / 4 |
| session-handoff | 2.0/2 | 2 / 2 / 2 |
| record | 4.0/4 | 4 / 4 / 4 |
| (null) | 7.0/7 | 7 / 7 / 7 |

Flaky (hit in some trials, missed in others):

- All 12 root-cause-analysis cases: 2/3 each, missed to `workflow` in trial 1.
- The two "i have a rough idea…" discovery cases: 2/3, missed to `null`.
- The two "lets figure out…" discovery cases: 2/3, missed to `workflow`.

Missed in every trial: "push this JS change over the air to the preview
channel" → `null` (see the lens 3 reading).
