---
name: research
description: "Multi-source dev research with parallel scouts. Scales effort to the question's shape, writes a plan and per-angle notes to a run folder, then synthesizes a cited report with a recommendation first. Every claim traces to a note finding with a URL. Inferred triggers are confirmed before a deep run. Comparing libraries, frameworks or approaches; surveying how others solve X; \"research X\"; ecosystem or standards surveys that need several sources. Not for a single API or signature lookup (researcher agent, or answer directly); not for implementation tasks (/workflow); not for explaining code (answer directly)."
argument-hint: "[question to research]"
---

# /research

Break a question into angles, send scouts at them in parallel, and return a report you can trust.

## 1. Clarify (only if it changes the research)

Ask only when the answer would change *what gets researched*: which options to compare, a version or time bound, the deciding criterion. Max 3 questions, all at once. Otherwise state your assumptions in `plan.md` and go.

## 2. Classify the shape

| Shape | Example | Scouts |
|---|---|---|
| Single fact or API | "what does `useId` return" | **0** — answer directly or hand to `researcher` |
| Comparison | "Zustand vs Jotai vs Valtio" | **2–4** — one per option, plus one for criteria if needed |
| Survey | "how do teams handle offline sync in 2026" | **5–6** — one per distinct angle |

More than 6 needs the user's yes first. Name the cost when you ask: multi-agent research ran at about 15x the tokens of a chat turn in Anthropic's own measurement.

**Depth gate.** How the skill was reached decides whether to fan out:

| Reached by | What happens |
|---|---|
| **Explicit** — the user named the skill (`/condux:research`, "use the research skill", "condux:research") or asked for depth in words ("deep research", "thorough", "comprehensive", "cited report", "dig into") | Proceed with the classified scout count. Do not ask. |
| **Inferred** — the skill loaded because a question sounded like research (routing hook or trigger description) | Single fact or API: answer directly, never ask. Comparison or survey: ask ONCE, recommendation marked: "Quick answer (one pass, about 1x cost) or deep research (N scouts, about 15x cost)?" N is the classified count. Recommend quick for a comparison of well-known options, deep for a survey or a comparison where the user's constraints decide it. |

**Quick answer** means: the main session answers in one pass, with a few searches and fetches through the host's search and fetch tools, sources cited inline, no run folder and no scouts. Same honesty rules: a version or date on dev claims, and say what could not be verified. If the user picks quick, answer and stop; offer deep research in one line only if the answer is visibly thin.

## 3. Open the run folder

```
.condux/research/<YYYY-MM-DD>-<slug>/
  plan.md
  notes/<angle>.md
  report.md
```

Never overwrite a run folder. A follow-up opens a new one and names the earlier run as background in its `plan.md`.

**Bootstrap.** `.condux/` is created on demand at the git root. Before the first write, check it is ignored:

```bash
git check-ignore -q .condux/ || echo "not ignored"
```

If not, offer once: "condux keeps its working files in `.condux/` — add it to `.gitignore` so they stay out of your commits?" On yes, append `.condux/` to `.gitignore`; if the user would rather not touch a tracked file, use `.git/info/exclude`. Never edit either without asking. Not a git repo: fall back to CWD and say so once.

## 4. Write `plan.md`

Before any dispatch, write: the sub-questions, the scout count with the reason, and **every brief verbatim**. Recording the notes paths here also makes a stray write by a scout visible later.

## 5. Dispatch — all scouts in ONE message

Parallel only works if every call goes out together. Dispatch the named `scout` agent and nothing else — never a general-purpose or custom-prompt agent.

A vague brief makes scouts repeat each other or wander. Each brief carries:

| Part | Rule |
|---|---|
| Objective | one angle, with a clear boundary against its siblings |
| Key questions | the specific things the notes must answer |
| Suggested sources | starting points (official docs, changelogs, repos) |
| Constraints | the user's version and time bounds, carried through unchanged |
| Notes path | absolute: `<git-root>/.condux/research/<run>/notes/<angle>.md` |

Wait for every scout to return before step 6. Their summaries say what was covered; the evidence is in the notes files.

## 6. Gap round (at most one)

Read every notes file. If a *critical* gap remains — one that blocks the recommendation — dispatch a single follow-up round of scouts aimed at only those gaps. Minor gaps go into the report as unknowns. A second round needs the user's consent.

## 7. Synthesize `report.md`

Read the notes from disk, not from scout summaries.

| Part | Contains |
|---|---|
| Recommendation / answer | first, decision-ready, with the deciding reason |
| Comparison table | when the question has options |
| Evidence sections | claims with inline `([source](url))` |
| Risks and unknowns | unresolved conflicts and gaps, stated plainly |
| Sources | the full list, each with its version or date |

When notes conflict, present both sides — don't pick one quietly.

## 8. Citation check

Walk the report claim by claim. Each must trace to a note finding that has a URL. Drop any claim that doesn't, or keep it visibly flagged as unverified. No re-fetching — the notes are the evidence.

## 9. Deliver

In chat: 3–5 lines (the answer, the confidence, the biggest unknown) and the report path.

Offer promotion **once**: "Does this feed a spec? If so, which one?" On a named spec:

1. Copy the report to `specs/<that-spec>/research-<YYYY-MM-DD>-<topic>.md`.
2. Add a link row to that spec's `index.md`.
3. The copy keeps external URLs only. It must never cite a `.condux/` path.

No fitting spec: the report stays in `.condux/`.

## Sequential fallback

If `scout` cannot be spawned — no agent tool, or no scout agent (Cursor, or Codex before the agent installer is re-run) — say so once: "no scout agent here — researching sequentially, slower, same output."

Then do the work yourself: take each angle in turn, using the host's search and fetch tools under the same rules (10–15 calls per angle, primary sources, version or date on every finding, conflicts recorded). Write the same `notes/<angle>.md` files in the scout's shape, one block per key question, then continue from step 7:

```
## <key question>
**Answer**: <1–2 lines>
**Findings**
- <claim> — <source URL> — <source version or date>
**Conflicts**
- <source A says X; source B says Y — both cited>
**Gaps**
- <what could not be found, and why>
```

A finding without a URL goes under Gaps.

## What does NOT happen

- No scouts for a single fact — answer it or use `researcher`
- No fan-out from an inferred trigger without asking
- No more than 6 scouts without the user's yes and the cost named
- No dispatch before `plan.md` holds the briefs
- No general-purpose or custom-prompt agent standing in for `scout`
- No overwriting a run folder
- No second gap round without consent
- No claim in the report without a URL in the notes
- No `.condux/` path cited from a promoted copy
- No promotion without asking which spec
