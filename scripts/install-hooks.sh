#!/usr/bin/env bash
# Install this repo's git hooks into .git/hooks/.
#
# .git/hooks/ is not version-controlled, so every fresh clone must run this once:
#   bash scripts/install-hooks.sh
#
# Installs: pre-commit — syncs skills/ → dist/ and stages the result, so dist/
# can never drift from skills/ in a commit made from this clone. Without the
# hook, run `bash scripts/sync.sh` manually before committing; CI (`node --test`)
# rejects drifted commits either way.

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
HOOK="$REPO_ROOT/.git/hooks/pre-commit"

cat > "$HOOK" <<'EOF'
#!/usr/bin/env bash
# Pre-commit: sync skills/ → dist/ and stage any resulting changes.
# Ensures dist/ is never out of sync with skills/ in any commit.
# (Installed by scripts/install-hooks.sh — edit that file, not this one.)

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)

echo "→ syncing skills/ to dist/ ..."
bash "$REPO_ROOT/scripts/sync.sh"

# Stage any dist/ files added or changed by the sync
git add "$REPO_ROOT/dist/"
EOF

chmod +x "$HOOK"
echo "installed  .git/hooks/pre-commit"
