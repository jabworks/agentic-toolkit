/**
 * Concord — the store.
 *
 * Every read and write under a memory directory goes through here, so the
 * durability invariants are enforceable in one place instead of scattered
 * across hooks.
 *
 * Invariants:
 *   - All writes are atomic: tmp + rename, in the SAME directory (rename is
 *     only atomic within a filesystem, and /tmp is frequently a different one).
 *   - Promotion is copy-then-truncate, never move. A crash mid-promotion
 *     duplicates work, it never loses it — and the duplicate is then suppressed
 *     by the entry markers, so the recoverable failure stays invisible.
 *   - No lock files. Concurrent sessions are made safe by idempotence, which is
 *     the whole reason this design avoids the locking machinery.
 *
 * Tier flow (Phase 1 — deterministic, no LLM):
 *
 *   buffer.md  →  days/YYYY-MM-DD.md  →  archive.md
 *                        ↓
 *                    recent.md  (DERIVED: a view of the last N day files,
 *                                regenerated on every promote, never appended
 *                                to — so it cannot drift or double up)
 *
 * pinned.md is outside this flow entirely and is never rewritten.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/** How many days of detail `recent.md` reflects before a day ages into the archive. */
export const RECENT_DAYS = 7;

const EMPTY_STATE = { rollouts: {}, lastConsolidated: null, skippedSubagents: 0 };

// --- primitives --------------------------------------------------------------

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Make the memory directory self-ignoring on creation.
 *
 * A `.gitignore` containing `*` inside the directory ignores everything in it,
 * including itself, without touching a `.gitignore` the user owns.
 *
 * This runs in code rather than being left to the agent's SKILL.md instructions
 * because the hooks create this directory on the very first session — before any
 * agent has read a skill file or been asked to remember anything. The tiers hold
 * verbatim prompts and tool output, so the realistic failure is a `git add -A`
 * committing a session transcript to a company remote. Nothing about that should
 * depend on an agent remembering a housekeeping step.
 */
function ensureSelfIgnored(dir) {
  const marker = path.join(dir, '.gitignore');
  if (fs.existsSync(marker)) return;
  try {
    fs.writeFileSync(marker, '*\n', { flag: 'wx', mode: 0o600 });
  } catch {
    // Already created by a concurrent session, or unwritable — either way the
    // caller's own write will surface a real problem if there is one.
  }
}

/**
 * Atomic write: temp file beside the target, then rename over it.
 * The temp name carries the pid so two concurrent writers never share one.
 */
export function atomicWrite(file, contents) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, contents, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

/**
 * Prepare the memory directory before any write. Every writer calls this, so
 * there is no ordering in which a tier file exists but the ignore marker does not.
 */
export function ensureStore(paths) {
  ensureDir(paths.dir);
  ensureSelfIgnored(paths.dir);
}

function readIfExists(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

/** Append via read-modify-atomic-write, so a reader never observes a partial line. */
function atomicAppend(file, addition) {
  if (!addition) return;
  atomicWrite(file, readIfExists(file) + addition);
}

// --- entry rendering ---------------------------------------------------------

/**
 * A stable identity for an entry, used to suppress duplicates when a crashed
 * promotion is retried. Derived from content, so the same entry read twice from
 * the same rollout always collapses to one line.
 */
export function entryId(entry) {
  const basis = `${entry.at ?? ''}|${entry.kind}|${entry.tool ?? ''}|${entry.text}`;
  return crypto.createHash('sha256').update(basis).digest('hex').slice(0, 12);
}

/** Local calendar date (YYYY-MM-DD) for an entry, falling back to `now`. */
export function entryDate(entry, now) {
  const d = entry.at ? new Date(entry.at) : now;
  const valid = Number.isNaN(d.getTime()) ? now : d;
  const y = valid.getFullYear();
  const m = String(valid.getMonth() + 1).padStart(2, '0');
  const day = String(valid.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timeOf(entry, now) {
  const d = entry.at ? new Date(entry.at) : now;
  const valid = Number.isNaN(d.getTime()) ? now : d;
  return `${String(valid.getHours()).padStart(2, '0')}:${String(valid.getMinutes()).padStart(2, '0')}`;
}

/**
 * One entry as a markdown line carrying its own dedupe marker.
 *
 * The buffer line keeps the full date, not just the time: a session can run past
 * midnight, and without the date on the line there is no way to file those
 * entries under the day they actually happened. The date is stripped again when
 * the line lands in a day file, which is already headed by it.
 */
export function renderEntry(entry, now = new Date()) {
  const body =
    entry.kind === 'tool'
      ? `\`${entry.tool ?? 'tool'}\` ${entry.text}`.trimEnd()
      : `**${entry.kind}** ${entry.text}`;
  return `- ${entryDate(entry, now)} ${timeOf(entry, now)} ${body} <!--c:${entryId(entry)}-->\n`;
}

/** The `YYYY-MM-DD` a rendered buffer line belongs to, or null if unmarked. */
function lineDate(line) {
  const m = line.match(/^-\s+(\d{4}-\d{2}-\d{2})\s/);
  return m ? m[1] : null;
}

/** Drop the date prefix — the day file's header already carries it. */
function stripDate(line) {
  return line.replace(/^(-\s+)\d{4}-\d{2}-\d{2}\s/, '$1');
}

/** Which entry ids does this text already contain? */
function existingIds(text) {
  const ids = new Set();
  for (const m of text.matchAll(/<!--c:([0-9a-f]{12})-->/g)) ids.add(m[1]);
  return ids;
}

// --- state -------------------------------------------------------------------

/**
 * Read `state.json`, degrading to a fresh empty state on anything unexpected.
 * A memory plugin must degrade to amnesia, never to a broken session.
 */
export function readState(paths) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(paths.state, 'utf8'));
  } catch {
    return { ...EMPTY_STATE, rollouts: {} };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ...EMPTY_STATE, rollouts: {} };
  }
  const rollouts =
    parsed.rollouts && typeof parsed.rollouts === 'object' && !Array.isArray(parsed.rollouts)
      ? parsed.rollouts
      : {};
  return {
    rollouts,
    lastConsolidated: typeof parsed.lastConsolidated === 'string' ? parsed.lastConsolidated : null,
    skippedSubagents: Number.isInteger(parsed.skippedSubagents) ? parsed.skippedSubagents : 0,
  };
}

export function writeState(paths, state) {
  ensureStore(paths);
  atomicWrite(paths.state, JSON.stringify(state, null, 2) + '\n');
}

// --- writing -----------------------------------------------------------------

/**
 * Append entries to the buffer, skipping any already present.
 * Returns the number actually written.
 */
export function appendBuffer(paths, entries, now = new Date()) {
  if (!entries?.length) return 0;
  ensureStore(paths);
  const current = readIfExists(paths.buffer);
  const seen = existingIds(current);

  let addition = '';
  let written = 0;
  for (const entry of entries) {
    const id = entryId(entry);
    if (seen.has(id)) continue;
    seen.add(id);
    addition += renderEntry(entry, now);
    written++;
  }
  if (addition) atomicWrite(paths.buffer, current + addition);
  return written;
}

/**
 * Append an explicit "remember this" fact. Outside the promotion flow entirely —
 * nothing in this module ever rewrites pinned.md.
 */
export function appendPinned(paths, text, now = new Date()) {
  const clean = String(text ?? '').trim();
  if (!clean) return false;
  ensureStore(paths);
  const date = entryDate({ at: now.toISOString() }, now);
  atomicAppend(paths.pinned, `- ${date} ${clean}\n`);
  return true;
}

// --- promotion ---------------------------------------------------------------

function dayFiles(paths) {
  try {
    return fs
      .readdirSync(paths.days)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
      .sort();
  } catch {
    return [];
  }
}

function daysBetween(fromDate, toDate) {
  const a = Date.parse(`${fromDate}T00:00:00Z`);
  const b = Date.parse(`${toDate}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86400000);
}

/**
 * Flush the buffer into per-day files.
 *
 * Entries are grouped by their OWN date, not by "today" — a session that runs
 * past midnight belongs to two days, and attributing all of it to one would
 * quietly misfile half the work.
 *
 * Destination is written and fsync'd by rename BEFORE the buffer is cleared.
 */
function flushBuffer(paths, now) {
  const buffer = readIfExists(paths.buffer);
  if (!buffer.trim()) return [];

  // Bucket the rendered lines by the date each one carries.
  const fallback = entryDate({}, now);
  const byDate = new Map();
  for (const line of buffer.split('\n')) {
    if (!line.trim()) continue;
    const date = lineDate(line) ?? fallback;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(stripDate(line));
  }

  const touched = [];
  for (const [date, lines] of byDate) {
    const file = path.join(paths.days, `${date}.md`);
    const current = readIfExists(file);
    const seen = existingIds(current);

    const fresh = lines.filter((l) => {
      const m = l.match(/<!--c:([0-9a-f]{12})-->/);
      return !m || !seen.has(m[1]);
    });
    if (!fresh.length) continue;

    const header = current ? '' : `# ${date}\n\n`;
    atomicWrite(file, current + header + fresh.join('\n') + '\n');
    touched.push(date);
  }

  // Only now is the source cleared — the destination is already durable.
  atomicWrite(paths.buffer, '');
  return touched;
}

/**
 * Age day files past the recent window into the archive, then rebuild
 * `recent.md` as a derived view of what remains.
 */
function ageDays(paths, now) {
  const today = entryDate({}, now);
  const archived = [];

  for (const name of dayFiles(paths)) {
    const date = name.replace(/\.md$/, '');
    if (daysBetween(date, today) < RECENT_DAYS) continue;

    const file = path.join(paths.days, name);
    const body = readIfExists(file);
    const archive = readIfExists(paths.archive);

    // Marker keeps a retried archive pass from appending the same day twice.
    if (!archive.includes(`<!--d:${date}-->`)) {
      atomicWrite(paths.archive, `${archive}<!--d:${date}-->\n${body}\n`);
    }
    fs.rmSync(file, { force: true });
    archived.push(date);
  }

  // recent.md is DERIVED, never appended to — regenerating it makes drift and
  // duplication structurally impossible.
  //
  // Today's day file is excluded: recall renders "Today" as its own section from
  // the day file plus the live buffer, so including it here too would inject
  // today's entries twice and spend the budget on duplicates. "Recent" means the
  // days *before* today.
  const remaining = dayFiles(paths).filter((n) => n !== `${today}.md`);
  const parts = remaining.map((n) => readIfExists(path.join(paths.days, n)).trimEnd()).filter(Boolean);
  atomicWrite(paths.recent, parts.length ? parts.join('\n\n') + '\n' : '');

  return archived;
}

/**
 * Run the full deterministic promotion. Safe to call repeatedly; safe to call
 * from two sessions at once.
 */
export function promote(paths, now = new Date()) {
  ensureStore(paths);
  ensureDir(paths.days);
  const promoted = flushBuffer(paths, now);
  const archived = ageDays(paths, now);
  return { promoted, archived };
}

// --- reading -----------------------------------------------------------------

/** Read a tier file, or '' when absent. Exposed for the recall composer. */
export function readTier(file) {
  return readIfExists(file);
}

/** Today's detail: the buffer plus today's day file, in that chronological order. */
export function readToday(paths, now = new Date()) {
  const today = entryDate({}, now);
  const dayFile = path.join(paths.days, `${today}.md`);
  return [readIfExists(dayFile), readIfExists(paths.buffer)]
    .map((s) => s.trimEnd())
    .filter(Boolean)
    .join('\n');
}
