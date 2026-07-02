#!/usr/bin/env bash
# Scaffolds a new tech spec directory for a feature.
# Usage: scaffold.sh <FeatureName or feature-name>
# Output (one line):
#   created:<absolute-spec-path> commit:<hash> date:<YYYY-MM-DD>
#   exists:<absolute-spec-path>  commit:<hash> date:<YYYY-MM-DD>
#
# Spec location: <git-root>/specs/<pkg-relpath>/<slug>/
# pkg-relpath = path of the nearest package root (first directory above CWD
# with package.json, Cargo.toml, go.mod, or pyproject.toml) relative to the
# git root — empty when they coincide, giving <git-root>/specs/<slug>/.
# All specs live under the root specs/ tree, mirroring the repo structure.

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: scaffold.sh <feature-name>" >&2
  exit 1
fi

INPUT="$*"

# PascalCase or spaces → kebab-case, acronym-aware: dashes go only at
# lower/digit→Upper and UPPER→Upper+lower boundaries, so AOGrcIntegration →
# ao-grc-integration and UIFormControls → ui-form-controls. Kebab input
# passes through unchanged.
SLUG=$(echo "$INPUT" \
  | sed 's/\([a-z0-9]\)\([A-Z]\)/\1-\2/g' \
  | sed 's/\([A-Z]\)\([A-Z][a-z]\)/\1-\2/g' \
  | tr '[:upper:]' '[:lower:]' \
  | tr ' _' '-' \
  | tr -s '-' \
  | sed 's/^-//; s/-$//')

DATE=$(date +%Y-%m-%d)
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "no-git")
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
[[ -z "$REPO_ROOT" ]] && REPO_ROOT="${PWD}"

# ---------------------------------------------------------------------------
# Detect package root: nearest dir with a package manifest, up to git root.
# Used only to compute the path relative to the git root — specs themselves
# always live under <git-root>/specs/, mirroring the repo structure.
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
PKG_REL="${SPEC_BASE#"$REPO_ROOT"}"
PKG_REL="${PKG_REL#/}"
if [[ -n "$PKG_REL" ]]; then
  SPEC_DIR="$REPO_ROOT/specs/$PKG_REL/$SLUG"
else
  SPEC_DIR="$REPO_ROOT/specs/$SLUG"
fi

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
