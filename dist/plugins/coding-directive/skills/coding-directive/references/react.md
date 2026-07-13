# React / JSX

## Mechanical rules (Tier 1 — enforced)

- **All components are arrow functions** — named and unnamed
  (`function-component-definition`).
- **JSX props are auto-sorted:** reserved props (`key`, `ref`) first →
  shorthand booleans → alphabetical → multiline props → callbacks last. Don't
  fight the sorter.
- Boolean props shorthand: `<Input disabled />`, never `disabled={true}`.
- No useless curly braces (`title='x'` not `title={'x'}`), no useless
  fragments, shorthand fragments `<>...</>`.
- **No leaked renders:** `{items.length > 0 && <List />}`, never
  `{items.length && <List />}`.
- `useState` destructuring must be symmetric: `[value, setValue]`.
- **Never define a component inside another component**
  (`no-unstable-nested-components`, error).
- Avoid array index as `key`; components are PascalCase in JSX; self-close
  childless elements; `<button>` always has an explicit `type`.
- `react-hooks` recommended-latest rules apply in full (exhaustive deps,
  etc.).
- **jsx-a11y recommended is enforced** — write accessible JSX by default
  (alt text, roles, keyboard handlers paired with click handlers).
- React 19 / automatic JSX runtime: no `import React` for JSX, no PropTypes.

## Component anatomy _(Medium)_

- File order: imports → types (`XxxProps`) → component → subcomponents →
  helpers/hooks used only here.
- Props destructured in the signature.
- No `useEffect` for derived state — compute during render or `useMemo`.
  Effects are for real external synchronization only.
- Extract a custom hook when stateful logic is reused or when a component's
  logic obscures its JSX; keep one-off logic inline.
- State libraries: Zustand for client stores (bounded — e.g. capped buffers
  like a 2000-line log store); tRPC + WebSocket subscriptions for server
  state. Don't introduce a new state paradigm into a project that has one.
- `memo`/`useCallback` only with a demonstrated reason, not prophylactically.
