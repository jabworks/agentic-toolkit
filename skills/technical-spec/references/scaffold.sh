#!/usr/bin/env bash
# Scaffolds a new tech spec directory for a feature.
# Usage: scaffold.sh <FeatureName or feature-name>
# Output (one line):
#   created:<absolute-spec-path> commit:<hash> date:<YYYY-MM-DD>
#   exists:<absolute-spec-path>  commit:<hash> date:<YYYY-MM-DD>
#
# Spec location: <package-root>/specs/<slug>/
# Package root = nearest directory above CWD containing a package manifest
# (package.json, Cargo.toml, go.mod, pyproject.toml), stopping at git root.
# Falls back to git root when no manifest is found.

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: scaffold.sh <feature-name>" >&2
  exit 1
fi

INPUT="$*"

# PascalCase or spaces → kebab-case
SLUG=$(echo "$INPUT" \
  | sed 's/\([A-Z]\)/-\1/g' \
  | sed 's/^-//' \
  | tr '[:upper:]' '[:lower:]' \
  | tr ' _' '-' \
  | tr -s '-')

DATE=$(date +%Y-%m-%d)
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "no-git")
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
[[ -z "$REPO_ROOT" ]] && REPO_ROOT="${PWD}"

# ---------------------------------------------------------------------------
# Detect spec base: nearest dir with a package manifest, up to git root
# ---------------------------------------------------------------------------
detect_spec_base() {
  local dir="${PWD}"
  while [[ "$dir" != "/" ]]; do
    if [[ -f "$dir/package.json" || -f "$dir/Cargo.toml" || \
          -f "$dir/go.mod"       || -f "$dir/pyproject.toml" ]]; then
      echo "$dir"
      return
    fi
    [[ "$dir" == "$REPO_ROOT" ]] && break
    dir=$(dirname "$dir")
  done
  echo "$REPO_ROOT"
}

SPEC_BASE=$(detect_spec_base)
SPEC_DIR="$SPEC_BASE/specs/$SLUG"

if [[ -d "$SPEC_DIR" ]]; then
  echo "exists:$SPEC_DIR commit:$COMMIT date:$DATE"
  exit 0
fi

mkdir -p "$SPEC_DIR"

cat > "$SPEC_DIR/index.md" <<EOF
# $INPUT — Tech Spec

**Last updated:** $DATE
**Commit:** $COMMIT
**Status:** draft

## Contents

## Changelog
- $DATE ($COMMIT): Initial spec
EOF

echo "created:$SPEC_DIR commit:$COMMIT date:$DATE"
