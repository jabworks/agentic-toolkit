import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// scripts/tokens/kit.js is inlined byte-for-byte into every HTML surface, so a
// regression in it breaks four shipped artifacts at once and shows up in none
// of the other suites — they check that the region *matches*, never that it
// *works*. This runs the real file against a shim.
//
// The shim stops at attribute selectors, which is all kit.js uses. Anything
// richer would be shim bugs wearing the costume of coverage.
//
// Tests are order-dependent by design: theme cycling is a state machine, and
// asserting the transitions in sequence is the point. node:test runs top-level
// tests in a file sequentially, in its own process, so the globals below do not
// leak into other suites.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const all = [];

class El {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.attrs = {};
    this.children = [];
    this.listeners = {};
    this.parent = null;
    this.textContent = '';
    this.hidden = false;
    this._classes = new Set();
    this.classList = {
      add: (c) => this._classes.add(c),
      remove: (c) => this._classes.delete(c),
      contains: (c) => this._classes.has(c),
    };
    all.push(this);
  }

  setAttribute(k, v) {
    this.attrs[k] = String(v);
  }

  getAttribute(k) {
    return k in this.attrs ? this.attrs[k] : null;
  }

  removeAttribute(k) {
    delete this.attrs[k];
  }

  get id() {
    return this.attrs.id || '';
  }

  set className(v) {
    this._classes.clear();
    for (const c of String(v).split(' ').filter(Boolean)) this._classes.add(c);
  }

  get className() {
    return [...this._classes].join(' ');
  }

  appendChild(child) {
    child.parent = this;
    this.children.push(child);

    return child;
  }

  addEventListener(type, fn) {
    (this.listeners[type] ||= []).push(fn);
  }

  dispatch(type, event) {
    for (const fn of this.listeners[type] || []) fn({ ...event, currentTarget: this });
  }

  click() {
    this.dispatch('click', { target: this });
  }

  focus() {
    doc.activeElement = this;
  }

  blur() {
    if (doc.activeElement === this) doc.activeElement = doc.body;
  }

  select() {}
  scrollIntoView() {}

  closest(sel) {
    const key = sel.replace(/[[\]]/g, '');
    let node = this;

    while (node) {
      if (key in node.attrs) return node;
      node = node.parent;
    }

    return null;
  }
}

const matches = (el, sel) => sel.replace(/[[\]]/g, '') in el.attrs;

const doc = {
  readyState: 'complete',
  documentElement: new El('html'),
  body: new El('body'),
  activeElement: null,
  listeners: {},
  createElement: (t) => new El(t),
  querySelectorAll: (sel) => all.filter((e) => matches(e, sel)),
  querySelector: (sel) => all.find((e) => matches(e, sel)) || null,
  getElementById: (id) => all.find((e) => e.attrs.id === id) || null,
  addEventListener(type, fn) {
    (this.listeners[type] ||= []).push(fn);
  },
  fire(type, event) {
    const e = { preventDefault() {}, target: doc.body, ...event };

    for (const fn of this.listeners[type] || []) fn(e);

    return e;
  },
};

doc.activeElement = doc.body;

const storage = new Map();
const copied = { text: null };
const url = { last: null };

globalThis.document = doc;
globalThis.window = {
  localStorage: {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, v),
  },
  setTimeout: () => 0,
  history: {
    replaceState: (_state, _title, next) => {
      url.last = next;
    },
  },
};

// Node ships a getter-only global navigator, so it has to be redefined.
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {
    clipboard: {
      writeText: (t) => {
        copied.text = t;

        return Promise.resolve();
      },
    },
  },
});

const themeButton = (mode) => {
  const b = new El('button');

  b.setAttribute('data-kit-theme', mode);
  doc.body.appendChild(b);

  return b;
};

const light = themeButton('light');
const dark = themeButton('dark');
const system = themeButton('system');

const item = (id) => {
  const el = new El('article');

  el.setAttribute('data-kit-item', '');
  el.setAttribute('id', id);
  doc.body.appendChild(el);

  return el;
};

const item1 = item('item-1');
const item2 = item('item-2');

const filter = new El('input');

filter.setAttribute('data-kit-filter', '');
doc.body.appendChild(filter);

const copyable = new El('span');

copyable.setAttribute('data-kit-copy', 'condux--v2.18.1');
doc.body.appendChild(copyable);

// Run the real file.
new Function(fs.readFileSync(path.join(REPO_ROOT, 'scripts/tokens/kit.js'), 'utf8'))();

test('with nothing stored, the theme resolves to system and no attribute is stamped', () => {
  assert.equal(doc.documentElement.getAttribute('data-theme'), null);
  assert.equal(system.getAttribute('aria-pressed'), 'true');
  assert.equal(dark.getAttribute('aria-pressed'), 'false');
});

test('t cycles system -> light -> dark -> system and persists each step', () => {
  doc.fire('keydown', { key: 't' });
  assert.equal(doc.documentElement.getAttribute('data-theme'), 'light');
  assert.equal(light.getAttribute('aria-pressed'), 'true');
  assert.equal(storage.get('jabworks-theme'), 'light');

  doc.fire('keydown', { key: 't' });
  assert.equal(doc.documentElement.getAttribute('data-theme'), 'dark');

  doc.fire('keydown', { key: 't' });
  assert.equal(doc.documentElement.getAttribute('data-theme'), null, 'system removes the stamp');
});

test('clicking a theme button applies that mode directly', () => {
  dark.dispatch('click', { target: dark });
  assert.equal(doc.documentElement.getAttribute('data-theme'), 'dark');
});

test('j and k walk the items, clamp at both ends, and reflect the id in the URL', () => {
  doc.fire('keydown', { key: 'j' });
  assert.equal(doc.activeElement, item1);
  assert.equal(url.last, '#item-1', 'replaceState, so holding j does not fill the history');

  doc.fire('keydown', { key: 'j' });
  assert.equal(doc.activeElement, item2);

  doc.fire('keydown', { key: 'j' });
  assert.equal(doc.activeElement, item2, 'clamped at the last item');

  doc.fire('keydown', { key: 'k' });
  assert.equal(doc.activeElement, item1);

  doc.fire('keydown', { key: 'k' });
  assert.equal(doc.activeElement, item1, 'clamped at the first item');
});

test('/ focuses the filter', () => {
  doc.fire('keydown', { key: '/' });
  assert.equal(doc.activeElement, filter);
});

test('every binding is inert while the caret is in a field', () => {
  doc.activeElement = filter;

  const before = doc.documentElement.getAttribute('data-theme');

  doc.fire('keydown', { key: 't', target: filter });
  assert.equal(doc.documentElement.getAttribute('data-theme'), before, 't must not fire inside an input');
});

test('Escape is the deliberate exception, and blurs the field', () => {
  doc.activeElement = filter;
  doc.fire('keydown', { key: 'Escape', target: filter });
  assert.equal(doc.activeElement, doc.body);
});

test('modifier chords are left to the browser', () => {
  doc.activeElement = doc.body;

  const before = doc.documentElement.getAttribute('data-theme');

  doc.fire('keydown', { key: 't', ctrlKey: true });
  assert.equal(doc.documentElement.getAttribute('data-theme'), before);
});

test('? builds the overlay listing only the bindings this page can honour', () => {
  doc.fire('keydown', { key: '?' });

  const help = all.find((e) => e.classList.contains('kit-help'));

  assert.ok(help, 'overlay was created');
  assert.equal(help.hidden, false);

  const labels = all
    .filter((e) => e.parent && e.parent.classList.contains('kit-help__row') && e.tagName === 'SPAN')
    .map((e) => e.textContent);

  assert.ok(labels.includes('Cycle theme'), 'an always-applicable binding is listed');
  assert.ok(!labels.includes('Jump to section'), 'a binding with no [data-kit-section] on the page is omitted');
});

test('? toggles the overlay closed again', () => {
  doc.fire('keydown', { key: '?' });
  assert.equal(all.find((e) => e.classList.contains('kit-help')).hidden, true);
});

test('clicking a [data-kit-copy] copies its attribute value, not its text', () => {
  doc.fire('click', { target: copyable });
  assert.equal(copied.text, 'condux--v2.18.1');
});

// The docket board's filter input ships `hidden`, and a hidden element cannot
// take focus — so the hook goes on the button that reveals it instead. Without
// this path `/` would move focus to a button while the ? overlay claimed it
// focused the filter, which makes the generated overlay a liar.
test('/ activates a revealing control when the field itself cannot take focus', () => {
  filter.removeAttribute('data-kit-filter');

  const hidden = new El('input');

  hidden.setAttribute('id', 'hidden-filter');
  doc.body.appendChild(hidden);

  const toggle = new El('button');

  toggle.setAttribute('data-kit-filter', '');
  toggle.setAttribute('aria-controls', 'hidden-filter');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.addEventListener('click', () => toggle.setAttribute('aria-expanded', 'true'));
  doc.body.appendChild(toggle);

  doc.activeElement = doc.body;
  doc.fire('keydown', { key: '/' });

  assert.equal(toggle.getAttribute('aria-expanded'), 'true', 'the revealing control was activated');
  assert.equal(doc.activeElement, hidden, 'focus landed on the revealed field, not the button');

  // An already-open control must not be toggled shut by pressing / again.
  doc.activeElement = doc.body;
  doc.fire('keydown', { key: '/' });

  assert.equal(toggle.getAttribute('aria-expanded'), 'true', 'still open');
  assert.equal(doc.activeElement, hidden);
});
