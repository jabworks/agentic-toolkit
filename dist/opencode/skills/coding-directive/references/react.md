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

## Async boundaries _(High)_

Every mutation and every fetch is a UI state machine, not a call. Shipping the
happy path alone is the single most-corrected omission in Harvey's reviews —
_"we should show some pending indicator, maybe a spinner next to it, and
disable the checkbox while pending, remember to do this from now on, we are
missing quite some UX implementation for mutations and fetchs"_.

Four states, every time — name the one you are deliberately skipping:

- **Pending** — a visible indicator on or beside the control that started it.
  Not a full-page spinner for a local action.
- **In-flight lockout** — the triggering control is `disabled` until it
  settles, so it cannot be fired twice. Bulk toggles ("enable all") disable the
  individual checkboxes too.
- **Error** — surfaced where the action was taken, with the failure reason and
  a way to retry. Never a silent `catch`, never only `console.error`.
- **Empty** — a list that can be empty renders a real empty state, not a bare
  container.

Optimistic updates need a defined rollback before they are worth writing; if
you cannot state what reverts on failure, render pending instead.

## Accessibility beyond the linter _(Medium)_

`jsx-a11y` recommended catches the mechanical cases (alt text, roles, a click
handler without a key handler). It does not catch the ones that actually reach
review:

- **Focus management** — after a dialog, popover, or drawer opens, focus moves
  into it and returns to the trigger on close.
- **Keyboard parity** — anything reachable by mouse is reachable by keyboard:
  Escape closes overlays, arrow keys move within menus and listboxes, Enter and
  Space activate.
- **Visible focus** — never remove a focus ring without replacing it; the
  replacement must be visible against both themes.
- **Announced state** — custom widgets carry the aria that their native
  equivalent would (`aria-expanded`, `aria-selected`, `aria-busy` while
  pending); live regions for async results the user did not navigate to.
- Prefer the native element over a div with a role.
