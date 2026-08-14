#!/usr/bin/env bash
# concord installer — registers the memory hooks with Codex.
#
# Follows the toolkit ease-of-install convention: detect -> register -> verify
# -> report, idempotent, re-runnable, never clobbers unrelated config.
# INSTALL.md beside this file is the same procedure written for an agent to
# follow by hand when it cannot run bash.
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
# concord-doctor is this skill's sibling in every tree — skills/concord-doctor/
# in the source repo and in a plugin install alike (bundles ship flat). It may
# legitimately be missing: `npx skills add` ships bare skill trees, so verify
# falls back to reading the registration back rather than requiring it.
DOCTOR="$SKILL_DIR/../concord-doctor/doctor.mjs"

report() { printf '%-10s %-8s %s\n' "$1" "$2" "$3"; }

# --- 0. detect ----------------------------------------------------------------
for f in "$RECALL" "$CAPTURE"; do
  [[ -f "$f" ]] || { report FATAL memory "missing $f — reinstall the plugin"; exit 1; }
done

NODE_BIN=$(command -v node || true)
[[ -n "$NODE_BIN" ]] || { report FATAL node "node is required (the hooks and this installer both run on it)"; exit 1; }

CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
export CODEX_HOME
mkdir -p "$CODEX_HOME"
CONFIG="$CODEX_HOME/config.toml"
HOOKS="$CODEX_HOME/hooks.json"

MODE="install"
[[ "${1:-}" == "--uninstall" ]] && MODE="uninstall"

# --- 1. Claude Code and OpenCode — nothing to register ------------------------
# concord is Codex-only by design. Named with the reason rather than omitted:
# the convention's report is never silent about a host.
if [[ -d "$HOME/.claude" ]]; then
  report claude skipped "concord is Codex-only — nothing is registered here by design"
else
  report claude absent "no ~/.claude on this machine"
fi

OPENCODE_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
if command -v opencode >/dev/null 2>&1 || [[ -d "$OPENCODE_DIR" ]]; then
  report opencode skipped "concord is Codex-only — nothing is registered here by design"
else
  report opencode absent "no opencode install found"
fi

# --- 2. Codex — merge (or remove) the hooks, idempotently, via node -----------
# The node block emits one "status<TAB>detail" line; bash owns the formatting so
# there is a single report() for the whole script.
merge_hooks() {
  "$NODE_BIN" - "$HOOKS" "$NODE_BIN" "$RECALL" "$CAPTURE" "$MODE" <<'NODE'
const fs = require('fs');
const [, , hooksPath, nodeBin, recall, capture, mode] = process.argv;

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

// Marker used to find our own entries again — matching on the script path keeps
// this from touching hooks any other plugin installed.
const WANTED = {
  SessionStart: `"${nodeBin}" "${recall}"`,
  UserPromptSubmit: `"${nodeBin}" "${capture}" --prompt`,
  SessionEnd: `"${nodeBin}" "${capture}" --session-end`,
};
// Legacy installs carry "concord" in the skill path. Once the skill was renamed
// to `remember`, an npx-installed tree no longer does — so also match the exact
// scripts this run manages, or a reinstall would duplicate every entry and
// --uninstall would leave them behind.
const isOurs = (entry) => {
  const serialized = JSON.stringify(entry);

  return serialized.includes('concord') || serialized.includes(recall) || serialized.includes(capture);
};

let changed = false;
for (const [event, command] of Object.entries(WANTED)) {
  if (cfg.hooks[event] === undefined) cfg.hooks[event] = [];
  if (!Array.isArray(cfg.hooks[event])) {
    console.error('"hooks.' + event + '" must be an array: ' + hooksPath);
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
  process.stdout.write('skipped\tSessionStart / UserPromptSubmit / SessionEnd already as wanted in ' + hooksPath + '\n');
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
process.stdout.write(
  'done\t' +
    (mode === 'install' ? 'merged' : 'removed') +
    ' SessionStart / UserPromptSubmit / SessionEnd in ' + hooksPath + '\n',
);
NODE
}

HOOKS_RC=0
HOOKS_OUT=$(merge_hooks) || HOOKS_RC=$?
if [[ "$HOOKS_RC" -ne 0 ]]; then
  report codex broken "could not update $HOOKS (reason above); nothing was changed"
  exit 1
fi
report codex "${HOOKS_OUT%%$'\t'*}" "${HOOKS_OUT#*$'\t'}"

if [[ "$MODE" == "uninstall" ]]; then
  # No verify on the way out: the correct end state is that nothing answers.
  report verify skipped "uninstall — nothing should be registered to verify"
  echo ""
  echo "done. Restart Codex to drop the hooks."
  echo "Memory files under .concord/ were left untouched."
  exit 0
fi

# --- 3. Codex — enable the experimental hooks feature -------------------------
if [[ -f "$CONFIG" ]] && grep -Eq '^[[:space:]]*hooks[[:space:]]*=[[:space:]]*true' "$CONFIG"; then
  report codex skipped "hooks feature already enabled in $CONFIG"
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
  report codex done "ensured hooks = true under existing [features] in $CONFIG"
else
  printf '\n[features]\nhooks = true\n' >>"$CONFIG"
  report codex done "added [features] hooks = true to $CONFIG"
fi

# --- 4. verify ----------------------------------------------------------------
# A registration that was written but does not resolve is a failure to report,
# not a success. concord-doctor already implements every probe and ships in this
# same plugin, so the installer asks it rather than growing a second copy.
fallback_verify() {
  "$NODE_BIN" -e '
    const fs = require("node:fs");
    const [hooksPath, recall, capture] = process.argv.slice(1);
    let cfg;
    try { cfg = JSON.parse(fs.readFileSync(hooksPath, "utf8")); } catch { process.exit(1); }
    const wanted = { SessionStart: recall, UserPromptSubmit: capture, SessionEnd: capture };
    for (const [event, script] of Object.entries(wanted)) {
      if (!JSON.stringify(cfg?.hooks?.[event] ?? []).includes(script)) process.exit(1);
      if (!fs.existsSync(script)) process.exit(1);
    }
  ' "$HOOKS" "$RECALL" "$CAPTURE"
}

if [[ -f "$DOCTOR" ]]; then
  VERIFY_RC=0
  VERIFY_OUT=$("$NODE_BIN" "$DOCTOR" --host codex --quiet 2>&1) || VERIFY_RC=$?
  if [[ "$VERIFY_RC" -eq 0 ]]; then
    report verify done "concord-doctor confirms the Codex registration resolves"
  else
    report verify broken "concord-doctor says the registration does not resolve"
    printf '%s\n' "$VERIFY_OUT" | sed 's/^/                    /'
    exit 1
  fi
elif fallback_verify; then
  report verify done "read $HOOKS back — all three events resolve (concord-doctor is not installed beside this skill)"
else
  report verify broken "wrote $HOOKS but the three events do not read back as registered"
  exit 1
fi

cat <<EOF

done. Next steps:
  1. Restart Codex (and Codex Desktop if used).
  2. Approve the hook-trust prompt when Codex shows it.
  3. Work as usual — memory starts accruing in <git-root>/.concord/.

Re-run this script anytime — it is idempotent.
To undo:  bash "$0" --uninstall
EOF
