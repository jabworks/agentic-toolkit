# PRD — live-verification-native

| Section | In one line |
|---|---|
| Problem | live-verification is browser-shaped, so on a mobile app the agent improvises and most runs leave no report |
| Users | the agent verifying an Expo / React Native Android app, and the developer holding the phone |
| Goals | an Android path, a `device-only` verdict, and a CP-3 pick that actually loads the skill |
| Scope | live-verification's body, a new native reference, its report template, workflow CP-3, condux's README row |

## Problem

Step 1 resolves a URL, Step 3 checks hover/Tab/Escape, failure handling assumes a DOM, and verdicts are only ✓/✗.
In the 2026-09-22 mobile eval the agent improvised instead: 223 of 950 Bash calls invoked `adb`, 227 prefixed a
PATH export, a device-only verdict was invented in the field, and 9 of 11 runs left screenshots and no `report.md`.

## Users

| Who | Today | What changes |
|---|---|---|
| The agent verifying an Expo / RN Android app | Reads the browser recipe, then rebuilds its own adb playbook from memory notes | Loads `references/native-app.md` on app detection and follows one recipe |
| The developer who reads the report | Gets screenshots with no report, and device-only checks buried in chat | Gets `report.md` with a "For the phone" checklist of what only a device can prove |

## Goals and non-goals

| Goal | Measured by |
|---|---|
| An Android path in Steps 1, 3 and 4 | a native run that resolves adb once and writes `report.md` |
| A three-rung driver ladder — adb core → agent-device / mobile-mcp when detected → `expo:*` skills when installed | the rung named in the report's Target row |
| A `device-only` verdict feeding a phone checklist | at least one `device-only` row and its checklist entry in a native run's report |
| CP-3 "Verify it live" loads the skill | the native run above happens through the skill, not ad hoc |

| Non-goal | Why excluded |
|---|---|
| An iOS simulator recipe | the build machine can't run the simulator; unverified steps would ship as fact — the reference states the gap |
| Auto-installing agent-device, mobile-mcp, or any driver | no-plugin-deps ladder (docket #6); recommend, never require |
| Build state in session-handoff (eval A7) | a different plugin; tracked separately |
| Changing live-verification's `when_to_use` | mobile phrasings already route to it 6/6; an edit would invalidate the measured trigger band |

## Success metrics

| Metric | Target | How measured |
|---|---|---|
| Native verification run through the skill | loads the skill, resolves adb once, writes `report.md` with ≥ 1 `device-only` row | one run against a real Expo app on an Android emulator, at CP-3 |
| Web report shape | unchanged — Date / Target / Diff / Themes, ✓ / ✗ claim table | the template's web example and rules table |

## Scope

| In | Out |
|---|---|
| `skills/live-verification/SKILL.md` Steps 1, 3, 4 and Failure Handling | a separate native-verification skill |
| new `skills/live-verification/references/native-app.md` | an iOS simctl recipe |
| `skills/live-verification/references/report-template.md` | a separate phone-checklist file |
| workflow's CP-3 row and one Red Flags row | live-verification's `when_to_use` |
| condux README's live-verification row | restating agent-device's or mobile-mcp's command syntax |

## Open questions

- none
