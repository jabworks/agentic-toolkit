# TypeScript: Lint Rules, Code Shape & Judgment

## Lint conventions (Tier 1 — enforced)

Built on `typescript-eslint` **strictTypeChecked + stylisticTypeChecked**
(type-aware, the strictest presets), then layered with:

- **Type imports/exports are inline:** `import { type Config } from 'prettier'`
  — not a separate `import type` line, and never type-only imports inside type
  annotations. Fix style is `inline-type-imports`.
- **Naming convention (`error` severity):**
  - Anything type-like (types, interfaces, classes, enums) and enum members:
    `PascalCase`.
  - Interfaces must **not** be prefixed `I`, and must **not** be named bare
    `Interface`, `Props`, or `State`. A component's props type is
    `ButtonProps`, never `Props`.
- **Method signature style: property style.** Write
  `onClick: (e: Event) => void`, not `onClick(e: Event): void` — property
  style gets stricter variance checking.
- **Explicit return types are NOT required.**
  (`explicit-function-return-type` is deliberately disabled.) Let inference
  work; annotate only where inference is wrong or the type is a public
  contract.
- **Template literals: strings and numbers only**
  (`restrict-template-expressions` with `allowNumber`). No objects/booleans/
  nullish interpolated directly.
- **Switches over unions must be exhaustive**
  (`switch-exhaustiveness-check`; a `default` counts as exhaustive for
  unions).
- **`Array#sort` requires a comparator** unless it's a string array.
- **Empty object types banned**, except an empty interface extending exactly
  one base.
- **Promises:** no misused promises (`no-misused-promises`; async handlers in
  JSX attributes are the sanctioned exception), and `Promise.reject` only with
  `Error` objects.
- Prefer `RegExp.exec()` over `String.match()`.
- Unused vars are errors; the escape hatch is a `_` prefix (`_unused`,
  `(_req, res)`), args checked `after-used`.
- `default-param-last`, no functions declared in loops, no useless
  constructors.

## JavaScript best practices (Tier 1 — enforced)

- `eqeqeq` — always `===`/`!==`.
- **No implicit coercion:** `Boolean(x)`, `Number(x)`, `String(x)` — never
  `!!x`, `+x`, `'' + x`.
- `curly: multi-line` — braces required for multiline blocks; a true
  single-line `if (x) return;` is permitted.
- No `else` after a `return` (`no-else-return`).
- **No parameter reassignment** — copy to a local instead.
- `prefer-const`, `no-var`, `prefer-template` (template literals over
  concatenation), `object-shorthand`, `prefer-spread`/`prefer-rest-params`
  (never `arguments`), `prefer-object-spread` over `Object.assign`.
- `no-console` allows only `console.error` and `console.warn`. **Never leave
  `console.log` behind.**
- Banned outright: `alert`, `eval`/implied eval, `new` for side effects,
  labels, bitwise operators, `Array` constructor, extending natives,
  `arguments.caller`/`callee`.
- `Symbol()` requires a description; regex literals over `new RegExp('...')`
  for static patterns.

## Code shape & rhythm (Tier 1 — distinctive, follow closely)

The `@stylistic` layer is **intentionally applied on top of Prettier** to
enforce a broader surface. Its `padding-line-between-statements` config
defines a deliberately "airy" vertical rhythm:

- **Blank line before every `return`.**
- **Blank line after a group of `const`/`let` declarations** (consecutive
  declarations may stay adjacent).
- **Blank lines both before and after** `if`, `try`, `switch`, `for`, `while`,
  and any block-like statement.

Also:

- **No nested ternaries** (`error`). One level max; refactor to `if`/early
  returns or a lookup map beyond that.
- No unneeded ternaries (`x ? true : false`), no lonely `if` inside `else`
  (use `else if`), no chained assignments (`a = b = c`).
- Function expressions are anonymous when the name adds nothing
  (`func-names: as-needed`); prefer arrow callbacks.
- Comments start with a space (`// like this`); `new` only with capitalized
  constructors.
- Yoda conditions discouraged.

## Type-level judgment calls _(Medium)_

- `unknown` over `any`, always. `any` only under duress with a justified
  disable directive.
- `as` assertions are a last resort; prefer narrowing, type guards, and
  `satisfies`. Never assert away `noUncheckedIndexedAccess`.
- Unions and `as const` objects over `enum` for value sets. (Enums aren't
  banned — enum members have a naming rule — but unions are the default
  reach.)
- `interface` for object shapes intended for extension/implementation and
  public component props; `type` for unions, intersections, mapped/utility
  compositions, and function types. Don't churn between them in a file.
- Shared types live in the shared package and are imported cross-package via
  the package entry point — never duplicated, never deep-imported.
- Generics: `T`, `K`, `V` for trivial cases; descriptive `TItem`, `TResponse`
  when there's more than one.

## Error handling _(Medium)_

- No swallowed catches — every `catch` either handles meaningfully, rethrows
  with context, or logs via `console.error`/`console.warn` (the only permitted
  console channels).
- Throw `Error` subclasses (never strings); typed/discriminated errors at API
  and package boundaries (tRPC procedures, NestJS services).
- Error messages state what failed and with which inputs; no leftover debug
  logging in committed code.
- Async code: no floating promises (enforced via strictTypeChecked) —
  `await`, `void`, or `.catch` deliberately.
