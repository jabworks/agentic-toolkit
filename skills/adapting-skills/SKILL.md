---
name: adapting-skills
description: Use when adapting a generic skill, cloning a skill template, scaffolding new code, or generating any output that should match Harvey's stack, conventions, and working preferences.
---

# Adapting Skills to Harvey's Stack

## Overview

Use this as priors when tailoring any skill or generated output to Harvey's context. Config files in the repo always win — read them first; this fills gaps and explains intent.

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
