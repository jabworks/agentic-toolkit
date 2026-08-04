---
name: toolkit-debugging-playbook
description: Use when a skill or plugin from jabworks/agentic-toolkit misbehaves — a skill doesn't trigger, a plugin doesn't show up after install, dist looks out of date, the installed copy differs from the repo, or a manifest fails to parse. Symptom → first discriminating command → root cause, with false friends and stop-and-ask points. Triggers include "why isn't my skill triggering", "why isn't X showing up", "plugin not showing up", "dist drift", "stale plugin", "skill broken".
when_to_use: The toolkit's own distribution machinery is the suspect. Not for ordinary bugs in the app you're building — that's root-cause-analysis.
---

# Toolkit Debugging Playbook

## Purpose

Triage skill/plugin problems in this repo without wandering: one discriminating command
per symptom, known root causes, and the false friends that burn time.

## When to use

Any misbehavior of this toolkit's skills, plugins, manifests, sync, or installs.

## When not to use

- General code bugs in a project → condux `root-cause-analysis`.
- The cause turns out to be description wording → hand off to
  `toolkit-skill-standards`.
- Nothing is broken and you're gating a release → `toolkit-change-control`.

## Inputs required

The symptom as reported, plus a repo checkout. For install-side symptoms you may also
need the user to report their installed plugin version — you cannot see their machine.

## Procedure — symptom table

Run the discriminating command FIRST; don't theorize before it returns.

| Symptom | First command | Likely root causes (ranked) |
|---|---|---|
| Skill doesn't trigger | `sed -n '1,10p' skills/<n>/SKILL.md` — does a trigger contract exist (description "Use when…" or `when_to_use`)? | 1. No/weak trigger contract (three skills shipped that way until 2026-07-08) 2. Stale installed cache (see below) 3. Collision — a sibling wins the trigger |
| Plugin doesn't show up after install | `node -e 'for (const p of require("./.claude-plugin/marketplace.json").plugins) console.log(p.name, p.source)'` | 1. Never registered (technical-spec, `66a71eb`) 2. `source` path doesn't resolve 3. Missing one of the two plugin.json manifests |
| dist looks out of date | `node --test tests/dist-mirror.test.mjs` | 1. Sync not run after a skills/ edit (hook is local-only) 2. Someone hand-edited dist/ (it gets clobbered next sync) |
| Installed copy differs from repo | compare versions: `node -p 'require("./dist/plugins/<p>/.claude-plugin/plugin.json").version'` vs what the user's tool reports | Stale plugin cache — caches refresh only on version bump (`a4f4aa8`). Fix: bump both manifests, re-release |
| Manifest fails to parse / install errors | `node -e 'for (const s of ["claude","codex"]) console.log(s, JSON.parse(require("fs").readFileSync("dist/plugins/<p>/." + s + "-plugin/plugin.json")).name)'` | Invalid JSON; missing required field; `skills` path not `./`-prefixed |
| Skill renders empty/garbled in listings | `node --test tests/skill-invariants.test.mjs` then eyeball YAML quoting | Unquoted YAML with `:` in description (`a13e094`); over-budget frontmatter |
| condux agents behave stale | `node --test tests/skill-invariants.test.mjs` (agents-mirror test) | Plugin-level `agents/` not mirrored — sync's special case (`6ba6572`) |

## False friends

- **"The description must be bad"** when a skill stops triggering after an edit —
  check the installed-cache version first; the repo copy may be fine and the user's
  cache stale.
- **"dist drifted, resync and move on"** — resyncing hides the cause. If drift keeps
  recurring, someone/something is editing dist/ directly; find it.
- **"The test passed, so the skill works"** — `node --test` proves parity and budgets,
  not content correctness or trigger quality.
- **"It works in Claude Code, so Codex is fine"** — the manifests are a pair with real
  divergence points (`hooks` wiring differs by design); check the codex side.

## When to stop and ask the user

- Any fix that renames, merges, or retires a skill (trigger-contract changes are
  owner decisions).
- Symptoms that depend on the user's machine state (installed versions, tool config)
  after you've exhausted repo-side evidence.
- Two plausible root causes with no repo-side discriminator left.

## Evidence required

The discriminating command's output, quoted. Never report a root cause without the
command that shows it.

## Output artifact

A triage note: symptom → command run → output → root cause → fix (or the question to
ask the user).

## Common traps

Jumping to the fix that matches the last incident you remember — this repo's history
shows the same symptom ("users see the old behavior") with two different causes
(dist drift vs stale installed cache) needing opposite fixes.

## Bad behavior this prevents

Debugging session-report's already-fixed cost bug because the installed 1.3.4 cache
kept serving pre-fix code — the real fix was a version bump to 1.3.5 (`a4f4aa8`), not
another code change. The symptom table routes "installed differs from repo" straight
to the version check.

## Related skills

`toolkit-skill-standards` (wording-caused trigger misses), `toolkit-change-control`
(publish gate after the fix), `toolkit-failure-archaeology` (has this happened
before?), `toolkit-plugin-reference` (manifest field semantics).

## Provenance and maintenance

Re-verify volatile claims with:
- `node --test` — which invariants currently exist and pass
- `git log --oneline -10` — whether new incident classes have appeared

Last generated: 2026-07-08 (jq commands converted to node 2026-08-04 — jq is not
installed everywhere; see toolkit-change-control)
Known uncertainty:
- Exact cache-refresh behavior of each host tool (Claude Code vs Codex) is inferred
  from one evidenced incident (`a4f4aa8`), not from tool documentation.
