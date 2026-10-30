import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { parseClaudeRecord } from './parse-claude.mjs';
import { parseCodexRecord } from './parse-codex.mjs';
import { loadPrivacy } from './privacy.mjs';
import { makeEvent } from './schema.mjs';
import { compressClosedMonths, createWriter, readJson, writeJson } from './store.mjs';

const CHUNK_BYTES = 1 << 22;

const walk = (dir, found = []) => {
  let entries = [];

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full, found);
    } else if (entry.name.endsWith('.jsonl')) {
      found.push(full);
    }
  }

  return found;
};

export const defaultSources = () => {
  const home = os.homedir();
  const claude = process.env.CLAUDE_CONFIG_DIR || path.join(home, '.claude');
  const codex = process.env.CODEX_HOME || path.join(home, '.codex');

  return [
    { host: 'claude', root: path.join(claude, 'projects'), parse: parseClaudeRecord },
    { host: 'codex', root: path.join(codex, 'sessions'), parse: parseCodexRecord },
  ];
};

const acquireLock = home => {
  const file = path.join(home, 'lock');

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      fs.writeFileSync(file, String(process.pid), { flag: 'wx' });

      return () => fs.rmSync(file, { force: true });
    } catch {
      const pid = Number(fs.readFileSync(file, 'utf8'));

      try {
        process.kill(pid, 0);

        return null;
      } catch {
        fs.rmSync(file, { force: true });
      }
    }
  }

  return null;
};

const readNewRecords = function* (file, start, size) {
  const fd = fs.openSync(file, 'r');
  let position = start;
  let carry = Buffer.alloc(0);

  try {
    while (position < size) {
      const chunk = Buffer.alloc(Math.min(CHUNK_BYTES, size - position));
      const read = fs.readSync(fd, chunk, 0, chunk.length, position);

      if (read === 0) {
        break;
      }

      position += read;

      const data = Buffer.concat([carry, chunk.subarray(0, read)]);
      const lastNewline = data.lastIndexOf(10);

      if (lastNewline === -1) {
        carry = data;
        continue;
      }

      carry = data.subarray(lastNewline + 1);

      // The end offset goes with the lines, so a partial last line is reread next run.
      yield { text: data.subarray(0, lastNewline).toString('utf8'), end: position - carry.length };
    }
  } finally {
    fs.closeSync(fd);
  }
};

const ingestFile = ({ file, source, entry, size, writer, privacy, unknown, totals }) => {
  const ctx = entry.ctx;
  let events = [];

  for (const { text, end } of readNewRecords(file, entry.pos, size)) {
    for (const line of text.split('\n')) {
      if (!line) {
        continue;
      }

      let record;

      try {
        record = JSON.parse(line);
      } catch {
        totals.failures += 1;
        continue;
      }

      try {
        const parsed = source.parse(record, ctx, privacy);

        events.push(...parsed.events);

        if (!parsed.known) {
          const label = `${source.host}:${record.type}${record.subtype ? `:${record.subtype}` : ''}`;

          unknown[label] = (unknown[label] || 0) + 1;
        }
      } catch {
        totals.failures += 1;
      }
    }

    totals.events += writer.write(events);
    events = [];
    entry.pos = end;
  }
};

export const runIngest = ({ home, sources = defaultSources(), privacy, now = new Date() }) => {
  fs.mkdirSync(home, { recursive: true });

  const release = acquireLock(home);

  if (!release) {
    return { skipped: 'locked' };
  }

  try {
    const stateFile = path.join(home, 'state.json');
    const state = readJson(stateFile, { files: {} });
    const writer = createWriter(home);
    const activePrivacy = privacy || loadPrivacy(home);
    const unknown = {};
    const totals = { events: 0, failures: 0, files: 0 };

    for (const source of sources) {
      for (const file of walk(source.root)) {
        let size;

        try {
          size = fs.statSync(file).size;
        } catch {
          continue;
        }

        let entry = state.files[file];

        if (!entry || size < entry.pos) {
          entry = { pos: 0, ctx: {} };
          state.files[file] = entry;
        }

        if (size === entry.pos) {
          continue;
        }

        totals.files += 1;
        ingestFile({ file, source, entry, size, writer, privacy: activePrivacy, unknown, totals });

        // After every file, so an interrupted backfill resumes rather than restarts.
        writeJson(stateFile, state);
      }
    }

    const ts = now.toISOString();

    if (totals.files > 0) {
      writer.write([
        makeEvent('coverage', {
          id: crypto.randomUUID(),
          ts,
          host: 'usage-trace',
          files: totals.files,
          events: totals.events,
          unknown,
          failures: totals.failures,
        }),
      ]);
    }

    compressClosedMonths(home, now);

    const result = { ...totals, unknown, ts };

    writeJson(path.join(home, 'last-run.json'), result);

    return result;
  } finally {
    release();
  }
};

export const measureLag = ({ home, sources = defaultSources() }) => {
  const state = readJson(path.join(home, 'state.json'), { files: {} });
  let files = 0;
  let bytes = 0;

  for (const source of sources) {
    for (const file of walk(source.root)) {
      let size = 0;

      // A transcript can be pruned between the walk and this stat.
      try {
        size = fs.statSync(file).size;
      } catch {
        continue;
      }

      const pos = state.files[file]?.pos || 0;

      if (size > pos) {
        files += 1;
        bytes += size - pos;
      }
    }
  }

  return { files, bytes };
};
