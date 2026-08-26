# Wireframe Kit

Reference for `/blueprint`. Every mockup speaks the house design language —
the surface-kit token core in `token-core.css` beside this file — in one of
two modes. The discipline is what keeps a mockup unambiguous: in wireframe
mode the schematic look keeps reviewers debating structure instead of taste;
in render mode the full language shows how the approved structure will
actually look.

## The Two Modes

| | `wireframe` | `render` |
|---|---|---|
| When | design time — structure is the open question | sign-off / presentation — structure is settled |
| Colour roles | neutrals only; semantics stay silent | full palette: accent, semantic, categorical |
| Grouping | dashed borders, flat corners | solid borders, radius + elevation |
| Buttons | transparent outlines, emphasis by border weight | filled `--primary`, hover, motion |
| Overall read | "schematic under discussion" | "this is how it'll look" |

**Same skeleton, two skins.** Both modes share identical HTML structure and
class names; only the component CSS block differs. Promoting a signed-off
wireframe to a render is a style-block swap — nothing may move. Declare the
mode on the body: `<body data-blueprint-mode="wireframe">` (or `"render"`).

Default to wireframe mode. Produce a render when the structure is already
signed off, when the user asks for fidelity ("make it look real", "mock this
up properly"), or when discovery offers promotion at sign-off.

## Hard Rules

1. **Tokens only.** Every colour, size, radius, and duration comes from a
   `var(--…)` defined in the token core. No raw hex, no ad-hoc px values
   where a ramp token exists. Paste `token-core.css` (sibling of this file)
   at the top of every `<style>` block, verbatim.
2. **Wireframe mode is neutral.** Its component CSS may reference only:
   `--background`, `--card`, `--foreground`, `--muted`, `--muted-foreground`,
   `--border`, `--input`, `--accent`, `--subtle`, the `--primary*` family
   (annotation callouts only), and every type / space / radius / motion /
   font token. Semantic (`--success*`, `--warning*`, `--destructive*`,
   `--info*`), categorical (`--cat-*`), and elevation (`--shadow-*`) tokens
   are render-mode vocabulary.
3. **Fonts per D2.** `--sans` for the UI's own copy; `--mono` for everything
   meta — labels, badges, annotations, data. The stacks are fallbacks; never
   load font files.
4. **No imagery.** Photos and illustrations render as a crossed box with a
   label (`.img-box`). Icons render as their name in brackets, e.g. `[gear]`.
5. **Real hierarchy, placeholder content.** Headings, labels, and CTAs carry
   their actual intended text; body copy may be greeked with `▓▓▓` bars.
6. **Annotate decisions, not furniture.** A callout explains *why this is
   here* or *what happens on interaction* — not "this is a button".
7. **One file per screen or flow state.** Empty, loading, error, and populated
   are different files named for the state:
   `settings-page.html`, `settings-page-empty.html`, `settings-page-error.html`.
8. **Self-contained.** All CSS inline in a `<style>` block. No external
   requests of any kind. The file must render identically from `file://`.
   The token core carries dark and light themes; the page follows the OS.

## Page Skeleton

```html
<title>settings-page — wireframe</title>
<style>
/* 1. token-core.css pasted verbatim */
/* 2. ONE mode block from below */
</style>
<body data-blueprint-mode="wireframe">
<div class="frame">
  <div class="box"><strong>Header</strong> · [logo] · nav: Account / Billing / Team</div>
  <div class="row">
    <div class="box"><!-- sidebar --></div>
    <div class="box" style="flex:3"><!-- main content --></div>
  </div>
  <div class="note">Sidebar collapses below 768px — Billing moves into the header nav.</div>
</div>
</body>
```

## Wireframe Mode CSS

```css
/* wireframe mode — surface-kit neutrals only, schematic look.
   Emphasis by value and weight, never hue. */
* { margin: 0; box-sizing: border-box; }
body {
  font-family: var(--sans);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  background: var(--background);
  color: var(--foreground);
  padding: var(--space-6);
}
.frame {
  background: var(--card);
  border: 1px dashed var(--muted-foreground);
  border-radius: var(--radius-sm);
  max-width: 1100px; margin: 0 auto; padding: var(--space-6);
}
.topbar {
  display: flex; justify-content: space-between; align-items: baseline;
  padding-bottom: var(--space-4); border-bottom: 1px solid var(--border);
  margin-bottom: var(--space-5);
}
.nav { display: flex; gap: var(--space-4); font-size: var(--text-sm); }
.nav a { color: var(--muted-foreground); }
.nav a.active { color: var(--foreground); border-bottom: 2px solid var(--foreground); padding-bottom: 2px; }
.row { display: flex; gap: var(--space-4); }
.row > * { flex: 1; }
.box {
  background: var(--card); border: 1px dashed var(--border);
  border-radius: var(--radius-sm); padding: var(--space-4); margin-bottom: var(--space-4);
}
h2 { font-size: var(--text-md); letter-spacing: var(--tracking-tight); margin-bottom: var(--space-3); }
.side-item {
  padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm);
  color: var(--muted-foreground); font-size: var(--text-sm);
}
.side-item.active { background: var(--accent); color: var(--foreground); }
.field { margin-bottom: var(--space-3); }
label {
  display: block; font-family: var(--mono); font-size: var(--text-2xs);
  text-transform: uppercase; letter-spacing: var(--tracking-wide);
  color: var(--muted-foreground); margin-bottom: var(--space-1);
}
input {
  width: 100%; background: transparent; color: var(--foreground);
  border: 1px solid var(--input); border-radius: var(--radius);
  padding: var(--space-2) var(--space-3); font: inherit; font-size: var(--text-sm);
}
.btn {
  display: inline-block; border: 1px solid var(--muted-foreground); border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-4); background: transparent;
  color: var(--foreground); font-size: var(--text-sm);
}
.btn.primary { border-width: 2px; font-weight: 600; }
.btn.danger { color: var(--muted-foreground); }   /* semantics stay silent in wireframe */
.greek { color: var(--border); letter-spacing: 2px; overflow: hidden; white-space: nowrap; }
.img-box {
  border: 1px solid var(--border); background:
    linear-gradient(45deg, transparent 49.5%, var(--border) 49.5%, var(--border) 50.5%, transparent 50.5%),
    linear-gradient(-45deg, transparent 49.5%, var(--border) 49.5%, var(--border) 50.5%, transparent 50.5%)
    var(--muted);
  display: flex; align-items: center; justify-content: center;
  color: var(--muted-foreground); font-family: var(--mono); font-size: var(--text-xs);
  min-height: 120px; border-radius: var(--radius);
}
table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
th {
  font-family: var(--mono); font-size: var(--text-2xs); text-transform: uppercase;
  letter-spacing: var(--tracking-wide); color: var(--muted-foreground);
  text-align: left; padding: var(--space-2); border-bottom: 1px solid var(--border);
}
td { padding: var(--space-2); border-bottom: 1px solid var(--border); }
.badge {
  display: inline-block; font-family: var(--mono); font-size: var(--text-2xs);
  padding: 2px var(--space-2); border-radius: var(--radius-full);
  border: 1px solid var(--border); color: var(--muted-foreground);
}
.note::before { content: "\25B8 note  "; font-weight: 600; letter-spacing: var(--tracking-wide); }
.note {
  border-left: 3px solid var(--primary); background: var(--primary-muted);
  color: var(--primary-text); border-radius: 0 var(--radius) var(--radius) 0;
  padding: var(--space-2) var(--space-3); margin: var(--space-3) 0;
  font-family: var(--mono); font-size: var(--text-xs); line-height: var(--leading-snug);
}
.actions { display: flex; gap: var(--space-2); margin-top: var(--space-3); }
.choice { display: flex; gap: var(--space-2); }
.empty { text-align: center; padding: var(--space-8); border-style: dashed; }
.muted { color: var(--muted-foreground); }
```

Greeked copy: `<div class="greek">▓▓▓▓▓▓▓▓ ▓▓▓▓ ▓▓▓▓▓▓</div>` at whatever
width the real copy would occupy.

## Render Mode CSS

```css
/* render mode — the full house language. Same skeleton, colour unlocked:
   accent on primary actions, semantic status colours, categorical chips,
   elevation, motion. */
* { margin: 0; box-sizing: border-box; }
body {
  font-family: var(--sans);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  background: var(--background);
  color: var(--foreground);
  padding: var(--space-6);
}
.frame {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  max-width: 1100px; margin: 0 auto; padding: var(--space-6);
}
.topbar {
  display: flex; justify-content: space-between; align-items: baseline;
  padding-bottom: var(--space-4); border-bottom: 1px solid var(--border);
  margin-bottom: var(--space-5);
}
.topbar strong { font-size: var(--text-lg); letter-spacing: var(--tracking-tight); }
.nav { display: flex; gap: var(--space-4); font-size: var(--text-sm); }
.nav a { color: var(--muted-foreground); transition: color var(--dur-fast) var(--ease-out); }
.nav a.active { color: var(--primary-text); border-bottom: 2px solid var(--primary); padding-bottom: 2px; }
.row { display: flex; gap: var(--space-4); }
.row > * { flex: 1; }
.box {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: var(--space-4); margin-bottom: var(--space-4);
  box-shadow: var(--shadow-sm);
}
h2 { font-size: var(--text-md); letter-spacing: var(--tracking-tight); margin-bottom: var(--space-3); }
.side-item {
  padding: var(--space-2) var(--space-3); border-radius: var(--radius);
  color: var(--muted-foreground); font-size: var(--text-sm);
  transition: background var(--dur-fast) var(--ease-out);
}
.side-item.active { background: var(--primary-muted); color: var(--primary-text); }
.field { margin-bottom: var(--space-3); }
label {
  display: block; font-family: var(--mono); font-size: var(--text-2xs);
  text-transform: uppercase; letter-spacing: var(--tracking-wide);
  color: var(--muted-foreground); margin-bottom: var(--space-1);
}
input {
  width: 100%; background: var(--muted); color: var(--foreground);
  border: 1px solid var(--input); border-radius: var(--radius);
  padding: var(--space-2) var(--space-3); font: inherit; font-size: var(--text-sm);
  transition: border-color var(--dur-fast) var(--ease-out);
}
input:focus { outline: none; border-color: var(--ring); }
.btn {
  display: inline-block; border: 1px solid var(--border); border-radius: var(--radius);
  padding: var(--space-2) var(--space-4); background: var(--accent);
  color: var(--foreground); font-size: var(--text-sm); cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out);
}
.btn.primary { background: var(--primary); color: var(--primary-foreground); border-color: transparent; }
.btn.primary:hover { background: var(--primary-hover); }
.btn.danger {
  background: var(--destructive-muted); color: var(--destructive);
  border-color: var(--destructive-border);
}
.greek { color: var(--border); letter-spacing: 2px; overflow: hidden; white-space: nowrap; }
.img-box {
  border: 1px solid var(--border); background:
    linear-gradient(45deg, transparent 49.5%, var(--border) 49.5%, var(--border) 50.5%, transparent 50.5%),
    linear-gradient(-45deg, transparent 49.5%, var(--border) 49.5%, var(--border) 50.5%, transparent 50.5%)
    var(--muted);
  display: flex; align-items: center; justify-content: center;
  color: var(--muted-foreground); font-family: var(--mono); font-size: var(--text-xs);
  min-height: 120px; border-radius: var(--radius);
}
table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
th {
  font-family: var(--mono); font-size: var(--text-2xs); text-transform: uppercase;
  letter-spacing: var(--tracking-wide); color: var(--muted-foreground);
  text-align: left; padding: var(--space-2); border-bottom: 1px solid var(--border);
}
td { padding: var(--space-2); border-bottom: 1px solid var(--border); }
.badge {
  display: inline-block; font-family: var(--mono); font-size: var(--text-2xs);
  padding: 2px var(--space-2); border-radius: var(--radius-full);
  border: 1px solid var(--border); color: var(--muted-foreground);
}
.badge.ok   { color: var(--success);     background: var(--success-muted);     border-color: var(--success-border); }
.badge.warn { color: var(--warning);     background: var(--warning-muted);     border-color: var(--warning-border); }
.badge.err  { color: var(--destructive); background: var(--destructive-muted); border-color: var(--destructive-border); }
.badge.role-1 { color: var(--cat-2); border-color: var(--cat-2); background: transparent; }
.badge.role-2 { color: var(--cat-4); border-color: var(--cat-4); background: transparent; }
.badge.role-3 { color: var(--cat-other); border-color: var(--cat-other); background: transparent; }
.note {
  border-left: 3px solid var(--primary); background: var(--primary-muted);
  color: var(--primary-text); border-radius: 0 var(--radius) var(--radius) 0;
  padding: var(--space-2) var(--space-3); margin: var(--space-3) 0;
  font-family: var(--mono); font-size: var(--text-xs); line-height: var(--leading-snug);
}
.actions { display: flex; gap: var(--space-2); margin-top: var(--space-3); }
.choice { display: flex; gap: var(--space-2); }
.empty { text-align: center; padding: var(--space-8); border-style: dashed; box-shadow: none; }
.muted { color: var(--muted-foreground); }
```

The `.badge.role-*` classes are categorical-colour examples — rename them for
the domain at hand (`.badge.plan-pro`, `.badge.env-staging`, …); the pattern
to keep is one `--cat-N` per identity, `--cat-other` for the long tail.

## Review Posture

Present a wireframe as a question, not an answer: "this is the structure I
understood — what's wrong with it?" When two structures genuinely compete,
produce both files and let discovery's mockup-picker run the choice. A render
is the opposite posture — it presents the settled structure in the house
language, so changes at render stage should be taste-level, not structural;
structural feedback at that point reopens the wireframe.
