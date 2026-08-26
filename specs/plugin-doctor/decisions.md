# Plugin doctor — Decisions

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | Per-plugin doctor, shared by convention | a doctor may require only the plugin's own files — higher rungs of the dependency ladder are what it diagnoses | accepted |
| 2 | Bundle-prefixed doctor names (`docket-doctor` …) | three directories named `doctor` cannot coexist in the flat `skills/` namespace — forced, not stylistic | accepted |
| 3 | concord becomes a bundle; its skill renamed `remember` | adding a second skill forces the bundle layout, and `skills/concord/concord/` is a wart; breaking change accepted | accepted |
| 4 | Probes are static + executable | a static parse is precisely the check that passes while a hook is silently broken | accepted |
| 5 | Offline only | a doctor runs in degraded conditions by definition; a check that needs egress fails when most needed | accepted |
| 6 | Diagnose everywhere, repair only where an installer exists | ad-hoc repair logic would duplicate the installer contract and diverge from it | accepted |
| 7 | Output is the installer's report shape, no JSON | one report family across install and doctor; no current reader needs a second contract | accepted |
| 8 | condux's front door wraps the two existing scripts, never absorbs | absorbing would delete them from the npx channel, where they are the sole mechanism | accepted |
| 9 | The Codex hooks feature flag is a probe | a manifest resolving is not a hook firing; the flag was an unprobed input to a probed system | accepted |

## 1. Per-plugin doctor, shared by convention (approach A)

**Decided:** each plugin ships its own `doctor.mjs` and doctor skill; nothing
is shared at runtime. The `detect → probe → report` contract is written into
`toolkit-skill-standards`, with docket as the reference implementation — the
same generalization path `INSTALL.md` took.
**Because:** rung 1 of the dependency ladder (the plugin's own files) is the
only rung a doctor may require, because the doctor is what you reach for when
higher rungs are the thing that broke.

| Alternative | Why not |
|---|---|
| Shared `doctor-core.mjs` vendored into each plugin by `sync.sh` | Dedups roughly forty lines of host detection, and costs a fourth hand-maintained plugin-level mirror with its own sync case and mirror test — the `6ba6572` blind-spot class (an out-of-tree copy silently drifting) bought for very little |
| One `toolkit-doctor` plugin covering all three | You would have to have installed the doctor before the install it diagnoses broke, and it would version independently of what it inspects. A diagnostic that depends on the system being diagnosed is not one |

**Consequences**
- Each doctor is self-contained; the convention, not code, is what is shared.

**Context** — approach A was user-chosen among the three candidates at
sign-off.

## 2. Skill naming: bundle-prefixed, forced by the flat namespace

**Decided:** `docket-doctor`, `condux-doctor`, `concord-doctor` — invoked
`/docket:docket-doctor` and friends.
**Because:** top-level `skills/` is a single flat namespace (that tree is what
`npx skills add` installs from) and the test invariant requires a skill's
`name` to equal its directory — three directories named `doctor` cannot
coexist there.

| Alternative | Why not |
|---|---|
| Bare `doctor` skill names | A namespace collision, not a style preference — the flat tree admits one directory per name |

**Consequences**
- Matches the existing `toolkit-orientation` / `toolkit-foundry` shape.

## 3. concord becomes a bundle, and its skill is renamed `remember`

**Decided:** concord converts to the bundle layout, its memory skill renamed
to `remember` — `concord:remember` and `concord:concord-doctor`.
**Because:** concord is the only one of the three that is a *standalone*
plugin — `dist/plugins/concord/skills/concord/` is the skill directory itself,
so there is nowhere to put a second skill — and the mechanical conversion
would produce `skills/concord/concord/`, which is a wart.

| Alternative | Why not |
|---|---|
| Mechanical bundle conversion keeping the name | `skills/concord/concord/` — a plugin-namespaced bundle holding a skill named after the bundle says nothing about what the skill does |

**Consequences**
- Breaking change for existing installs, accepted: every
  `${PLUGIN_ROOT}/skills/concord/…` path in concord's Codex hooks manifest
  moves to `skills/remember/…`, so a registered host must re-read the
  manifest, and `/concord:concord` stops resolving. The conversion is its own
  task, reviewable separately from the doctor that motivated it.
- Bare, meaningful skill names inside a plugin-namespaced bundle is docket's
  shape (`docket:record`, `docket:groom`), and concord will plausibly grow
  more skills.
- The doctors keep their `<plugin>-doctor` prefixes regardless — the flat
  namespace still forbids three `doctor` directories.

## 4. Probe depth: static + executable

**Decided:** a probe passes only when the registration parses **and** the
thing it registers actually answers — `session-start.mjs` is executed and must
emit the host's wire format, `mcp-server.mjs` must answer an `initialize`
round-trip, `recall.mjs` / `capture.mjs` must resolve on disk and run without
error.
**Because:** a static parse is precisely the check that passes while a hook is
silently broken — the condition that motivated the verify step in docket's
installer.

| Alternative | Why not |
|---|---|
| Static-only probes | Pass while the hook is silently broken — the exact failure the doctor exists to catch |
| Evidence-of-firing (host-side artifacts, e.g. recent entries in concord's store) | Uneven: concord leaves an artifact, condux leaves none, so coverage would differ per plugin and the check would be time-dependent |

**Consequences**
- Every executable probe must first answer "what does this write?" — see
  quirks Q2 for the two that could not be run naively.

## 5. Offline only

**Decided:** installed version is compared against the local marketplace clone
at `~/.claude/plugins/marketplaces/<marketplace>/`, whose own freshness is
reported alongside. No network, ever.
**Because:** a doctor runs in degraded conditions by definition; a check that
hangs or fails without egress fails when it is most needed.

| Alternative | Why not |
|---|---|
| `--fetch` opt-in | A network code path plus a test that must stub it, for an answer the stale-clone report already qualifies honestly |

**Consequences**
- Keeps the toolkit's no-egress property, which is already a tested invariant
  for plan-review.
- Every version verdict is a claim about a snapshot — see quirks Q3.

## 6. Diagnose everywhere, repair only where an installer exists

**Decided:** every broken probe prints the exact fix — command or file edit.
`--fix` actually performs it only where an installer already provides the
idempotency and backup guarantees a repair needs.
**Because:** ad-hoc repair logic written into the doctors would duplicate the
installer contract in a second place and diverge from it.

| Alternative | Why not |
|---|---|
| Ad-hoc repair logic in each doctor | The installer contract duplicated in a second place, guaranteed to diverge |

**Consequences**
- docket had an installer from the start; concord gained one in docket #8, and
  its doctor's `--fix` runs
  `skills/remember/references/install-codex-hook.sh`. condux gained its front
  door in docket #9, and its `--fix` delegates to that installer — which in
  turn composes the two scripts that already lived inside `plan-review` and
  `subagent-execution` (see decision 8).
- The delegation runs both ways for concord and stays acyclic: the installer's
  own verify beat calls `concord-doctor --host codex --quiet`, and the doctor
  never passes `--fix` down.
- Delegating means the doctor must report its delegate's failure. Both doctors
  check the spawn result and print how the installer failed — could not be
  run, killed by a signal, or a non-zero exit — before re-probing.
  `running …` followed by silence otherwise reads as a repair that happened,
  and with concord that is a live case: its installer exits 1 when the
  registration it just wrote fails verify. The re-probe still decides the exit
  code.

## 7. Output: the installer's report shape, no JSON

**Decided:** `host / status / detail` columns, statuses `done` `broken`
`absent` `skipped`, exit 0 when everything is green and 1 when anything is
broken — the same `report()` layout `install.sh` already prints.
**Because:** one report family across install and doctor; no current reader
needs a second contract.

| Alternative | Why not |
|---|---|
| A `--json` mode | The consumer is an agent reading a skill's shell output, which parses columns fine; a second output contract doubles the surface for no current reader |

**Consequences**
- Install output and doctor output read as one family.

## 8. condux's front door wraps, it does not absorb (docket #9)

**Decided:** condux's installer composes the two scripts that already exist —
`plan-review/references/install-codex-hook.sh` and
`subagent-execution/references/install-codex-agents.mjs` — leaving both where
they are, resolved plugin-root-first with a source-tree fallback (the
`firstExisting` pattern the doctor already uses).
**Because:** the decision is forced by channel topology, not preference —
`npx skills add` installs from top-level `skills/` while `plugins/condux/`
reaches the marketplace alone, so absorbing the scripts into a plugin-level
installer would delete them from the npx channel, the one channel where they
are the *sole* mechanism (no plugin manifest exists there to register
anything).

| Alternative | Why not |
|---|---|
| Absorb both scripts into the new installer | Self-contained, no two-hop resolution — and it breaks npx installs outright |
| Document only — an `INSTALL.md` naming the two scripts, no new script | Pushes orchestration of two foreign skill trees into `--fix`, which is the wrapper's job written in a worse place; this spec already forbids registration logic inside a doctor |

**Consequences**
- The docket entry's own host table was stale when this was designed: it
  assigned the Codex Stop hook to `install-codex-hook.sh`, but that hook ships
  in the plugin manifest (`hooks/codex-hooks.json` declares `SessionStart` and
  `Stop`), so the script is redundant for a plugin install and load-bearing
  only on npx.

## 9. The Codex hooks feature flag is a probe, not just an install step

**Decided:** `condux-doctor` gains a `features.hooks` probe.
**Because:** a manifest resolving is not a hook firing — nothing in the condux
plugin enables Codex's experimental `features.hooks = true` (only the
installers do), so a plugin install with the flag off had a manifest that
resolves and two hooks that never fire, which the doctor scored `done`.

| Alternative | Why not |
|---|---|
| Split into its own docket item | It is the same Codex registration surface docket #9 already opens, and a knowingly false-green row costs more than the gap #9 was opened for |

**Consequences**
- The same class the probe-depth decision (4) already commits to; the flag was
  simply an unprobed input to a probed system. What the flag row can and
  cannot claim is quirks Q7.

## Out of scope

Uninstall verification and `UNINSTALL.md` as a cross-plugin convention
(docket #2 — condux's installer carries an `--uninstall` flag for concord
parity, which is not the same thing) · any network version check · proving the
host actually invoked a hook (see quirks.md) · doctors for the skill-only
plugins, which have no registrations to probe.
