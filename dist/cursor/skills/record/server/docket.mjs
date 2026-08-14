#!/usr/bin/env node
// CLI over docket-core — the surface skills call via Bash on every host.
// Machine-friendly stdout (ids and paths, one fact per line), reasons on
// stderr, exit 0/1. The MCP server wraps the same core, never this file.

import process from 'node:process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {
  resolveDocket,
  nextId,
  addItem,
  closeItem,
  checkDocket,
  scaffold,
  migrate,
} from './docket-core.mjs';
import { renderHtml } from './docket-render.mjs';

const USAGE = `usage: docket <command> [options]

  next-id                              print the next free id
  add "<title>" [--section <name>]     add an open item (default section: someday)
                [--body -]             body read from stdin
  close <id> [--note "<verification>"] stamp ✅ + move to the archive
  check                                id-space and format integrity
  scaffold [--project <name>]          create docket/ in a repo that has none
  migrate                              convert a legacy root BACKLOG.md layout
  browse [--open <id>] [--out <path>]  render the board to self-contained HTML
         [--serve]                     serve it locally with live reload
`;

function parseFlags(argv) {
  const flags = {};
  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];

      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(argv[i]);
    }
  }

  return { flags, positional };
}

// The only place the clock is read — core takes injected dates.
function today() {
  return new Date().toISOString().slice(0, 10);
}

function main(argv) {
  const [command, ...rest] = argv;
  const { flags, positional } = parseFlags(rest);
  const cwd = process.cwd();

  switch (command) {
    case 'next-id': {
      process.stdout.write(nextId(resolveDocket(cwd)) + '\n');
      return 0;
    }

    case 'add': {
      const title = positional[0];
      if (!title) throw new Error('add needs a title: docket add "<title>"');

      const body = flags.body === '-' ? fs.readFileSync(0, 'utf8') : '';
      const section = typeof flags.section === 'string' ? flags.section : 'someday';
      const { id } = addItem(resolveDocket(cwd), { title, section, body, date: today() });
      process.stdout.write(id + '\n');
      return 0;
    }

    case 'close': {
      // Passed through as written: `close 47` resolves by number, and
      // `close "47 (remainder)"` names one qualified item exactly. parseInt
      // here would silently truncate the second form to the first.
      const id = (positional[0] ?? '').trim();
      if (id === '' || Number.isNaN(Number.parseInt(id, 10))) {
        throw new Error('close needs an id: docket close <id> | docket close "<id> (qualifier)"');
      }

      const note = typeof flags.note === 'string' ? flags.note : '';
      const result = closeItem(resolveDocket(cwd), id, { note, date: today() });
      process.stdout.write('closed #' + result.id + ' → ' + result.archiveFile + '\n');
      process.stdout.write('suggested commit: ' + result.commitSubject + '\n');
      return 0;
    }

    case 'check': {
      const { ok, findings } = checkDocket(resolveDocket(cwd));

      if (ok) {
        process.stdout.write('ok — no findings\n');
        return 0;
      }
      for (const finding of findings) {
        process.stdout.write(finding.kind + (finding.id ? ' #' + finding.id : '') + ': ' + finding.message + '\n');
      }
      return 1;
    }

    case 'scaffold': {
      const project = typeof flags.project === 'string' ? flags.project : '';
      const { dir } = scaffold(cwd, { project, date: today() });
      process.stdout.write('scaffolded ' + dir + '\n');
      return 0;
    }

    case 'migrate': {
      const d = resolveDocket(cwd);
      const { moved } = migrate(d);
      process.stdout.write('migrated ' + moved + ' blocks into ' + d.root + '/docket (originals left in place)\n');
      return 0;
    }

    case 'browse': {
      const d = resolveDocket(cwd);
      const openId = flags.open !== undefined ? parseInt(flags.open, 10) : null;
      if (openId !== null && Number.isNaN(openId)) throw new Error('--open needs a numeric id: docket browse --open 47');

      if (flags.serve === true) {
        serve(d, openId);
        return null;
      }

      const html = renderHtml(d, { openId, date: today() });
      const out = typeof flags.out === 'string'
        ? path.resolve(flags.out)
        : path.join(os.tmpdir(), 'docket-' + path.basename(d.root) + '.html');
      fs.writeFileSync(out, html);
      process.stdout.write(out + '\n');
      return 0;
    }

    default: {
      process.stderr.write(USAGE);
      return command === undefined || command === 'help' || command === '--help' ? 0 : 1;
    }
  }
}

// Live board: render fresh per request, nudge open tabs over SSE on change.
// Rendering per request instead of caching keeps the server stateless — the
// files on disk are the only source of truth.
function serve(d, openId) {
  const clients = new Set();
  let debounce = null;

  const server = http.createServer((req, res) => {
    if (req.url === '/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      res.write('\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderHtml(d, { openId, date: today(), live: true }));
  });

  const watchTargets = (d.layout === 'docket' ? [d.paths.dir, d.paths.archiveDir] : [d.root]).filter((p) =>
    fs.existsSync(p),
  );

  for (const target of watchTargets) {
    fs.watch(target, () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        for (const client of clients) client.write('event: reload\ndata: 1\n\n');
      }, 200);
    });
  }

  // localhost only; on a taken port, walk forward instead of failing — two
  // grooming sessions on one machine is a normal state, not an error.
  const start = (port) => {
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE' && port < 7887) {
        start(port + 1);
      } else {
        process.stderr.write(String(err?.message ?? err) + '\n');
        process.exit(1);
      }
    });
    server.listen(port, '127.0.0.1', () => {
      process.stdout.write('http://127.0.0.1:' + port + '/\n');
    });
  };
  start(7787);
}

try {
  const code = main(process.argv.slice(2));
  if (code !== null) process.exit(code);
} catch (err) {
  process.stderr.write(String(err?.message ?? err) + '\n');
  process.exit(1);
}
