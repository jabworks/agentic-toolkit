# Trigger check: blueprint runs the diagram gate unprompted on Codex (condux 2.30.0)

Carried from the 2026-09-08 and 2026-09-10 handoffs: after the routing gate (2.29.0, #77) and the font-size cascade (2.30.0, #76) shipped, does a Codex agent that was asked for a diagram run `diagram-check.mjs` before delivering, without being told to, and does it write the base font size where the kit now says? A single sample says nothing about a trigger (trigger-reliability, D7), so three trials, each in a fresh copy of a synthetic nine-service project. The HTML files beside this report are the delivered diagrams verbatim; the `.checker-log.txt` files are each trial's shell commands and checker output with local paths and the login name replaced.

| | |
|---|---|
| Date | 2026-09-10 |
| Host | Codex CLI 0.154.0, `codex exec --json --sandbox workspace-write -c approval_policy="never"`, model `gpt-5.6-sol` at medium reasoning, condux 2.30.0 installed from the marketplace clone at 00455af |
| Target | `skills/blueprint/SKILL.md` Step 2 ("Diagrams are checked with references/diagram-check.mjs before Step 3 and delivered only clean; a skipped check is said, never silent") and `references/diagram-kit.md` Canvas bullet (`font-size="13"` on the `<svg>` tag) |
| Diff | `main` at f12b63e, no working-tree change — a check of what shipped, not of a candidate |
| Project | synthetic: an `AGENTS.md` naming nine services (web, gateway, orders, catalog, billing, payments-adapter, identity, bus, notifier), their request paths, two bus events, and per-service Postgres schema ownership. No real system, no real name |
| Prompt | "Use $blueprint to sketch the architecture of this system as a diagram: every service in AGENTS.md as a node, with the request paths, the event flows over the bus, and the database ownership shown as edges. Standalone, no design doc exists. Write the file and tell me its path when you are done." |

| Claim | Evidence | Verdict |
|---|---|---|
| The agent loads the skill and its kit on an explicit `$blueprint` mention | every `.checker-log.txt` opens with `sed` of `SKILL.md`, then `diagram-kit.md` + `token-core.css` | ✓ 3/3 |
| The agent runs the checker before delivering, unprompted (the prompt never mentions a check) | trial 1: 6 checker runs, all before the final message; trial 2: 4 runs; trial 3: 1 run — clean on the first pass — then the deliver step (`xdg-open`) | ✓ 3/3 |
| It iterates to clean rather than delivering with findings | findings per run — trial 1: 15 → 9 → 2 → 1 → 1 → 0; trial 2: 11 → 5 → 1 → 0; trial 3: 0 | ✓ 3/3 — no trial delivered with a finding outstanding |
| The base font size lands on the `<svg>` tag, with no `text { font-size }` rule and no "16px" notice from the checker | `trial-1.html` and `trial-2.html` open `<svg viewBox="…" font-size="13" …>`; no `text{` rule in either; no checker output in any log mentions 16px; `trial-3.html` carries `font-size="13"` on each of its three `<svg>` canvases | ✓ 3/3 |
| The delivered file is clean under this repo's own 2.30.0 checker, independent of the agent's claim | `trial-*.findings.txt` (`node skills/blueprint/references/diagram-check.mjs <file>` from `main`) | ✓ `clean`, exit 0, 3/3 |
| The delivered diagram renders with no edge through a box and no label on node text | `trial-1.html`, `trial-2.html` opened with `google-chrome --headless=new --screenshot` and `trial-3.html` (light scheme; screenshots observed in-session, not committed) | ✓ 3/3 — every edge in a gutter, every label haloed; trial 3 split the system into three sectioned canvases (topology, event flows, storage ownership) with dashed boundary boxes |

Also seen:
- **`text-overflows-box` fired on a real agent-drawn diagram** (trial 2, first run): `"draft → placed → fulfilled → closed" overflows "orders" by 20.5` — the #76 shape, an orders-lifecycle subtitle wider than its 190-unit node, which the 2.29.0 checker would have passed. The agent wrapped it onto two lines; the delivered file shows `draft → placed` / `fulfilled → closed`.
- **`text-outside-canvas` ×5** (trial 1, first run): the agent sized the viewBox before placing the right-hand column of external providers. Fixed by widening the canvas on the next pass.
- **`unlabeled-edge` dominated trial 1** (14 across six runs, one edge surviving two passes): every instance was a real edge the agent had drawn without a label near enough, not a decorative line. None of the three diagrams contains a `<line>` element at all — legends are HTML — so docket #75 still has no case.
- **Halos**: no edge shows through a label's ends in any of the three renders; #79 stays waiting for a case.
- The agent noticed `.condux/` was not gitignored in the scratch project and said so before writing there — the SKILL.md bootstrap check, running as written.
- Cost of one trial on this host: 9–12 minutes wall time, 270k–890k input tokens (over 85 % cache hits), 16k–21k output tokens — the clean-first-try trial was the cheap one.

0 claims failed across 3 trials. The checker step fires on Codex as the skill text intends, and the kit's canvas line is being pasted as written. No trigger-contract fix and no kit-wording fix; docket #78 is unblocked.
