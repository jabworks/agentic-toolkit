#!/usr/bin/env bash
# Install this repo's git hooks into .git/hooks/.
#
# .git/hooks/ is not version-controlled, so every fresh clone must run this once:
#   bash scripts/install-hooks.sh
#
# Installs: pre-commit — validates SKILL.md frontmatter, then syncs skills/ →
# dist/ and stages the result, so neither illegal frontmatter nor dist drift can
# enter a commit made from this clone. Without the hook, run
# `bash scripts/sync.sh` manually before committing; CI (`node --test`) rejects
# both either way.

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
HOOK="$REPO_ROOT/.git/hooks/pre-commit"

cat > "$HOOK" <<'EOF'
#!/usr/bin/env bash
# Pre-commit: validate SKILL.md frontmatter, then sync skills/ → dist/ and stage
# any resulting changes. Ensures neither illegal frontmatter nor a dist/ that is
# out of sync with skills/ can enter a commit.
# (Installed by scripts/install-hooks.sh — edit that file, not this one.)

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)

# sync.sh gates on this too, but checking here first means the commit is blocked
# even if someone reaches for --no-verify's opposite and syncs by hand.
echo "→ checking SKILL.md frontmatter ..."
if ! node "$REPO_ROOT/scripts/check-frontmatter.mjs"; then
  echo "" >&2
  echo "commit blocked — fix the frontmatter above (node scripts/check-frontmatter.mjs --fix)" >&2
  exit 1
fi

echo "→ syncing skills/ to dist/ ..."
bash "$REPO_ROOT/scripts/sync.sh"

# Stage any dist/ files added or changed by the sync
git add "$REPO_ROOT/dist/"
EOF

chmod +x "$HOOK"
echo "installed  .git/hooks/pre-commit"
