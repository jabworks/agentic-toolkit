#!/usr/bin/env bash
# Extract one task's full text from a draft-plan markdown file into a scratch
# file, so dispatch prompts can reference a path instead of pasting content.
#
# Usage: task-brief.sh <plan-file> <task-number>
# Prints the absolute path of the written brief file on stdout.
set -euo pipefail

PLAN_FILE="$1"
TASK_N="$2"

if [[ ! -f "$PLAN_FILE" ]]; then
  echo "ERROR: plan file not found: $PLAN_FILE" >&2
  exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
SCRATCH_DIR="$REPO_ROOT/.condux/scratch"
mkdir -p "$SCRATCH_DIR"

SLUG=$(basename "$PLAN_FILE" .md)
BRIEF_FILE="$SCRATCH_DIR/${SLUG}-task-${TASK_N}-brief.md"

awk -v n="$TASK_N" '
  BEGIN { found = 0 }
  /^### Task [0-9]+:/ {
    if (found) exit
    if ($0 ~ ("^### Task " n ":")) { found = 1 }
  }
  found { print }
' "$PLAN_FILE" > "$BRIEF_FILE"

if [[ ! -s "$BRIEF_FILE" ]]; then
  echo "ERROR: Task $TASK_N not found in $PLAN_FILE" >&2
  rm -f "$BRIEF_FILE"
  exit 1
fi

echo "$BRIEF_FILE"
