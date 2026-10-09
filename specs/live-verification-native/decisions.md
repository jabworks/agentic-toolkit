# Decisions — live-verification-native

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | The native path is a reference file loaded on app detection, with short branches in Steps 1, 3 and 4 | mirrors finalize's `native-change.md`; a web run pays nothing | accepted |
| 2 | `native-app.md` has nine parts, and the driver rungs defer to each tool's own help | the core is ours to write; the drivers' syntax is not | accepted |
| 3 | `device-only` is a fourth verdict, with Device/Build header keys and a "For the phone" section, all in the one report | a deferred check must never read as a pass | accepted |
| 4 | Fix the CP-3 transition and the README, not the trigger | routing is already 6/6; the miss was a pick that never loaded the skill | accepted |

## 1. A reference file plus branch points — 2026-10-09

**Decided:** a new `references/native-app.md`, loaded only when Step 1 detects an app project (finalize's native-change test: an `expo` / `react-native` dependency, or a committed `android/` / `ios/`), with a 2–4 line "Mobile app:" branch in Steps 1, 3 and 4 pointing into it.
**Because:** it is the pattern finalize used for `native-change.md` (#88) — one detection rule, one home for the mechanics, nothing new for a web run.

| Alternative | Why not |
|---|---|
| Inline the recipe in SKILL.md | ~80 lines that every web verification pays for; the body is already 162 |
| A separate native-verification skill | routing already sends mobile phrasings here 6/6; a second skill splits the trigger and forks the claim/report contract |

**Consequences**
- SKILL.md grows by about fifteen lines; the mechanics live in one reference.

## 2. Nine parts, drivers deferred to their own help — 2026-10-09

**Decided:** the reference covers rung choice, target, adb resolution, the core recipe, stale-UI rules, the log sweep, what the emulator can't prove, native failure handling, and the iOS gap — in that order. The agent-device and mobile-mcp rungs name the tool and defer to its own `help` and skills.
**Because:** the survey (`skills/toolkit-research-frontier/references/mobile-prior-art-survey-2026-09-24.md` §1) found the logcat sweep, the stale-dump rules, the PATH trap and the report shape covered by nobody; the drivers' command sets are covered by their owners.

| Alternative | Why not |
|---|---|
| Restate agent-device's / mobile-mcp's command sets | someone else's surface, moves on their release cadence, unverified on our side |
| agent-device as the primary recipe, adb a thin fallback | most of the guidance becomes dead weight on a machine without it |
| Platform-neutral rules only, no adb recipe | leaves the agent rebuilding the recipe from memory — the observed failure |

**Consequences**
- Android-only core. iOS is a stated gap: the driver rung if present, otherwise reported unverified.

## 3. device-only as a verdict, one report — 2026-10-09

**Decided:** `device-only — <why>` joins ✓ / ✗ / unchecked and is never counted as passed; native runs add `Device` and `Build` header keys; a "For the phone" checklist follows the claim table when any claim is device-only; the outcome line counts failed · device-only · verified.
**Because:** prior art says it twice — "never report hardware validation that was not performed" (pulsar-haptics), "feel is judged on a release build… nothing else counts as verified" (expo-animation).

| Alternative | Why not |
|---|---|
| ✓ with a "(needs device)" note | reads as verified at a glance |
| A separate `phone-checklist.md` | two homes for one run's outcome; the claim table stops being the index |

**Consequences**
- Web reports keep exactly today's header keys and verdicts.

## 4. Fix the transition, not the trigger — 2026-10-09

**Decided:** workflow's CP-3 row says to load and follow the skill, "including on a mobile app"; Red Flags gains "verifying live without loading `live-verification`"; condux's README row mentions Android emulators and recommends agent-device as optional. `when_to_use` is unchanged.
**Because:** the eval's router stratum scored live-verification 6/6 on mobile phrasings; the observed miss was a CP-3 pick followed by ad-hoc verification.

| Alternative | Why not |
|---|---|
| Add "emulator" / "phone" trigger phrases | fixes a routing problem that does not exist and invalidates the measured band |

**Consequences**
- No trigger re-measure needed.
