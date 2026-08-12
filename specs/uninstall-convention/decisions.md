# Decisions

## 1. An uninstaller reverses only what it exclusively owns

Shared host state is never cleared. `[features] hooks = true` in Codex's
`config.toml` has three writers — condux's front door, concord's hook installer,
plan-review's hook installer — and no owner. No plugin's `--uninstall` touches
it, and every UNINSTALL.md states that by name, listing who else rides it.

This promotes existing behaviour into a stated rule. `plugins/condux/install.mjs`
already comments *"it is also shared state: concord and plan-review ride the same
flag, which is why uninstall never clears it"*, but nothing a **user** reads says
so, which makes a correct outcome look like an incomplete removal.

**Rejected — reference-counting.** Probe whether any other known plugin still
registers hooks, clear only when none does. Requires each plugin to carry a map
of its siblings' registration shapes: exactly the cross-plugin knowledge the
no-plugin-deps rule bans, and it fails in the dangerous direction when a probe is
wrong (clearing a flag a live plugin still needs). The residue it avoids costs
nothing — the flag alone fires no hook.

**Rejected — prompting the user.** Moves a decision the toolkit can make
correctly onto someone with strictly less information about who else rides the
flag.

## 2. Machinery lives in the writer, not the front door

Each sub-installer gains `--uninstall`; the plugin-root front doors delegate to
it, exactly as they already delegate for install.

**Deciding evidence:** concord's existing `--uninstall` is not a separate
reversal routine. It is a `MODE` flag inside the same script
(`skills/remember/references/install-codex-hook.sh:48`) reusing the detect and
report machinery already present. Reversal was cheap because the writer already
knows the shape of what it wrote.

**Rejected — front door reverses directly.** Reads as fewer moving parts, but it
means `install.mjs` re-deriving the registration shape of the Codex agents file
and the Stop hook, knowledge that lives in exactly one place each today. The
install path already delegates to those scripts; letting uninstall skip them
makes install and uninstall structurally different. Scattered install knowledge
is what made condux's install story wrong until #9 fixed it.

**Accepted cost:** four scripts change rather than one. The alternative's smaller
surface is duplicated knowledge, which rots.

## 3. Shape follows #19

UNINSTALL.md sits at the **plugin root**, wrapping the deep procedure where one
exists — the shape #19 settled for INSTALL.md, for reasons that carry over
unchanged: the deep documents resolve their base paths relative to themselves so
they cannot be moved, and a generated pointer cannot derive the per-plugin host
table.

Spine mirrors INSTALL.md: `detect → reverse → verify → report`, reporting
`skipped` and `absent` per host rather than omitting them.

## 4. Surgical removal, never restore-from-backup

docket's `install.sh` writes `config.toml.bak` fresh on **every** install run
(`install.sh:47`). After a second install that backup holds an *already
registered* config, so restoring it on uninstall would reinstate the very
registration being removed — and in every case it clobbers unrelated edits made
since. Uninstall removes its own key surgically, matching every other installer
here. The `.bak` stays an install-time safety net only.

Verified 2026-08-12 against `skills/record/server/install.sh`, not assumed.
