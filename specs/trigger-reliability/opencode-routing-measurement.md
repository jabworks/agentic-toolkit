# OpenCode routing measurement — `@jabworks/condux` 0.20.0 vs 0.21.0 (docket #73)

Measured 2026-09-02 with `scripts/eval-invocations.mjs --host opencode` (shipped
earlier the same branch, commit 299ddf5). The question: docket #72 relocated the
condux routing payload out of `config.instructions` (global, mid-system-prompt,
Claude-verb) into a `synthetic:true` `<system-reminder>` part on the first
main-session user message with the OpenCode verb — did the fire rate move?

## Method

- **Host:** OpenCode 1.18.25, `opencode run --format json`, model
  `opencode/big-pickle` (OpenCode Zen's free model; $0.00 total). No max-turns
  on this host — runs go to completion under a 300 s timeout, with a 45 s
  first-event watchdog for the init stall (quirks Q6; 4 stall retries across
  all arms, none fatal).
- **Clean room per arm** (quirks Q5): scratch `HOME` whose only config is
  `{plugin: [<spec>]}`, `XDG_DATA_HOME` left real for credentials, `PWD` pinned
  to the per-case fresh temp dir (quirks Q7 — without that, every case runs
  against whatever repo the harness was launched from). The resolved
  `plugin` / `instructions` / `skills.paths` arrays are logged per arm.
- **Arms:** `@jabworks/condux@0.20.0` from npm (`instructions` channel,
  payload names `/condux:workflow`) vs the local package at 299ddf5
  (`chat.message` reminder, payload names `skill(name="workflow")` — the
  0.21.0 candidate, since PR #148 had not published to npm yet).
- **Corpora:** `workflow` (28 cases, 27 scored, × 3 trials) and `finalize`
  (20 cases, 12 scored, × 1 trial) as a bundled-skill control. `record` was
  the docket's suggested control but is not a condux skill, so it cannot be
  used in a condux-only clean room (it scores `uninstalled`).
- A fire is a `skill` tool call naming the expected skill; misses are read
  from completed runs only (a run killed after a fire counts as a fire, one
  killed before any fire is discarded as truncated).

## Results

| metric | 0.20.0 (instructions, old verb) | 0.21.0 (reminder, skill-tool verb) |
|---|---|---|
| `workflow` corpus headline (27 × 3) | 71.2% ± 12.5pp (74.1 / 74.1 / 65.4) | 69.1% ± 5.3pp (66.7 / 70.4 / 70.4) |
| — implementation tasks expecting `workflow` | 82.9% (29/35) | **88.9%** (32/36) |
| — operating-manual questions (7 cases) | 38.1% (8/21) | 28.6% (6/21) |
| — cross-skill cases (expect `discovery`/`rca`/…) | 77.8% (14/18) | 66.7% (12/18) |
| — should-not-trigger | 6/6 clean | 6/6 clean |
| `finalize` control (12 × 1) | 75.0% | 83.3% |

An earlier 0.20.0 run of the same arm (2026-09-01, lost to a `/tmp` wipe before
the paired arm completed; numbers preserved in the session record) came in at
61.7% ± 19.2pp (55.6 / 59.3 / 70.4) — same configuration, 10pp lower headline.
Treat single-arm differences smaller than that as noise on this model.

## Reading

1. **On the routing question proper — an implementation request firing
   `workflow` — the relocation gains ~6pp (82.9% → 88.9%), within noise at
   this n.** The `finalize` control moves the same direction (+8.3pp, n=12).
   Nothing regressed; the reminder arm's headline CI is a third the width of
   the instructions arm's.
2. **The old verb was not the bottleneck on this model.** big-pickle fired
   82.9% of task cases with a payload telling it to run `/condux:workflow`, a
   command the host does not have. The live under-firing Harvey reported
   (docket #72) is therefore likelier the seat/subagent-leak half of the
   defect, or model-dependent — C0 remains correct (it costs nothing and
   removes a translation step), but it is not what moves this number.
3. **The flat headline is two buckets measuring different questions.** The
   manual-question cluster ("how does condux work", "what are the four named
   agents") is low in both arms *because the routing payload says questions
   route nowhere* — the model answers correctly and directly. The corpus
   expects `workflow` to load as the operating manual; the payload tells it
   not to. That is a corpus/doctrine tension to resolve in the corpus (or
   accept), not an OpenCode defect. The cross-skill bucket scores the
   0.21.0 arm *down* for router-first behaviour: on "theres a bug where
   checkout crashes on empty cart" it invoked `workflow` 3/3 — the doctrine's
   answer — and scored 0/3 because the case expects `root-cause-analysis`
   and these corpora carry no `accept: [workflow]` alternates. A corpus pass
   adding `accept` lists to cross-skill cases would make both arms' numbers
   mean what they look like they mean.
4. **For docket #74's gate (C2, the edit-without-router reminder):** the
   remaining misses on this model are empty-cwd phrase-not-task cases ("no
   README here"), manual questions, and cross-skill scoring — none of which
   C2 addresses (C2 catches an *edit starting* in an unrouted session; task
   cases already route at ~89%). On this evidence C2 does not pay on
   big-pickle. The open question is a paid-model arm (the free model is the
   floor, not the ceiling); that is a spend decision, not a default.

## Caveats

- One free model of unknown provenance; 27 scored cases; 3 trials. The
  lost-run delta (61.7% vs 71.2% for the identical arm) is the measured
  trial-to-trial spread — read every comparison against it.
- The agent can inspect the real filesystem through the bash tool (one run
  listed the machine's `~/projects` while reasoning about its empty cwd);
  the clean room isolates *configuration*, not the disk.
- The 0.21.0 arm is the local package at 299ddf5, not the npm artifact —
  rerun `--plugin @jabworks/condux@0.21.0` after PR #148 publishes if an
  npm-exact number is ever needed.

## Reproduce

```
node scripts/eval-invocations.mjs --host opencode \
  --plugin @jabworks/condux@0.20.0 --skills workflow --runs 3 --out a.md
node scripts/eval-invocations.mjs --host opencode \
  --plugin file:///…/packages/condux-opencode/index.js --skills workflow --runs 3 --out b.md
```

Per-case trials land beside each report as `<out>.json`.
