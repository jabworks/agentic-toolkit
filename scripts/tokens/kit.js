/* Shared behaviour layer — do not hand-edit; edit scripts/tokens/kit.js. */

/* Deliberately free of backticks and interpolation openers. No target is a JS
   template literal since the board-shell extraction, so this is insurance
   rather than a requirement — but it is the difference between this file being
   safe to inline anywhere and being safe only where someone remembered to
   check. Regexes and escapes are avoided for the same reason. */

(function () {
  'use strict';

  var THEME_KEY = 'jabworks-theme';
  var THEME_MODES = ['light', 'dark', 'system'];
  var root = document.documentElement;

  /* localStorage throws on an opaque origin, which is what a file:// artifact
     often gets. Degrade to session-only theming; never break the page. */
  function readStored(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function writeStored(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      /* no-op */
    }
  }

  function applyTheme(mode) {
    if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode);
    else root.removeAttribute('data-theme');

    writeStored(THEME_KEY, mode);

    var buttons = document.querySelectorAll('[data-kit-theme]');

    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', String(buttons[i].getAttribute('data-kit-theme') === mode));
    }
  }

  function currentTheme() {
    return root.getAttribute('data-theme') || 'system';
  }

  function cycleTheme() {
    applyTheme(THEME_MODES[(THEME_MODES.indexOf(currentTheme()) + 1) % THEME_MODES.length]);
  }

  function items() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-kit-item]'));
  }

  /* document.activeElement is null in a detached or not-yet-painted document,
     and Element.closest is absent on the document node itself. */
  function activeWithin(selector) {
    var el = document.activeElement;

    return el && el.closest ? el.closest(selector) : null;
  }

  function moveItem(step) {
    var all = items();

    if (all.length === 0) return;

    var index = all.indexOf(activeWithin('[data-kit-item]'));
    var next = all[Math.min(Math.max(index + step, 0), all.length - 1)] || all[0];

    next.setAttribute('tabindex', '-1');
    next.focus();
    next.scrollIntoView({ block: 'nearest' });

    /* Reflect the focused item in the URL so a board or a review can be linked
       to a specific row. replaceState, not a hash assignment: assigning to
       location.hash pushes a history entry per keypress. */
    if (next.id && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#' + next.id);
    }
  }

  function reveal(el) {
    if (el && el.focus) {
      el.focus();
      if (el.select) el.select();

      return true;
    }

    return false;
  }

  /* A surface whose filter field ships hidden cannot hang the hook on the field
     itself — a hidden element does not take focus, so the binding would be a
     silent no-op. Those surfaces put the hook on the control that REVEALS the
     field instead; activate it, then focus what it revealed via aria-controls.
     Without this the ? overlay would advertise "Focus filter" for a key that
     only moves focus to a button, and a generated overlay that misdescribes its
     own bindings is worse than no overlay. */
  function focusFilter() {
    var hook = document.querySelector('[data-kit-filter]');

    if (!hook) return false;

    if (hook.tagName === 'BUTTON') {
      if (hook.getAttribute('aria-expanded') === 'false' && hook.click) hook.click();

      if (reveal(document.getElementById(hook.getAttribute('aria-controls') || ''))) return true;
    }

    return reveal(hook);
  }

  function flashCopied(el) {
    el.classList.add('kit-copied');
    window.setTimeout(function () {
      el.classList.remove('kit-copied');
    }, 900);
  }

  function copyFrom(el) {
    if (!el) return;

    var text = el.getAttribute('data-kit-copy') || el.textContent || '';

    if (!text || !navigator.clipboard || !navigator.clipboard.writeText) return;

    navigator.clipboard.writeText(text.trim()).then(
      function () {
        flashCopied(el);
      },
      function () {
        /* Clipboard is permission-gated; a refusal is not an error worth
           interrupting the page for. */
      },
    );
  }

  function sections() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-kit-section]'));
  }

  function jumpToSection(n) {
    var target = sections()[n - 1];

    if (target) target.scrollIntoView({ block: 'start' });
  }

  /* One registry drives both the key handler and the help overlay, so the
     documented shortcuts cannot drift from the implemented ones. */
  var BINDINGS = [
    { keys: ['j'], label: 'Next item', when: function () { return items().length > 0; }, run: function () { moveItem(1); } },
    { keys: ['k'], label: 'Previous item', when: function () { return items().length > 0; }, run: function () { moveItem(-1); } },
    {
      keys: ['/'],
      label: 'Focus filter',
      when: function () { return Boolean(document.querySelector('[data-kit-filter]')); },
      run: focusFilter,
    },
    {
      keys: ['y'],
      label: 'Copy id or path',
      when: function () { return Boolean(document.querySelector('[data-kit-copy]')); },
      run: function () {
        copyFrom(activeWithin('[data-kit-copy]'));
      },
    },
    { keys: ['t'], label: 'Cycle theme', when: function () { return true; }, run: cycleTheme },
    {
      keys: ['g', '1-9'],
      label: 'Jump to section',
      when: function () { return sections().length > 0; },
      run: null,
    },
    { keys: ['?'], label: 'Show shortcuts', when: function () { return true; }, run: null },
    { keys: ['Esc'], label: 'Dismiss', when: function () { return true; }, run: null },
  ];

  var overlay = null;

  function buildOverlay() {
    var host = document.createElement('div');

    host.className = 'kit-help';
    host.hidden = true;
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');
    host.setAttribute('aria-label', 'Keyboard shortcuts');

    var panel = document.createElement('div');

    panel.className = 'kit-help__panel';

    var title = document.createElement('p');

    title.className = 'kit-help__title';
    title.textContent = 'Keyboard shortcuts';
    panel.appendChild(title);

    for (var i = 0; i < BINDINGS.length; i++) {
      if (!BINDINGS[i].when()) continue;

      var row = document.createElement('div');

      row.className = 'kit-help__row';

      var label = document.createElement('span');

      label.textContent = BINDINGS[i].label;
      row.appendChild(label);

      var keys = document.createElement('span');

      keys.className = 'kit-help__keys';

      for (var k = 0; k < BINDINGS[i].keys.length; k++) {
        var kbd = document.createElement('kbd');

        kbd.className = 'kit-kbd';
        kbd.textContent = BINDINGS[i].keys[k];
        keys.appendChild(kbd);
      }

      row.appendChild(keys);
      panel.appendChild(row);
    }

    host.appendChild(panel);
    host.addEventListener('click', function (event) {
      if (event.target === host) toggleOverlay(false);
    });
    document.body.appendChild(host);

    return host;
  }

  function toggleOverlay(show) {
    if (!overlay) overlay = buildOverlay();

    overlay.hidden = !show;
  }

  function isTypingTarget(el) {
    if (!el) return false;

    var tag = el.tagName;

    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
  }

  var pendingJump = false;

  function onKeydown(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (event.key === 'Escape') {
      toggleOverlay(false);
      if (isTypingTarget(event.target) && event.target.blur) event.target.blur();

      return;
    }

    /* A filter box must be typeable: every other binding is inert while the
       caret is in a field. Escape above is the deliberate exception. */
    if (isTypingTarget(event.target)) return;

    if (pendingJump) {
      pendingJump = false;

      if (event.key >= '1' && event.key <= '9') {
        jumpToSection(Number(event.key));
        event.preventDefault();

        return;
      }
    }

    if (event.key === 'g' && sections().length > 0) {
      pendingJump = true;
      window.setTimeout(function () {
        pendingJump = false;
      }, 1200);

      return;
    }

    if (event.key === '?') {
      toggleOverlay(overlay ? overlay.hidden : true);
      event.preventDefault();

      return;
    }

    for (var i = 0; i < BINDINGS.length; i++) {
      if (BINDINGS[i].run && BINDINGS[i].keys.indexOf(event.key) !== -1 && BINDINGS[i].when()) {
        BINDINGS[i].run();
        event.preventDefault();

        return;
      }
    }
  }

  function init() {
    applyTheme(readStored(THEME_KEY) || 'system');

    var buttons = document.querySelectorAll('[data-kit-theme]');

    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function (event) {
        applyTheme(event.currentTarget.getAttribute('data-kit-theme'));
      });
    }

    document.addEventListener('click', function (event) {
      var target = event.target.closest ? event.target.closest('[data-kit-copy]') : null;

      if (target) copyFrom(target);
    });

    document.addEventListener('keydown', onKeydown);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
