import {
  type EngineInterface,
  type PromptFillMode,
  type Register,
  type RenderChildren,
  type Timer,
  atom,
  read,
  update,
} from 'claude-code';

import { type DocketBoard, type DocketItem, type DocketSection } from '../types';
import { ageInDays, ancestors, baseName, joinPath, parseDocket } from './docket';

const PANE = 'docket';
const POLL_MS = 3000;

const board = atom({ plugin: 'docket', key: 'board' } as const, null);
const expanded = atom({ plugin: 'docket', key: 'expanded' } as const, []);

type Located = { root: string; file: string; layout: 'docket' | 'legacy' };

const locate = async ($: EngineInterface, cwd: string): Promise<Located | null> => {
  for (const dir of ancestors(cwd)) {
    const docketFile = joinPath(dir, 'docket', 'DOCKET.md');

    if (await $.fs.exists(docketFile)) {
      return { root: dir, file: docketFile, layout: 'docket' };
    }

    const legacyFile = joinPath(dir, 'BACKLOG.md');

    if (await $.fs.exists(legacyFile)) {
      return { root: dir, file: legacyFile, layout: 'legacy' };
    }

    // `.git` is the stop, as in the CLI's resolveDocket: a docket in a parent checkout is never adopted by a nested repo.
    if (await $.fs.exists(joinPath(dir, '.git'))) {
      return null;
    }
  }

  return null;
};

// Missing and unreadable boards are rewritten on every poll; skipping identical writes keeps the pane from redrawing.
const setBoard = async ($: EngineInterface, value: DocketBoard): Promise<void> => {
  const current = await read($, board);

  if (JSON.stringify(current) === JSON.stringify(value)) {
    return;
  }

  await update($, board, () => value);
};

const fillPrompt = async ($: EngineInterface, text: string, mode: PromptFillMode, done: string): Promise<void> => {
  const filled = await $.prompt.fill({ text, mode });

  if (filled.isFilled) {
    // A press leaves the keys with the pane, so the person needs telling how to get back to what was just filled.
    $.ui.toast(`${done} Esc returns to the prompt.`);

    return;
  }

  if (filled.refusal === 'no_composer') {
    $.ui.toast('This session has no prompt box to fill.');

    return;
  }

  $.ui.toast('The prompt is not taking text right now. Close the open dialog and press again.');
};

const cite = ($: EngineInterface, item: DocketItem): Promise<void> =>
  fillPrompt($, `#${item.id} `, 'insert', `Cited #${item.id}.`);

const startWork = async ($: EngineInterface, item: DocketItem): Promise<void> => {
  const line = `/condux:workflow #${item.id} — ${item.title}`;
  const { text } = await $.prompt.read();
  const draft = text.trim();

  // A slash command only runs from the start of the prompt, so the draft goes after it rather than before.
  await fillPrompt($, draft === '' ? line : `${line}\n${draft}`, 'replace', `Ready to start #${item.id}.`);
};

const toggle = ($: EngineInterface, idPart: string): Promise<unknown> =>
  update($, expanded, list => (list.includes(idPart) ? list.filter(id => id !== idPart) : [...list, idPart]));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// `2026-09-22` reads as a stamp, not a fact; "added Sep 22 · 21 days ago" says what it means.
const describeAdded = (date: string, age: number | null): string => {
  const [year, month, day] = date.split('-').map(Number);
  const label = `${MONTHS[(month ?? 1) - 1] ?? ''} ${day ?? ''}${year === new Date().getFullYear() ? '' : `, ${year}`}`;

  if (age === null) {
    return `added ${label}`;
  }

  if (age === 0) {
    return `added ${label} · today`;
  }

  return `added ${label} · ${age} ${age === 1 ? 'day' : 'days'} ago`;
};

// Ids of items closed since they were expanded would otherwise sit in state for the rest of the session.
const pruneExpanded = async ($: EngineInterface, sections: DocketSection[]): Promise<void> => {
  const ids = new Set(sections.flatMap(section => section.items.map(item => item.idPart)));
  const current = await read($, expanded);

  if (current.every(id => ids.has(id))) {
    return;
  }

  await update($, expanded, list => list.filter(id => ids.has(id)));
};

// The engine follows `$` only into functions declared at the top of the file, so the poll lives here. A hot reload
// loads the module afresh, which resets these as it would a closure inside `register`.
let poll: Timer | undefined;
let inFlight: Promise<void> | undefined;
let lastCwd: string | undefined;
let located: Located | null | undefined;
let lastMtime: number | undefined;
let failures = 0;

const load = async ($: EngineInterface, isForced: boolean): Promise<void> => {
  try {
    const cwd = await $.session.cwd();

    // Re-walk on a cwd change (a worktree switch) and while nothing is found, so a fresh `docket scaffold` shows up.
    if (isForced || cwd !== lastCwd || !located) {
      const found = await locate($, cwd);

      if (found?.file !== located?.file) {
        lastMtime = undefined;
      }

      lastCwd = cwd;
      located = found;
    }

    if (!located) {
      failures = 0;
      await setBoard($, { kind: 'missing', searchedFrom: cwd });

      return;
    }

    const { file, layout, root } = located;
    const { mtimeMs } = await $.fs.stat(file);

    if (!isForced && mtimeMs === lastMtime) {
      failures = 0;

      return;
    }

    const text = await $.fs.read(file);
    const sections = parseDocket(text);
    const loaded: DocketBoard = { kind: 'found', root, file, layout, mtimeMs, sections };

    failures = 0;
    lastMtime = mtimeMs;
    await update($, board, () => loaded);
    await pruneExpanded($, sections);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const file = located?.file ?? '';

    failures += 1;
    lastMtime = undefined;
    // Walk again next time, so a docket that is gone for good reads as missing rather than as an error.
    located = undefined;

    // An editor that saves by replacing the file leaves it missing for a moment: one failed poll keeps the board.
    if (!isForced && failures < 2) {
      return;
    }

    await setBoard($, { kind: 'unreadable', file, reason }).catch(() => undefined);
  }
};

// One load at a time, so a slow filesystem cannot stack polls; a forced load waits its turn instead of being lost.
const refresh = async ($: EngineInterface, isForced: boolean): Promise<void> => {
  if (inFlight) {
    if (!isForced) {
      return;
    }

    await inFlight;

    return refresh($, true);
  }

  inFlight = load($, isForced).finally(() => {
    inFlight = undefined;
  });

  return inFlight;
};

const stopPolling = (): void => {
  poll?.cancel();
  poll = undefined;
};

// ui.close hooks do not run when the engine unloads a pane whose drawing threw, so each tick checks the pane is up.
const tick = async ($: EngineInterface): Promise<void> => {
  const panes = await $.ui.panes().catch(() => undefined);

  if (panes !== undefined && !panes.some(pane => pane.id === PANE)) {
    stopPolling();

    return;
  }

  await refresh($, false);
};

const startPolling = ($: EngineInterface): void => {
  if (poll) {
    return;
  }

  poll = $.clock.every(POLL_MS, () => {
    void tick($);
  });
};

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // A literal name lets `claude plugin validate` see that the command.run hook answers only its own command.
    await $.command.register({ name: 'docket', description: "Show this repo's open docket items in a pane" });

    // Never opened here: repos without a docket see nothing. A pane that survived a hot reload resumes its polling.
    const panes = await $.ui.panes();

    if (panes.some(pane => pane.id === PANE)) {
      void refresh($, true);
      startPolling($);
    }

    return next(e);
  });

  on('command.run', { command: 'docket' }, async $ => {
    const opened = await $.ui.open({ id: PANE, title: 'Docket', focus: true });

    await refresh($, true);
    startPolling($);

    if (!opened.isPlaced) {
      $.ui.toast(`The docket pane is waiting for room: ${opened.reason}`);
    }

    // No text: the pane is the output, and a transcript line would cost the model tokens for nothing.
    return {};
  });

  on('ui.close', ($, e, next) => {
    if (e.id === PANE) {
      stopPolling();
    }

    return next(e);
  });

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Markdown, Text } = $.ui.resolve(e);
    const current = await read($, board);
    const openIds = await read($, expanded);
    const now = await $.clock.now();

    // Window frame (2) + its padding (2); each section box spends the same again inside it.
    const windowWidth = Math.max(20, e.props.bodyColumns - 4);
    const rowWidth = Math.max(16, windowWidth - 4);
    const rule = <Text color='subtle'>{'─'.repeat(windowWidth)}</Text>;

    const frame = (title: string, count: string, body: RenderChildren, footer: string) => (
      <Box
        flexDirection='column'
        borderStyle='round'
        borderColor='claude'
        paddingX={1}
      >
        <Box justifyContent='space-between'>
          <Box gap={1}>
            <Text
              bold
              color='claude'
            >
              {title}
            </Text>
            <Text color='subtle'>{count}</Text>
          </Box>
          <Button
            key='refresh'
            hotkey='r'
            label='Refresh'
            dimColor
            onPress={() => refresh($, true)}
          />
        </Box>
        {rule}
        {body}
        {rule}
        <Text color='subtle'>{footer}</Text>
      </Box>
    );

    if (current === null) {
      return frame('docket', '', <Text color='subtle'>Loading the docket…</Text>, 'r refresh');
    }

    if (current.kind === 'missing') {
      return frame(
        'docket',
        'none found',
        <Box flexDirection='column'>
          <Text>No docket found in {current.searchedFrom} or above it.</Text>
          <Text color='suggestion'>`docket scaffold` creates one.</Text>
        </Box>,
        'r refresh',
      );
    }

    if (current.kind === 'unreadable') {
      return frame(
        'docket',
        'unreadable',
        <Text color='error'>
          Could not read {current.file}: {current.reason}
        </Text>,
        'r retry',
      );
    }

    const total = current.sections.reduce((sum, section) => sum + section.items.length, 0);
    const idWidth = Math.max(
      3,
      ...current.sections.flatMap(section => section.items.map(item => item.idPart.length + 1)),
    );
    const edited = new Date(current.mtimeMs);
    const editedAt = `${String(edited.getHours()).padStart(2, '0')}:${String(edited.getMinutes()).padStart(2, '0')}`;

    // Dashed and indented under #N, so it reads as part of the item rather than a section break.
    const detailRule = <Text color='subtle'>{'┄'.repeat(Math.max(8, rowWidth - 2))}</Text>;

    const renderItem = (item: DocketItem) => {
      const isOpen = openIds.includes(item.idPart);
      const age = item.date === null ? null : ageInDays(item.date, now);
      const ageText = age === null ? '' : `${age}d`;
      // Marker + gaps + id column + age column; the title takes what is left and is cut, never wrapped.
      const titleRoom = Math.max(8, rowWidth - 2 - idWidth - 1 - 5);
      const title = item.title.length > titleRoom ? `${item.title.slice(0, titleRoom - 1)}…` : item.title;
      let ageColor = 'text';

      if (age !== null && age <= 7) {
        ageColor = 'success';
      } else if (age !== null && age > 30) {
        ageColor = 'warning';
      }

      return (
        <Box flexDirection='column'>
          <Button
            key={`item:${item.idPart}`}
            plain
            onPress={() => toggle($, item.idPart)}
          >
            <Text color='claude'>{isOpen ? '▾ ' : '▸ '}</Text>
            <Text color='suggestion'>{`#${item.idPart}`.padEnd(idWidth + 1)}</Text>
            <Text bold={isOpen}>{title.padEnd(titleRoom)}</Text>
            <Text color={ageColor}>{ageText.padStart(5)}</Text>
          </Button>
          {isOpen && (
            <Box
              flexDirection='column'
              // The marker column is 2 cells ('▾ '), so the detail starts under the row's #N.
              marginLeft={2}
              marginY={1}
              gap={1}
            >
              {/* Actions lead the detail: below a long body they scroll out of sight and get missed. */}
              <Box justifyContent='space-between'>
                <Box gap={1}>
                  <Button
                    key={`work:${item.idPart}`}
                    variant='primary'
                    hotkey='w'
                    label='▶ Start work'
                    onPress={() => startWork($, item)}
                  />
                  <Button
                    key={`cite:${item.idPart}`}
                    hotkey='c'
                    label={`Cite #${item.id}`}
                    onPress={() => cite($, item)}
                  />
                </Box>
                {item.date !== null && <Text color='subtle'>{describeAdded(item.date, age)}</Text>}
              </Box>
              {detailRule}
              {item.body === '' ? <Text color='subtle'>No body.</Text> : <Markdown text={item.body} />}
              {detailRule}
            </Box>
          )}
        </Box>
      );
    };

    const body = (
      <Box
        flexDirection='column'
        marginY={1}
        gap={1}
      >
        {current.sections.map(section => {
          // Loose threads are entries too: a section holding only threads is not empty.
          const count = section.items.length + section.threads.length;
          const tone = count > 0 ? 'suggestion' : 'subtle';

          return (
            <Box
              flexDirection='column'
              borderStyle='round'
              borderColor={tone}
              paddingX={1}
            >
              <Box gap={1}>
                <Text
                  bold
                  color={tone}
                >
                  {section.name.toUpperCase()}
                </Text>
                <Text color='subtle'>{count}</Text>
              </Box>
              {count === 0 && (
                <Text
                  color='subtle'
                  italic
                >
                  nothing here
                </Text>
              )}
              {section.items.map(renderItem)}
              {/* Markdown drawn dim printed list markers literally, so the bullet is ours and each thread its own row. */}
              {section.threads.map(thread => (
                <Box gap={1}>
                  <Text color='claude'>•</Text>
                  <Markdown text={thread} />
                </Box>
              ))}
            </Box>
          );
        })}
      </Box>
    );

    return frame(
      baseName(current.root),
      `· ${total} open`,
      body,
      `tab move · ⏎ expand · r refresh · edited ${editedAt}`,
    );
  });
};
