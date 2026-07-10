#!/usr/bin/env bash
# Install the plan-review Stop hook into Codex.
#
# Codex has no ExitPlanMode interception point, so plan review runs off Codex's
# experimental `Stop` hook: when a planning turn ends, annotate-server.js
# (--codex-stop) opens the review UI and returns a continuation reason on deny.
#
# This script:
#   1. validates and merges a Stop hook into <CODEX_HOME>/hooks.json pointing at
#      this skill's annotate-server.js (absolute paths — Codex Desktop doesn't
#      inherit PATH)
#   2. enables the experimental hooks feature in <CODEX_HOME>/config.toml
#
# Usage:  bash install-codex-hook.sh
# Notes:  experimental; disabled on Windows. Restart Codex and trust the hook
#         after running. Honors $CODEX_HOME (falls back to ~/.codex).
set -euo pipefail
umask 077

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
SERVER="$SCRIPT_DIR/annotate-server.js"
[[ -f "$SERVER" ]] || { echo "error: annotate-server.js not found next to this script" >&2; exit 1; }

NODE_BIN=$(command -v node || true)
[[ -n "$NODE_BIN" ]] || { echo "error: node not found on PATH" >&2; exit 1; }

CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
mkdir -p "$CODEX_HOME"
CONFIG="$CODEX_HOME/config.toml"
HOOKS="$CODEX_HOME/hooks.json"
COMMAND="$NODE_BIN \"$SERVER\" --codex-stop"

# --- 1. validate + merge the Stop hook (idempotent) via node --------------------
"$NODE_BIN" - "$HOOKS" "$COMMAND" <<'NODE'
const fs = require('fs');
const [, , hooksPath, command] = process.argv;
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
if (cfg.hooks.Stop === undefined) cfg.hooks.Stop = [];
if (!Array.isArray(cfg.hooks.Stop)) {
  console.error('error: "hooks.Stop" must be an array: ' + hooksPath);
  process.exit(1);
}
const has = JSON.stringify(cfg.hooks.Stop).includes('--codex-stop');
if (!has) {
  cfg.hooks.Stop.push({ hooks: [{ type: 'command', command, timeout: 345600 }] });
  const tmp = hooksPath + '.tmp-' + process.pid;
  let mode = 0o600;
  try { mode = fs.statSync(hooksPath).mode & 0o777; } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2) + '\n', { mode });
  fs.chmodSync(tmp, mode);
  fs.renameSync(tmp, hooksPath);
  console.log('set   merged Stop hook into ' + hooksPath);
} else {
  console.log('ok    Stop hook already present in ' + hooksPath);
}
NODE

# --- 2. enable the hooks feature ------------------------------------------------
if [[ -f "$CONFIG" ]] && grep -Eq '^[[:space:]]*\[features\][[:space:]]*($|#)' "$CONFIG"; then
  cp -p "$CONFIG" "$CONFIG.tmp"
  awk '
    BEGIN { in_features=0; hooks_written=0 }
    /^[[:space:]]*\[features\][[:space:]]*($|#)/ {
      in_features=1
      print
      next
    }
    /^[[:space:]]*\[/ {
      if (in_features && !hooks_written) { print "hooks = true"; hooks_written=1 }
      in_features=0
      print
      next
    }
    {
      if (in_features && /^[[:space:]]*hooks[[:space:]]*=/) {
        if (!hooks_written) { print "hooks = true"; hooks_written=1 }
        next
      }
      print
    }
    END { if (in_features && !hooks_written) print "hooks = true" }
  ' "$CONFIG" > "$CONFIG.tmp" && mv "$CONFIG.tmp" "$CONFIG"
  echo "set   ensured hooks = true under existing [features] in $CONFIG"
else
  printf '\n[features]\nhooks = true\n' >> "$CONFIG"
  echo "set   added [features] hooks = true to $CONFIG"
fi

echo ""
echo "done. Next steps:"
echo "  1. Restart Codex (and Codex Desktop if used)."
echo "  2. Codex will ask you to trust the hook definition — approve it."
echo "  3. Enter plan mode; when the planning turn ends, the review UI opens."
