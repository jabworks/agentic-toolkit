#!/usr/bin/env bash
# Sync skills/ source trees to their dist/ targets.
#
# Usage:
#   scripts/sync.sh              # sync all skills
#   scripts/sync.sh <name>       # sync one skill by name
#
# Target detection (no config needed):
#   dist/plugins/<bundle>/skills/<bundle>/<name>/  → bundle skill (condux, toolkit-ops, …)
#   dist/plugins/<name>/skills/<name>/             → standalone plugin skill
#
# New skills with no dist target are skipped with a warning — scaffold
# them first with plugin-foundry, then run sync.

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
[[ -z "$REPO_ROOT" ]] && REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
SKILLS_DIR="$REPO_ROOT/skills"
DIST_DIR="$REPO_ROOT/dist/plugins"

# ---------------------------------------------------------------------------
# Frontmatter gate — refuse to propagate a SKILL.md that a strict YAML parser
# would reject. Codex declines to load such a skill outright, and four separate
# incidents shipped one anyway (see the incident ledger). Checking the source
# BEFORE the copy is what keeps a bad value out of dist/ entirely; the whole
# tree is re-checked after the build to catch generator bugs too.
# ---------------------------------------------------------------------------
if ! node "$REPO_ROOT/scripts/check-frontmatter.mjs" "$SKILLS_DIR" >/dev/null; then
  node "$REPO_ROOT/scripts/check-frontmatter.mjs" "$SKILLS_DIR" >&2 || true
  echo "" >&2
  echo "ERROR  refusing to sync — fix the frontmatter above first." >&2
  echo "       node scripts/check-frontmatter.mjs --fix" >&2
  exit 1
fi

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

  # Bundle target: dist/plugins/<p>/skills/<p>/<name> for any bundle plugin <p>.
  local bundle_dst="" p_dir p
  for p_dir in "$DIST_DIR"/*/; do
    p=$(basename "$p_dir")
    if [[ -d "$DIST_DIR/$p/skills/$p/$name" ]]; then
      bundle_dst="$DIST_DIR/$p/skills/$p/$name"
      break
    fi
  done
  local standalone_dst="$DIST_DIR/$name/skills/$name"

  if [[ -n "$bundle_dst" ]]; then
    copy_dir "$src" "$bundle_dst"
    echo "synced  skills/$name  →  ${bundle_dst#"$REPO_ROOT"/}"
  elif [[ -d "$standalone_dst" ]]; then
    copy_dir "$src" "$standalone_dst"
    echo "synced  skills/$name  →  dist/plugins/$name/skills/$name"
  else
    echo "SKIP    skills/$name — no dist target (scaffold with plugin-foundry first)" >&2
  fi

  # The condux plugin also loads named agents from a plugin-level agents/ dir,
  # which is NOT reached by the skill copy above. Mirror them from their source
  # (the subagent-execution skill owns the canonical agent definitions).
  if [[ "$name" == "subagent-execution" && -d "$src/agents" ]]; then
    copy_dir "$src/agents" "$DIST_DIR/condux/agents"
    echo "synced  skills/$name/agents  →  dist/plugins/condux/agents"
  fi

  # Same shape as agents/ above: both hosts load hooks from the PLUGIN root, not
  # from a skill tree, so the skill copy never reaches them. This dir was
  # hand-maintained in dist/ until 2026-08-05 — exactly the blind spot 6ba6572
  # produced doctrine about ("every out-of-tree mirror target needs its own sync
  # step AND its own test"). workflow owns it because the payload is its routing
  # rule; plan-review's Codex Stop hook rides along in the same manifest.
  if [[ "$name" == "workflow" && -d "$src/hooks" ]]; then
    copy_dir "$src/hooks" "$DIST_DIR/condux/hooks"
    echo "synced  skills/$name/hooks  →  dist/plugins/condux/hooks"
  fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
# Post-build gate: the OpenCode build re-quotes frontmatter through its own path
# (it folds when_to_use into description), so a clean source does not guarantee a
# clean generated tree.
check_generated() {
  if ! node "$REPO_ROOT/scripts/check-frontmatter.mjs" >/dev/null; then
    node "$REPO_ROOT/scripts/check-frontmatter.mjs" >&2 || true
    echo "" >&2
    echo "ERROR  generated frontmatter is illegal — the build, not the source, is at fault." >&2
    exit 1
  fi
}

if [[ $# -gt 0 ]]; then
  sync_skill "$1"
  node "$REPO_ROOT/scripts/build-opencode.mjs"
  check_generated
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
  node "$REPO_ROOT/scripts/build-opencode.mjs"
  check_generated
  echo ""
  echo "done — ${synced} synced, ${skipped} skipped, ${failed} failed"
  [[ $failed -eq 0 ]]
fi
