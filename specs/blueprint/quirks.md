# blueprint — Quirks

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | `xdg-open`/`open` may be absent or a no-op | headless / SSH hosts | low | yes — write files, print paths, continue |
| Q2 | `.condux/` has no git root to anchor to | non-git repos | low | yes — CWD fallback, said once |
| Q3 | Frontmatter a strict parser rejects | hand-edited SKILL.md frontmatter | medium | yes — canonical grammar check with `--fix` |
| Q4 | Folded description can blow the channel cap | `when_to_use` merged on OpenCode/Cursor | low | yes — merged text ≤ 1024 chars, test-gated |
| Q5 | routing.md payload bloat | adding blueprint to the SessionStart hook | low | yes — one list mention, no prose paragraph |
| Q6 | Other skills claim mockup requests | hosts carrying `design`, Figma MCP, dataviz, taste skills | medium | yes — not-for boundaries named in both directions |
| Q7 | Wireframes quietly become styled UI | any wireframe edit | medium | yes — neutral token allowlist asserted by test |

## Q1 — Headless / SSH hosts

**Symptom:** the deliver step's open command does nothing, or errors.
**Trigger:** hosts where `xdg-open`/`open` is absent or a no-op.
**Cause:** no display, or no opener installed.
**Mitigation:** yes — the skill must not fail: write the files, print absolute paths, and continue.

## Q2 — Non-git repos

**Symptom:** nowhere to anchor `.condux/`.
**Trigger:** running blueprint outside a git repository.
**Cause:** the artifact contract keys working state to the git root.
**Mitigation:** yes — `.condux/` falls back to CWD (workflow's bootstrap rule); blueprint inherits that and says so once.

## Q3 — Frontmatter grammar

**Symptom:** frontmatter that Claude's lenient parser accepts and Codex's strict parser rejects.
**Trigger:** hand-editing SKILL.md frontmatter.
**Cause:** the canonical grammar bans single quotes and free-form YAML.
**Mitigation:** yes — run `node scripts/check-frontmatter.mjs --fix` on violation; never hand-fix.

## Q4 — `when_to_use` folding

**Symptom:** a merged description over the channel cap.
**Trigger:** the OpenCode/Cursor channels folding `when_to_use` into `description`.
**Cause:** two fields become one on those hosts.
**Mitigation:** yes — merged text must stay ≤ 1024 chars (test-gated).

## Q5 — routing.md token budget

**Symptom:** a bloated SessionStart payload taxing every session.
**Trigger:** adding blueprint to the routing hook.
**Cause:** the payload is ~390 tokens and rides every session start.
**Mitigation:** yes — one list mention, no prose paragraph.

## Q6 — Boundary collisions

**Symptom:** a mockup request routed to the wrong skill.
**Trigger:** hosts that also carry a `design` canvas skill, Figma MCP, dataviz, or third-party taste skills claiming mockup requests.
**Cause:** overlapping trigger territory across independently installed skills.
**Mitigation:** yes — the trigger contract names these as not-for boundaries in both directions: blueprint = structural clarity at design time; those = aesthetic or host-specific surfaces.

## Q7 — Wireframe discipline drift

**Symptom:** HTML mockups quietly becoming styled UI.
**Trigger:** any edit to wireframe output or its CSS.
**Cause:** the natural failure mode of HTML mockups — styling accretes.
**Mitigation:** yes — since the 2026-08-26 two-mode rework the discipline is mechanical, not just stated: wireframe mode's CSS may only reference the neutral token allowlist, asserted by `tests/blueprint-kit.test.mjs` (chromatic vocabulary belongs to render mode), and the kit's token core is byte-pinned to `scripts/tokens/core.css` by the same test.
