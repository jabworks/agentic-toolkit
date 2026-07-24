// condux-opencode — OpenCode plugin for the condux workflow toolkit.
//
// Injects the four condux specialist agents (coder, explorer, planner,
// researcher) into the loaded config via the `config` hook, reading their
// definitions from the bundled agents/*.md (generated from the canonical
// Claude-dialect sources by scripts/build-opencode.mjs in the toolkit repo),
// including the tool restrictions those sources declare.
// User-defined agents with the same name always win — injection is skip-if-present.
//
// The same `config` hook registers the bundled skills/ tree (the 12 condux
// skills, generated alongside the agents) onto config.skills.paths, so
// `plugin: ["@jabworks/condux"]` alone installs both agents and skills — no
// separate `npx skills add` step for condux. This works because the config hook
// mutates the cached config before OpenCode lazily discovers skills.
//
// Optional plan-review listener (CONDUX_PLAN_REVIEW=1): when the primary
// `plan` agent finishes a turn (session.idle), spawns the plan-review annotate
// server from an installed condux skill tree. Best-effort only — OpenCode does
// not await event hooks, so unlike the Codex Stop hook this cannot gate the
// next turn on the review outcome.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const PKG_DIR = path.dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = path.join(PKG_DIR, 'agents');
const SKILLS_DIR = path.join(PKG_DIR, 'skills');

// Bundled agent files use exactly the frontmatter the toolkit generator emits:
// a JSON-quoted `description`, a plain `mode`, an optional `permission` deny map
// (JSON object), body = system prompt.
function parseAgent(text, name) {
  const match = text.match(/^---\ndescription: (".*")\nmode: (\S+)\n(?:permission: (\{.*\})\n)?---\n/);
  if (!match) throw new Error(`condux-opencode: malformed bundled agent ${name}`);
  return {
    description: JSON.parse(match[1]),
    mode: match[2],
    permission: match[3] ? JSON.parse(match[3]) : undefined,
    prompt: text.slice(match[0].length).trim(),
  };
}

function loadBundledAgents() {
  const agents = {};
  for (const file of readdirSync(AGENTS_DIR).sort()) {
    if (!file.endsWith('.md')) continue;
    const name = file.slice(0, -3);
    agents[name] = parseAgent(readFileSync(path.join(AGENTS_DIR, file), 'utf8'), name);
  }
  return agents;
}

// The annotate server ships inside the plan-review skill; look for it in every
// skill tree OpenCode discovers (project then global).
function findAnnotateServer(worktree) {
  const roots = [
    path.join(worktree, '.opencode', 'skills'),
    path.join(worktree, '.agents', 'skills'),
    path.join(worktree, '.claude', 'skills'),
    path.join(os.homedir(), '.config', 'opencode', 'skills'),
    path.join(os.homedir(), '.claude', 'skills'),
    // The plan-review skill now also ships bundled in this package, so the
    // listener works even when the user never ran a separate skills install.
    SKILLS_DIR,
  ];
  for (const root of roots) {
    const candidate = path.join(root, 'plan-review', 'references', 'annotate-server.js');
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export const ConduxPlugin = async ({ worktree }) => {
  const bundled = loadBundledAgents();
  const activeAgent = new Map();
  let warnedPayloadShape = false;

  return {
    config: async (cfg) => {
      cfg.agent ??= {};
      for (const [name, def] of Object.entries(bundled)) {
        if (cfg.agent[name]) continue;
        cfg.agent[name] = {
          description: def.description,
          mode: def.mode,
          prompt: def.prompt,
          // Only present for agents whose canonical definition restricts them
          // (explorer/researcher are read-only, planner cannot run shell) —
          // without it OpenCode's defaults grant bash/edit/write to all four.
          // Must be `permission`, not the deprecated `tools`: `tools` is folded
          // into permissions while the config file is parsed, which has already
          // happened by the time this hook runs.
          ...(def.permission ? { permission: def.permission } : {}),
        };
      }

      // Register the bundled condux skills so OpenCode discovers them without a
      // separate install. Guarded on existsSync because a source checkout runs
      // this file before the generator has produced skills/. Idempotent — the
      // includes() check keeps re-fires (the hook runs per config load) from
      // pushing duplicates, and never disturbs a user-provided paths entry.
      if (existsSync(SKILLS_DIR)) {
        cfg.skills ??= {};
        cfg.skills.paths ??= [];
        if (!cfg.skills.paths.includes(SKILLS_DIR)) cfg.skills.paths.push(SKILLS_DIR);
      }
    },

    'chat.params': async (input) => {
      if (input.sessionID && input.agent) activeAgent.set(input.sessionID, input.agent);
    },

    event: async ({ event }) => {
      if (process.env.CONDUX_PLAN_REVIEW !== '1') return;
      if (event.type !== 'session.idle') return;
      const sessionID = event.properties?.sessionID;
      if (sessionID === undefined) {
        // Payload shape drifted from what this plugin expects — say so once,
        // so "listener not wired" is distinguishable from "plan agent not active".
        if (!warnedPayloadShape) {
          warnedPayloadShape = true;
          console.error('condux-opencode: session.idle carried no properties.sessionID — plan-review listener inactive');
        }
        return;
      }
      if (activeAgent.get(sessionID) !== 'plan') return;
      const server = findAnnotateServer(worktree);
      if (!server) return;
      const child = spawn('node', [server, '--codex-stop'], {
        cwd: worktree,
        detached: true,
        stdio: 'ignore',
      });
      // Fail silent if `node` is missing (OpenCode itself only needs Bun) —
      // an unhandled 'error' event would crash the plugin host.
      child.on('error', () => {});
      child.unref();
    },
  };
};
// No default export: OpenCode's loader invokes every exported plugin function,
// so a default re-export of ConduxPlugin would register all hooks twice.
