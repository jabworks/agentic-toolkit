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
// It also carries workflow's routing.md — the payload Claude Code and Codex
// get from their SessionStart hook — into the session as a `synthetic: true`
// `<system-reminder>` text part on the first user message of every *main*
// session (`chat.message`), re-injected after compaction. That is the shape
// OpenCode's own plan-mode reminders use (session/reminders.ts): it reaches
// the model in the user turn rather than mid-system-prompt, and it never
// reaches subagent sessions. Verified live on OpenCode 1.18.25 — the part
// persists (`chat.message` runs before the message is saved, and its parts
// array is the one written) and the model sees it. Per main-session turn it
// costs the same ~390 tokens as the `config.instructions` channel it replaces
// (docket #38 ratified that trade; docket #72 relocated the payload out of
// the system prompt and out of subagents).
//
// Optional plan-review listener (CONDUX_PLAN_REVIEW=1): when the primary
// `plan` agent finishes a turn (session.idle), spawns the plan-review annotate
// server from an installed condux skill tree. Best-effort only — OpenCode does
// not await event hooks, so unlike the Codex Stop hook this cannot gate the
// next turn on the review outcome.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const PKG_DIR = path.dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = path.join(PKG_DIR, 'agents');
const SKILLS_DIR = path.join(PKG_DIR, 'skills');
const ROUTING_MD = path.join(SKILLS_DIR, 'workflow', 'hooks', 'routing.md');

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

// The routing payload, framed the way OpenCode frames its own reminders. Null
// when routing.md is missing or empty — then the hook is a no-op, the same
// fail-open contract the Claude Code and Codex SessionStart scripts follow.
function loadRoutingReminder() {
  if (!existsSync(ROUTING_MD)) return null;
  const payload = readFileSync(ROUTING_MD, 'utf8').trim();

  return payload ? `<system-reminder>\n${payload}\n</system-reminder>` : null;
}

// What the compaction summariser is asked to keep. The full reminder is
// re-injected on the next user message; this only stops the summary from
// describing a session in which the router never existed.
const COMPACTION_CONTEXT =
  'Carry this rule into the summary: every implementation request in this session starts by loading the ' +
  '`workflow` skill (`skill(name="workflow")`) before any other condux skill or any edit.';

// A part id in OpenCode's own ascending format — `prt_` + six big-endian bytes
// of (ms << 12 | counter) + fourteen base62 characters — so the reminder sorts
// among the parts OpenCode minted. The counter is pinned to its maximum: a
// part created in the same millisecond as the user's text must still order
// after it. The reminder follows the prompt, never precedes it.
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function partId() {
  const stamp = BigInt(Date.now()) * 0x1000n + 0xfffn;
  const bytes = Buffer.alloc(6);
  for (let i = 0; i < 6; i++) bytes[i] = Number((stamp >> BigInt(40 - 8 * i)) & 0xffn);
  let suffix = '';
  for (const byte of randomBytes(14)) suffix += BASE62[byte % 62];

  return `prt_${bytes.toString('hex')}${suffix}`;
}

// True when the session's stored history still shows the reminder to the
// model: a synthetic text part with exactly this text on a user message that
// comes after the last compaction. Compaction narrows the model's view to the
// summary plus a short tail, so a reminder on the far side of one counts as
// absent — the next user message gets it again.
export function historyIsRouted(messages, reminder) {
  let routed = false;
  for (const { info, parts = [] } of messages) {
    if (parts.some((part) => part.type === 'compaction')) routed = false;
    if (info?.role !== 'user') continue;
    if (parts.some((part) => part.type === 'text' && part.synthetic === true && part.text === reminder)) routed = true;
  }

  return routed;
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

export const ConduxPlugin = async ({ worktree, client }) => {
  const bundled = loadBundledAgents();
  const reminder = loadRoutingReminder();
  const activeAgent = new Map();
  // Sessions whose live history carries the reminder, as far as this process
  // knows. A compaction clears the entry so the next user message re-injects.
  const routed = new Set();
  const isChild = new Map();
  let warnedPayloadShape = false;

  // Subagent sessions never get the router: their brief is the task the parent
  // handed them, and "every request starts at workflow" contradicts coder's.
  // The bundled agent names are the free path; the parent lookup catches every
  // other child (OpenCode's own `general`, user-defined subagents) — `task`
  // creates them with parentID set, and `chat.message` carries their agent
  // name. Unknown counts as main: the instructions channel this replaces
  // reached subagents too, so leaning toward injection is the known state.
  async function isSubagentSession(input) {
    if (input.agent && bundled[input.agent]?.mode === 'subagent') return true;
    if (typeof client?.session?.get !== 'function') return false;
    if (!isChild.has(input.sessionID)) {
      try {
        const { data } = await client.session.get({ path: { id: input.sessionID } });
        isChild.set(input.sessionID, Boolean(data?.parentID));
      } catch {
        isChild.set(input.sessionID, false);
      }
    }

    return isChild.get(input.sessionID);
  }

  // On first sight of a session in this process — fresh, resumed, or after a
  // compaction cleared it — ask the server whether the reminder is already in
  // the model's view instead of trusting process memory: a resumed session
  // would otherwise be injected twice, a compacted one never.
  async function alreadyRouted(sessionID) {
    if (routed.has(sessionID)) return true;
    if (typeof client?.session?.messages !== 'function') return false;
    try {
      const { data } = await client.session.messages({ path: { id: sessionID } });

      return Array.isArray(data) && historyIsRouted(data, reminder);
    } catch {
      return false;
    }
  }

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
      // routing.md deliberately does NOT go on cfg.instructions any more: that
      // channel is global (every subagent session read it) and lands mid
      // system prompt. The reminder below is the replacement (docket #72).
    },

    // Route through workflow the way Claude Code and Codex do at SessionStart:
    // one reminder on the first user message of a main session. Runs before
    // the message is saved, so the pushed part is persisted with the rest.
    'chat.message': async (input, output) => {
      if (!reminder || !input?.sessionID || !output?.message?.id || !Array.isArray(output.parts)) return;
      if (await isSubagentSession(input)) return;
      if (await alreadyRouted(input.sessionID)) {
        routed.add(input.sessionID);

        return;
      }

      output.parts.push({
        id: partId(),
        messageID: output.message.id,
        sessionID: input.sessionID,
        type: 'text',
        synthetic: true,
        text: reminder,
      });
      routed.add(input.sessionID);
    },

    // Compaction narrows the model's view to a summary plus a short tail. Ask
    // the summariser to keep the rule; the next user message re-injects the
    // full reminder (the `session.compacted` event below clears the session).
    'experimental.session.compacting': async (input, output) => {
      if (!reminder || !Array.isArray(output?.context)) return;
      if (input?.sessionID && routed.has(input.sessionID)) output.context.push(COMPACTION_CONTEXT);
    },

    'chat.params': async (input) => {
      if (input.sessionID && input.agent) activeAgent.set(input.sessionID, input.agent);
    },

    event: async ({ event }) => {
      if (event.type === 'session.compacted') {
        routed.delete(event.properties?.sessionID);

        return;
      }
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
