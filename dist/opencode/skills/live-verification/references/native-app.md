# Native app verification (Android)

Loaded from Step 1 when the project is a mobile app — the same test as
finalize's native-change check: an `expo` or `react-native` dependency in
`package.json`, or a committed `android/` or `ios/` directory. A web project
never reads this file.

The claim/verdict/report contract in SKILL.md does not change. This file only
says how to reach the app, drive it, and read its errors — and which claims an
emulator cannot settle.

## 1. Pick the rung

Decide once, at the start of the run, and name the choice in the report's
`Target` row. Three rungs, each optional, none ever installed by you:

| Concern | Use, first match wins |
|---|---|
| Build and install | the `expo` plugin's `expo-dev-client` / `eas-simulator` skills, when they are in your skill list → the project's own build script → `npx expo run:android` |
| Drive and read logs | `agent-device` on PATH (`command -v agent-device`) → mobile-mcp's `mobile_*` tools, when you have them → the core adb recipe below |

When a driver rung is in use, follow **its** documentation for the commands
(`agent-device help`, its bundled skills, the MCP tools' own descriptions) —
this file deliberately does not restate them. Parts 5–7 below apply on every
rung: they are about what counts as evidence, not about which tool taps.

No driver installed is the normal case, not a gap — never install one, and
never stop the run to ask.

## 2. Target

In order, before booting or building anything:

1. **The project's own setup wins.** `AGENTS.md`, `README.md`, a
   project-local skill for running the app, `package.json` scripts
   (`android`, `start`, a dev-client script), and anything under `scripts/`
   that boots an emulator or installs a build. Use them as written. When they
   disagree, the prose that is newest wins over a script name — a script can
   outlive the emulator it boots.
2. **Is a device already attached?** `adb devices` (with the resolved path,
   part 3). One device in the `device` state → use it. `offline` or
   `unauthorized` → part 8.
3. **No device** → boot the emulator the project's script names, or
   `emulator -list-avds` and the first one. Poll until
   `adb shell getprop sys.boot_completed` prints `1` — never a fixed sleep.
4. **Metro.** A dev client loads JS from Metro: check port 8081 before
   starting it, and run `adb reverse tcp:8081 tcp:8081` once per boot.
5. **Package and scheme.** Read `android.package` and `scheme` from the app
   config (`app.json` / `app.config.*`), or `applicationId` from
   `android/app/build.gradle*`. Every launch and log filter below needs them.
   An `app.config.*` can change both per build variant (a dev client often
   carries a `.dev` suffix and its own scheme) — confirm the installed one
   with `adb shell pm list packages <name>` before launching.

## 3. Resolve adb once

`adb` is often on the user's interactive PATH only, and an agent's shell keeps
no state between calls — an `export PATH=…` or an `ADB=…` variable lasts one
command.

**A project-provided adb wins.** Some setups run the emulators on another
host or OS and reach them through a wrapper script or a non-default adb
server; the project's docs (part 2) name it. Use that, by absolute path.
Otherwise resolve the absolute path once:

```bash
command -v adb || ls "$ANDROID_HOME/platform-tools/adb" "$ANDROID_SDK_ROOT/platform-tools/adb" 2>/dev/null | head -1
```

Then **write that literal path into every later command**. An adb that lists
no devices while the project documents a running one is the wrong adb, not an
empty machine — go back to the project's docs. Nothing found →
stop and report the blocker with the exact next command to try (set
`ANDROID_HOME`, or install platform-tools). Never install the SDK yourself.

## 4. Drive

The core recipe, written with `adb` for brevity — use the resolved path.

| Need | Command |
|---|---|
| Launch at a screen | `adb shell am start -W -a android.intent.action.VIEW -d "<scheme>://<path>" <package>` |
| Tap / swipe | `adb shell input tap <x> <y>` · `adb shell input swipe <x1> <y1> <x2> <y2> <ms>` |
| Long-press | `adb shell input swipe <x> <y> <x> <y> 800` (a swipe that does not move) |
| Drag, multi-step gestures | `adb shell input motionevent DOWN/MOVE/UP <x> <y>`, where the device's `input` lists it |
| Type / keys | `adb shell input text '<text>'` · `adb shell input keyevent 4` (back) |
| Screenshot | `adb exec-out screencap -p > <claim>.png` — then Read the PNG; an unread screenshot proves nothing |
| Motion | `adb shell screenrecord --time-limit <s> /sdcard/<claim>.mp4`, then `adb pull` — a still cannot prove an animation |
| UI tree | `adb exec-out uiautomator dump /dev/tty` — element text, ids and `bounds` |
| Theme | `adb shell cmd uimode night yes` / `no` — both themes still gate a themed change |
| Offline | `adb shell cmd connectivity airplane-mode enable` / `disable` |
| Fresh state | `adb shell pm clear <package>` — only when the claim needs it; it wipes the user's app data |

## 5. Stale UI

Most wrong taps in the field came from acting on a picture of a screen that
had already changed.

- **Take a fresh screenshot before any tap that changes state**, and look at it.
- **A `uiautomator dump` is true only for the moment it ran.** Re-dump after
  every navigation, dialog, or list change.
- **Coordinates come from a dump's `bounds`**, never estimated from an image.
- **"could not get idle state"** means an animation is running. Poll the dump
  again; a screen that never goes idle is a finding, not a reason to guess.

## 6. Log sweep

Runtime errors are part of the evidence — the same rule as the browser
console.

1. Before driving: `adb logcat -c`.
2. After driving, the app's errors: `adb logcat -d -v time --pid=$(adb shell pidof -s <package>) '*:E'`.
3. The JS layer: `adb logcat -d -v time -s ReactNativeJS:V`, plus Metro's own output.
4. The app is gone (no pid) → it crashed: `adb logcat -d -b crash`. A crash on a
   claim's path fails that claim.

A LogBox or RedBox overlay is a finding: read it, record its message, then
dismiss it. A RedBox on a claim's path fails that claim. Everything found here
goes in the report's "Also seen", even when it belongs to another feature.

## 7. What the emulator can't prove

These claims get the **`device-only`** verdict, with the reason, and go on the
report's phone checklist. Never ✓, whatever the emulator showed:

| Claim touches | Why the emulator can't settle it |
|---|---|
| Haptics | no vibration hardware |
| Camera, QR scanning, biometrics | simulated sources, not the real sensor path |
| Push notification delivery | needs real FCM delivery on a signed-in device |
| Feel — scroll, animation smoothness, startup time | judged on the slowest device you support, on a release build |
| Sensors — GPS movement, motion, NFC, Bluetooth | mocked or absent |

The emulator can still verify the *surrounding* behaviour — the button that
triggers the haptic, the screen the scan result lands on. Split such a claim
in two rather than giving the whole thing one verdict.

## 8. When it goes wrong

Environmental failures are results, not things to retry into the ground. The
two-attempt ceiling from SKILL.md applies.

| Failure | Response |
|---|---|
| `device offline` / `unauthorized` | one `adb reconnect`; still failing → report it |
| Emulator won't boot, or no AVD exists | report it with the next command to try; never kill an emulator you did not start |
| Metro port taken | report it; do not kill the process holding it |
| The app shows old behaviour | the binary is stale — Step 1's rebuild-first rule; record what you drove in the `Build` key |
| A tap does nothing | re-dump (part 5) and retry once; second miss → claim unchecked |

## 9. iOS

The core recipe is Android-only. It has not been verified against the iOS
simulator, so this file does not pretend to cover it. For an iOS claim: use
the driver rung (agent-device and mobile-mcp both drive the simulator) when
one is present; otherwise report the claim **unchecked** with the blocker
named — "no iOS driver; the core recipe is Android-only".
