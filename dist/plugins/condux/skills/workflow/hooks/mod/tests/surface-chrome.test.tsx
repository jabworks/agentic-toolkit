import { expect, test } from 'claude-code/testing';

import { PANE_EDGE, TRAY, TRAY_EDGE } from '../kit/charts';
import { answerBeneath, mountPane, run, sampleFiles } from './harness';

// Surface chrome on the board: each section a tinted tray with a rim in its own tone, a rounded tag, rounded status
// pills, and a solid neutral rule under the masthead, all inside a neutral frame. The desktop draws it; the terminal
// keeps its plain bordered cards.

test('on the desktop each section is a tray whose border follows its fill', async ($, on) => {
  answerBeneath(on, sampleFiles);
  await $.command.run(run(''));

  const ui = await mountPane('desktop', $);
  const card = await ui.find({ key: 'card:ACTIVE' });

  expect(card?.props.backgroundColor).toBe(TRAY);
  expect(card?.props.borderColor).toBe(TRAY_EDGE);
  // The hover restyle is the surface's alone: the kit does not hand it back, so it is checked live.
});

test('on the desktop the pane frame is neutral and a tray insets its tag evenly from its corner', async ($, on) => {
  answerBeneath(on, sampleFiles);
  await $.command.run(run(''));

  const ui = await mountPane('desktop', $);
  const frames = (await ui.findAll({ type: 'Box' })).filter(box => box.props.borderColor === PANE_EDGE);
  const card = await ui.find({ key: 'card:ACTIVE' });

  expect(frames.length).toBe(1);
  // The frame insets its content by the same step down as across, like the trays inside it.
  expect(frames[0]?.props.padding).toBe('xs');
  expect(frames[0]?.props.paddingX).toBe(undefined);
  // One step on every side, so the tag's rounded end sits concentric with the tray's corner.
  expect(card?.props.padding).toBe('xs');
  expect(card?.props.paddingX).toBe(undefined);
});

test('the terminal keeps its plain bordered section cards and its text statuses', async ($, on) => {
  answerBeneath(on, sampleFiles);
  await $.command.run(run(''));

  const ui = await mountPane('terminal', $);
  const card = await ui.find({ key: 'card:ACTIVE' });

  expect(card).toBeDefined();
  expect(card?.props.backgroundColor).toBe(undefined);
  expect(await ui.find({ text: /ACTIVE/ })).toBeDefined();
});

test('on the desktop a section name is a rounded tag carrying its count', async ($, on) => {
  answerBeneath(on, sampleFiles);
  await $.command.run(run(''));

  const ui = await mountPane('desktop', $);
  const alts = (await ui.findAll({ type: 'Svg' })).map(svg => String(svg.props.alt));

  expect(alts).toContain('ACTIVE · 1');
  expect(alts).toContain('COMPLETE · 1');
});

test('on the desktop a plan row carries its status as a rounded pill', async ($, on) => {
  answerBeneath(on, sampleFiles);
  await $.command.run(run(''));

  const ui = await mountPane('desktop', $);
  const alts = (await ui.findAll({ type: 'Svg' })).map(svg => String(svg.props.alt));

  expect(alts).toContain('Active work: in progress');
  expect(alts).toContain('Shipped work: complete');
});

test('on the desktop a solid neutral rule sits under the masthead in place of the line of dashes', async ($, on) => {
  answerBeneath(on, sampleFiles);
  await $.command.run(run(''));

  const ui = await mountPane('desktop', $);
  const rules = (await ui.findAll({ type: 'Svg' })).filter(svg => svg.props.alt === 'divider');

  expect(rules.length).toBe(1);
  expect(String(rules[0]?.props.source)).not.toContain('Gradient');
  // Height and no width, like the bar: the desktop stretches it to the slot.
  expect(rules[0]?.props.width).toBe(undefined);
  expect(await ui.find({ text: /─{8}/ })).toBe(undefined);
});

test('on the desktop the masthead counts are quiet chips, one per figure', async ($, on) => {
  answerBeneath(on, sampleFiles);
  await $.command.run(run(''));

  const ui = await mountPane('desktop', $);
  const alts = (await ui.findAll({ type: 'Svg' })).map(svg => String(svg.props.alt));

  expect(alts.some(alt => /^\d+ plans$/.test(alt))).toBe(true);
  expect(alts.some(alt => /^\d+ active$/.test(alt))).toBe(true);
});

test('on the desktop an in-progress pill is blue, the colour of work under way, not the red of trouble', async ($, on) => {
  answerBeneath(on, sampleFiles);
  await $.command.run(run(''));

  const ui = await mountPane('desktop', $);
  const pill = (await ui.findAll({ type: 'Svg' })).find(svg => svg.props.alt === 'Active work: in progress');

  expect(String(pill?.props.source)).toContain('#2f6db5');
  expect(String(pill?.props.source)).not.toContain('#c8643c');
});

test('on the desktop a section tag is solid, in the colour of the status its rows carry', async ($, on) => {
  answerBeneath(on, sampleFiles);
  await $.command.run(run(''));

  const ui = await mountPane('desktop', $);
  const svgs = await ui.findAll({ type: 'Svg' });
  const tagSource = (alt: string) => String(svgs.find(svg => svg.props.alt === alt)?.props.source);

  expect(tagSource('ACTIVE · 1')).toContain('fill="#2f6db5" fill-opacity="1"');
  expect(tagSource('COMPLETE · 1')).toContain('fill="#3f8f5b" fill-opacity="1"');
});

test('on the desktop a plan row\'s marker is a chevron drawing that turns as the row opens', async ($, on) => {
  answerBeneath(on, sampleFiles);
  await $.command.run(run(''));

  const ui = await mountPane('desktop', $);
  const alts = (await ui.findAll({ type: 'Svg' })).map(svg => String(svg.props.alt));

  expect(alts).toContain('collapsed');
});
