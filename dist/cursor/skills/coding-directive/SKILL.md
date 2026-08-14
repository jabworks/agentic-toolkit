---
name: coding-directive
description: Use when code must conform to the jabworks house conventions — "what's our convention for X", "why does our style ban <lint rule>", "make this match house style", or setting Prettier/ESLint/oxlint/tsconfig to the house settings. Not for what a lint rule or language feature means in general, why a shell command or CLI flag is banned here (toolkit-failure-archaeology), scaffolding or adapting artifacts to the stack (adapting-skills), quality gates (finalize), or design/layout work.
---

# The jabworks Coding Directive

## Prime Directive

These are deliberate style choices, not accidents. Do not "fix" them toward a
more common convention — when a rule here conflicts with a general best
practice you were trained on, this skill wins. Tier-1 rules are mechanically
enforced by CI (ESLint/oxlint with deny-warnings, Prettier/oxfmt, Stylelint);
getting them right the first time is the whole point.

## Meta-Rule: Codebase Mimicry First _(High)_

Before writing anything in an existing project, inspect neighboring code and
match it — CSS approach (Tailwind vs CSS Modules vs plain), state patterns,
folder anatomy, naming. Never default to your own habits when a local
convention exists. Repo config files (`.oxlintrc.json`, `eslint.config.*`,
Prettier config, `tsconfig.json`) always win over this skill. When no local
convention exists, fall back to the references here.

## Non-Negotiables Digest

The rules agents get wrong most often — internalize before writing a line:

- **Named exports only** — default exports are an error, except
  framework-mandated files (Next.js `page.tsx`, `layout.tsx`, `*.config.*`, …)
- **kebab-case filenames, always** — the component inside is PascalCase, the
  file is not (`log-trail.tsx`, `use-log-store.ts`)
- **All React components are arrow functions**; boolean props shorthand
  (`<Input disabled />`, never `disabled={true}`)
- **Airy vertical rhythm** — blank line before every `return`, after
  `const`/`let` groups, and around `if`/`try`/`switch`/loop blocks
- **No nested ternaries** (error); no implicit coercion — `Boolean(x)` /
  `Number(x)` / `String(x)`, never `!!x` / `+x` / `'' + x`
- **Inline type imports** — `import { type Config } from 'prettier'`, never a
  separate `import type` line
- `console.error` / `console.warn` only — never leave `console.log` behind
- Semicolons always; single quotes (JSX too), 120-char lines, trailing commas
  everywhere, single-arg arrows without parens, one JSX attribute per line
- `unknown` over `any`; narrowing and `satisfies` over `as`; unions and
  `as const` objects over `enum`
- Props types are `ButtonProps`, never `Props`; interfaces never prefixed `I`
- **Every mutation and fetch ships four states** — pending indicator, trigger
  disabled while in flight, error surfaced where it was triggered, empty state
- **Light mode first** — build and verify light before dark, and never call a
  themed change done until both are checked; never hardcode a color the theme
  tokens cover

## Topic References

Load only what the task touches:

| Task touches | Read |
|---|---|
| Toolchain assumptions, Prettier/oxfmt settings, tsconfig | `references/formatting-and-toolchain.md` |
| TS lint rules, code shape & rhythm, type judgment, error handling | `references/typescript.md` |
| Import order, exports, monorepo boundaries, dependencies | `references/imports-and-boundaries.md` |
| React/JSX rules, component anatomy, state libraries | `references/react.md` |
| Naming — files, booleans, handlers, collections, generics | `references/naming-and-files.md` |
| CSS Modules, Stylelint, Tailwind discipline | `references/css-and-tailwind.md` |
| Quality gates, git/versioning, agent editing discipline, portability | `references/process.md` |

## Confidence Tiers

Enforced rules (extracted from `github.com/jabworks/style-guide` configs) are
stated as fact — violating them fails CI. Judgment rules carry a confidence
marker: _(High)_ directly evidenced in the project's own decisions and review
history, _(Medium)_ strongly implied by adjacent choices, _(Low)_ plausible
default. Treat Low/Medium as defaults to confirm with the maintainer before
hard-coding them into other skills, configs, or per-repo instructions.

## Rationale Discipline _(High)_

Every opinion carries a rationale. Comments explain _why_, never _what_.
Deviations from a preset or convention get an explicit inline justification.
When adding config or non-obvious code, state the reason, not just the rule.

## Quality Gates

Typecheck → lint → format → test, run **once at the end of a task**, not
per-file and not in a loop. The condux `/finalize` skill owns execution;
`references/process.md` has the pipeline details.
