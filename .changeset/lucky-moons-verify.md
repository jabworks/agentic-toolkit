---
"@jabworks/condux": minor
---

Add the `live-verification` skill to the bundle (13 skills, up from 12). It runs after `finalize` on changes with a runnable surface: resolve the run target, enumerate the change's claims, drive the real UI or endpoint dark-mode-first, and report claim → evidence → verdict. It assumes no driving tool is installed and reports what it could not verify rather than inferring a result from the code.

Also tightens trigger contracts across the bundle so adjacent skills disambiguate each other mutually — `preflight` and `finalize` now both point at `live-verification`, and `root-cause-analysis` hands off toolkit-distribution symptoms to `toolkit-debugging-playbook`.
