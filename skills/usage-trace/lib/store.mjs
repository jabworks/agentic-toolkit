import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

export const storeHome = () => process.env.USAGE_TRACE_HOME || path.join(os.homedir(), '.usage-trace');

const eventsDir = home => path.join(home, 'events');
const monthOf = ts => String(ts).slice(0, 7);
const plainFile = (home, month) => path.join(eventsDir(home), `${month}.jsonl`);
const gzFile = (home, month) => `${plainFile(home, month)}.gz`;

// api_call rows legitimately repeat with a growing output count while a response
// streams, so the dedupe key includes it and readers keep the largest.
const dedupeKey = event => (event.type === 'api_call' ? `${event.id}:${event.output}` : event.id);

const readMonth = (home, month) => {
  const gz = gzFile(home, month);
  const plain = plainFile(home, month);
  let text = '';

  if (fs.existsSync(gz)) {
    text += zlib.gunzipSync(fs.readFileSync(gz)).toString('utf8');
  }

  if (fs.existsSync(plain)) {
    text += fs.readFileSync(plain, 'utf8');
  }

  return text;
};

const parseLines = text => {
  const events = [];

  for (const line of text.split('\n')) {
    if (!line) {
      continue;
    }

    try {
      events.push(JSON.parse(line));
    } catch {
      // A torn final line from a killed writer: skip it, the rest stays good.
    }
  }

  return events;
};

export const createWriter = home => {
  const seen = new Map();

  fs.mkdirSync(eventsDir(home), { recursive: true });

  const seenFor = month => {
    if (!seen.has(month)) {
      seen.set(month, new Set(parseLines(readMonth(home, month)).map(dedupeKey)));
    }

    return seen.get(month);
  };

  const write = events => {
    const byMonth = new Map();
    let written = 0;

    for (const event of events) {
      const month = monthOf(event.ts);
      const known = seenFor(month);
      const key = dedupeKey(event);

      if (known.has(key)) {
        continue;
      }

      known.add(key);
      written += 1;

      if (!byMonth.has(month)) {
        byMonth.set(month, []);
      }

      byMonth.get(month).push(JSON.stringify(event));
    }

    for (const [month, lines] of byMonth) {
      fs.appendFileSync(plainFile(home, month), `${lines.join('\n')}\n`);
    }

    return written;
  };

  return { write };
};

export const appendEvent = (home, event) => {
  fs.mkdirSync(eventsDir(home), { recursive: true });
  fs.appendFileSync(plainFile(home, monthOf(event.ts)), `${JSON.stringify(event)}\n`);
};

export const compressClosedMonths = (home, now = new Date()) => {
  const current = now.toISOString().slice(0, 7);

  for (const name of fs.readdirSync(eventsDir(home))) {
    const match = /^(\d{4}-\d{2})\.jsonl$/.exec(name);

    if (!match || match[1] >= current) {
      continue;
    }

    // Keep the gz whole before removing the plain file, so a crash loses nothing.
    const temp = `${gzFile(home, match[1])}.tmp`;

    fs.writeFileSync(temp, zlib.gzipSync(readMonth(home, match[1])));
    fs.renameSync(temp, gzFile(home, match[1]));
    fs.rmSync(plainFile(home, match[1]));
  }
};

export const listMonths = home => {
  try {
    const months = fs.readdirSync(eventsDir(home)).map(name => /^(\d{4}-\d{2})\.jsonl/.exec(name)?.[1]);

    return [...new Set(months.filter(Boolean))].sort();
  } catch {
    return [];
  }
};

export const readEvents = function* ({ home, since, until }) {
  for (const month of listMonths(home)) {
    if ((since && month < monthOf(since)) || (until && month > monthOf(until))) {
      continue;
    }

    const calls = new Map();

    for (const event of parseLines(readMonth(home, month))) {
      if ((since && event.ts < since) || (until && event.ts > until)) {
        continue;
      }

      if (event.type !== 'api_call') {
        yield event;
        continue;
      }

      const previous = calls.get(event.id);

      if (!previous || event.output > previous.output) {
        calls.set(event.id, event);
      }
    }

    yield* calls.values();
  }
};

export const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};

export const writeJson = (file, value) => {
  const temp = `${file}.${process.pid}.tmp`;

  fs.writeFileSync(temp, JSON.stringify(value));
  fs.renameSync(temp, file);
};
