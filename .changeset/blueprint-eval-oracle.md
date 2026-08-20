---
"@jabworks/condux": patch
---

Reconcile trigger-eval oracles with the routing payload's own doctrine.

`blueprint`: two negatives ("build the settings page from the approved design",
"implement this Figma design as a React component") asserted `expected_skill: null`,
which contradicts *every implementation request starts at `/condux:workflow`*. The
model answered `workflow` and the corpus scored it a miss.

`test-first-development`: eight positives lost to `workflow` in one run of three for
the same reason — `routing.md` lists the skill among those that execute *within*
workflow, never instead of it. Nine cases now carry `accept: ["workflow"]`, and the
bug-shaped one also accepts `root-cause-analysis`. The four cases where the skill is
genuinely the sole right answer — questions about the practice, and ownership of an
existing failing test — stay strict, so the corpus keeps its discriminating power.

No routing behaviour changes; these are test fixtures.
