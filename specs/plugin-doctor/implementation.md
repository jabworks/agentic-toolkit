# Plugin doctor — Implementation

## File layout

Three new skills, each owning its own doctor script. Nothing lands in a
plugin-level directory — see quirks.md for why.

```
skills/docket-doctor/
  SKILL.md
  doctor.mjs
  evals/trigger_eval.json
skills/condux-doctor/        # same three files
skills/concord-doctor/       # same three files
```

concord additionally converts from standalone to bundle, and its skill is
renamed `concord` → `remember` (see decisions.md): `skills/concord/` becomes
`skills/remember/`, and `dist/plugins/concord/skills/concord/` gains
`remember/` and `concord-doctor/` beneath it. Every `${PLUGIN_ROOT}`
path inside `codex-hooks.json` moves with it.

Mirrors, produced by `scripts/sync.sh` with no new sync case (the skill-tree
copy already reaches these — they are ordinary skill directories):

```
dist/plugins/docket/skills/docket/docket-doctor/
dist/plugins/condux/skills/condux/condux-doctor/
dist/plugins/concord/skills/concord/concord-doctor/
dist/opencode/skills/{docket,condux,concord}-doctor/
packages/condux-opencode/skills/condux-doctor/     # condux bundle only
```

The zero-new-mirror property is deliberate. Every out-of-tree mirror this repo
has added needed its own sync case *and* its own test, and the one that did
not have them is the `6ba6572` blind spot.

## Registration checklist per skill

Each of the three needs the full new-skill path from `toolkit-foundry`:

1. `SKILL.md` with a trigger contract — `when_to_use` carrying triggers, with
   explicit "not for" lines against `toolkit-debugging-playbook` (and, for
   `docket-doctor`, against `record`/`groom`).
2. Bundle membership — the skill directory under the right
   `dist/plugins/<bundle>/skills/<bundle>/`.
3. No `sync.sh` change is needed — its bundle detection is generic (`dist/plugins/<p>/skills/<p>/<name>`), so scaffolding the dist directory at the right depth is the whole registration. Version bumps on all three bundles' paired manifests
   (`.claude-plugin` + `.codex-plugin`): condux minor, concord minor,
   docket minor. Both manifests of a plugin must stay in lockstep —
   `manifest-parity.test.mjs` enforces it.
4. No `marketplace.json` change — these are skills inside existing bundles,
   not new plugins.
5. `bash scripts/sync.sh <name>` per skill, then `node --test`.

## `doctor.mjs` shape

Dependency-free ESM, node built-ins only, same house rules as `docket.mjs`:

- `detectHosts()` → which of `~/.claude`, `~/.codex`,
  `${XDG_CONFIG_HOME:-~/.config}/opencode` exist. Roughly forty lines,
  deliberately duplicated across the three doctors rather than shared.
- One `probe*()` per row in the probe matrix, each returning
  `{ host, status, detail, fix }`.
- `report()` — the column printer, byte-compatible with `install.sh`'s.
- Exit code from the worst status seen.

Executing a registered script goes through `spawnSync` with a timeout and no
inherited stdio, so a hanging hook reports `broken` instead of hanging the
doctor.

## Convention write-up

`skills/toolkit-skill-standards/SKILL.md` gains a **Health-check convention**
section next to the ease-of-install one: the four beats from api.md, the
must-not-mutate rule, and the pointer to docket as reference implementation.
That is a `toolkit-ops` minor bump.

## Tests

- `tests/plugin-doctor.test.mjs` — new. Runs each `doctor.mjs` against
  fixture host trees in a scratch dir (`HOME` overridden): all-green, one
  broken registration, host absent, and a hanging server. Asserts exit codes,
  the absent-vs-broken distinction, that a hang is reported inside the probe
  timeout rather than hanging the doctor, and that no probe writes to the
  fixture tree — the must-not-mutate rule gets a test, not just a paragraph.
- `tests/skill-invariants.test.mjs` — picks the three skills up automatically
  (frontmatter budgets, name-equals-dir).
- `tests/dist-mirror.test.mjs`, `opencode-dist.test.mjs` — likewise, no
  change needed.
- Trigger eval cases: near-miss prompts in both directions across the
  doctor / playbook boundary, plus a null band. Run via
  `scripts/eval-triggers.mjs`, which auto-discovers the new suites.

## Phasing

1. **docket-doctor** — the reference implementation, with `--fix` wired to
   `install.sh`. Proves the shape against the MCP-server surface.
2. **Convention write-up** in `toolkit-skill-standards`, derived from what (1)
   actually needed rather than from this spec's guesses.
3. **condux-doctor** — the hook surface plus the OpenCode npm surface, the
   most varied of the three.
4. **concord-doctor** — the Codex-only surface, and the must-not-mutate case.
5. **Evals + version bumps + docket #1 close.**

Each phase is independently shippable; stopping after (2) still leaves the
convention and one working doctor.
