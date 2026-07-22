# Process & Discipline

## Quality gates (Tier 1 pipeline)

Run **once, at the end of a task** — not per-file, not in a loop (the condux
`/finalize` skill owns execution when installed):

1. **Typecheck** (`tsc --noEmit` / `pnpm check-types`)
2. **Lint** (ESLint and/or oxlint; warnings block)
3. **Format** (`prettier --check`, auto-write if dirty, report what changed)
4. **Test** (Vitest `--run`; one fix attempt on failure, then stop and report)

Stop on first failure, fix, continue. If tests still fail after one fix
attempt, report instead of looping. Check `package.json` scripts before
assuming script names; scope with `pnpm --filter <pkg>` in the monorepo.

## Communication & handoff style _(High)_

When producing plans, handoff prompts, or explanations for Harvey:

- **Exact file paths and package scopes**, always — never "in the appropriate
  file."
- Call out **non-obvious constraints** explicitly (the trap a naive
  implementer would fall into), and include an explicit **Out of scope**
  section.
- When giving CLI commands, **explain every argument and flag**.
- When updating code, state **which part** changes (CSS, JS, or both) and
  include the snippet in a copyable code block even if a file/artifact was
  also updated.
- Plans name assumptions and blockers instead of guessing; trade-offs are
  reasoned, not asserted.
- Tone: direct and corrective over flattering. Flag real problems; don't
  propose changes to subjective style choices just because another convention
  is more common.

## Git, versioning & release _(High)_

The git-commit and release skills execute these when installed; the rules
hold regardless:

- Conventional-commit messages: `feat:` / `fix:` / `chore:` / `docs:` prefix,
  scoped when it clarifies (`feat(condux): …`), imperative subject.
- Always sign off: `git commit -s`. **Never add `Co-Authored-By:` or any
  AI-attribution trailer.**
- Version bumps are part of the change, not an afterthought: editing any file
  inside a versioned artifact (plugin templates, SKILL.md, scripts, HTML
  assets) bumps that artifact's manifest version in the same commit.
  "Template-only" changes still count as a release — consumers detect updates
  by version.
- Force-push only with `--force-with-lease`, never bare `--force`.
- Behavior changes to agent skills/prompts ship with eval evidence when a
  corpus exists (trigger-routing eval, ~90% pass threshold) — not on vibes.

## Agent editing & verification discipline _(High)_

- **Never rewrite code by regex-splicing a file**
  (node `s.replace(/fn[\s\S]*?}/, …)`, sed). Lazy matches run past the
  intended closing brace and silently delete adjacent code — this has deleted
  142 lines and shipped broken in a release before. Use precise Edit
  operations with unique anchors.
- After any structural change to a big file, **verify the whole file, not
  just the edited function**: confirm all key definitions still exist, parse
  embedded `<script>` content, and diff against the last known-good commit to
  confirm only intended lines changed — before committing.
- Self-contained HTML tools keep an extract-and-eval test harness —
  browser-only functions won't fail in isolated unit tests.
- **Sentinels in source are escape sequences, never raw control bytes.** Write
  the six characters `\u0000` (backslash, `u`, four zeros); a raw NUL byte
  makes git treat the file as binary and drops it out of `grep`. Beware the
  second-order trap: reading such a file pulls the raw byte into the agent's
  context, and writing it back reproduces the corruption. Retype the escape
  rather than copying the example.
- **Byte-exact file content goes through Write/Edit, never a shell redirect
  through a display wrapper.** rtk (mandatory prefix for all shell commands
  in Harvey's environment) decorates and truncates output; `jq … > file`
  has corrupted manifests. Keep rtk command lines simple — it also rewrites
  some pipelines.
- **Stay inside the current repo.** Never read or modify files in other
  projects without explicit permission — even read-only, even "just to check
  a pattern."

## Shipped-artifact portability _(High)_

- Anything distributed (skills, plugins, viewers) must run on a bare host:
  **assume no MCP server or plugin is installed** (context-mode explicitly
  included). A skill that leans on one silently breaks for everyone without
  it.
- For agent-facing reference/search needs, ship a portable artifact any agent
  can read or grep — a plain-markdown catalog — over an MCP dependency.
  Viewers are self-contained HTML + Node, no external services.
