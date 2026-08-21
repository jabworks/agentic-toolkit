# Live verification — Agent Plugins conformance (docket #29)

Date: 2026-08-14 · Setup: Cursor on Windows + WSL remote; plugins copied to
both `C:\Users\hieu1\.cursor\plugins\local\` and WSL `~/.cursor/plugins/local/`
(docket, condux, session-handoff — real copies of `dist/plugins/<name>`).

## Claims → evidence → verdict

1. **Root plugin.json makes the plugin load in Cursor** — after a FULL
   restart (window reload was not enough), the Plugins view lists all three
   as "Installed 3", each tagged **Local**. **VERIFIED** (screenshot).
2. **Flat skills/ discovery works for bundles** — the Skills panel lists
   condux members (discovery, draft-plan, finalize, code-review,
   condux-doctor, plan-review, preflight, live-verification, …) and docket
   members (record, groom, docket-doctor) as individual entries.
   **VERIFIED** (screenshot).
3. **Spec mcp.json starts the docket server** — MCPs panel: docket
   connected, 4 tools enabled (docket_next/add/close/check). **VERIFIED**
   (note: entry tagged "Plugin"; the pre-existing Claude-import server and
   the local-plugin server are not visually distinguishable — connected
   state + tools confirmed either way).
4. **Stray root manifest is inert on Claude Code** — `claude plugin
   validate --strict` passes for docket, condux, session-handoff, concord
   with the generated root plugin.json present. **VERIFIED** (CLI output).
5. **Skill descriptions surface raw** — panel shows the unmerged
   `description` text (when_to_use invisible), matching the documented
   trigger-quality caveat for the plugin path vs `dist/cursor/skills/`.
   **VERIFIED** (screenshot).

## Follow-up — Codex hook suppression (2026-08-21)

Claim 4 above verified inertness on **Claude Code only**; quirks.md
generalised it to "inert on both". Codex 0.149.0 on WSL, tracer written
into each hook's script body (preserves the trusted command identity, so no
re-approval prompt), root manifest moved out of the installed plugin cache:

| Plugin | root `plugin.json` | SessionStart | Other | Tracer |
|---|---|---|---|---|
| condux | present | 2 | Stop 1 | silent |
| condux | removed | **3** | Stop **2** | `FIRED` |
| concord | present | 2 | no UserPromptSubmit | silent |
| concord | removed | **3** | UserPromptSubmit **fires** | `CONCORD FIRED` |

The 2 / Stop 1 baseline is another plugin's hooks entirely; condux and
concord contributed nothing. Payload probe: asked whether its context holds
a phrase unique to `routing.md`, Codex answers NO with the manifest
present, YES without it. **REFUTES** the "inert on both" generalisation;
the exclusion in decisions.md follows.

Also refuted along the way, so nobody re-fights them: `${PLUGIN_ROOT}` works
fine in Codex hook commands (the winning run used it unchanged), raw stdout
is a valid SessionStart payload under `additionalContextLimit` (no JSON
envelope required), and bare `node` resolves in the hook environment.

## Environment notes

- A window reload did not pick up new local plugins; a full Cursor restart
  did.
- Copies were staged on both filesystems; which side this window read from
  was not isolated. For docs: "copy to `~/.cursor/plugins/local` on the
  side Cursor runs on; restart fully."
