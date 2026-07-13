# CSS & Tailwind

## CSS (Tier 1 — enforced)

- Stylelint `standard` + **recess-order** (property ordering is enforced —
  don't hand-order) + CSS Modules support.
- **CSS Module class names are camelCase** (`.logLine`, not `.log-line`).
- Tailwind v4 at-rules (`@theme`, `@utility`, `@variant`, `@custom-variant`,
  `@apply`, `@source`, `@reference`) and CSS Modules `@value` are recognized —
  don't "fix" them.
- Tailwind class order is owned by the Prettier Tailwind plugin
  (`prettier-plugin-tailwindcss` / `sortTailwindcss`) — never hand-order.

## Tailwind discipline _(Low — confirm specifics)_

- Token-first: no arbitrary values (`w-[13px]`) when a design token exists.
  Project design tokens (e.g. Terminus' Obelisk ink/Bone/Gold palette) come
  from the theme, not hardcoded hex in class names.
- Repeated class clusters: extract a component (or `cva` variant) rather than
  copy-pasting long class strings; `cn()` for conditional classes.
