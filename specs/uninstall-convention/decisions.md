# Decisions

| # | Decision | Because | Status |
|---|---|---|---|
| 1 | An uninstaller reverses only what it exclusively owns | Codex's hooks flag has three writers and no owner; reference-counting needs banned cross-plugin knowledge and fails in the dangerous direction | accepted |
| 2 | Machinery lives in the writer, not the front door | reversal is cheap where the writer already knows the shape of what it wrote; scattered install knowledge is what #9 fixed | accepted |
| 3 | UNINSTALL.md at plugin root wrapping the deep procedure | the shape #19 settled for INSTALL.md, for reasons that carry over unchanged | accepted |
| 4 | Surgical removal, never restore-from-backup | the `.bak` after a second install holds an already-registered config — restoring it would reinstate the registration being removed | accepted |

## 1. An uninstaller reverses only what it exclusively owns

**Decided:** shared host state is never cleared. `[features] hooks = true` in Codex's `config.toml` has three writers — condux's front door, concord's hook installer, plan-review's hook installer — and no owner; no plugin's `--uninstall` touches it, and every UNINSTALL.md states that by name, listing who else rides it.
**Because:** the flag alone fires no hook, so the residue costs nothing — while clearing it wrongly breaks a live plugin.

| Alternative | Why not |
|---|---|
| Reference-counting (probe whether any other known plugin still registers hooks; clear when none does) | Requires each plugin to carry a map of its siblings' registration shapes — exactly the cross-plugin knowledge the no-plugin-deps rule bans — and it fails in the dangerous direction when a probe is wrong (clearing a flag a live plugin still needs) |
| Prompting the user | Moves a decision the toolkit can make correctly onto someone with strictly less information about who else rides the flag |

**Context** — this promotes existing behaviour into a stated rule. `plugins/condux/install.mjs` already comments *"it is also shared state: concord and plan-review ride the same flag, which is why uninstall never clears it"*, but nothing a **user** reads said so, which makes a correct outcome look like an incomplete removal.

## 2. Machinery lives in the writer, not the front door

**Decided:** each sub-installer gains `--uninstall`; the plugin-root front doors delegate to it, exactly as they already delegate for install.
**Because:** reversal is cheap where the writer already knows the shape of what it wrote — the deciding evidence is concord's existing `--uninstall`, which is not a separate reversal routine but a `MODE` flag inside the same script (`skills/remember/references/install-codex-hook.sh:48`) reusing the detect and report machinery already present.

| Alternative | Why not |
|---|---|
| Front door reverses directly | Reads as fewer moving parts, but means `install.mjs` re-deriving the registration shape of the Codex agents file and the Stop hook — knowledge that lives in exactly one place each today. It also makes install and uninstall structurally different; scattered install knowledge is what made condux's install story wrong until #9 fixed it |

**Consequences**
- Accepted cost: four scripts change rather than one. The alternative's smaller surface is duplicated knowledge, which rots.

## 3. Shape follows #19

**Decided:** UNINSTALL.md sits at the **plugin root**, wrapping the deep procedure where one exists. The spine mirrors INSTALL.md: `detect → reverse → verify → report`, reporting `skipped` and `absent` per host rather than omitting them.
**Because:** the shape #19 settled for INSTALL.md carries over unchanged — the deep documents resolve their base paths relative to themselves so they cannot be moved, and a generated pointer cannot derive the per-plugin host table.

## 4. Surgical removal, never restore-from-backup

**Decided:** uninstall removes its own key surgically, matching every other installer here; the `.bak` stays an install-time safety net only.
**Because:** docket's `install.sh` writes `config.toml.bak` fresh on **every** install run (`install.sh:47`) — after a second install that backup holds an *already registered* config, so restoring it on uninstall would reinstate the very registration being removed, and in every case it clobbers unrelated edits made since. Verified 2026-08-12 against `skills/record/server/install.sh`, not assumed.

| Alternative | Why not |
|---|---|
| Restore `config.toml.bak` on uninstall | Reinstates the registration being removed after a second install, and clobbers unrelated edits in every case |
