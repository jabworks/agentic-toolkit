import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  SKILLS_DIR,
  OPENCODE_SKILLS_DIR,
  AGENTS_SRC_DIR,
  AGENTS_DST_DIR,
  CONDUX_OPENCODE_SKILLS_DIR,
  OPENCODE_TRANSFORMS,
  conduxSkillNames,
  splitFrontmatter,
  decodeScalar,
  transformRouting,
  translateAgent,
} from '../scripts/build-opencode.mjs';
import { CURSOR_SKILLS_DIR } from '../scripts/build-cursor.mjs';

const skillNames = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

function listFilesRelative(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFilesRelative(full, base, out);
    else out.push(path.relative(base, full));
  }
  return out.sort();
}

test('dist/opencode/skills matches the generator output for every skill', () => {
  const mismatches = [];
  for (const name of skillNames) {
    const src = path.join(SKILLS_DIR, name);
    const dst = path.join(OPENCODE_SKILLS_DIR, name);
    if (!fs.existsSync(dst)) {
      mismatches.push(`${name}: missing from dist/opencode/skills`);
      continue;
    }
    const srcFiles = listFilesRelative(src);
    const dstFiles = listFilesRelative(dst);
    if (JSON.stringify(srcFiles) !== JSON.stringify(dstFiles)) {
      mismatches.push(`${name}: file lists differ`);
      continue;
    }
    for (const rel of srcFiles) {
      const srcContent = fs.readFileSync(path.join(src, rel));
      const dstContent = fs.readFileSync(path.join(dst, rel));
      if (Object.hasOwn(OPENCODE_TRANSFORMS, rel)) {
        const expected = OPENCODE_TRANSFORMS[rel](srcContent.toString('utf8'), `skills/${name}`);
        if (dstContent.toString('utf8') !== expected) {
          mismatches.push(`${name}: ${rel} differs from transform output`);
        }
      } else if (!srcContent.equals(dstContent)) {
        mismatches.push(`${name}: ${rel} not byte-identical`);
      }
    }
  }
  assert.deepEqual(mismatches, [], 'dist/opencode has drifted — run scripts/build-opencode.mjs:\n' + mismatches.join('\n'));
});

test('no orphaned skill dirs in dist/opencode/skills', () => {
  const orphans = fs.readdirSync(OPENCODE_SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !skillNames.includes(e.name))
    .map((e) => e.name);
  assert.deepEqual(orphans, [], 'orphaned dirs in dist/opencode/skills: ' + orphans.join(', '));
});

test('transformed frontmatter fits the OpenCode contract', () => {
  const problems = [];
  for (const name of skillNames) {
    const skillPath = path.join(OPENCODE_SKILLS_DIR, name, 'SKILL.md');
    const { entries } = splitFrontmatter(fs.readFileSync(skillPath, 'utf8'), name);
    if (entries.some((e) => e.key === 'when_to_use')) {
      problems.push(`${name}: when_to_use survived the transform`);
    }
    const description = entries.find((e) => e.key === 'description');
    if (!description) {
      problems.push(`${name}: no description`);
      continue;
    }
    const value = decodeScalar(description.raw);
    // OpenCode's documented cap; name pattern matches the repo's existing invariant.
    if (value.length < 1 || value.length > 1024) {
      problems.push(`${name}: description length ${value.length} outside 1–1024`);
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('the routing payload names the OpenCode verb in both OpenCode trees, and stays verbatim for Cursor', () => {
  // Docket #72: routing.md used to ship verbatim and tell the model to run
  // `/condux:workflow`, a Claude Code command OpenCode does not have. Both
  // OpenCode copies (dist tree and the npm-bundled subset) must carry the
  // executable verb; Cursor never reads the file, so its copy is untouched.
  const source = fs.readFileSync(path.join(SKILLS_DIR, 'workflow', 'hooks', 'routing.md'), 'utf8');
  assert.ok(source.includes('`/condux:workflow`'), 'canonical routing.md no longer names /condux:workflow — update the transform anchors');

  for (const root of [OPENCODE_SKILLS_DIR, CONDUX_OPENCODE_SKILLS_DIR]) {
    const shipped = fs.readFileSync(path.join(root, 'workflow', 'hooks', 'routing.md'), 'utf8');
    assert.equal(shipped, transformRouting(source, 'skills/workflow'), `${root}: routing.md differs from transform output`);
    assert.ok(!shipped.includes('/condux:'), `${root}: routing.md still names a /condux: slash command`);
    assert.ok(shipped.includes('skill(name="workflow")'), `${root}: routing.md does not name the skill tool`);
    assert.ok(shipped.includes('`/finalize` → `skill(name="finalize")`'), `${root}: routing.md lost the /name → skill(name) mapping`);
    assert.ok(shipped.trimEnd().endsWith('</EXTREMELY_IMPORTANT>'), `${root}: routing.md lost its closing anchor`);
  }

  const cursor = fs.readFileSync(path.join(CURSOR_SKILLS_DIR, 'workflow', 'hooks', 'routing.md'), 'utf8');
  assert.equal(cursor, source, 'Cursor tree must ship routing.md verbatim — it never reads it');

  // The transform refuses a payload that lost its anchors rather than shipping
  // the Claude Code verb silently.
  assert.throws(() => transformRouting('no verb here\n</EXTREMELY_IMPORTANT>\n', 'x'), /no longer names/);
  assert.throws(() => transformRouting('run `/condux:workflow`\n', 'x'), /anchor/);
});

test('packages/condux-opencode/agents matches the generator output', () => {
  const srcFiles = fs.readdirSync(AGENTS_SRC_DIR).filter((f) => f.endsWith('.md')).sort();
  const dstFiles = fs.readdirSync(AGENTS_DST_DIR).filter((f) => f.endsWith('.md')).sort();
  assert.deepEqual(dstFiles, srcFiles, 'agent file sets differ — run scripts/build-opencode.mjs');
  for (const file of srcFiles) {
    const expected = translateAgent(fs.readFileSync(path.join(AGENTS_SRC_DIR, file), 'utf8'), file);
    const actual = fs.readFileSync(path.join(AGENTS_DST_DIR, file), 'utf8');
    assert.equal(actual, expected, `${file} differs from translation output`);
    const { entries, body } = splitFrontmatter(actual, file);
    assert.ok(decodeScalar(entries.find((e) => e.key === 'description').raw).length > 0, `${file}: empty description`);
    assert.equal(entries.find((e) => e.key === 'mode')?.raw, 'subagent', `${file}: mode must be subagent`);
    assert.ok(!body.includes('<example>'), `${file}: <example> block leaked into the prompt body`);
    assert.ok(body.trim().length > 0, `${file}: empty prompt body`);
  }
});

test('restricted agents keep their tool restrictions on OpenCode', () => {
  // The canonical sources make explorer/researcher read-only and deny planner a
  // shell; OpenCode grants bash/edit/write by default, so the translation has to
  // carry the denials or the guarantee becomes prompt-only. It must express them
  // as `permission` — OpenCode's `tools` field is deprecated and only folded into
  // permissions during config parsing, which is over before the plugin's config
  // hook runs, so a `tools` map injected there has no effect at all.
  const expected = {
    'explorer.md': { bash: 'deny', edit: 'deny' },
    'researcher.md': { bash: 'deny', edit: 'deny' },
    'planner.md': { bash: 'deny' },
    'coder.md': undefined,
  };
  for (const [file, denied] of Object.entries(expected)) {
    const { entries } = splitFrontmatter(fs.readFileSync(path.join(AGENTS_DST_DIR, file), 'utf8'), file);
    assert.equal(entries.find((e) => e.key === 'tools'), undefined, `${file}: must not use the deprecated tools field`);
    const permission = entries.find((e) => e.key === 'permission');
    if (denied === undefined) {
      assert.equal(permission, undefined, `${file}: unrestricted agent should carry no permission line`);
      continue;
    }
    assert.ok(permission, `${file}: missing permission line`);
    assert.deepEqual(JSON.parse(permission.raw), denied, `${file}: permission denials differ`);
  }
});

test('packages/condux-opencode/skills is the dist/opencode subset for the condux bundle', () => {
  const bundled = fs.readdirSync(CONDUX_OPENCODE_SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  // Membership must equal the marketplace bundle — no more, no less.
  assert.deepEqual(bundled, conduxSkillNames(), 'bundled skill set differs from the condux bundle — run scripts/build-opencode.mjs');

  // Each bundled tree is the exact same transform output as its dist/opencode
  // counterpart — the package ships a scoped copy, never a divergent one.
  const mismatches = [];
  for (const name of bundled) {
    const opencodeDir = path.join(OPENCODE_SKILLS_DIR, name);
    const bundledDir = path.join(CONDUX_OPENCODE_SKILLS_DIR, name);
    const a = listFilesRelative(opencodeDir);
    const b = listFilesRelative(bundledDir);
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      mismatches.push(`${name}: file lists differ`);
      continue;
    }
    for (const rel of a) {
      if (!fs.readFileSync(path.join(opencodeDir, rel)).equals(fs.readFileSync(path.join(bundledDir, rel)))) {
        mismatches.push(`${name}: ${rel} not byte-identical to dist/opencode`);
      }
    }
  }
  assert.deepEqual(mismatches, [], 'bundled condux skills drifted from dist/opencode — run scripts/build-opencode.mjs:\n' + mismatches.join('\n'));
});

test('condux-opencode package is loadable and consistent', async () => {
  const pkgDir = path.dirname(AGENTS_DST_DIR);
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  assert.equal(pkg.type, 'module');
  assert.ok(fs.existsSync(path.join(pkgDir, pkg.main)), 'package.json main does not resolve');
  assert.ok(pkg.files.includes('agents/'), 'agents/ missing from package files array');
  assert.ok(pkg.files.includes('skills/'), 'skills/ missing from package files array');

  const mod = await import(pathToFileURL(path.join(pkgDir, pkg.main)).href);
  const hooks = await mod.ConduxPlugin({ worktree: pkgDir });
  assert.equal(typeof hooks.config, 'function');

  const cfg = { agent: { coder: { description: 'user-defined' } } };
  await hooks.config(cfg);
  assert.equal(cfg.agent.coder.description, 'user-defined', 'user-defined agent was clobbered');
  for (const name of ['explorer', 'planner', 'researcher']) {
    assert.ok(cfg.agent[name], `agent ${name} not injected`);
    assert.equal(cfg.agent[name].mode, 'subagent');
    assert.ok(cfg.agent[name].prompt.length > 0, `agent ${name} has empty prompt`);
  }
  assert.equal(cfg.agent.explorer.permission.edit, 'deny', 'explorer must not be able to modify files');
  assert.equal(cfg.agent.explorer.permission.bash, 'deny', 'explorer must not be able to run shell commands');
  assert.equal(cfg.agent.planner.permission.bash, 'deny', 'planner must not be able to run shell commands');

  // coder above is the user-defined one, so check injection into a clean config.
  const fresh = {};
  await hooks.config(fresh);
  assert.equal(fresh.agent.coder.permission, undefined, 'unrestricted agent must not gain a permission block');

  // The hook also auto-registers the bundled skills dir so one plugin line
  // installs both agents and skills.
  const skillsDir = path.join(pkgDir, 'skills');
  assert.ok(cfg.skills?.paths?.includes(skillsDir), 'bundled skills path not registered');
  assert.ok(fs.existsSync(path.join(skillsDir, 'workflow', 'SKILL.md')), 'bundled skills dir missing the workflow skill');

  // Docket #72: the routing payload no longer rides config.instructions — that
  // channel is global (every subagent read it) and lands mid system prompt.
  // The chat.message reminder below is the replacement.
  assert.equal(cfg.instructions, undefined, 'routing.md must not be pushed onto config.instructions any more');

  // Registration is idempotent across re-fires and never disturbs a user path.
  const userCfg = { skills: { paths: ['/tmp/my-skills'] } };
  await hooks.config(userCfg);
  await hooks.config(userCfg);
  assert.deepEqual(
    userCfg.skills.paths,
    ['/tmp/my-skills', skillsDir],
    'skills path registration must be idempotent and preserve user-provided paths',
  );
});

// A stand-in for the SDK client OpenCode hands every plugin: `session.get`
// answers the parent lookup, `session.messages` the stored-history check.
function fakeClient({ parentID, messages = [] } = {}) {
  return {
    session: {
      get: async () => ({ data: { parentID } }),
      messages: async () => ({ data: messages }),
    },
  };
}

// A part id the way OpenCode mints one for the user's own text: `prt_` + six
// big-endian bytes of (ms << 12 | counter) + fourteen base62 characters. The
// counter is low, as OpenCode's would be for the first part of a message.
function opencodePartId(counter = 1) {
  const stamp = BigInt(Date.now()) * 0x1000n + BigInt(counter);
  const bytes = Buffer.alloc(6);
  for (let i = 0; i < 6; i++) bytes[i] = Number((stamp >> BigInt(40 - 8 * i)) & 0xffn);

  return `prt_${bytes.toString('hex')}AAAAAAAAAAAAAA`;
}

function userTurn(id = 'msg_1') {
  return { message: { id }, parts: [{ id: opencodePartId(), type: 'text', text: 'add a button' }] };
}

test('routing reminder rides the first main-session user message as a synthetic part', async () => {
  const pkgDir = path.dirname(AGENTS_DST_DIR);
  const mod = await import(pathToFileURL(path.join(pkgDir, 'index.js')).href);
  const hooks = await mod.ConduxPlugin({ worktree: pkgDir, client: fakeClient() });
  assert.equal(typeof hooks['chat.message'], 'function');

  const turn = userTurn();
  await hooks['chat.message']({ sessionID: 'ses_main' }, turn);
  assert.equal(turn.parts.length, 2, 'first main-session message must gain exactly one part');
  const [, reminder] = turn.parts;
  assert.equal(reminder.type, 'text');
  assert.equal(reminder.synthetic, true, 'the reminder must be synthetic — OpenCode hides synthetic parts from the transcript UI');
  assert.equal(reminder.messageID, 'msg_1');
  assert.equal(reminder.sessionID, 'ses_main');
  // OpenCode's own part id shape: prefix, six timestamp bytes as hex, fourteen base62 chars.
  assert.match(reminder.id, /^prt_[0-9a-f]{12}[0-9A-Za-z]{14}$/);
  // Same millisecond or later, the reminder must still sort after the user's
  // text — that is what pinning the counter to its maximum buys.
  assert.ok(reminder.id > turn.parts[0].id, `the reminder must sort after the user text (${reminder.id} vs ${turn.parts[0].id})`);
  assert.ok(reminder.text.startsWith('<system-reminder>\n<EXTREMELY_IMPORTANT>'), 'reminder must carry the routing payload in system-reminder framing');
  assert.ok(reminder.text.trimEnd().endsWith('</system-reminder>'));
  assert.ok(reminder.text.includes('skill(name="workflow")'), 'reminder must name the OpenCode verb');
  assert.ok(!reminder.text.includes('/condux:'), 'reminder must not name a Claude Code slash command');

  // Once per session: the second message of the same session gets nothing.
  const second = userTurn('msg_2');
  await hooks['chat.message']({ sessionID: 'ses_main' }, second);
  assert.equal(second.parts.length, 1, 'a routed session must not be injected again');

  // Compaction narrows the model's view; the summariser is asked to keep the
  // rule and the next user message gets the full reminder again.
  const compacting = { context: [] };
  await hooks['experimental.session.compacting']({ sessionID: 'ses_main' }, compacting);
  assert.equal(compacting.context.length, 1, 'a routed session must add one context line at compaction');
  assert.ok(compacting.context[0].includes('skill(name="workflow")'));
  const unrouted = { context: [] };
  await hooks['experimental.session.compacting']({ sessionID: 'ses_unknown' }, unrouted);
  assert.deepEqual(unrouted.context, [], 'an unrouted session must not add compaction context');

  await hooks.event({ event: { type: 'session.compacted', properties: { sessionID: 'ses_main' } } });
  const third = userTurn('msg_3');
  await hooks['chat.message']({ sessionID: 'ses_main' }, third);
  assert.equal(third.parts.length, 2, 'the first message after compaction must be injected again');
  assert.equal(third.parts[1].text, reminder.text);
});

test('routing reminder never reaches subagent sessions', async () => {
  const pkgDir = path.dirname(AGENTS_DST_DIR);
  const mod = await import(pathToFileURL(path.join(pkgDir, 'index.js')).href);

  // Bundled agents are recognised by name — no server round-trip needed.
  const byName = await mod.ConduxPlugin({ worktree: pkgDir, client: fakeClient() });
  for (const agent of ['coder', 'explorer', 'planner', 'researcher']) {
    const turn = userTurn();
    await byName['chat.message']({ sessionID: `ses_${agent}`, agent }, turn);
    assert.equal(turn.parts.length, 1, `${agent} session must not be injected`);
  }

  // Every other child (OpenCode's own `general`, user-defined subagents) is
  // caught by the parent lookup — `task` creates them with parentID set.
  const byParent = await mod.ConduxPlugin({ worktree: pkgDir, client: fakeClient({ parentID: 'ses_parent' }) });
  const child = userTurn();
  await byParent['chat.message']({ sessionID: 'ses_child', agent: 'general' }, child);
  assert.equal(child.parts.length, 1, 'a child session must not be injected');

  // A primary agent on a top-level session is main, whatever it is called.
  const plan = userTurn();
  await byName['chat.message']({ sessionID: 'ses_plan', agent: 'plan' }, plan);
  assert.equal(plan.parts.length, 2, 'a top-level plan session is a main session');
});

test('routing reminder trusts stored history over process memory', async () => {
  const pkgDir = path.dirname(AGENTS_DST_DIR);
  const mod = await import(pathToFileURL(path.join(pkgDir, 'index.js')).href);

  const probe = await mod.ConduxPlugin({ worktree: pkgDir, client: fakeClient() });
  const first = userTurn();
  await probe['chat.message']({ sessionID: 'ses_probe' }, first);
  const reminderText = first.parts[1].text;
  const routedTurn = { info: { role: 'user' }, parts: [{ type: 'text', synthetic: true, text: reminderText }] };
  const compaction = { info: { role: 'user' }, parts: [{ type: 'compaction' }] };
  const summary = { info: { role: 'assistant', summary: true }, parts: [] };

  // Resumed in a fresh process with the reminder already in view: no duplicate.
  const resumed = await mod.ConduxPlugin({ worktree: pkgDir, client: fakeClient({ messages: [routedTurn] }) });
  const turn = userTurn();
  await resumed['chat.message']({ sessionID: 'ses_resumed' }, turn);
  assert.equal(turn.parts.length, 1, 'a session whose history carries the reminder must not be injected again');

  // The reminder sits on the far side of a compaction: it left the model's
  // view with everything else before the summary, so it is injected again.
  const compacted = await mod.ConduxPlugin({
    worktree: pkgDir,
    client: fakeClient({ messages: [routedTurn, compaction, summary] }),
  });
  const after = userTurn();
  await compacted['chat.message']({ sessionID: 'ses_compacted' }, after);
  assert.equal(after.parts.length, 2, 'a reminder before the last compaction counts as absent');

  // A plain user text that merely quotes the payload is not the reminder.
  const quoted = { info: { role: 'user' }, parts: [{ type: 'text', text: reminderText }] };
  const quoting = await mod.ConduxPlugin({ worktree: pkgDir, client: fakeClient({ messages: [quoted] }) });
  const q = userTurn();
  await quoting['chat.message']({ sessionID: 'ses_quoted' }, q);
  assert.equal(q.parts.length, 2, 'only a synthetic part counts as the reminder');

  // No client at all (or a failing one) fails open toward injecting on main.
  const noClient = await mod.ConduxPlugin({ worktree: pkgDir });
  const bare = userTurn();
  await noClient['chat.message']({ sessionID: 'ses_bare' }, bare);
  assert.equal(bare.parts.length, 2, 'without a client the main session is still routed');
  const failing = await mod.ConduxPlugin({
    worktree: pkgDir,
    client: { session: { get: async () => { throw new Error('offline'); }, messages: async () => { throw new Error('offline'); } } },
  });
  const f = userTurn();
  await failing['chat.message']({ sessionID: 'ses_failing' }, f);
  assert.equal(f.parts.length, 2, 'a failing client must not suppress routing');
});
