#!/bin/bash
# Prepare a Claude Code cloud container for this repo.
#
# Everything here fixes something that has actually gone wrong in a cloud
# session, not something that might:
#
#   identity   the container ships git user.name=Claude / user.email=
#              noreply@anthropic.com, so commits land attributed to a bot
#              instead of their author (CLAUDE.md also bans Co-Authored-By)
#   history    the clone is shallow, and durable-citations.test.mjs reads
#              citations against origin/main — every commit beyond the
#              horizon reports as orphaned
#   deps       frontmatter-yaml.test.mjs fails rather than skips without the
#              `yaml` devDependency, by design
#   hooks      local-hooks.test.mjs fails when the pre-commit sync gate is
#              missing from this clone
#
# Remote only: the identity block would clobber a real contributor's git
# config on their own machine.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"

# Identity, derived from the repo's own history rather than hardcoded, so it
# stays correct without being maintained. Only overrides the container
# default; a real identity already set is left alone.
current_email="$(git config user.email || true)"
if [ -z "$current_email" ] || [ "$current_email" = "noreply@anthropic.com" ]; then
  author="$(git log -100 --format='%an|%ae' origin/main 2>/dev/null \
    | grep -v 'noreply@anthropic.com' | head -1 || true)"

  if [ -n "$author" ]; then
    git config user.name "${author%%|*}"
    git config user.email "${author##*|}"
    echo "git identity → ${author%%|*} <${author##*|}>"
  else
    echo "WARNING: could not derive a git identity from origin/main; commits will be attributed to the container default" >&2
  fi
fi

# Full history, so citation checks can see what the specs cite.
if [ "$(git rev-parse --is-shallow-repository)" = "true" ]; then
  git fetch --unshallow --quiet origin || echo "WARNING: --unshallow failed; durable-citations may report false orphans" >&2
fi

pnpm install --frozen-lockfile
bash scripts/install-hooks.sh
