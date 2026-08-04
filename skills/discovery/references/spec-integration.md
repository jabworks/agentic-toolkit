# Spec Integration (Live Preview)

Integrates with the `technical-spec` skill to persist the design and render it live while discovery runs.

### At discovery start

Infer the feature slug (kebab-case from `$ARGUMENTS`). Specs live under
`<git-root>/specs/`, mirroring the repo structure: check
`<git-root>/specs/<pkg-relpath>/<feature-slug>/` (pkg-relpath = the nearest
package root's path relative to the git root, empty at the root) and
`<git-root>/specs/<feature-slug>/` for an existing spec.

If found, offer:

> "Found an existing spec for this feature. Open live preview while we refine the design? [y/n]"

If yes, go straight to **Launch preview** below (skip scaffold + write — spec already exists).

### At sign-off

The Markdown design doc (Step 7) is always written. The spec write-back is
**default-on** — announce it rather than ask:

> "Saving this as a tech spec too (decisions + the concern files from the
> detail round) and opening the live preview — say no to skip."

Unless the user opts out (the spec directory then becomes the target for the
Design Review Loop above, in directory mode):

1. **Find scripts** — the scaffold from technical-spec, the preview from
   plan-review (its annotate server renders spec directories):
   ```bash
   SCAFFOLD=$(find ~/.claude ~/.codex ~/.agents -name "scaffold.sh" -path "*technical-spec*" 2>/dev/null | head -1)
   PREVIEW=$(find ~/.claude ~/.codex ~/.agents -name "annotate-server.js" -path "*plan-review*" 2>/dev/null | head -1)
   ```
   If either is missing, tell the user: "the `technical-spec` / `plan-review` skills weren't found — install the condux plugin to enable spec integration."

2. **Scaffold** the spec dir and capture the output:
   ```bash
   SCAFFOLD_OUT=$(bash "$SCAFFOLD" "<FeatureName>")
   SPEC_PATH=$(echo "$SCAFFOLD_OUT" | sed 's/^[^:]*://; s/ .*//')
   ```
   `SPEC_PATH` is an absolute path (e.g. `/repo/specs/apps/web/wan-config`).
   The scaffold script places specs under `<git-root>/specs/`, mirroring the
   repo structure, automatically.

3. **Write initial spec files** from the design into `$SPEC_PATH/`.
   `decisions.md` always (chosen approach + rationale). Then every concern
   the detail round produced answers for gets its file: `api.md`,
   `fields.md`, `quirks.md`, `implementation.md`. A detail-round answer
   that never lands in a spec file is a bug in the flow, not a judgment call.

4. **Launch preview** in the background, pointing at the absolute spec path:
   ```bash
   node "$PREVIEW" "$SPEC_PATH"
   ```
   Tell user: "Preview is live. The browser updates automatically as spec files change, and you can annotate any file and submit a decision. Ctrl+C in the terminal to stop."

### Keeping the spec current

As discovery continues and design details shift, update the relevant spec files — the preview re-renders on every save. This is the main benefit: the spec stays in sync with the conversation instead of being written once at the end.

If the user submits a decision in the preview, read `$SPEC_PATH/review.feedback.md` (notes grouped by file) and action it. Spec review is accept-or-fix (directory mode has no Reject): **Approve** = design is signed off, proceed; **Request Revisions** = fix the spec files, then continue the loop.
