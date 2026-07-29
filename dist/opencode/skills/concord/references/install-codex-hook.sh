#!/usr/bin/env bash
# Install Concord's memory hooks into Codex.
#
# Codex hooks are experimental and opt-in, so two things have to happen:
#   1. merge SessionStart / UserPromptSubmit / SessionEnd into
#      <CODEX_HOME>/hooks.json, pointing at this plugin's bin/ scripts with
#      absolute paths (Codex Desktop does not inherit PATH)
#   2. enable the experimental hooks feature in <CODEX_HOME>/config.toml
#
# Usage:  bash install-codex-hook.sh [--uninstall]
# Notes:  experimental. Restart Codex and trust the hooks after running.
#         Honors $CODEX_HOME (falls back to ~/.codex).
set -euo pipefail
umask 077

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
SKILL_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
RECALL="$SKILL_DIR/bin/recall.mjs"
CAPTURE="$SKILL_DIR/bin/capture.mjs"

for f in "$RECALL" "$CAPTURE"; do
  [[ -f "$f" ]] || { echo "error: missing $f" >&2; exit 1; }
done

NODE_BIN=$(command -v node || true)
[[ -n "$NODE_BIN" ]] || { echo "error: node not found on PATH" >&2; exit 1; }

CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
mkdir -p "$CODEX_HOME"
CONFIG="$CODEX_HOME/config.toml"
HOOKS="$CODEX_HOME/hooks.json"

MODE="install"
[[ "${1:-}" == "--uninstall" ]] && MODE="uninstall"

# --- merge (or remove) the hooks, idempotently, via node ----------------------
"$NODE_BIN" - "$HOOKS" "$NODE_BIN" "$RECALL" "$CAPTURE" "$MODE" <<'NODE'
const fs = require('fs');
const [, , hooksPath, nodeBin, recall, capture, mode] = process.argv;

let cfg = {};
try {
  cfg = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
} catch (e) {
  if (e.code !== 'ENOENT') {
    console.error('error: refusing to overwrite invalid hooks JSON at ' + hooksPath + ': ' + e.message);
    process.exit(1);
  }
}
if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) {
  console.error('error: hooks config must be a JSON object: ' + hooksPath);
  process.exit(1);
}
if (cfg.hooks === undefined) cfg.hooks = {};
if (!cfg.hooks || typeof cfg.hooks !== 'object' || Array.isArray(cfg.hooks)) {
  console.error('error: "hooks" must be a JSON object: ' + hooksPath);
  process.exit(1);
}

// Marker used to find our own entries again — matching on the script path keeps
// this from touching hooks any other plugin installed.
const WANTED = {
  SessionStart: `"${nodeBin}" "${recall}"`,
  UserPromptSubmit: `"${nodeBin}" "${capture}" --prompt`,
  SessionEnd: `"${nodeBin}" "${capture}" --session-end`,
};
const isOurs = (entry) => JSON.stringify(entry).includes('concord');

let changed = false;
for (const [event, command] of Object.entries(WANTED)) {
  if (cfg.hooks[event] === undefined) cfg.hooks[event] = [];
  if (!Array.isArray(cfg.hooks[event])) {
    console.error('error: "hooks.' + event + '" must be an array: ' + hooksPath);
    process.exit(1);
  }

  const before = cfg.hooks[event].length;
  cfg.hooks[event] = cfg.hooks[event].filter((e) => !isOurs(e));
  if (cfg.hooks[event].length !== before) changed = true;

  if (mode === 'install') {
    cfg.hooks[event].push({ hooks: [{ type: 'command', command }] });
    changed = true;
  }
  if (cfg.hooks[event].length === 0) delete cfg.hooks[event];
}

if (!changed) {
  console.log('ok    nothing to change in ' + hooksPath);
  process.exit(0);
}

const tmp = hooksPath + '.tmp-' + process.pid;
let fileMode = 0o600;
try { fileMode = fs.statSync(hooksPath).mode & 0o777; } catch (e) {
  if (e.code !== 'ENOENT') throw e;
}
fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2) + '\n', { mode: fileMode });
fs.chmodSync(tmp, fileMode);
fs.renameSync(tmp, hooksPath);
console.log(
  (mode === 'install' ? 'set   merged' : 'set   removed') +
    ' SessionStart / UserPromptSubmit / SessionEnd in ' + hooksPath,
);
NODE

if [[ "$MODE" == "uninstall" ]]; then
  echo ""
  echo "done. Restart Codex to drop the hooks."
  echo "Memory files under .concord/ were left untouched."
  exit 0
fi

# --- enable the experimental hooks feature ------------------------------------
if [[ -f "$CONFIG" ]] && grep -Eq '^[[:space:]]*hooks[[:space:]]*=[[:space:]]*true' "$CONFIG"; then
  echo "ok    hooks feature already enabled in $CONFIG"
elif [[ -f "$CONFIG" ]] && grep -Eq '^[[:space:]]*\[features\][[:space:]]*($|#)' "$CONFIG"; then
  awk '
    BEGIN { in_features=0; written=0 }
    /^[[:space:]]*\[features\][[:space:]]*($|#)/ { in_features=1; print; next }
    /^[[:space:]]*\[/ {
      if (in_features && !written) { print "hooks = true"; written=1 }
      in_features=0; print; next
    }
    {
      if (in_features && /^[[:space:]]*hooks[[:space:]]*=/) {
        if (!written) { print "hooks = true"; written=1 }
        next
      }
      print
    }
    END { if (in_features && !written) print "hooks = true" }
  ' "$CONFIG" >"$CONFIG.tmp" && mv "$CONFIG.tmp" "$CONFIG"
  echo "set   ensured hooks = true under existing [features] in $CONFIG"
else
  printf '\n[features]\nhooks = true\n' >>"$CONFIG"
  echo "set   added [features] hooks = true to $CONFIG"
fi

cat <<EOF

done. Next steps:
  1. Restart Codex (and Codex Desktop if used).
  2. Approve the hook-trust prompt when Codex shows it.
  3. Work as usual — memory starts accruing in <git-root>/.concord/.

To undo:  bash "$0" --uninstall
EOF
