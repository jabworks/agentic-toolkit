#!/usr/bin/env bash
# Sync skills/ source trees to their dist/ targets.
#
# Usage:
#   scripts/sync.sh              # sync all skills
#   scripts/sync.sh <name>       # sync one skill by name
#
# Targets come from composition.json (via scripts/composition.mjs --pairs) —
# bundle membership, standalone plugins, and the plugin-level dirs are all
# declared there. A skill missing from the declaration is a hard error:
# scaffold it with toolkit-foundry, add it to composition.json, then sync.

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
# Token-core gate — refuse to propagate an HTML surface whose colour core has
# drifted from scripts/tokens/core.css. Same reasoning as the frontmatter gate
# above: checking the source before the copy keeps the drift out of dist/. No
# post-build re-check is needed — nothing in the build transforms CSS, and the
# dist copies are already guarded byte-for-byte by the mirror tests.
# ---------------------------------------------------------------------------
if ! node "$REPO_ROOT/scripts/check-tokens.mjs" >/dev/null; then
  node "$REPO_ROOT/scripts/check-tokens.mjs" >&2 || true
  echo "" >&2
  echo "ERROR  refusing to sync — fix the token drift above first." >&2
  echo "       node scripts/check-tokens.mjs --fix" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# copy_dir <src> <dst>  — mirrors src into dst, removing stale files
#
# Returns the copy's exit status. That is load-bearing: sync_skill runs inside
# an `if`, which disables errexit for everything it calls, so a failed copy is
# invisible unless the status is propagated by hand (docket #31 — a code-11
# rsync was reported as `36 synced, 0 skipped, 0 failed`).
#
# mkdir -p first because rsync cannot create nested parents: a brand-new
# standalone plugin has no dist/plugins/<name>/skills/<name>/ yet, and that was
# the failure the silent path hid.
# ---------------------------------------------------------------------------
copy_dir() {
  local src="$1" dst="$2"
  mkdir -p "$dst" || return 1
  if command -v rsync &>/dev/null; then
    rsync -a --delete "$src/" "$dst/" || return 1
  else
    rm -rf "$dst"
    mkdir -p "$dst"
    cp -r "$src/." "$dst/" || return 1
  fi
}

# ---------------------------------------------------------------------------
# Declared sync pairs — composition.json is the source of truth (docket #11).
# Bundle membership and the plugin-level dirs (condux/agents, condux/hooks,
# docket/server) used to be inferred by probing dist/ plus three hardcoded
# name checks; each of those failed quietly (silent SKIP, the 6ba6572 blind
# spot). Now composition.mjs validates the declaration and prints every
# src<TAB>dest pair; a skill it doesn't know is a hard error, not a SKIP.
# ---------------------------------------------------------------------------
PAIR_SRCS=()
PAIR_DESTS=()
while IFS=$'\t' read -r pair_src pair_dest; do
  PAIR_SRCS+=("$pair_src")
  PAIR_DESTS+=("$pair_dest")
done < <(node "$REPO_ROOT/scripts/composition.mjs" --pairs)
[[ ${#PAIR_SRCS[@]} -gt 0 ]] || { echo "ERROR  composition.mjs produced no pairs" >&2; exit 1; }

# ---------------------------------------------------------------------------
# sync_skill <name> — copy every declared pair owned by skills/<name>: its
# skill tree, plus any pluginDirs sourced from inside it (skills/<name>/…).
# ---------------------------------------------------------------------------
sync_skill() {
  local name="$1"
  local src="$SKILLS_DIR/$name"

  if [[ ! -d "$src" ]]; then
    echo "ERROR  skills/$name — directory not found" >&2
    return 1
  fi

  local i matched=0
  for i in "${!PAIR_SRCS[@]}"; do
    local pair_src="${PAIR_SRCS[$i]}" pair_dest="${PAIR_DESTS[$i]}"
    if [[ "$pair_src" == "skills/$name" || "$pair_src" == "skills/$name/"* ]]; then
      if ! copy_dir "$REPO_ROOT/$pair_src" "$REPO_ROOT/$pair_dest"; then
        echo "ERROR  skills/$name — copy failed: $pair_src  →  $pair_dest" >&2
        return 1
      fi
      echo "synced  $pair_src  →  $pair_dest"
      matched=1
    fi
  done

  if [[ $matched -eq 0 ]]; then
    echo "ERROR  skills/$name — not declared in composition.json; add it to a plugin there" >&2
    return 1
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
    #
    # Status-checked for the same reason copy_dir is: this function's return
    # value is the only thing standing between a failed copy and a "synced"
    # line claiming it happened (docket #31).
    if ! cp "$REPO_ROOT/LICENSE" "$plugin_dir/LICENSE"; then
      echo "ERROR  copy failed: LICENSE  →  dist/plugins/$plugin/LICENSE" >&2
      return 1
    fi

    if [[ -d "$PLUGIN_SRC/$plugin" ]]; then
      # dotglob so the syncer sees the same files its guard does: bash's `*`
      # skips dot-prefixed names while the mirror test reads the directory with
      # readdirSync, which does not. Without this the two disagree, and a
      # plugin-level dotfile would be demanded by the test and never copied.
      shopt -s dotglob
      for src in "$PLUGIN_SRC/$plugin"/*; do
        [[ -f "$src" ]] || continue
        if ! cp "$src" "$plugin_dir/$(basename "$src")"; then
          echo "ERROR  copy failed: $src  →  dist/plugins/$plugin/" >&2
          shopt -u dotglob
          return 1
        fi
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
  node "$REPO_ROOT/scripts/generate-catalogs.mjs"
  node "$REPO_ROOT/scripts/generate-agent-manifests.mjs"
  node "$REPO_ROOT/scripts/build-opencode.mjs"
  node "$REPO_ROOT/scripts/build-cursor.mjs"
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
  node "$REPO_ROOT/scripts/generate-catalogs.mjs"
  node "$REPO_ROOT/scripts/generate-agent-manifests.mjs"
  node "$REPO_ROOT/scripts/build-opencode.mjs"
  node "$REPO_ROOT/scripts/build-cursor.mjs"
  check_generated
  echo ""
  echo "done — ${synced} synced, ${skipped} skipped, ${failed} failed"
  [[ $failed -eq 0 ]]
fi
