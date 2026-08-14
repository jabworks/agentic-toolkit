#!/usr/bin/env bash
# Install (or remove) the plan-review Stop hook in Codex.
#
# Codex has no ExitPlanMode interception point, so plan review runs off Codex's
# experimental `Stop` hook: when a planning turn ends, annotate-server.js
# (--codex-stop) opens the review UI and returns a continuation reason on deny.
#
# This script:
#   1. validates and merges (or removes) a Stop hook entry in
#      <CODEX_HOME>/hooks.json pointing at this skill's annotate-server.js
#      (absolute paths — Codex Desktop doesn't inherit PATH)
#   2. enables the experimental hooks feature in <CODEX_HOME>/config.toml
#      (install only — hooks.json and the feature flag are shared host state
#      with other plugins, so uninstall never turns the flag back off)
#
# Usage:  bash install-codex-hook.sh [--uninstall]
# Notes:  experimental; disabled on Windows. Restart Codex and trust the hook
#         after running. Honors $CODEX_HOME (falls back to ~/.codex).
set -euo pipefail
umask 077

report() { printf '%-10s %-8s %s\n' "$1" "$2" "$3"; }

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
SERVER="$SCRIPT_DIR/annotate-server.js"

MODE="install"
[[ "${1:-}" == "--uninstall" ]] && MODE="uninstall"

# --- 0. detect --------------------------------------------------------------
[[ -f "$SERVER" ]] || { report codex failed "annotate-server.js not found next to this script"; exit 1; }

NODE_BIN=$(command -v node || true)
[[ -n "$NODE_BIN" ]] || { report codex failed "node not found on PATH"; exit 1; }

CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
mkdir -p "$CODEX_HOME"
CONFIG="$CODEX_HOME/config.toml"
HOOKS="$CODEX_HOME/hooks.json"
COMMAND="$NODE_BIN \"$SERVER\" --codex-stop"

# --- 1. validate + merge/remove the Stop hook (idempotent) via node ---------
HOOKS_RC=0
HOOKS_OUT=$("$NODE_BIN" - "$HOOKS" "$COMMAND" "$MODE" <<'NODE'
const fs = require('fs');
const [, , hooksPath, command, mode] = process.argv;
let cfg = {};
try {
  cfg = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
} catch (e) {
  if (e.code !== 'ENOENT') {
    console.error('refusing to overwrite invalid hooks JSON at ' + hooksPath + ': ' + e.message);
    process.exit(1);
  }
}
if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) {
  console.error('hooks config must be a JSON object: ' + hooksPath);
  process.exit(1);
}
if (cfg.hooks === undefined) cfg.hooks = {};
if (!cfg.hooks || typeof cfg.hooks !== 'object' || Array.isArray(cfg.hooks)) {
  console.error('"hooks" must be a JSON object: ' + hooksPath);
  process.exit(1);
}
if (cfg.hooks.Stop === undefined) cfg.hooks.Stop = [];
if (!Array.isArray(cfg.hooks.Stop)) {
  console.error('"hooks.Stop" must be an array: ' + hooksPath);
  process.exit(1);
}

// Marker used to find our own entry again — matching on the command string
// (never array position) keeps this from touching Stop entries any other
// plugin (e.g. concord) registered on the same shared hooks.json.
const isOurs = (entry) => JSON.stringify(entry).includes('--codex-stop');

let changed;
if (mode === 'uninstall') {
  const before = cfg.hooks.Stop.length;
  cfg.hooks.Stop = cfg.hooks.Stop.filter((e) => !isOurs(e));
  changed = cfg.hooks.Stop.length !== before;
  if (!changed) {
    process.stdout.write('skipped\tno --codex-stop entry found in ' + hooksPath + '\n');
    process.exit(0);
  }
  // An empty array still reads as "a Stop hook is registered here" to the
  // next reader, and an empty hooks object the same way for "hooks" — drop
  // both rather than leave a stub behind.
  if (cfg.hooks.Stop.length === 0) delete cfg.hooks.Stop;
  if (Object.keys(cfg.hooks).length === 0) delete cfg.hooks;
} else {
  const has = cfg.hooks.Stop.some(isOurs);
  if (has) {
    process.stdout.write('skipped\tStop hook already present in ' + hooksPath + '\n');
    process.exit(0);
  }
  cfg.hooks.Stop.push({ hooks: [{ type: 'command', command, timeout: 345600 }] });
  changed = true;
}

const tmp = hooksPath + '.tmp-' + process.pid;
let fileMode = 0o600;
try { fileMode = fs.statSync(hooksPath).mode & 0o777; } catch (e) {
  if (e.code !== 'ENOENT') throw e;
}
fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2) + '\n', { mode: fileMode });
fs.chmodSync(tmp, fileMode);
fs.renameSync(tmp, hooksPath);
process.stdout.write(
  'done\t' + (mode === 'install' ? 'merged' : 'removed') + ' the Stop hook in ' + hooksPath + '\n',
);
NODE
) || HOOKS_RC=$?

if [[ "$HOOKS_RC" -ne 0 ]]; then
  report codex failed "could not update $HOOKS (reason above); nothing was changed"
  exit 1
fi
report codex "${HOOKS_OUT%%$'\t'*}" "${HOOKS_OUT#*$'\t'}"

if [[ "$MODE" == "uninstall" ]]; then
  # [features] hooks = true is shared host state — concord's installer and
  # condux's front door both read and write it, and none of the three owns
  # it. Report whether it's still on without touching it either way.
  if [[ -f "$CONFIG" ]] && grep -Eq '^[[:space:]]*hooks[[:space:]]*=[[:space:]]*true' "$CONFIG"; then
    report features warn "hooks = true left as-is in $CONFIG — concord and condux may still need it"
  else
    report features absent "hooks feature not enabled in $CONFIG"
  fi

  echo ""
  echo "done. Restart Codex to drop the hook."
  exit 0
fi

# --- 2. enable the hooks feature (install only) ------------------------------
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
  report features done "ensured hooks = true under existing [features] in $CONFIG"
else
  printf '\n[features]\nhooks = true\n' >> "$CONFIG"
  report features done "added [features] hooks = true to $CONFIG"
fi

echo ""
echo "done. Next steps:"
echo "  1. Restart Codex (and Codex Desktop if used)."
echo "  2. Codex will ask you to trust the hook definition — approve it."
echo "  3. Enter plan mode; when the planning turn ends, the review UI opens."
echo ""
echo "To undo:  bash \"$0\" --uninstall"
