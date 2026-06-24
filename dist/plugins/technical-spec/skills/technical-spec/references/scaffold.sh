#!/usr/bin/env bash
# Scaffolds a new tech spec directory for a feature.
# Usage: scaffold.sh <FeatureName or feature-name>
# Output: creates specs/{slug}/index.md with metadata pre-filled.

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
SPEC_DIR="specs/$SLUG"

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
