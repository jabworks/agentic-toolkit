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
PLUGIN_SRC="$REPO_ROOT/plugins"

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

  # docket's machinery (CLI, MCP server, renderer, installer) is loaded from
  # the PLUGIN root — .mcp.json points at server/mcp-server.mjs — so the skill
  # copy never reaches it. Same doctrine as agents/ and hooks/ above: every
  # out-of-tree mirror target gets its own sync step AND its own test
  # (tests/docket-server.test.mjs). record owns the canonical source.
  if [[ "$name" == "record" && -d "$src/server" ]]; then
    copy_dir "$src/server" "$DIST_DIR/docket/server"
    echo "synced  skills/$name/server  →  dist/plugins/docket/server"
  fi
}

# ---------------------------------------------------------------------------
# sync_plugin_files — plugin-level files that belong to no skill: the README
# that acts as the plugin's homepage, an INSTALL.md or installer where the
# plugin has one, plus the LICENSE every plugin ships.
#
# These sit outside every skill tree, so the skill copy never reaches them —
# the same shape as agents/ and hooks/, and the same rule applies: an
# out-of-tree mirror target gets its own sync step AND its own test
# (tests/plugin-files.test.mjs). Before this existed, condux's README was
# hand-written straight into dist/ and docket shipped with no LICENSE at all.
#
# Every regular file is copied, rather than a hardcoded list of names. The
# list was the blind spot: adding condux's INSTALL.md and install.mjs under
# the old shape meant two more `cp` lines, and the file after that would have
# meant a third. Directories are deliberately skipped — the plugin-level dirs
# (condux/agents, condux/hooks, docket/server) have their own sync cases and
# their own mirror tests, and copying them here would give them two writers.
# ---------------------------------------------------------------------------
sync_plugin_files() {
  local copied=0

  for plugin_dir in "$DIST_DIR"/*/; do
    local plugin
    plugin=$(basename "$plugin_dir")

    # One LICENSE, at the repo root, copied to every plugin — not 12 identical
    # source files that can drift apart.
    cp "$REPO_ROOT/LICENSE" "$plugin_dir/LICENSE"

    if [[ -d "$PLUGIN_SRC/$plugin" ]]; then
      # dotglob so the syncer sees the same files its guard does: bash's `*`
      # skips dot-prefixed names while the mirror test reads the directory with
      # readdirSync, which does not. Without this the two disagree, and a
      # plugin-level dotfile would be demanded by the test and never copied.
      shopt -s dotglob
      for src in "$PLUGIN_SRC/$plugin"/*; do
        [[ -f "$src" ]] || continue
        cp "$src" "$plugin_dir/$(basename "$src")"
        ((copied++)) || true
      done
      shopt -u dotglob
    fi

    if [[ ! -f "$PLUGIN_SRC/$plugin/README.md" ]]; then
      echo "WARN    dist/plugins/$plugin has no plugins/$plugin/README.md" >&2
    fi
  done

  echo "synced  plugins/*/* + LICENSE  →  dist/plugins/*/  (${copied} plugin-level file(s))"
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
  sync_plugin_files
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
  sync_plugin_files
  node "$REPO_ROOT/scripts/build-opencode.mjs"
  check_generated
  echo ""
  echo "done — ${synced} synced, ${skipped} skipped, ${failed} failed"
  [[ $failed -eq 0 ]]
fi
