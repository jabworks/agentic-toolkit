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
  findings=$(echo "$out" | grep -c '❯' || true)
  known=$(echo "$out" | grep -c "Unknown field 'interface'" || true)
  if [ "$findings" != "$known" ]; then
    echo "✘ $p has findings beyond the known interface warning:"
    echo "$out"
    fail=1
  else
    echo "✔ $p (interface warning only)"
  fi
done
exit $fail
