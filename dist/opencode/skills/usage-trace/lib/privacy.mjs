import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const BUILT_IN_TOOLS = new Set([
  'Agent',
  'Task',
  'Bash',
  'Read',
  'Write',
  'Edit',
  'MultiEdit',
  'NotebookEdit',
  'Glob',
  'Grep',
  'LS',
  'WebFetch',
  'WebSearch',
  'Skill',
  'ToolSearch',
  'AskUserQuestion',
  'TodoWrite',
  'ExitPlanMode',
  'EnterPlanMode',
  'exec_command',
  'write_stdin',
  'shell',
  'apply_patch',
  'update_plan',
  'view_image',
  'spawn_agent',
  'wait_agent',
]);

const BUILT_IN_AGENTS = new Set(['general-purpose', 'Explore', 'Plan', 'statusline-setup', 'claude-code-guide']);

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};

const loadSalt = home => {
  const file = path.join(home, 'salt');

  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    const salt = crypto.randomBytes(32).toString('hex');

    fs.mkdirSync(home, { recursive: true });

    // 'wx' so two first runs can't overwrite each other's salt and split hashes.
    try {
      fs.writeFileSync(file, salt, { flag: 'wx', mode: 0o600 });

      return salt;
    } catch {
      return fs.readFileSync(file, 'utf8');
    }
  }
};

const loadInstalledPlugins = () => {
  const claudeHome = process.env.CLAUDE_CONFIG_DIR || path.join(process.env.HOME || '', '.claude');
  const installed = readJson(path.join(claudeHome, 'plugins', 'installed_plugins.json'), {});

  return new Set(Object.keys(installed.plugins || {}).map(key => key.split('@')[0]));
};

export const loadPrivacy = (home, { plugins = loadInstalledPlugins() } = {}) => {
  const salt = loadSalt(home);
  const config = readJson(path.join(home, 'config.json'), {});
  const allow = new Set(config.allow || []);

  const hash = value => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return `h:${crypto.createHmac('sha256', salt).update(String(value)).digest('hex').slice(0, 16)}`;
  };

  const isPublicPlugin = name => plugins.has(name);

  // Readable only when it's a built-in or comes from an installed plugin;
  // a custom skill or MCP server can be named after a private project.
  const publicName = name => {
    if (!name) {
      return undefined;
    }

    if (BUILT_IN_TOOLS.has(name) || BUILT_IN_AGENTS.has(name)) {
      return name;
    }

    const mcp = /^mcp__plugin_([^_]+(?:-[^_]+)*)_/.exec(name);

    if (mcp && isPublicPlugin(mcp[1])) {
      return name;
    }

    const qualifier = name.split(':')[0];

    if (name.includes(':') && isPublicPlugin(qualifier)) {
      return name;
    }

    if (isPublicPlugin(name)) {
      return name;
    }

    return hash(name);
  };

  const isAllowlisted = projectPath => allow.has(projectPath);

  return { hash, publicName, isPublicPlugin, isAllowlisted };
};
