#!/usr/bin/env bash
# Install the plan-review Stop hook into Codex.
#
# Codex has no ExitPlanMode interception point, so plan review runs off Codex's
# experimental `Stop` hook: when a planning turn ends, annotate-server.js
# (--codex-stop) opens the review UI and returns a continuation reason on deny.
#
# This script:
#   1. enables the experimental hooks feature in <CODEX_HOME>/config.toml
#   2. merges a Stop hook into <CODEX_HOME>/hooks.json pointing at this skill's
#      annotate-server.js (absolute paths — Codex Desktop doesn't inherit PATH)
#
# Usage:  bash install-codex-hook.sh
# Notes:  experimental; disabled on Windows. Restart Codex and trust the hook
#         after running. Honors $CODEX_HOME (falls back to ~/.codex).
set -euo pipefail

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

# --- 1. enable the hooks feature ------------------------------------------------
if [[ -f "$CONFIG" ]] && grep -Eq '^[[:space:]]*hooks[[:space:]]*=[[:space:]]*true' "$CONFIG"; then
  echo "ok    [features] hooks = true already set"
elif [[ -f "$CONFIG" ]] && grep -Eq '^[[:space:]]*\[features\]' "$CONFIG"; then
  awk '{ print } /^[[:space:]]*\[features\]/ && !done { print "hooks = true"; done=1 }' \
    "$CONFIG" > "$CONFIG.tmp" && mv "$CONFIG.tmp" "$CONFIG"
  echo "set   hooks = true under existing [features] in $CONFIG"
else
  printf '\n[features]\nhooks = true\n' >> "$CONFIG"
  echo "set   added [features] hooks = true to $CONFIG"
fi

# --- 2. merge the Stop hook (idempotent) via node -------------------------------
"$NODE_BIN" - "$HOOKS" "$COMMAND" <<'NODE'
const fs = require('fs');
const [, , hooksPath, command] = process.argv;
let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(hooksPath, 'utf8')); } catch (e) { /* fresh */ }
cfg.hooks = cfg.hooks || {};
cfg.hooks.Stop = cfg.hooks.Stop || [];
const has = JSON.stringify(cfg.hooks.Stop).includes('--codex-stop');
if (!has) {
  cfg.hooks.Stop.push({ hooks: [{ type: 'command', command, timeout: 345600 }] });
  fs.writeFileSync(hooksPath, JSON.stringify(cfg, null, 2) + '\n');
  console.log('set   merged Stop hook into ' + hooksPath);
} else {
  console.log('ok    Stop hook already present in ' + hooksPath);
}
NODE

echo ""
echo "done. Next steps:"
echo "  1. Restart Codex (and Codex Desktop if used)."
echo "  2. Codex will ask you to trust the hook definition — approve it."
echo "  3. Enter plan mode; when the planning turn ends, the review UI opens."
