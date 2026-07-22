# Resume Checklist

Run through this before touching any code.

## 1. Read the full handoff

- [ ] Read every section — no skimming (handoff may be `.md` or `.html` — both are equally readable)
- [ ] Note `workstream`, `branch`, and `continues-from`

## 2. Verify project state

```bash
git branch --show-current       # matches handoff branch?
git log --oneline -5            # what happened since?
git status --short              # unexpected uncommitted changes?
```

- [ ] On the correct branch
- [ ] Aware of commits since handoff
- [ ] No unexpected in-flight changes

## 3. Assess staleness

See SKILL.md staleness table. If stale or very stale, surface the delta to the user before acting.

## 4. Validate assumptions

For each item in "Important context":
- [ ] Constraint / invariant still holds?

For each file in "Critical files":
- [ ] File still exists at that path?
- [ ] Line numbers approximately correct?

## 5. Check services (if relevant)

- [ ] Docker Compose services needed are running
- [ ] Dev server running if needed
- [ ] DB migration state matches handoff (run your migration status command if applicable)

## 6. Red flags — pause and confirm with user before proceeding

- [ ] Files listed in handoff are missing from disk
- [ ] Branch has diverged substantially (>20 commits)
- [ ] An assumption in "Important context" is now false
- [ ] A blocker is now causing active failures
- [ ] Architecture in files doesn't match what the handoff describes

## 7. Resume

- Start at "Immediate Next Steps §1"
- Don't re-litigate decisions in "Decisions made" without a reason
- If you discover major new context mid-session, update this handoff before the session ends

## 8. Prune

- Once the resume has landed, this handoff is consumed — offer to delete it
  (and its `continues-from` chain) per the Prune workflow in SKILL.md
