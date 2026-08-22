# Implementation

## Key files

| File | Role | Change |
|---|---|---|
| `scripts/tokens/core.css` | canonical colour core | **+38 scale tokens**, three-state theme structure (Q6) |
| `scripts/tokens/kit.css` | shared state layer | **new** |
| `scripts/tokens/kit.js` | shared behaviour layer | **new** |
| `scripts/check-tokens.mjs` | region gate + fixer | one region → three; source assertions extended (api.md) |
| `tests/token-core.test.mjs` | guards the above | extended to all three regions |
| `skills/record/server/board-shell.html` | docket document shell | **new** (D4) |
| `skills/record/server/docket-render.mjs` | docket renderer | shell extracted; builders retained |
| `skills/plan-review/references/plan-review-template.html` | reviewer SPA | regions + step-2 layout |
| `skills/session-report/template.html` | usage report | regions + step-2 layout |
| `skills/session-handoff/references/handoff-template.html` | handoff doc | regions + step-2 layout |
| `specs/surface-kit/style-guide.html` | style guide | promoted at design time; keep in step with the shipped tokens |

`composition.json` needs **no change**: it maps `"skills/record/server": "server"`
as a directory, so `board-shell.html` is copied automatically.

## Phasing

### Step 0 — Extract docket's shell (docket only, no visual change)

1. Move the `renderHtml` document literal (lines 42–77) to `board-shell.html`,
   replacing its `${…}` interpolations with `{{…}}` placeholders.
2. `docket-render.mjs` reads it once at module scope
   (`fs.readFileSync(path.join(__dirname, 'board-shell.html'), 'utf8')`) —
   the pattern `annotate-server.js` already uses.
3. Single-pass replacer substitution (Q2).
4. Update the file header: it is no longer a *pure* renderer in the
   "no filesystem" sense; purity there meant no serving or watching.
5. `tests/docket-cli.test.mjs` should pass **unchanged** — it asserts on the
   returned string. If it needs edits, the refactor changed behaviour.

Verification: `node --test`, then diff `docket browse --out` output before and
after. It must be byte-identical.

### Step 1 — The kit (atomic, all four)

1. Extend `core.css` (D1) with the three-state theme structure (Q6).
2. Write `kit.css` and `kit.js`; assert them against api.md's source rules.
3. Teach `check-tokens.mjs` three regions; keep byte-exact comparison and the
   refuse-on-missing-marker behaviour.
4. Add the marker pairs to all four surfaces **by hand** — a missing marker is
   deliberately not mechanically fixable.
5. `node scripts/check-tokens.mjs --fix`, then `bash scripts/sync.sh`.
6. `pnpm changeset` (Q8), bump each touched plugin's `plugin.json`, then
   `node scripts/release-plugins.mjs --write-changelog`.

Every visible effect here is additive (D5): focus rings, motion,
reduced-motion, print, theme override, keyboard. No surface restructures.

### Step 2 — Per-surface layout and typography

Four independent PRs, one plugin each, in ascending risk order:

1. **session-handoff** — **direction signed off 2026-08-22 (D8)**; specimen
   [handoff-direction-b.html](handoff-direction-b.html)
2. **docket board** — **shipped** out of order, PR #93/#95, docket 0.10.0
   (`specs/docket/board-direction-a.html`)
3. **plan-review** (911 lines; 17 flex rules to 1 grid — grid conversion here).
   **Needs `pnpm changeset`** — its template is bundled in
   `packages/condux-opencode/skills/` (Q8)
4. **session-report** (1516 lines)

Each applies its own direction within the shared system. The `px` → `rem` step in
the original ordering is **already done for font sizes** on all four surfaces —
every size is `var(--text-*)` and those tokens are `rem`. What remains per surface
is layout, hierarchy, and the raw `px` still in spacing and radius. See the
re-measurement banner in [audit.md](audit.md).

Per-surface work states the intended visual outcome first, renders it against real
content, and promotes the signed-off render to a committed `specs/` path before
anything durable cites it (`durable-citations.test.mjs`).

### Step 3 — Style guide

Already promoted to `specs/surface-kit/style-guide.html`, because
`tests/durable-citations.test.mjs` enforces **promote on cite**: a committed
file may never name a file inside gitignored working state, since that path
resolves on no other machine.

Remaining work is to keep it truthful — when step 1 lands, the guide's token
block and the shipped `core.css` must agree. It carries the proposed values
today, so it becomes documentation the moment they ship.

### Step 4 — Categorical ramp (docket #46, D7)

Atomic for the same reason step 1 is: the ramp is a `core.css` group, so every
surface must be re-inlined in the same commit or `token-core.test.mjs` fails.

Order is forced — `check-tokens.mjs` **gates** sync rather than feeding it, so a
stale region fails sync instead of being fixed by it:

1. add `--cat-1` … `--cat-8` and `--cat-other` to `scripts/tokens/core.css` —
   dark row in bare `:root`, light row restated in **both** light blocks (Q10)
2. `node scripts/check-tokens.mjs --fix`
3. `bash scripts/sync.sh <each touched skill>`
4. `node --test`

Then session-report's consumption, which is the only visual change:

- one global slot map from `DATA.by_project` ranked by total tokens, computed
  once and shared by both charts — replacing `projects.indexOf(p)` in the
  timeline IIFE, which is scoped to the selected day range
- `PCOL` and the private `colorOf()` are deleted, not re-pointed
- bars: slots 9–16 render `▓` instead of `█` (Q12)
- gantt: slots 9–16 add the stripe, hue passed as `--hue` (Q11)
- the prompt histogram is a single distribution and keeps `--clay`
- `style-guide.html`'s swatch section is **hand-authored outside the markers**,
  so `--fix` will not add the new group — it is manual work no test demands

| File | Change |
|---|---|
| `scripts/tokens/core.css` | the nine tokens, three blocks |
| `skills/session-report/template.html` | slot map, bar tier, gantt tier, legend |
| `specs/surface-kit/style-guide.html` | categorical swatch group (manual) |
| `specs/surface-kit/ramp-direction-c.html` | the specimen — the visual contract |

## Tests

| Test | Covers |
|---|---|
| `tests/token-core.test.mjs` | all three regions match their canonical source, byte-exact, in all four surfaces |
| `tests/docket-cli.test.mjs` | `renderHtml()` still returns a complete standalone document (Q9) |
| `tests/skill-supply-chain.test.mjs` | no egress — must stay green with the new `--sans` stack (names only, never fetched) |
| `tests/dist-mirror.test.mjs`, `opencode-dist.test.mjs`, `cursor-dist.test.mjs` | byte-mirror across 2–3 dist locations |
| `tests/npm-channel.test.mjs` | a changeset exists for the condux surface |
| `tests/release-plugins.test.mjs` | every bumped version has a `CHANGELOG.md` entry |

New coverage to add:

- Source assertions reject `` ` ``, `${`, `\` and `</script` with named reasons
  (regression fixtures, mirroring `frontmatter-canonical.test.mjs`'s use of the
  four historical breaks).
- A missing or duplicated marker is reported, not guessed.
- `--fix` is idempotent: running it twice produces no further diff. The
  existing suite already proves this for one region; three regions in one file
  add a distinct failure mode, where rewriting region 2 shifts the byte offsets
  region 3's marker search depends on. The write path already avoids it —
  `check-tokens.mjs:120` reads each surface once into `src` and
  `:125` writes once, and each region's `indexOf(START)` runs against the
  current `src`, so offsets recompute per region for free. Extending it means
  applying the three replacements sequentially in memory before the single
  write; a test should pin that ordering so a future refactor to
  compute-all-offsets-then-splice cannot silently reintroduce the bug.
- Every token referenced by a surface has a bare `:root` definition — the
  theme-only-definition bug (Q5).

For step 4 specifically — the tiers past slot 8 are the part that ships
unexercised otherwise, which is exactly the "unbounded series count" concern
docket #46 raised:

- slot 9 emits `▓`, not `█`, and carries the same hue as slot 1
- slot 17 emits `--cat-other`, and nothing past 16 emits a `--cat-N`
- the slot map is derived from the global ranking, so a project's slot does not
  change when the timeline's day selection changes
- the histogram's buckets are untouched by the ramp

## Release surface

| Plugin | Touched by |
|---|---|
| `docket` | steps 0, 1, 2, 4 |
| `condux` | steps 1, 2, 4 — **plus npm changeset** |
| `session-report` | steps 1, 2, 4 |
| `session-handoff` | steps 1, 2, 4 |

Step 4 releases like step 1: one commit across all four, session-report taking
the minor (it is the only one whose output changes) and the rest a patch, plus a
changeset because plan-review's template is bundled into
`packages/condux-opencode/skills/plan-review/references/`.

Step 1 is one commit across all four plus a changeset. Steps 0 and 2 are
per-plugin and release independently through the existing automation
(`.github/workflows/plugin-release.yml`). Never hand-tag.
