#!/usr/bin/env bash
# Publish-surface dry-run: every plugin must pass `claude plugin validate` with
# EXACTLY the one known warning — the Codex-native `interface` field, which
# Claude Code ignores at load time (verified 2026-07-08; see
# skills/toolkit-plugin-reference — the manifest pair carries it for parity).
# Any other warning, or any error, fails.
#
# Used by CI's advisory release-dry-run job and by /release's toolkit branch.
# Load-bearing constraint: do NOT switch to `--strict` — it treats the known
# interface warning as an error by design. If the parity doctrine ever flips
# (interface removed from .claude-plugin manifests), tighten this to expect
# zero warnings and adopt --strict.

set -euo pipefail

if ! command -v claude >/dev/null 2>&1; then
  echo "claude CLI not found — skipping publish-surface validation"
  echo "(install: npm install -g @anthropic-ai/claude-code)"
  # Skipping is a convenience for local runs only. In CI the tool is installed
  # by the workflow, so its absence means the job is broken, not unnecessary —
  # a guard that quietly passes when its tool is missing is what let the
  # 2026-08-05 frontmatter break ship.
  if [[ -n "${CI:-}" ]]; then
    echo "CI is set — a missing validator is a failure, not a skip" >&2
    exit 1
  fi
  exit 0
fi

fail=0
for p in dist/plugins/*/; do
  if ! out=$(claude plugin validate "$p" 2>&1); then
    echo "✘ $p failed validation:"
    echo "$out"
    fail=1
    continue
  fi
  # The validator's "ℹ Advice (does not change the verdict)" block lists its
  # items with the same ❯ marker as warnings. Advice is not a finding: concord's
  # README is told to add a Claude `/plugin install` line, but concord is
  # Codex-only by design. Drop the block, from its header to the next
  # unindented line, before counting.
  verdict=$(echo "$out" | awk '/^ℹ Advice/ { skip = 1; next } skip && /^[^ ]/ { skip = 0 } !skip')
  # Newer CLIs also print "Plugin directory checks for <path>" — what the marketplace
  # catalog wants (an icon, ICON_MISSING, as of 2026-10-21) — and say themselves that
  # those checks "do not change the result below". They are catalog advice, not a
  # finding on this manifest, and an unpinned CLI turned them into a red job on every
  # plugin overnight. Drop the block, from its header to its own closing line. If a
  # later CLI rewords that closing line, the block ends at the next section marker
  # instead, so the skip can never swallow a real finding that follows it.
  verdict=$(echo "$verdict" | awk '
    /^Plugin directory checks for / { dir = 1; next }
    dir && /^These plugin directory checks do not change the result/ { dir = 0; next }
    dir && /^(✔|✘|Validating )/ { dir = 0 }
    !dir')
  # A function-hooks plugin (docket's /docket pane) also gets a report: what its
  # types file declares and what its hooks module hooks, calls, reads and writes.
  # Those lines carry ❯ too but are facts, not findings — the verdict still says
  # "Validation passed". Drop exactly those shapes; anything else still counts.
  verdict=$(echo "$verdict" | grep -vE "❯ types \./.* declares |❯ \./[^ ]+ (hooks|calls|state reads|state writes|answers its own command|gating hook (with|without) \.catch):" || true)
  findings=$(echo "$verdict" | grep -c '❯' || true)
  known=$(echo "$verdict" | grep -c "Unknown field 'interface'" || true)
  if [ "$findings" != "$known" ]; then
    echo "✘ $p has findings beyond the known interface warning:"
    echo "$out"
    fail=1
  else
    echo "✔ $p (interface warning only)"
  fi
done
exit $fail
