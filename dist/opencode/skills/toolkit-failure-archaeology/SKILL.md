---
name: toolkit-failure-archaeology
description: Use when about to re-fight an old battle in jabworks/agentic-toolkit — checking whether a mistake happened before, mining git history for precedent, or recording a new incident. Holds the evidenced incident ledger (dist drift, YAML breakage, missed registration, stale plugin caches) with commit hashes and the doctrine each produced. Triggers include "has this happened before", "why do we do it this way", "add this to the ledger". Not for recalling past sessions; use concord.
---

# Toolkit Failure Archaeology

## Purpose

This repo's memory of real mistakes — sourced only from git history, never invented —
so no session re-fights a settled battle.

## When to use

- Before "fixing" something that smells like a past incident.
- When a convention seems arbitrary and you want the incident behind it.
- After resolving a new incident worth remembering.

## When not to use

- Active triage of a live problem → `toolkit-debugging-playbook` (it links back here).
- General repo layout questions → `toolkit-orientation`.

## Inputs required

`git log` access. For new entries: the incident's commit hash(es) — no hash, no entry.

## Procedure

1. **Consult the ledger first**: `references/incident-ledger.md` — one entry per
   evidenced incident (symptom, wrong path, root cause, commit, doctrine, where
   encoded).
2. **If not in the ledger, mine git**:
   ```bash
   git log --oneline --all --grep='<term>'   # fix, revert, sync, stale, rename…
   git show --stat <hash>                     # what a suspect commit touched
   ```
3. **Adding an entry** (only with commit evidence): append to the ledger using its
   entry template. Never rewrite or delete existing entries — append corrections.
4. **"Do not re-fight this battle" check**: the ledger's settled decisions include
   hand-editing dist/ (settled: never), monorepo-local plan paths (reverted,
   `dc1e221`), GNU-only grep flags (banned for portability, `dc1e221`), and a separate
   html-artifacts skill (folded into plan-review — the fold's design record lives
   in `docs/plans/2026-07-02-plan-review-spec-fold-design.md`; the root `PLAN.md`
   that once recorded it is gone).

## Evidence required

Every claim in the ledger carries a commit hash. If a lesson has no commit, it does
not belong here — say "no evidenced incident" rather than fabricating one.

## Output artifact

Either the relevant ledger entry (quoted, with hash) answering "has this happened
before," or a new appended entry.

## Common traps

- Summarizing incidents from memory instead of the ledger — the details (which copy
  was stale, which fix worked) are exactly what memory garbles.
- Recording near-misses or hypotheticals as incidents — dilutes trust in the ledger.

## Bad behavior this prevents

Re-attempting per-package monorepo plan paths without knowing they were already tried
and reverted the same day (`b782719` → `dc1e221`) — the ledger's rejected-approach
entry blocks the retry before design work starts.

## Related skills

`toolkit-debugging-playbook` (live triage that cites this ledger),
`toolkit-change-control` (doctrine this history produced), `toolkit-orientation`
(where things live).

## Provenance and maintenance

Re-verify volatile claims with:
- `git log --oneline --all | wc -l` — history size (50 on main at the 2026-08-04
  re-eval; squash-merges keep it small, so a jump means unmerged branches)
- `git log --oneline -5` — anything new worth a ledger entry

Last generated: 2026-07-08 (pointers refreshed 2026-08-04)
Known uncertainty:
- Pre-toolkit history (skills imported from other repos, e.g. toolkit-foundry's
  softaworks origin) is not covered — the ledger starts at this repo's own commits.
