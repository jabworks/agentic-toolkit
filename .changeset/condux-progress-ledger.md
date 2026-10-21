---
"@jabworks/condux": minor
---

The Progress Ledger is now one contract in `/workflow`, kept by inline execution as well as by `subagent-execution`: task lines after each commit and wrap-up lines (preflight, finalize, review, commit/PR) as the checkpoints finish, so a tool reading `.condux/progress/` sees every saved plan, not only the ones agents ran.
