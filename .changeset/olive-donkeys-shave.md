---
"@jabworks/condux": patch
---

plan-review: write the feedback file atomically

`annotate-server.js` wrote the decision with a plain `writeFileSync`, which is
`open(O_CREAT|O_TRUNC)` followed by `write()` — two syscalls. A reader polling
for the file could win that gap and read a created, still-empty file. Both the
steer-mode and manual-mode writes now go through a temp file plus `renameSync`,
which is atomic on POSIX: a reader sees either the previous file or the complete
new one, never a truncated one. Falls back to a direct write if rename fails.
