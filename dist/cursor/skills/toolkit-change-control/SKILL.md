---
name: toolkit-change-control
description: "Use when deciding whether a change to jabworks/agentic-toolkit is done and safe to ship — classifying the change (including retiring a skill or a hook), picking the version bump, and gating on the publish checklist (mirror synced, manifests paired, marketplace entry, node --test green). Triggers include \"is this skill shipped\", \"am I done shipping this skill/plugin\", \"ready to publish\", \"what version do I bump\", \"did I register this plugin\", \"retire this skill\", \"remove this hook\". Also fires on the imperative form, not just the question — \"bump the condux version\", \"sync dist and bump\". Self-trigger right after any edit to a plugin.json, marketplace.json, or a shipped SKILL.md, before the user asks. Run this gate before `release`, which ships the version this one picks."
---

# Toolkit Change Control

## Purpose

Gate every change to this toolkit through classification → checklist → evidence, so
"shipped" always means the same verifiable thing.

## When to use

- Before declaring any skill/plugin change done, published, or shipped.
- Choosing a version bump, or wondering whether one is needed at all.
- Deciding what a given change is allowed to touch.

## When not to use

- End-of-dev-task check for ordinary coding work → condux `preflight` / `finalize`.
- The mechanics of scaffolding/registering a NEW skill → `toolkit-foundry` (this skill
  gates; that skill builds).
- Diagnosing why something already shipped is broken → `toolkit-debugging-playbook`.

## Inputs required

- `git status` / `git diff` of the working tree.
- The change's intent (new skill, edit, fix) from the user or conversation.

## Procedure

### 1. Classify the change

| Class | Touches | Version bump |
|---|---|---|
| New standalone skill | `skills/<n>/`, `dist/plugins/<n>/**`, marketplace.json | new plugin at 1.0.0 |
| New bundle-member skill | `skills/<n>/`, `dist/plugins/<bundle>/skills/<n>/`, bundle manifests | bundle minor |
| Skill edit | `skills/<n>/` + its dist mirror (via sync) | owning plugin patch (minor if new capability) |
| Manifest-only fix | both `dist/plugins/<p>/.{claude,codex}-plugin/plugin.json`, then sync — it regenerates the root `plugin.json` from the claude manifest | patch |
| Marketplace-only fix | `.claude-plugin/marketplace.json` | none (no version field there) |
| Doc-only fix | README.md / CLAUDE.md / skill README.md | none, unless the doc ships inside a plugin (then patch) |
| Dist-only resync | `dist/` via `scripts/sync.sh` | none — but ask WHY it drifted first |
| Retired skill | remove `skills/<n>/`, its dist tree (standalone: whole `dist/plugins/<n>/`; bundle-member: its subdir), its marketplace entry (standalone only), then `bash scripts/sync.sh` to regenerate the OpenCode, Cursor, and package trees | standalone: entry gone, no bump target; bundle-member: bundle **major** (an installed skill disappearing is a breaking change to the install surface) |
| New plugin-level surface (hooks, `agents/`, `server/`, MCP config) | the source dir under `skills/<owner>/`, its `pluginDirs` entry in `composition.json`, any manifest wiring (Codex `hooks`), then sync | owning plugin **minor** (new capability) |
| **Retired plugin-level surface** (hooks, `agents/`, `server/`, MCP config) | delete the source dir **and** its dist copy (sync stops copying it, it does not delete it), drop the `pluginDirs` entry, drop the manifest wiring, drop the `supply-chain-allowlist.json` entry, delete its test, then sync | owning plugin **major** — see below |

A retired plugin-level surface is **major even though no skill changed**, and
that is the trap: the diff can look like a deletion of four small files while the
install surface changes on both hosts. The retired-skill row's reasoning applies
unchanged — something an installed user had is gone after an update — and the
one precedent is condux 2.0.0, a skill *rename*, the same shape. Do not reach
for "skill edit → patch" because no `SKILL.md` moved.

**Check the Q2 coupling before you sync.** Dropping Codex `hooks` from a
manifest flips the Agent Plugins exclusion *off*, so sync starts generating a
root `plugin.json` for that plugin — it rejoins a distribution channel it was
excluded from. Adding hooks does the reverse and silently kills them if a root
manifest already exists. Either direction, sync's own line is the check: watch
the `generated N root plugin.json manifests … skipped M` count move.
(`specs/agent-plugins-conformance/quirks.md` Q2; `tests/agent-plugins.test.mjs`
asserts the coupling but cannot tell you it was intended.)

Worked example: session-handoff 2.0.0 (2026-08-28, docket #70) retired its
SessionStart hook — 10/3 became 11/2, and the plugin rejoined Agent Plugins.

**Rules that override everything:** `skills/` is the only editable skill source;
`dist/` skill trees are generated (edit manifests only). Version bumps go in **both**
hand-edited plugin.json manifests, kept identical — installed caches only refresh on
a version change (git `a4f4aa8`).

"Both" means the `.claude-plugin/` + `.codex-plugin/` pair. The **root**
`plugin.json` is a third manifest and carries a version too, but it is generated
from the claude manifest by sync — never bump it by hand, and stage it with the
rest of `dist/` (`tests/agent-plugins.test.mjs` fails on a stale one).

### 2. Run the publish checklist (all must pass)

```bash
bash scripts/sync.sh            # 1. mirror is current
git status --porcelain          #    ...and stayed clean — output here means drift
node --test                     # 2. parity + invariants + manifests green

# 3+4. manifests parse, marketplace entries present, version pairs equal
node -e '
const fs=require("fs");
const mp=JSON.parse(fs.readFileSync(".claude-plugin/marketplace.json","utf8"));
const reg=new Set(mp.plugins.map(p=>p.name));
let bad=0;
for(const d of fs.readdirSync("dist/plugins")){
  const v={};
  for(const h of [".claude-plugin",".codex-plugin"]){
    const f=`dist/plugins/${d}/${h}/plugin.json`;
    if(!fs.existsSync(f)){bad++;console.log(`MISSING  ${f}`);continue}
    try{v[h]=JSON.parse(fs.readFileSync(f,"utf8")).version}
    catch(e){bad++;console.log(`BAD JSON ${f}: ${e.message}`)}
  }
  if(v[".claude-plugin"]!==v[".codex-plugin"]){
    bad++;console.log(`VERSION MISMATCH ${d}: ${v[".claude-plugin"]} vs ${v[".codex-plugin"]}`)}
  if(!reg.has(d)){bad++;console.log(`UNREGISTERED ${d} — not in marketplace.json`)}
}
console.log(bad?`${bad} problem(s)`:"all manifests valid, paired, and registered");
'
```

**Use `node`, not `jq`.** `jq` is not installed everywhere, and
`jq . "$m" || echo "BAD JSON: $m"` fires its `||` on the *missing-binary* exit
code — a machine without `jq` reports every manifest corrupt while a version
comparison between two empty strings reports `OK`. False failures and false
passes from the same run. `node` is already a hard dependency (`node --test`),
so the gate can rely on it. Same doctrine as `sed` over `grep -P` (`dc1e221`).

5. Version bumped in both manifests (if the class requires it) — the script
   above proves the pair is equal, not that it *changed*; confirm against
   `git diff` when the class requires a bump.
6. Commit — only if the user asked: `feat:`/`fix:`/`chore:` prefix, `-s` signoff,
   no `Co-Authored-By` trailer.
7. **Push.** Nothing is shipped until it is pushed: `/plugin install` reads a
   clone of the *remote*, so an unpushed commit installs as the previous
   version and the user gets a stale skill with no error.

### 3. Say what the evidence shows — nothing more

"Shipped" requires all checklist items with command output. Anything less is
"authored but not shipped" — say which items remain.

Green tests on a local clone prove the *repo* is correct, not that anyone can
install it. Before claiming shipped, confirm the remote actually has it:

```bash
git status -sb | head -1                                   # ahead of origin?
git -C ~/.claude/plugins/marketplaces/<marketplace> log --oneline -1
```

## Evidence required

Command output for every checklist claim. A clean `node --test` proves mirror parity
and manifest validity; it does NOT prove the skill's content is correct or that its
description triggers well (see `toolkit-skill-standards`).

## Output artifact

A short ship/no-ship verdict listing each checklist item as pass/fail with the command
that proved it.

## Common traps

- Marking done at "SKILL.md written." History: technical-spec existed unregistered
  until a follow-up commit (`66a71eb`). Registration is part of done.
- Bumping the version in marketplace.json — there is no version field there.
- Editing one manifest and not its twin (`ba69d2b` corrected a displayName that had
  been edited unevenly across the pair).
- Trusting the pre-commit hook to sync — it's developer-local; fresh clones don't have
  it (install via `bash scripts/install-hooks.sh`).
- Calling it shipped while the commit is still local. `/plugin install` clones the
  remote, so an unpushed change installs as the *previous* version silently — the
  same shape as the stale-cache incident in the ledger, self-inflicted.
- Reaching for `jq` in the checklist — see step 2. It is not a dependency of this
  repo and its absence produces confidently wrong output in both directions.

## Bad behavior this prevents

Declaring a skill "shipped" with no marketplace entry — exactly how technical-spec
shipped invisible to `/plugin install` until `66a71eb` retrofitted the entry. The
checklist makes that state unclaimable.

## Related skills

`toolkit-foundry` (the build steps this skill gates), `toolkit-skill-standards`
(content quality bar), `toolkit-debugging-playbook` (when a shipped thing misbehaves),
`git-commit` (crafting the commit itself).

## Provenance and maintenance

Re-verify volatile claims with:
- `node --test` — the gate itself
- the step-2 `node -e` script — registration reality and pair equality in one pass
- `git status -sb | head -1` — whether the work has actually left this machine

Last generated: 2026-07-08 (retired-skill class added 2026-08-04)
Known uncertainty:
- Whether marketplace `category` values beyond "development" are meaningful to any
  installer is unverified — every entry currently uses "development".
- No skill has actually been retired yet — the retired-skill row is doctrine, not
  precedent; expect to refine it on first use (e.g. whether `npx skills add`
  installs prune removed skills).
