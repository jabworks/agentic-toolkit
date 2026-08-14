# Release rollback matrix

Doctrine first: **fix forward beats unwinding.** A bad release that's already
public is usually best superseded by the next patch version — unwinding is for
releases nobody has consumed yet. Every path below states its blast radius.

| Completed step | Rollback | Blast radius / caveats |
|---|---|---|
| Tag created locally only | `git tag -d <tag>` | None — nothing left the machine. |
| Tag pushed, no release yet | `git push --delete origin <tag>` then `git tag -d <tag>` | Safe if nobody fetched; anyone who fetched keeps a dangling tag. Re-tagging the same name later confuses caches — prefer the next patch version. |
| GitHub release created | `gh release delete <tag> --yes` then the tag deletion above | Release URLs 404 for anyone holding them; notes are gone. |
| Toolkit plugin released | Delete release + tag as above | Installed users are unaffected until a marketplace refresh — ship the corrected version promptly so caches skip the bad one entirely (a4f4aa8 doctrine). |
| `changeset publish` hit npm | Prefer `npm deprecate <pkg>@<version> "<reason>"`; `npm unpublish` only within the 72-hour policy window and only if nothing depends on it | Unpublish breaks downstream installs immediately; deprecate warns without breaking. Fix forward with a patch release. |
| Version Packages PR merged wrongly | Revert the merge commit (`git-operations` owns the revert mechanics), then a corrective changeset fixes forward | The reverted version number is burned — changesets will move past it. |

Partial-failure rule: when the sequence stops mid-way, roll back only the steps
that completed, in reverse order, and report each command as it runs. Never
attempt the failed step again in the same breath — diagnose first
(`root-cause-analysis` if it's genuinely unclear why).
