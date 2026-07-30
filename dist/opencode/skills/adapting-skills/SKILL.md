---
name: adapting-skills
description: Use when adapting a generic skill, cloning a skill template, scaffolding new code, or generating output that should match the jabworks stack and conventions. Also when improving or updating an existing skill in any project — its trigger contract, eval cases, or structure — to the jabworks authoring standards. Not for creating, registering, or syncing toolkit skills (toolkit-foundry) or reviewing this toolkit's own SKILL.md files (toolkit-skill-standards).
---

# Adapting Skills to the jabworks Stack

## Overview

Use this as priors when tailoring any skill or generated output to this stack. Config files in the repo always win — read them first; this fills gaps and explains intent.

## Ground Truth Rule

These repo files override everything here:
`.oxlintrc.json`, `eslint.config.*`, `prettier`, `tsconfig.json`, `package.json`, `drizzle.config.ts`, `docker-compose.yml`

## Quick Checklist

1. Read repo config files first — they override this profile
2. TypeScript: strict, ESM, no `any` escape hatches — surface the type problem
3. Monorepo tooling: `@jabworks/*` scope, `workspace:*` deps, layered `src/configs/*`, ESM `exports` map
4. Linting: oxlint direction — port rule *intent*, not ESLint plugin code
5. Backend: keep NestJS + tRPC + Drizzle layers explicit — don't collapse them
6. Go: idiomatic standard style; explain via JS/TS analogy
7. Edits: minimal diff — show proposed change and wait before writing
8. Local AI: 16GB VRAM ceiling, dual-model split (text + vision)
9. Docs: bullet-structured, concise

## Stack

| Layer | Tool | Key constraint |
|---|---|---|
| Language | TypeScript strict, ESM-first | No `any`; `"type": "module"` everywhere |
| Backend lang | Go | Explain via JS/TS analogy (pointers, nil, receivers) |
| Frontend | Next.js 14 App Router | SSR + route handlers |
| Backend | NestJS + tRPC | Module-per-feature, controller/service/repo split |
| ORM | Drizzle | TS-native, SQL-first; schema is source of truth |
| DB | PostgreSQL | |
| Infra | Docker Compose | Monorepo services wired together |
| Monorepo | Turborepo + pnpm workspaces | `workspace:*` internal deps |
| Lint | Migrating ESLint → oxlint | `.oxlintrc.json`, no custom plugin API |
| Test | Vitest | |
| Streaming | SSE via Next.js route handlers | WebSockets only when real-time genuinely needed |
| Local AI | llama.cpp dual-model server | 16GB VRAM — `UD-IQ4_XS`-class quants |

## Monorepo Conventions

- **Scope:** `@jabworks/*`, kebab-case names
- **Config packages:** `packages/<name>/src/configs/` split by `base`, `typescript`, `react`, `next`, `vitest` — thin `index` re-exports all
- **Deps:** tool is a `peerDependency`; internal packages use `workspace:*`
- **Publishable:** `"private": false`, `"publishConfig": { "access": "public" }`
- **ESM:** `exports` map with subpath entries (`./base`, `./typescript`, `./react`, `./next`)

## Code Style

- Explicit types at boundaries, inference inside; end-to-end type safety is the goal
- Semantic, descriptive names — design-token taste: names say what a thing *is for*
- Comments = intent/why, never narration of what the code obviously does
- Go: `PascalCase` exported, `camelCase` unexported, short receiver names, idiomatic over clever

## Working Style

- **Concepts first, then code** — lead with the mental model, JS/TS analogy for Go topics
- **Show diff before writing** — propose and wait for confirmation; don't autonomously rewrite
- **Minimal diff** — change only what the task requires; no drive-by reformats
- **Reasoned recommendations** — lay out tradeoffs, give a clear recommendation with the *why*
- **Honest pushback** — say so if an approach is wrong or overkill

## Improving an Existing Skill (any project)

These authoring standards travel; the toolkit's machinery does not. When
improving a skill in another repo (`.claude/skills/`, `.codex/skills/`, a
plugin's skills tree), apply the standards below and defer to that repo's own
conventions for everything else — same ground-truth rule as the stack profile.

**Trigger contract.** Either `description` starts with "Use when…" (triggering
conditions only), or a `when_to_use` field carries them. Budgets: description
≤ 500 chars, frontmatter total ≤ 1024. Natural user phrasing, never
skill-internal vocabulary — a cold user types "why does checkout 500", not
"run the four-phase investigation".

**One owner per query space.** Before widening a description, check which
existing skill (or global skill, e.g. skill-creator) already claims the
phrasing. Overlap makes routing worse for both sides. Carve explicit "Not
for X; use Y" boundaries — both directions when possible.

**Seam discipline.** When two skills share a boundary, sharpen *both* sides:
the loser drops the ambiguous vocabulary, the winner claims it explicitly.
Mirror the seam's eval cases into both skills' corpora so it stays measured.

**Eval cases.** If the repo has a trigger-eval setup, add cases for any new
vocabulary (positives + hard negatives). If not, note the untested change —
description edits without measurement are how trigger spaces rot. The
toolkit's harness (`scripts/eval-triggers.mjs`) is repo-agnostic if they
want one.

**Structure.** Body ≤ ~150 lines; move templates, checklists, and long
reference material into `references/` (progressive disclosure). One skill =
one job — split before a skill grows a second trigger surface.

**Boundary:** generic scaffolding and eval *tooling* belong to skill-creator
(if installed); this section is for applying these standards. Skills in
*this* toolkit route to toolkit-foundry / toolkit-skill-standards instead.

## Common Mistakes

| Mistake | Correct approach |
|---|---|
| `any` to unblock compilation | Surface the type error instead |
| Monolithic lint/tooling config | Layer by concern under `src/configs/*` |
| Porting ESLint plugin code to oxlint | Port rule *intent* only — oxlint has no plugin API |
| Collapsing NestJS/tRPC/Drizzle | Keep all three layers explicit and visible |
| Rewriting whole file for small edit | Minimal diff; show before writing |
| Suggesting heavy infra for streaming | SSE via route handlers first; WS only when needed |
| Go explanation from scratch | Frame against JS/TS mental model |
