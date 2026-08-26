---
"@jabworks/condux": minor
---

technical-spec's concern-file templates are layered: every file opens with a
scannable summary table and carries its reasoning underneath. decisions.md
drops the four ADR prose headings for Decided/Because one-liners with a
mandatory alternatives table; quirks.md gets Symptom/Trigger/Cause/Mitigation
with canonical `## Q<n> — Title` headings; api.md types annotate every field
inline (the type says what a field means, fields.md says what happens to it);
implementation.md's data flow becomes a numbered list; index.md's Contents
becomes a File/Answers table, pre-shaped by the scaffold.
