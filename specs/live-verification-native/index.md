# live-verification-native — Tech Spec

> A native-app path for condux's live-verification: an Android recipe loaded on app detection, a three-rung driver ladder (adb core → agent-device / mobile-mcp → Expo skills), a `device-only` verdict with a phone checklist, and a CP-3 pick that loads the skill. Docket #89.

**Last updated:** 2026-10-09
**Commit:** PR #183
**Status:** draft

## Contents

| File | Answers |
|---|---|
| [PRD](prd.md) | why the skill needs a native path, for whom, and what is deliberately left out |
| [Decisions](decisions.md) | where the path lives, what the reference holds, how the report carries device-only claims, and why the trigger is untouched |
| [Implementation](implementation.md) | which files carry the feature and the order a native run walks through them |
| [Quirks](quirks.md) | nine Android verification gotchas and the rule that answers each |

## Changelog
- 2026-10-09 (PR #183): Initial spec — discovery signed off for docket #89
