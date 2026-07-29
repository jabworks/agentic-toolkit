# Trigger Reliability Audit — 2026-07-29

Scope: all `skills/*/SKILL.md` in `jabworks/agentic-toolkit`, measured against 102 session
digests in `scratchpad/digests/{agentic-toolkit,terminus,crucible,style-guide,codex}/`.

## Methodology notes (read before the table)

- **Repo snapshot is live/moving.** At scan time the working tree had a 30th skill,
  `skills/live-verification/` (uncommitted, no git history), plus uncommitted edits to
  `coding-directive`, `discovery`, `finalize`. It is included in the table for completeness
  but has zero corpus history by construction (it didn't exist during any of the 102
  sessions) — its cold status is not evidence of anything.
- **One codex digest is corrupted and excluded from counts.**
  `digests/codex/rollout-2026-07-10T05-17-25-...txt` has a `slash-commands:` line that is
  actually a shredded directory listing of the whole repo (`/home, /hieuvi, /plugins, /cache,
  ..., /code-review, /git-commit, /workflow, ...` — every skill name in the repo, plus path
  fragments like `/home`). Counting it would falsely credit every skill with +1 invocation.
  It is dropped; all counts below are over the remaining 101 sessions (still reported as
  "102 sessions" per the task's framing, with this one caveated out).
- **Bare vs. plugin-prefixed names are the same skill.** This toolkit ships three install
  channels (`CLAUDE.md`): `npx skills add` (bare name, e.g. `git-commit`), the plugin
  marketplace (`plugin:skill`, e.g. `git-commit:git-commit` or `condux:workflow`), and
  OpenCode. In the corpus, bare names for standalone skills (`git-commit`, `coding-directive`,
  `session-handoff`, `code-review`) appear exclusively in the `terminus` project, while the
  toolkit's own dogfooding sessions (`agentic-toolkit/`) use the prefixed form — consistent
  with `terminus` having installed via `npx` rather than the marketplace. These are merged
  as one skill (session-level union, not summed) per skill. This is why `git-commit` reads
  as **27**, not the "20" figure in the task's framing (20 is the marketplace-channel count
  alone; +7 npx-channel sessions in `terminus` bring it to 27). All other headline numbers
  (workflow 37, finalize 34, discovery 26, draft-plan 24, preflight 23) reproduced exactly.
- **Reached** = invoked in ≥3 sessions. **Cold** = 0–2. Two cold skills
  (`session-report`, `technical-spec`) carry `disable-model-invocation: true` — they are
  *manual-invocation-only by design*, so a 0 count there is not a trigger defect, it's the
  intended behavior.

## Trigger matrix

| Skill | Style | Declared triggers (abbrev.) | Sessions invoked | Verdict |
|---|---|---|---|---|
| workflow | when_to_use | any implementation request; "the operating manual" | 37 | Reached |
| finalize | when_to_use | run after implementation; no quoted phrases | 34 | Reached |
| discovery | when_to_use | LARGE tasks, unclear scope, "brainstorm" | 26 | Reached |
| draft-plan | when_to_use | after discovery sign-off; no quoted phrases | 24 | Reached |
| git-commit | description | "staging changes and creating a git commit" | 27 (20 marketplace + 7 npx, unioned) | Reached |
| preflight | when_to_use | "verify this", "am I done?", "preflight" | 23 | Reached |
| session-handoff | when_to_use | "save state", "handoff", "wrap up", "resume from handoff" | 16 (12 + 4 unioned) | Reached |
| code-review | when_to_use | "review this", "review before merge", "check this PR" | 14 (8 + 8 unioned) | Reached |
| coding-directive | description | "what's our convention for X", "make this match house style" | 9 (7 + 2 unioned) | Reached |
| root-cause-analysis | when_to_use | "the moment debugging starts" — **no quoted phrases** | 7 | Reached, but see §Violations |
| subagent-execution | when_to_use | LARGE plan, agent specialization; no quoted phrases | 6 | Reached |
| release | description | "cut a release", "release v1.2.3", "ship a new version" | 2 | Cold — see §Shadowed |
| test-first-development | when_to_use | explicit tests-first ask; no quoted phrases | 2 | Cold, rarely relevant (opt-in feature, used when asked) |
| plan-review | when_to_use | hook-driven (ExitPlanMode/Codex Stop) + `/plan-review`; no quoted phrases | 1 | Cold, mixed evidence — see §Cold-despite-relevant |
| subagent-deployment | when_to_use | "2+ independent tasks... fan out" | 1 | Cold, thin but plausibly rare |
| adapting-skills | description | "adapting a generic skill, cloning a skill template" | 0 | Cold, rarely relevant (no cross-project adaptation asks in corpus) |
| concord | description | "remember that…", "note for next time" | 0 | Cold, **too new** (added same day as corpus cutoff — no window) |
| git-operations | description | "undoing a commit, discarding... parking work-in-progress" | 0 | Cold, rarely relevant (no organic undo/stash asks found) |
| session-report | when_to_use | usage report; `disable-model-invocation: true` | 0 | Cold **by design** (manual-only) |
| spec-browser | both | "browse specs", "spec index", "list all specs" | 0 | Cold, rarely relevant (repo has few `specs/` trees yet) |
| technical-spec | description | "save spec", "document this"; `disable-model-invocation: true` | 0 | Cold **by design** (manual-only) |
| toolkit-change-control | description | "ready to publish", "what version do I bump" | 0 | **Cold despite relevant — DEFECT** |
| toolkit-debugging-playbook | description | "why isn't my skill triggering", "stale plugin" | 0 | **Cold despite relevant — DEFECT** |
| toolkit-failure-archaeology | description | "has this happened before", "add this to the ledger" | 0 | Cold, rarely relevant (no precedent-lookup asks) |
| toolkit-foundry | description | "creating a new skill", "registering it in the marketplace" | 0 | Cold, rarely relevant (no new-skill-creation asks in this window) |
| toolkit-orientation | description | "how is this repo organized", "where do skills live" | 0 | Cold, rarely relevant (no orientation asks) |
| toolkit-plugin-reference | description | "what fields does plugin.json need" | 0 | Cold, rarely relevant |
| toolkit-research-frontier | description | "what should we improve next", "toolkit roadmap" | 0 | **Cold despite relevant — DEFECT** |
| toolkit-skill-standards | description | "review this skill description", "write the frontmatter" | 0 | Cold, rarely relevant |
| live-verification | when_to_use | "verify it live", "did this actually work" | N/A (uncommitted, post-dates corpus) | Not yet shippable — see §Shadowed |

## Cold-despite-relevant (the real defects)

Three skills had their declared trigger vocabulary matched almost verbatim by an organic
user turn, in a session that invoked *other* skills but not the matching one.

**`toolkit-change-control`** — declared triggers include *"what version do I bump"*, *"ready
to publish"*. In session `agentic-toolkit/0ed20825-b588-471f-b971-3dc782a0e1ba`, the user's
literal instruction was:

> "...Sync dist, bump condux version."

That session's `skills:` line: `condux:workflow, git-commit:git-commit, condux:code-review,
condux:root-cause-analysis, session-handoff:session-handoff` — the one skill whose entire
job is "picking the version bump" never fired. This matches the task's own seed example
exactly: the rule is fully specified, the trigger vocabulary is reasonably concrete, and it
still didn't fire on a session that did exactly the thing it gates.

**`toolkit-research-frontier`** — declared triggers include *"what should we improve
next"*, *"toolkit roadmap"*. Three separate sessions on 2026-07-29 open with the near-verbatim:

> "Let's improve our toolkit. See the local transcripts for our problems."

All three (`16d07041-c41a-4aa7-b80d-6fbec76c7b9d`, `71375bba-97ef-4cc3-ba88-e5a7198930ad`,
`aba68968-f5e2-42df-a4d8-ce6f9e99ad19`) show `skills: none` — not shadowed by a competing
skill, just never reached at all. This is the cleanest miss in the corpus: 3/3 identical
phrasing, 3/3 no fire.

**`toolkit-debugging-playbook`** — declared triggers include *"why isn't my skill
triggering"*, *"stale plugin"*. Two sessions:

> `0bdc21ab-a062-411f-94f9-be37e6faa719`: "...but why isn't `condux` skills appear there?"
> (re: skills.sh not listing condux) — fired `condux:discovery, condux:draft-plan,
> condux:finalize` instead.
>
> `e9e639da-027d-40e8-99d4-adb62a72e8aa`: "...foundry with implement step. It's already
> removed stale plugin, give me a prompt to tell Cod[ex]..." — fired `git-commit:git-commit,
> release:release, condux:workflow` instead.

Both are squarely "a jabworks/agentic-toolkit skill/plugin isn't showing up correctly" —
this skill's exact remit — and neither invoked it.

`plan-review` has one adjacent data point worth naming without over-claiming it as the same
class of defect: session `33ab28b9-f4e1-4c8e-ad7e-43a8482a8f4e` contains the literal report
*"plan-review didn't fire after plan mode e[nded]"* — but that's a hook-wiring failure
(ExitPlanMode auto-capture), already tracked in this project's memory
(`project_plan_review_hook_wiring.md`), not a description/trigger-vocabulary problem. The
rest of plan-review's "hits" in the corpus are meta-conversation about building the skill
itself (dogfooding during its own development), not missed real-world invocations. Listed
as Cold with mixed evidence, not added to the defect count.

## Cold-because-rarely-relevant

`adapting-skills`, `git-operations`, `toolkit-failure-archaeology`, `toolkit-foundry`,
`toolkit-orientation`, `toolkit-plugin-reference`, `toolkit-skill-standards`, `spec-browser`,
`subagent-deployment` — a targeted regex sweep of every organic (non-skill-content-paste)
user turn in the `agentic-toolkit` sessions for each skill's own declared vocabulary
returned zero or single incidental hits with no genuine match. These situations plausibly
just didn't come up in this window (no cross-project skill adaptation, no git accidents
needing undo/stash, no precedent lookups, no new-skill creation in the 18 post-toolkit-ops
sessions, no orientation questions, no manifest-schema questions, no skill-description
reviews, no multi-spec navigation, no independent-parallel-task fan-outs). This is the
"rarely relevant" bucket, not a defect — nothing here should be rewritten on the strength of
this corpus alone.

`concord` (added 2026-07-29, same day as the corpus cutoff — essentially zero window) and
`live-verification` (uncommitted, no git history, post-dates the entire corpus) are cold
purely because they didn't exist yet, not because their triggers are weak.

`session-report` and `technical-spec` are cold by explicit design
(`disable-model-invocation: true` in their frontmatter) — they are slash-command-only and
were never meant to fire off conversational vocabulary.

## Shadowed

**`toolkit-change-control`** shadowed by **`release`**. TCC declares *"ready to publish"*,
*"what version do I bump"*; release declares *"cut a release"*, *"ship a new version"*. Both
skills own a "version"/"ship"/"publish" lexical territory but gate different decisions (TCC:
what semver bump a *plugin manifest* needs after a skill edit; release: cutting an actual
git tag + GH release). In session `950067da-22c3-468e-ab6c-dc54a6cfb618` the user says "Cut
a release for the two bumped plugins" — release fires, TCC (whose job is literally deciding
what "bumped" should have meant) never does. Release's own SKILL.md doesn't cross-reference
toolkit-change-control at all, so nothing in its text redirects a "did I bump this right"
sub-question back to the more specific skill.

**`toolkit-debugging-playbook`** shadowed by **`root-cause-analysis`**. RCA's when_to_use is
*"Trigger the moment debugging starts"* — a generic condition with zero quoted phrases,
covering literally any debugging including "why isn't my skill triggering." TDP is the more
specific skill ("when a skill or plugin from jabworks/agentic-toolkit misbehaves") but has no
structural signal telling the router to prefer it over RCA's blanket "debugging starts"
condition. (In the two observed miss sessions neither skill fired, so this is a latent risk
more than an observed steal — but RCA's genericness is the mechanism that would produce a
steal if either skill fired at all.)

**`preflight`** vs. the new **`live-verification`**. Preflight declares *"verify this"*,
*"am I done?"*; live-verification declares *"verify it live"*, *"did this actually work"*.
Both anchor on "verify." live-verification's own description already carries a reverse
disclaimer ("not for typecheck/lint/test... not for auditing plan completeness (preflight)"),
but preflight (written first, before live-verification existed) carries no matching
forward-reference — a bare "verify this" from a user is currently, structurally, preflight's
to claim by default. No corpus evidence yet (live-verification post-dates the corpus) — this
is a pre-emptive flag, not an observed failure.

## Stale aliases

All four resolve cleanly via commit history — and all invocations in the corpus **predate or
straddle** the actual rename, so none of this is live plugin-cache drift; it's simply what
these skills used to be called when the sessions ran.

| Alias seen in corpus | Sessions | Renamed to | Commit |
|---|---|---|---|
| `condux:brainstorm` | 7 (all 2026-06-30 → 07-08, before the 07-07 13:49 UTC rename) | `discovery` | `a605be9` "rename skills off superpowers vocab; tighten pipeline (v2.0.0)" |
| `condux:write-plan` | 6 (all 2026-07-02 → 07-08, before/straddling the rename) | `draft-plan` | `a605be9` |
| `condux:verification` | 4 (all 2026-07-02 → 07-07, before the rename) | `preflight` | `a605be9` |
| `condux:systematic-debugging` | 1 (2026-07-05 → 07-06, before the rename) | `root-cause-debugging`, then renamed again same week to `root-cause-analysis` | `a605be9` then `0b88ab2` "rename skills → root-cause-analysis + test-first-development" |

One session (`terminus/c99f9be7-...`) spans the rename commit itself (started 07-07 12:20,
rename landed 13:49, session ended 07-08 02:14) — it used both `condux:write-plan` and
`condux:brainstorm`, consistent with the plugin cache having been loaded before the rename
and not yet refreshed mid-session, not an ongoing bug today.

`verify` (bare, 1 session, `terminus/eed85ecd-...`, 2026-07-10 — after the rename) does not
map cleanly to any of the toolkit's real or former skill names; most likely either a
project-local `terminus` skill/command unrelated to this toolkit, or digest noise similar to
the excluded codex file. Not confidently attributable — flagged, not resolved.

## Trigger-contract violations

**Structural invariant (description starts with "Use when" OR `when_to_use` present):
100% compliant.** All 30 skills on disk satisfy this — it is not the failure mode here.

**Abstract/jargon-only vocabulary: one clear case.** `root-cause-analysis`'s `when_to_use`
is *"Trigger the moment debugging starts — never proactively — and always before any fix is
proposed or any change is made."* This is a behavioral condition, not a set of phrases — it
gives the router no lexical anchor at all (contrast with `toolkit-debugging-playbook`,
`toolkit-orientation`, `release`, etc., which all list quoted phrases a user would actually
type). It's reached anyway (7 sessions) because "debugging" is common enough vocabulary
in-context, but it's also the mechanism enabling the `toolkit-debugging-playbook` shadow
above — a purely condition-based trigger can't discriminate "the user's app has a bug" from
"this toolkit's own skill has a bug."

## Ranked: 8 highest-value trigger rewrites

1. **`toolkit-change-control`** — current triggers are all question-shaped ("is this
   shipped", "ready to publish"). The corpus miss was imperative-shaped ("Sync dist, bump
   condux version"). Add the imperative form.
   - Current: `Triggers include "is this skill shipped", "am I done shipping this skill/plugin", "ready to publish", "what version do I bump", "did I register this plugin", "retire this skill".`
   - Proposed: add `"bump the version", "sync dist and bump", "just edited a plugin template/SKILL.md — what's the version bump"` and a `when_to_use` note: *"Also self-trigger immediately after any edit to a plugin.json, marketplace.json, or shipped SKILL.md — before the user asks."*

2. **`toolkit-research-frontier`** — 3/3 identical near-verbatim misses.
   - Current: `Triggers include "what should we improve next", "toolkit roadmap", "open problems", "run the health campaign".`
   - Proposed: add the corpus's literal phrasing: `"let's improve our toolkit", "let's improve this repo"`.

3. **`toolkit-debugging-playbook`** — both misses were about distribution/visibility
   ("why isn't X showing up"), not literally "triggering."
   - Current: `Triggers include "why isn't my skill triggering", "plugin not showing up", "dist drift", "stale plugin", "skill broken".`
   - Proposed: add `"why isn't X showing up on skills.sh/the marketplace", "condux doesn't appear when I search"`.

4. **`root-cause-analysis`** — no quoted phrases at all; the abstraction is what lets it
   swallow toolkit-self-debugging too.
   - Current: `when_to_use: Trigger the moment debugging starts — never proactively — and always before any fix is proposed or any change is made.`
   - Proposed: add `Trigger phrases: "why is this failing", "this bug", "unexpected behavior", "error when I...". For a jabworks/agentic-toolkit skill/plugin itself misbehaving (not triggering, not showing up, dist drift) — hand off to toolkit-debugging-playbook instead.`

5. **`release`** — one-directional boundary; doesn't send version-bump sub-questions back
   to the more specific skill.
   - Current: no mention of toolkit-change-control anywhere in the file.
   - Proposed: add `Not for deciding a plugin/skill's semver bump before shipping (that's toolkit-change-control) — run that gate first when the repo is jabworks/agentic-toolkit.`

6. **`preflight`** — no forward-reference to the new live-verification, which shares the
   "verify" anchor word.
   - Current: `Trigger standalone on "verify this", "am I done?", or "preflight".`
   - Proposed: add `Not for actually running the change to observe it work in a browser/CLI — that's live-verification.`

7. **`plan-review`** — no conversational trigger phrases at all; entirely dependent on a
   hook or explicit slash command, both of which have known gaps.
   - Current: `when_to_use` has no quoted phrases, only "when the agent finishes planning... or when you invoke /plan-review."
   - Proposed: add `Trigger phrases: "let's review the plan", "walk me through the plan before we build", "annotate the plan"` as a description-level fallback for when the ExitPlanMode/Codex-Stop hook doesn't fire.

8. **`concord`** — brand new, zero corpus window, but a direct competitor ("remember"
   plugin) already owns this vocabulary in 12 sessions across sibling repos.
   - Current: `Use when the user asks you to remember something ("remember that…", "note for next time", "keep this in mind")...`
   - Proposed: add distinguishing phrasing before it ships further: `"what did we do last time", "have we hit this before", "what's in memory"` — and state explicitly that it supersedes any generic memory/Remember plugin for this repo, since the corpus shows the generic one already winning that lexical space by default.
