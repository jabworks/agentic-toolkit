---
"@jabworks/condux": minor
---

`finalize` now reports a `Native` line in mobile app projects. None of the quality gates compile an app's native layer, so a change that touches it (Kotlin/Swift, native modules, native app config, native dependencies) passes every check and still is not in the app until it is rebuilt. The line says whether a JS reload is enough or a native rebuild is needed. On Expo projects it compares against a recorded fingerprint of the installed build when one exists, and otherwise checks a list of native paths. It never blocks. `workflow` mentions a native change when confirming the tier, and `live-verification` rebuilds and reinstalls before driving the app.
