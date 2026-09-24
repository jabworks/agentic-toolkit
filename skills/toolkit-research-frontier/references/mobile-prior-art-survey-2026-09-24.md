# External survey — mobile agent skills and device tooling (2026-09-24)

Prior art for the fixes the mobile eval filed (`eval-mobile-2026-09-22.md`,
dockets #88–#92), read before any of them is designed. Two sweeps:

1. **The two skill sets already installed on mobile projects:** the Expo Claude
   Code plugin (`expo@claude-plugins-official` 1.13.6, 25 skills) and
   `vercel-labs/agent-skills` (`063bee9`: react-native-skills,
   react-best-practices, composition-patterns).
2. **A web sweep for the most-adopted third-party mobile tooling.** It covers
   skills, plugins, rules files and device-driving MCP servers, ranked by
   skills.sh installs, npm downloads and stars.

Findings are ranked by how much they change the work, each tied to its docket
item. Every third-party text quoted here is 2 lines or fewer.

**The design constraint every finding answers to.** A toolkit skill must work
from its own files alone, and cross-plugin dependencies are banned (the
degrade-gracefully ladder, docket #6). "Hand off to Expo" or "use agent-device"
therefore never means *require* it. Each fix ships a minimal self-contained
core, and *prefers* the stronger tool when it detects one installed. The
survey's job is to say what that core should be and what it should defer to.

**Scope note.** The installed Expo plugin covers most of what the eval found
missing. The popular third-party value is almost entirely in **device-driving
tooling**, not in knowledge skills.

---

## 1. Device verification has a clear best tool, and its skills already match our contract — #89

**What exists.**

- **callstack/agent-device** is the most adopted: 4,757★, MIT, 539,655 npm
  downloads last month, 15.2K skills.sh installs.
  - It is a CLI with a built-in MCP server (`agent-device mcp`), covering iOS
    and Android simulators, emulators and devices.
  - It drives the accessibility tree (`snapshot` with `@eN` refs,
    `press`/`fill`), and takes screenshots and video.
  - It reads logs (`logs clear --restart`, `logs mark`), plus network, perf
    frames and crash symbolication.
  - It dismisses RN LogBox/RedBox overlays, and can replay flows or export
    them to Maestro YAML.
- **Its skills already state what our live-verification contract says:**
  - "Prove the changed behavior through public agent-device surfaces. Do not
    validate against stale dist output…" (`help validate`).
  - Blocked runs must "state the blocker, device/session, and exact next
    command needed".
  - "Findings must come from runtime behavior, not source reads" (`dogfood`).
  - Installation is a "user-owned setup step. Do not run that command
    autonomously."
- **mobile-next/mobile-mcp** is the leading MCP-only option: 6,839★,
  Apache-2.0, 102,387 npm downloads last month. It is the one tool with a log
  reader: `mobile_get_device_logs` returns "logcat on Android, unified log on
  iOS".
- **Expo's own recipes** exist in two forms:
  - `eas-simulator` drives a *cloud* simulator through agent-device. It
    carries the rule "reset once, then stop and report", and "a still can't
    prove motion" (record video instead).
  - `expo-web-to-native/references/verify-on-device.md` is the local
    simctl/adb recipe: `adb exec-out screencap -p`, deep links through
    `am start -d`, `screenrecord`, and `--clear` for stale bundles.
- **The device-only verdict has prior art twice:**
  - expo-animation: "Feel is judged on a release build on the slowest device
    you support. Nothing else counts as verified."
  - Software Mansion's pulsar-haptics: "Never report hardware validation that
    was not performed."
- **Maestro MCP** has durable YAML flows but no log tool.
- **MobileBuildMCP** (formerly XcodeBuildMCP, 381k npm downloads a month)
  remains Apple-only despite the rename.

**What nobody covers.** A `logcat -d` error sweep as a verification step,
stale `uiautomator dump` rules, the adb-not-on-PATH trap, and a claims-table
report template with a device-only row. Those are ours to write.

**Decision it forces for #89.** Build the native branch as a three-rung ladder:

1. **Core (always present).** A short adb/simctl recipe in the skill's own
   files: deep-link launch, tap/swipe, screencap, `logcat -d` sweep, and the
   stale-UI and PATH rules. Plus the `device-only` verdict and report rows.
2. **Preferred driver.** When `agent-device` (or mobile-mcp) is detected, use
   it for driving and logs. Adopt its blocker-report and no-auto-install rules
   verbatim in spirit.
3. **Expo projects.** Defer build and install mechanics to `expo:expo-dev-client`
   / `expo:eas-simulator` when that plugin is installed.

Recommend agent-device in the skill's README as the tool to install. Never
make it a requirement.

## 2. The rebuild question has a mechanism — the fingerprint — plus a semantic rule — #88

**What exists.**

- **Expo's semantic rule** (`eas-update/SKILL.md:69`): "Create a new native
  build when a change adds or modifies native code or native configuration,
  including most native-library additions and SDK upgrades."
- **Expo's mechanism is the fingerprint**, a hash of the project's native
  characteristics.
  - Commands: `npx @expo/fingerprint fingerprint:generate` / `fingerprint:diff`,
    or `npx expo-updates fingerprint:generate --platform <p>`, and the
    `runtimeVersion.policy: "fingerprint"`.
  - `eas-simulator` already uses it for build reuse: "reuse only a
    fingerprint-matched build, else build fresh."
- **Software Mansion's Radon guide** has the clearest escalation for
  in-session reloads: `reloadJs` (seconds) → `restartProcess` (seconds) →
  `rebuild` (minutes; "Changed native code, added/removed native dependency,
  changed build config"), and "Always start with the lightest method and
  escalate".
- **agent-device** agrees: "rebuild only for native changes or dependency
  changes that affect the binary."
- **Neither non-Expo source mentions OTA compatibility or runtimeVersion.**

**Decision it forces for #88.** The detector has two tiers:

- **Core.** The eval's path list (`modules/**`, app-config native fields,
  native dependencies, `android/`/`ios/`), extended by the triggers Expo
  names: config plugins, autolinked modules, SDK upgrades. It is cheap,
  offline, and works on any RN project.
- **Precise tier.** When the project has `expo-updates` or `@expo/fingerprint`,
  diff the current fingerprint against the installed build's. That is the
  authoritative answer and it catches cases no path list can.
- **Report shape.** Use Radon's three rungs as the vocabulary: JS reload /
  process restart / native rebuild. It maps directly onto workflow tier cost,
  finalize's `Native` line and live-verification's precondition.

## 3. Release needs a version-source check first; otherwise Expo owns it — #90

**What exists.**

- **`expo:eas-app-stores`** covers build and submit (`--auto-submit`,
  `npx testflight`), `versionCode` per Play upload, iOS `buildNumber`, and
  `eas build:version:get/set`.
- **`expo:eas-update`** covers the runtime-version model, "Do not change the
  project's runtime-version policy as an incidental fix", and
  production-only-with-explicit-approval.
- **Outside Expo, release is unowned.** No popular third-party skill covers
  version source of truth, build numbers, OTA vs store, or submission.

**The correction to the eval.** Expo recommends `cli.appVersionSource:
"remote"`. Expo's docs (`build-reference/app-versions`) are precise about what
that moves: EAS then holds only the **developer-facing build version**
(`android.versionCode` / `ios.buildNumber`), and "the build version values
stored in app config are ignored". The user-facing `expo.version` stays in the
app config, so the eval's "tags follow `expo.version`" premise holds. Two
things change:

- Under `remote`, release must never bump `versionCode` in `app.json`, because
  EAS ignores it.
- Local Gradle/Xcode builds need `eas build:version:sync` to pick up the
  remote build number.

The eval's project runs exactly this configuration: `remote` plus local Gradle
builds.

**Still new content (nobody names it).** A version bump under
`runtimeVersion.policy: "appVersion"` cuts every installed build off from OTA.
The dry-run warning for that is ours to write.

**Decision it forces for #90.** The Expo machinery row:

1. Reads `eas.json` `cli.appVersionSource` first.
2. Takes the tag version from `expo.version`.
3. States where the build number lives.
4. Flags the `appVersion` stranding case.
5. Defers store submission and OTA publishing to the expo skills when
   installed. Without them, it names the commands and stops. It never
   improvises a store submission.

## 4. Composition: condux wins by mechanism, and "rides along" fits — #92

**What exists.**

- **expo-overview's claim is weaker than it reads.** Its "Load this skill
  first" lives only in its description.
  - The Expo plugin's hooks are telemetry (`PostToolUse` and
    `UserPromptExpansion` running `skill-event.cjs`). It has no SessionStart
    hook, so condux's injected routing wins on mechanism, not wording.
  - Its only skip condition is a user naming a leaf skill. Loading it *after*
    tier confirmation is not a skip.
  - Its README softens the claim further: "the entry point when a request is
    vague".
- **Across the web sweep, the ecosystem converges on thin index skills.**
  - The SKILL.md is a short index that routes to references or to versioned
    CLI help (`agent-device help <topic>`; MobileBuildMCP's "Help-First
    Discovery").
  - Triggers are scoped to a topic or tool (Callstack, agent-device), and
    those coexist with a router.
  - Nobody else ships a SessionStart hook or a process router.
- **The anti-pattern to plan for is Software Mansion's react-native-best-practices.**
  It says "MUST USE before writing, reviewing, or debugging ANY code in a
  React Native or Expo project", with package.json detection. That is the
  unconditional platform trigger that fights a load-first router.

**Decision it forces for #92.**

- Generalize workflow rule 6 ("house style rides along") into "platform
  routers ride along". After tier confirmation, when an installed platform
  skill claims the project (expo-overview, or an unconditional trigger like
  SWM's), load it for domain steps. Its "Trust the leaf skill … Don't
  improvise" is then scoped to domain steps, never to condux's gates or
  checkpoints.
- The same clause absorbs an unconditional platform trigger. It becomes a
  companion, not a competitor.
- `condux-doctor/conflicts.json` stays twins-only.

## 5. Conventions: Expo has the rules; web-shaped React skills are the counter-example — #91

**What exists.**

- **Expo's authoritative route rule** (`expo-router/references/route-structure.md:10`):
  "every file should export a default component", and `app/` holds routes and
  `_layout` only.
- **expo-project-structure** adds one named export per shared component and
  `.web.tsx` platform files, with a required default file.
- **`expo-web-to-native/references/false-friends.md`** is a ready web → native
  table: `<button>`→`Pressable`, `onClick`→`onPress`, no hover, flex-column
  default, no `position: fixed`, `window.location`→`usePathname`.
- **Touch targets:** 44pt/48dp with `hitSlop` (expo-animation).
- **Not named anywhere:** `+not-found`, `+html`, `+native-intent`. Only `+api`
  is covered, so cite the Expo docs for the rest.
- **vercel react-best-practices is the web-shaped defect in someone else's
  skill.**
  - It has zero React Native mentions, yet "React components" would fire it
    on RN work.
  - It carries DOM-only rules: `rendering-resource-hints`, `js-cache-storage`,
    `js-request-idle-callback`, the hydration and bundle families.
  - Its RN-safe rules are a useful list to cross-check our own:
    `rendering-conditional-render` (ternary, not `&&`), `rerender-*` and
    `async-*`.
- **vercel react-native-skills** contributes performance and UI rules
  (FlashList, `Pressable`, Text wrapping, "Avoid falsy && … crashes on RN").
  Nothing for the rest.

**Decision it forces for #91.** The coding-directive RN/Expo delta:

- **Export exceptions.** Add `app/**` routes and `_layout`, the `+`-prefixed
  special files, and `*.config.*`.
- **Fence off DOM rules.** Name the DOM-only rules that do not apply on
  native, the way react-best-practices shows is necessary.
- **Borrow the false-friends shape** for a short table in our own words.
- **Accessibility numbers.** Take 44pt/48dp + `hitSlop`.

Quote Vercel with attribution only. Its repo has no LICENSE file; MIT is
declared in the README and frontmatter.

---

## Negative findings — checked, nothing to take

- **Knowledge skills outside Expo are thin for our problems.**
  - Callstack's `react-native-best-practices` (26.8K installs) is
    performance-only.
  - Jeffallan's `react-native-expert` (4.5K) asserts "verify on simulator"
    with no tooling, and still recommends Flipper.
  - The awesome-cursorrules RN rules are static prose, last pushed May 2026.
- **Rejected on size or staleness.** Metro/CDP MCP servers (metro-mcp 81★ and
  smaller) and small adb MCP servers (android-mcp-server, stale since
  2025-05). Also awesome-react-native-skills (11★, GPL-3.0) and expo-toolkit
  (5★). agent-device covers their ground.
- **ios-simulator-mcp** (2,181★) is cited in Anthropic's best-practices post,
  but it is iOS-only with no logs. agent-device and mobile-mcp supersede it
  for cross-platform work.
- **One structural note, not a finding.** Callstack ships each bundle with
  both `.claude-plugin` and `.codex-plugin`, the same dual-host shape as this
  toolkit. It is the only other repo found doing so.

## Popularity numbers — read with care

Stars count whole repos (Maestro's 15.8k is the CLI; Jeffallan's 11.6k spans
67 skills). skills.sh counts only the skills channel, so MCP adoption shows
in npm instead: mobile-mcp has 11 skill installs but ~102k npm downloads a
month. Compare tools within one channel.

## Provenance

- **Expo plugin 1.13.6.** Read from the local plugin cache. Upstream is
  `github.com/expo/skills`, MIT, © 650 Industries.
- **Expo docs.** The MCP page, `build-reference/app-versions`, and the
  fingerprint docs, fetched through Context7.
- **vercel-labs/agent-skills.** Commit `063bee9`, read through the GitHub API.
- **Web-sweep candidates.** Read on 2026-09-24.
  - Stars and licenses come from the GitHub API, npm figures from
    `api.npmjs.org` (last month), and installs from skills.sh.
  - agent-device's and mobile-mcp's star and download counts and licenses, the
    agent-device rebuild quote and the Software Mansion trigger quote were
    re-fetched to verify them.
- **Candidates checked:** callstack/agent-device, mobile-next/mobile-mcp,
  getsentry/MobileBuildMCP, Maestro MCP, joshuayoes/ios-simulator-mcp,
  callstackincubator/agent-skills, software-mansion-labs/skills,
  Jeffallan/claude-skills, PatrickJS/awesome-cursorrules.
- **Search log.** Nine queries, with each rejection and its reason. It lived
  in the session's scratch notes and was not committed. The rejected names are
  listed above.
