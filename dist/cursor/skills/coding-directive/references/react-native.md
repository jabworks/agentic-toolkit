# React Native & Expo

Everything in `react.md` applies except the rules that assume a DOM; this file
says which ones those are and what replaces them.

## The `reactNative` preset (Tier 1 — enforced)

`@jabworks/oxlint-config` ships `reactNative` (0.4.0+) for Expo and bare
React Native apps. It is **oxlint-only** — there is no `@jabworks/eslint-plugin`
counterpart, a deliberate parity gap. It carries the renderer-agnostic half
of the `react` preset (hooks, React Compiler rules, component style) and:

- **Drops the DOM rules:** `jsx-a11y`, `env.browser`, `react/button-has-type`,
  `react/jsx-no-target-blank`. `window` and `document` are undefined.
- **expo-router routes default-export.** Every file under `app/**` or
  `src/app/**` — routes, `_layout`, `+not-found`, `+html` — is loaded through
  its default export, so `import/no-default-export` is off there and
  `import/prefer-default-export` is on. **API routes (`*+api.ts`) are the
  exception:** they export named HTTP-method handlers (`GET`, `POST`) and keep
  the house named-export rule. `*.config.{ts,mts,cts}` (e.g. `app.config.ts`)
  default-export too.
- **Known gap: `+native-intent.tsx`** exports a named `redirectSystemPath`, not
  a default, but the preset carves out only `+api` — so `prefer-default-export`
  flags it. Until the preset excludes it, disable that one rule in that one
  file, with the reason inline.
- **Globals:** `__DEV__`, and `process` for Expo's build-time-inlined
  `process.env.EXPO_PUBLIC_*`. Fetch, timers, `URL` and `console` come from
  `shared-node-browser`.
- **Ignores:** `.expo/`, `android/`, `ios/`, `expo-env.d.ts` — generated, never
  hand-edited. (Like every preset's ignores, they apply only when the preset is
  spread or merged; Expo's default `.gitignore` covers them anyway.)

expo-router file names (`[id].tsx`, `[...rest].tsx`, `(tabs)/_layout.tsx`) and
platform suffixes (`card.ios.tsx`) already satisfy kebab-case filenames.

Opt-in layers (0.5.0+), each needing its plugin installed in the app:

- `expoPlugin` (`eslint-plugin-expo`): `no-dynamic-env-var` and
  `no-env-var-destructuring` — Expo inlines only a literal
  `process.env.EXPO_PUBLIC_X` read; any other shape is `undefined` at runtime —
  and `use-dom-exports` for `'use dom'` files.
- `reactNativePlugin` (`oxlint-plugin-react-native`): `no-raw-text` at error —
  a string outside `<Text>` crashes on native — plus warnings for color
  literals, inline styles, single-element style arrays and unused styles.

Imperative renderers (three.js / React Three Fiber, Skia, expo-gl):
`imperativeRenderOverride(globs)` (0.4.1+) turns off `react/refs` and
`react/preserve-manual-memoization` for the renderer code only — frame loops
read fresh values through the "latest ref" pattern on purpose. Keep the globs
narrow.

## TypeScript on React Native _(Medium)_

`@jabworks/typescript-config` has no React Native variant, and its `base.json`
puts `DOM` and `DOM.Iterable` in `lib`. On native that makes browser-only
helpers type-check and then crash on device. Extend Expo's
`expo/tsconfig.base` instead, and keep the house strictness on top
(`strict`, `noUncheckedIndexedAccess`). A React Native variant in the
style-guide would close this gap.

## Web habits that break on native _(High)_

| Web | Native |
|---|---|
| `<div>`, `<span>`, `<p>` | `<View>`, `<Text>` — and every string lives inside `<Text>` |
| `<button onClick>` | `<Pressable onPress>` (no `type`; there is no form submit) |
| `:hover`, hover-revealed controls | nothing hovers — show the control, or put it behind a press or long-press |
| `display: block`, row by default | flexbox everywhere, **column** by default |
| `position: fixed` | absolute inside a full-screen parent, or the navigator's own header/tab bar |
| `window.location`, `<a href>` | expo-router's `<Link>`, `router`, `usePathname()` |
| `localStorage` | `expo-sqlite`, `expo-secure-store` for secrets, or an async storage library |
| `px`, `rem`, media queries | unitless density-independent points, `useWindowDimensions()`, safe-area insets |
| CSS transitions | Reanimated on the UI thread; animate `transform` and `opacity` |

## Accessibility on native _(High)_

`jsx-a11y` does not apply, so nothing checks this mechanically:

- **Label and role every control** — `accessibilityRole` + `accessibilityLabel`
  (or the `role` / `aria-label` equivalents). Icon-only buttons always carry a
  label.
- **Touch targets ≥ 44×44 pt (iOS) / 48×48 dp (Android).** When the visual is
  smaller, extend the hit area with `hitSlop` rather than growing the visual.
- **Back is an interaction.** Android's back button and the iOS swipe-back must
  do the obvious thing on every screen and sheet — close the sheet before
  leaving the screen.
- **Announce state** — `accessibilityState` (`disabled`, `busy`, `selected`,
  `expanded`) mirrors what the visuals show, including the pending state of the
  four-states rule.
- **Screen-reader order follows reading order** — group related elements
  (`accessible` on the container) instead of leaving a card as ten stops.
