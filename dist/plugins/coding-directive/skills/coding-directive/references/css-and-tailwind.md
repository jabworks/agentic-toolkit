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

## Theme correctness _(High)_

- **Dark mode first.** Build and check dark before light — _"Go from dark mode
  first"_. Light-first work ships black-on-dark text that survives to review.
- **Both themes before done.** A color change is not finished until it has been
  looked at in both. Foreground and background are set together, never one
  alone.
- **Never hardcode a color a token covers.** Themed surfaces inherit from the
  theme; a literal hex or a fixed `text-black`/`text-white` in a themed
  component is the defect, not the fix. Set foreground defaults globally rather
  than patching each component that shows the wrong one.
- **One source per shared geometry.** When a border/stroke layer and a
  background layer are separate elements, their radii come from a single value
  — desynced radii read as a visible seam. Same for a parent radius and its
  inner child's.
- Cover the states, not just the resting look: hover, focus, active, disabled,
  and selected — dropdown and menu item hover states are a repeat offender.
