#!/usr/bin/env bash
# Write a commit-range review package (log + diffstat + full diff) to a
# scratch file for a review-subagent dispatch, instead of pasting the diff.
#
# Usage: review-package.sh <base-sha> <head-sha>
# Prints the absolute path of the written package file on stdout.
set -euo pipefail

BASE="$1"
HEAD="$2"

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
SCRATCH_DIR="$REPO_ROOT/.condux/scratch"
mkdir -p "$SCRATCH_DIR"

PACKAGE_FILE="$SCRATCH_DIR/review-${BASE}-${HEAD}.diff"

{
  echo "## Commits ${BASE}..${HEAD}"
  git log --oneline "${BASE}..${HEAD}"
  echo
  echo "## Diffstat"
  git diff --stat "${BASE}..${HEAD}"
  echo
  echo "## Full diff"
  git diff -U10 "${BASE}..${HEAD}"
} > "$PACKAGE_FILE"

echo "$PACKAGE_FILE"
