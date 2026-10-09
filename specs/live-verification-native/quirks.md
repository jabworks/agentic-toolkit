# Quirks — live-verification-native

Each mitigation is a rule written into `skills/live-verification/references/native-app.md`
unless the row says otherwise. `yes` means the rule is on the page an agent reads; nothing
here has a runtime.

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | `adb` not found, or found only after a PATH export on every call | platform-tools on the interactive shell's PATH only | medium | yes |
| Q2 | A tap lands on the wrong element | coordinates from a stale screenshot or `uiautomator dump` | high | yes |
| Q3 | `uiautomator dump` fails with "could not get idle state" | an animation or a looping view is running | low | yes |
| Q4 | A verdict is driven on a binary that lacks the change | a native change verified without a rebuild | high | yes (Step 1, #88) |
| Q5 | A LogBox / RedBox overlay hides the UI under test | a JS warning or error during the run | medium | yes |
| Q6 | Something only a physical device can show gets reported ✓ | haptics, camera, biometrics, push, feel | high | yes |
| Q7 | iOS has no core recipe | an iOS-only claim, or no Mac to run the simulator | medium | partial |
| Q8 | The resolved adb sees no devices while the project has emulators | emulators hosted on another OS behind a wrapper or a non-default adb server | high | yes |
| Q9 | The launch targets the wrong package or scheme | an `app.config.*` that changes both per build variant | medium | yes |

## Q1 — adb off PATH

**Discovered:** 2026-09-22, mobile eval (A2)

**Symptom:** `adb: command not found`, or 227 Bash calls each prefixed with a PATH export.
**Trigger:** platform-tools added to the PATH only in the user's interactive shell profile.
**Cause:** the agent's shell does not keep state between calls, so an `export` lasts one command.
**Mitigation:** resolve once — `command -v adb`, then `$ANDROID_HOME/platform-tools/adb`, then `$ANDROID_SDK_ROOT/platform-tools/adb` — and call it by absolute path every time. Not found → report the blocker with the exact next command; never install the SDK.

## Q2 — Stale coordinates

**Discovered:** 2026-09-22, mobile eval (A2)

**Symptom:** a tap opens the wrong screen, or nothing happens.
**Trigger:** tapping from a screenshot or dump taken before the last transition.
**Cause:** a dump or screenshot is valid only for the moment it ran.
**Mitigation:** a fresh screenshot before any tap that changes state; re-dump after every transition; take coordinates from the dump's `bounds`, never estimate them from an image.

## Q3 — Dump fails on a busy screen

**Discovered:** 2026-10-09, design

**Symptom:** `uiautomator dump` exits with "could not get idle state".
**Trigger:** a running animation, spinner, or video.
**Cause:** uiautomator waits for the UI to go idle before it dumps.
**Mitigation:** poll — retry the dump after the animation should have finished; a screen that never goes idle is a finding, not a reason to guess coordinates.

## Q4 — Stale binary

**Discovered:** 2026-09-22, mobile eval (#88)

**Symptom:** the change "doesn't work" on the emulator.
**Trigger:** a native-layer change verified on the previously installed build.
**Cause:** JS reloads do not change the binary.
**Mitigation:** SKILL.md Step 1's rebuild-first paragraph, driven by finalize's native-change check (`skills/finalize/references/native-change.md`). The report's `Build` key records which build was driven.

## Q5 — Overlays hide the UI

**Discovered:** 2026-10-09, design

**Symptom:** a screenshot shows a yellow or red overlay instead of the screen under test.
**Trigger:** a React Native warning (LogBox) or error (RedBox) during the run.
**Cause:** dev builds surface JS warnings and errors as full-screen or banner overlays.
**Mitigation:** read the overlay and record it under "Also seen" before dismissing it; a RedBox on a claim's path fails that claim.

## Q6 — Device-only behaviour reported as passed

**Discovered:** 2026-09-22, mobile eval (A2)

**Symptom:** a report says ✓ for haptics or camera behaviour that the emulator cannot produce.
**Trigger:** a claim whose outcome needs real hardware.
**Cause:** ✓/✗ were the only verdicts available.
**Mitigation:** the `device-only` verdict and the report's "For the phone" checklist (`references/report-template.md`).

## Q7 — No iOS core recipe

**Discovered:** 2026-10-09, design

**Symptom:** an iOS claim has no recipe in the reference.
**Trigger:** the change is iOS-specific, or the project is iOS-only.
**Cause:** the toolkit's build machine cannot run the iOS simulator, so a simctl recipe would ship unverified.
**Mitigation:** partial — use the driver rung (agent-device / mobile-mcp) when present; otherwise report the claim unchecked with the blocker named.

## Q8 — The wrong adb

**Discovered:** 2026-10-09, first live run of the recipe against a real Expo app

**Symptom:** the generic chain resolves an adb, and `adb devices` lists nothing, although the project's docs describe running emulators.
**Trigger:** the project runs its emulators on another host or OS (for example GPU emulators on a Windows host, reached from WSL) and talks to them through a wrapper script or an adb server on a non-default port.
**Cause:** the chain in part 3 finds the local SDK's adb, which owns no devices.
**Mitigation:** part 3 — a project-provided adb or wrapper, named in the project's docs, wins over the generic chain; an adb that lists no devices while the project documents one is the wrong adb, not an empty machine. Part 2 reads `README.md` and project-local skills as well as scripts, because a script can outlive the emulator it boots.

## Q9 — Variant package and scheme

**Discovered:** 2026-10-09, first live run of the recipe against a real Expo app

**Symptom:** the deep link opens nothing, or opens the release app instead of the dev client.
**Trigger:** `app.json` names one package and scheme, and `app.config.*` swaps both for a development variant.
**Cause:** part 2 read the static config.
**Mitigation:** part 2.5 — the config can change both per variant; confirm the installed package with `adb shell pm list packages <name>` before launching.
