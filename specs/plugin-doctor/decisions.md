# Plugin doctor — Decisions

## Per-plugin doctor, shared by convention (approach A)

User-chosen. Each plugin ships its own `doctor.mjs` and doctor skill; nothing
is shared at runtime. The `detect → probe → report` contract is written into
`toolkit-skill-standards`, with docket as the reference implementation —
the same generalization path `INSTALL.md` took.

This satisfies the dependency ladder directly: rung 1 (the plugin's own
files) is the only rung a doctor may require, because the doctor is what you
reach for when higher rungs are the thing that broke.

Rejected:

- **Shared `doctor-core.mjs` vendored into each plugin by `sync.sh`.** Would
  dedup roughly forty lines of host detection, and would cost a fourth
  hand-maintained plugin-level mirror with its own sync case and its own
  mirror test. That is the `6ba6572` blind-spot class — the failure mode
  where an out-of-tree copy silently drifts — bought for very little.
- **One `toolkit-doctor` plugin covering all three.** You would have to have
  installed the doctor before the install it diagnoses broke, and it would
  version independently of what it inspects. A diagnostic that depends on the
  system being diagnosed is not one.

## Skill naming: bundle-prefixed, forced by the flat namespace

`docket-doctor`, `condux-doctor`, `concord-doctor` — invoked
`/docket:docket-doctor` and friends.

Top-level `skills/` is a single flat namespace (that tree is what
`npx skills add` installs from) and the test invariant requires a skill's
`name` to equal its directory. Three directories named `doctor` cannot
coexist there. The prefix is therefore not a style choice; the alternative
was a namespace collision. It matches the existing `toolkit-orientation` /
`toolkit-foundry` shape.

## concord becomes a bundle, and its skill is renamed `remember`

concord is the only one of the three that is a *standalone* plugin —
`dist/plugins/concord/skills/concord/` is the skill directory itself, so
there is nowhere to put a second skill. Adding `concord-doctor` forces the
bundle layout.

The mechanical conversion would produce `skills/concord/concord/`, which is
a wart. The skill is renamed to `remember` instead: `concord:remember` and
`concord:concord-doctor`. Bare, meaningful skill names inside a
plugin-namespaced bundle is docket's shape (`docket:record`,
`docket:groom`), and concord will plausibly grow more skills.

The doctors keep their `<plugin>-doctor` prefixes regardless — three
directories named `doctor` cannot coexist in the flat `skills/` namespace,
so the prefix there is forced, not stylistic.

Cost, accepted: this is a breaking change for existing installs. Every
`${PLUGIN_ROOT}/skills/concord/…` path in concord's Codex hooks manifest
moves to `skills/remember/…`, so a registered host must re-read the
manifest, and `/concord:concord` stops resolving. The conversion is its own
task, reviewable separately from the doctor that motivated it.

## Probe depth: static + executable

A probe passes only when the registration parses **and** the thing it
registers actually answers:

- `session-start.mjs` is executed and must emit the host's wire format.
- `mcp-server.mjs` must answer an `initialize` round-trip.
- `recall.mjs` / `capture.mjs` must resolve on disk and run without error.

Static-only was rejected because it is precisely the check that passes while
a hook is silently broken — the condition that motivated the verify step in
docket's installer.

Evidence-of-firing (looking for host-side artifacts, e.g. concord's memory
store having recent entries) was rejected as uneven: concord leaves an
artifact, condux leaves none, so coverage would differ per plugin and the
check would be time-dependent.

## Offline only

Installed version is compared against the local marketplace clone at
`~/.claude/plugins/marketplaces/<marketplace>/`, whose own freshness is
reported alongside. No network, ever.

The doctor runs in degraded conditions by definition; a check that hangs or
fails without egress fails when it is most needed. It also keeps the toolkit's
no-egress property, which is already a tested invariant for plan-review.

`--fetch` opt-in was rejected as a network code path plus a test that must
stub it, for an answer the stale-clone report already qualifies honestly.

## Diagnose everywhere, repair only where an installer exists

Every broken probe prints the exact fix — command or file edit. `--fix`
actually performs it only where an installer already provides the idempotency
and backup guarantees a repair needs. docket had one from the start; concord
gained one in docket #8, and its doctor's `--fix` runs
`skills/remember/references/install-codex-hook.sh`. condux still only prints
its fix, and gains `--fix` when docket #9 gives it a front door.

Rejected: writing ad-hoc repair logic into the doctors now. That would
duplicate the installer contract in a second place and diverge from it.

The delegation runs both ways for concord and stays acyclic: the installer's
own verify beat calls `concord-doctor --host codex --quiet`, and the doctor
never passes `--fix` down.

Delegating means the doctor must report its delegate's failure. Both doctors
check the spawn result and print how the installer failed — could not be run,
killed by a signal, or a non-zero exit — before re-probing. `running …`
followed by silence otherwise reads as a repair that happened, and with
concord that is a live case: its installer exits 1 when the registration it
just wrote fails verify. The re-probe still decides the exit code.

## Output: the installer's report shape, no JSON

`host / status / detail` columns, statuses `done` `broken` `absent`
`skipped`, exit 0 when everything green and 1 when anything is broken. The
same `report()` layout `install.sh` already prints, so install output and
doctor output read as one family.

No `--json`: the consumer is an agent reading a skill's shell output, which
parses columns fine. Adding a second output contract doubles the surface for
no current reader.

## Out of scope

Repair for condux and concord (docket #5) · uninstall verification
(docket #2) · any network version check · proving the host actually invoked
a hook (see quirks.md) · doctors for the skill-only plugins, which have no
registrations to probe.
