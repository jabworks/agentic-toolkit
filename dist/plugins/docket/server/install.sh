#!/usr/bin/env bash
# docket installer — registers the bundled MCP server with the hosts that
# need registration. Reference implementation of the toolkit's ease-of-install
# convention: detect -> register -> verify -> report, idempotent, re-runnable,
# never clobbers unrelated config. INSTALL.md is the same procedure written
# for an agent to follow by hand.
#
# Usage:  bash install.sh [--uninstall]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER="$SCRIPT_DIR/mcp-server.mjs"

report() { printf '%-10s %-8s %s\n' "$1" "$2" "$3"; }

if ! command -v node >/dev/null 2>&1; then
  report FATAL node "node is required (the server and this installer both run on it)"
  exit 1
fi

# Round-trips an initialize request through the server; registration without
# verification is how silently-broken hooks shipped before.
verify_server() {
  printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}\n' \
    | node "$SERVER" 2>/dev/null | head -1 | grep -q '"docket"'
}

if ! verify_server; then
  report FATAL server "mcp-server.mjs did not answer an initialize round-trip"
  exit 1
fi

MODE="install"
[ "${1:-}" = "--uninstall" ] && MODE="uninstall"

# --- Claude Code -------------------------------------------------------------
# The plugin ships .mcp.json, so a marketplace install needs nothing here.
# Uninstall is the same story: removing the plugin is the host's job, not
# this script's — so it reports skipped either way, named with why.
if [ -d "$HOME/.claude" ]; then
  if [ "$MODE" = "uninstall" ]; then
    report claude skipped "remove the plugin to uninstall — .mcp.json is not this script's to touch"
  else
    report claude skipped "plugin .mcp.json registers the server on install"
  fi
else
  report claude absent "no ~/.claude found"
fi

# --- Codex -------------------------------------------------------------------
CODEX_CONFIG="$HOME/.codex/config.toml"
if [ -d "$HOME/.codex" ]; then
  REGISTERED=false
  [ -f "$CODEX_CONFIG" ] && grep -q '^\[mcp_servers\.docket\]' "$CODEX_CONFIG" && REGISTERED=true

  if [ "$MODE" = "uninstall" ]; then
    if [ "$REGISTERED" = true ]; then
      # Surgical removal, no TOML parser: drop the [mcp_servers.docket] header
      # and its contiguous key lines, stopping at the next [table] or EOF.
      # config.toml.bak is never restored here — install rewrites it on every
      # run, so by the time an uninstall happens it holds the very
      # registration being removed, not "before".
      awk '
        /^\[mcp_servers\.docket\]/ { in_docket=1; next }
        /^\[/ { in_docket=0 }
        in_docket { next }
        { print }
      ' "$CODEX_CONFIG" > "$CODEX_CONFIG.tmp"
      # Rewrite through the existing inode rather than mv'ing the temp over it.
      # config.toml is 0600 on a real machine and can hold credentials; a temp
      # file created under the caller's umask and then moved into place silently
      # widens that to 0644. Truncate-and-write keeps the user's own mode and
      # ownership, which is the only thing that cannot be restored afterwards.
      cat "$CODEX_CONFIG.tmp" > "$CODEX_CONFIG"
      rm -f "$CODEX_CONFIG.tmp"
      report codex done "removed [mcp_servers.docket] from config.toml"
    else
      report codex skipped "not registered in config.toml"
    fi
  else
    if [ "$REGISTERED" = true ]; then
      report codex skipped "already registered in config.toml"
    else
      # Append-only TOML: a new table at EOF is always valid, and the write goes
      # through node so quoting survives any path.
      [ -f "$CODEX_CONFIG" ] && cp "$CODEX_CONFIG" "$CODEX_CONFIG.bak"
      node -e '
        const fs = require("node:fs");
        const [config, server] = process.argv.slice(1);
        const block = `\n[mcp_servers.docket]\ncommand = "node"\nargs = [${JSON.stringify(server)}]\n`;
        fs.appendFileSync(config, block);
      ' "$CODEX_CONFIG" "$SERVER"
      report codex done "registered in config.toml (backup: config.toml.bak)"
    fi
  fi
else
  report codex absent "no ~/.codex found"
fi

# --- OpenCode ----------------------------------------------------------------
OPENCODE_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/opencode/opencode.json"
if command -v opencode >/dev/null 2>&1 || [ -d "$(dirname "$OPENCODE_CONFIG")" ]; then
  if [ "$MODE" = "uninstall" ]; then
    RESULT=$(node -e '
      const fs = require("node:fs");
      const [config] = process.argv.slice(1);
      if (!fs.existsSync(config)) { console.log("skipped"); process.exit(0); }
      const data = JSON.parse(fs.readFileSync(config, "utf8"));
      if (!data.mcp?.docket) { console.log("skipped"); process.exit(0); }
      fs.copyFileSync(config, config + ".bak");
      delete data.mcp.docket;
      if (data.mcp && Object.keys(data.mcp).length === 0) delete data.mcp;
      fs.writeFileSync(config, JSON.stringify(data, null, 2) + "\n");
      console.log("done");
    ' "$OPENCODE_CONFIG")
    if [ "$RESULT" = "skipped" ]; then
      report opencode skipped "not registered in opencode.json"
    else
      report opencode done "removed from opencode.json (backup: opencode.json.bak)"
    fi
  else
    RESULT=$(node -e '
      const fs = require("node:fs");
      const path = require("node:path");
      const [config, server] = process.argv.slice(1);
      let data = {};
      if (fs.existsSync(config)) {
        data = JSON.parse(fs.readFileSync(config, "utf8"));
        if (data.mcp?.docket) { console.log("skipped"); process.exit(0); }
        fs.copyFileSync(config, config + ".bak");
      } else {
        fs.mkdirSync(path.dirname(config), { recursive: true });
      }
      data.mcp = { ...data.mcp, docket: { type: "local", command: ["node", server], enabled: true } };
      fs.writeFileSync(config, JSON.stringify(data, null, 2) + "\n");
      console.log("done");
    ' "$OPENCODE_CONFIG" "$SERVER")
    if [ "$RESULT" = "skipped" ]; then
      report opencode skipped "already registered in opencode.json"
    else
      report opencode done "registered in opencode.json (backup kept when it existed)"
    fi
  fi
else
  report opencode absent "no opencode install found"
fi

# The verify beat checks what the run claimed to do, not that the binary works.
# On uninstall "the server still answers initialize" is true and beside the
# point — what needs confirming is that no registration survived.
if [ "$MODE" = "uninstall" ]; then
  LEFTOVER=""
  [ -f "$CODEX_CONFIG" ] && grep -q '^\[mcp_servers\.docket\]' "$CODEX_CONFIG" && LEFTOVER="config.toml"
  if [ -f "$OPENCODE_CONFIG" ] && node -e 'const fs=require("node:fs");const d=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.exit(d.mcp?.docket?0:1)' "$OPENCODE_CONFIG" 2>/dev/null; then
    LEFTOVER="${LEFTOVER:+$LEFTOVER, }opencode.json"
  fi

  if [ -n "$LEFTOVER" ]; then
    report verify failed "docket is still registered in $LEFTOVER"
    exit 1
  fi
  report verify ok "no docket registration remains; re-run this anytime — it is idempotent"
else
  report verify ok "server answers initialize; re-run this script anytime — it is idempotent"
fi
