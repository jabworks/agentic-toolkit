#!/usr/bin/env bash
# docket installer — registers the bundled MCP server with the hosts that
# need registration. Reference implementation of the toolkit's ease-of-install
# convention: detect -> register -> verify -> report, idempotent, re-runnable,
# never clobbers unrelated config. INSTALL.md is the same procedure written
# for an agent to follow by hand.
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

# --- Claude Code -------------------------------------------------------------
# The plugin ships .mcp.json, so a marketplace install needs nothing here.
if [ -d "$HOME/.claude" ]; then
  report claude skipped "plugin .mcp.json registers the server on install"
else
  report claude absent "no ~/.claude found"
fi

# --- Codex -------------------------------------------------------------------
CODEX_CONFIG="$HOME/.codex/config.toml"
if [ -d "$HOME/.codex" ]; then
  if [ -f "$CODEX_CONFIG" ] && grep -q '^\[mcp_servers\.docket\]' "$CODEX_CONFIG"; then
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
else
  report codex absent "no ~/.codex found"
fi

# --- OpenCode ----------------------------------------------------------------
OPENCODE_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/opencode/opencode.json"
if command -v opencode >/dev/null 2>&1 || [ -d "$(dirname "$OPENCODE_CONFIG")" ]; then
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
else
  report opencode absent "no opencode install found"
fi

report verify ok "server answers initialize; re-run this script anytime — it is idempotent"
