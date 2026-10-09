# Implementation — live-verification-native

| File | Role |
|------|------|
| `skills/live-verification/SKILL.md` | Detects an app project in Step 1 and branches into the reference at Steps 1, 3 and 4 |
| `skills/live-verification/references/native-app.md` | New — rung choice, target, adb resolution, core recipe, stale-UI rules, log sweep, device-only list, native failures, iOS gap |
| `skills/live-verification/references/report-template.md` | `device-only` verdict, `Device` / `Build` header keys, "For the phone" section, three-count outcome line |
| `skills/workflow/SKILL.md` | CP-3 "Verify it live" row and one Red Flags row |
| `plugins/condux/README.md` | live-verification row: Android emulators, agent-device optional |
| `tests/live-verification-native.test.mjs` | Guard — the reference stays reachable from SKILL.md, the template keeps its native anchors, CP-3 keeps "including on a mobile app" |

## Data flow

1. Step 1 — app detected (finalize's native-change test) → load `native-app.md`; rebuild first if finalize said *native rebuild*; resolve the target and adb once.
2. Step 1, rung choice — `expo:*` skills for build/install when installed; agent-device or mobile-mcp for driving when detected; core adb otherwise.
3. Step 3 — drive each claim: fresh screenshot before state-changing taps, re-dump after transitions, both themes via `cmd uimode night`.
4. Step 4 — evidence per claim in the run dir; the `logcat -d` sweep and Metro output feed "Also seen"; hardware-bound claims get `device-only`.
5. Step 5 — `report.md` with `Device` / `Build` keys and the "For the phone" checklist, printed as the terminal report.

## Patterns

| Pattern | Where | Why not the obvious thing |
|---|---|---|
| Reference loaded on detection | `native-app.md` | inlining puts ~80 lines in every web run |
| Defer to the driver's own help | rungs 2–3 | restating their syntax would drift with their releases |
| Absolute-path adb | `native-app.md` part 3 | a PATH export lasts one command in an agent shell |

## Dependencies

- `skills/finalize/references/native-change.md` — the detection test and the rebuild verdict, referenced by name.
- Optional, never required: `agent-device`, `mobile-mcp`, the `expo` plugin's `expo-dev-client` / `eas-simulator` skills.
