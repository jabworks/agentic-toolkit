#!/usr/bin/env bash
# Sync skills/ source trees to their dist/ targets.
#
# Usage:
#   scripts/sync.sh              # sync all skills
#   scripts/sync.sh <name>       # sync one skill by name
#
# Target detection (no config needed):
#   dist/plugins/condux/skills/condux/<name>/  → condux bundle skill
#   dist/plugins/<name>/skills/<name>/         → standalone plugin skill
#
# New skills with no dist target are skipped with a warning — scaffold
# them first with plugin-foundry, then run sync.

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
[[ -z "$REPO_ROOT" ]] && REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
SKILLS_DIR="$REPO_ROOT/skills"
DIST_DIR="$REPO_ROOT/dist/plugins"

# ---------------------------------------------------------------------------
# copy_dir <src> <dst>  — mirrors src into dst, removing stale files
# ---------------------------------------------------------------------------
copy_dir() {
  local src="$1" dst="$2"
  if command -v rsync &>/dev/null; then
    rsync -a --delete "$src/" "$dst/"
  else
    rm -rf "$dst"
    mkdir -p "$dst"
    cp -r "$src/." "$dst/"
  fi
}

# ---------------------------------------------------------------------------
# sync_skill <name>
# ---------------------------------------------------------------------------
sync_skill() {
  local name="$1"
  local src="$SKILLS_DIR/$name"

  if [[ ! -d "$src" ]]; then
    echo "ERROR  skills/$name — directory not found" >&2
    return 1
  fi

  local condux_dst="$DIST_DIR/condux/skills/condux/$name"
  local standalone_dst="$DIST_DIR/$name/skills/$name"

  if [[ -d "$condux_dst" ]]; then
    copy_dir "$src" "$condux_dst"
    echo "synced  skills/$name  →  dist/plugins/condux/skills/condux/$name"
  elif [[ -d "$standalone_dst" ]]; then
    copy_dir "$src" "$standalone_dst"
    echo "synced  skills/$name  →  dist/plugins/$name/skills/$name"
  else
    echo "SKIP    skills/$name — no dist target (scaffold with plugin-foundry first)" >&2
  fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if [[ $# -gt 0 ]]; then
  sync_skill "$1"
else
  synced=0
  skipped=0
  failed=0
  for skill_dir in "$SKILLS_DIR"/*/; do
    [[ -d "$skill_dir" ]] || continue
    name=$(basename "$skill_dir")
    if sync_skill "$name"; then
      ((synced++)) || true
    else
      ((failed++)) || true
    fi
  done
  echo ""
  echo "done — ${synced} synced, ${skipped} skipped, ${failed} failed"
  [[ $failed -eq 0 ]]
fi
