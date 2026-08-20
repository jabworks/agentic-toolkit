# Wireframe Kit

Reference for `/blueprint`. The discipline is what keeps a wireframe
unambiguous: the moment brand styling creeps in, reviewers debate taste
instead of structure.

## Hard Rules

1. **Grayscale only.** Backgrounds `#fff`–`#f5f5f5`, borders `#ccc`,
   text `#222`/`#777`. One muted accent (`#5b7c99`) is allowed for
   annotation callouts only — never for UI elements.
2. **System font stack.** `-apple-system, "Segoe UI", Roboto, sans-serif`.
   No webfonts, no font files.
3. **No imagery.** Photos and illustrations render as a crossed box with a
   label (`.img-box`). Icons render as their name in brackets, e.g. `[gear]`.
4. **Real hierarchy, placeholder content.** Headings, labels, and CTAs carry
   their actual intended text; body copy may be greeked with `▓▓▓` bars.
5. **Annotate decisions, not furniture.** A callout explains *why this is
   here* or *what happens on interaction* — not "this is a button".
6. **One file per screen or flow state.** Empty, loading, error, and populated
   are different files named for the state:
   `settings-page.html`, `settings-page-empty.html`, `settings-page-error.html`.
7. **Self-contained.** All CSS inline in a `<style>` block. No external
   requests of any kind. The file must render identically from `file://`.

## Base CSS

Copy this block into every wireframe's `<style>` and build on it.

```css
* { margin: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
  background: #f5f5f5; color: #222; padding: 24px;
}
.frame {            /* the device/viewport boundary */
  background: #fff; border: 2px solid #ccc; border-radius: 6px;
  max-width: 1100px; margin: 0 auto; padding: 24px;
}
.box {              /* generic grouping region */
  border: 1px dashed #bbb; border-radius: 4px;
  padding: 16px; margin-bottom: 16px;
}
.row { display: flex; gap: 16px; }
.row > * { flex: 1; }
.img-box {          /* rule 3: imagery placeholder */
  border: 1px solid #ccc; background:
    linear-gradient(45deg, transparent 49.5%, #ccc 49.5%, #ccc 50.5%, transparent 50.5%),
    linear-gradient(-45deg, transparent 49.5%, #ccc 49.5%, #ccc 50.5%, transparent 50.5%);
  display: flex; align-items: center; justify-content: center;
  color: #777; min-height: 120px;
}
.btn {              /* any actionable element */
  display: inline-block; border: 1px solid #777; border-radius: 4px;
  padding: 8px 20px; background: #eee; color: #222;
}
.greek {            /* rule 4: body-copy placeholder */
  color: #ccc; letter-spacing: 2px; overflow: hidden; white-space: nowrap;
}
.note {             /* rule 5: annotation callout — the only accent use */
  border-left: 3px solid #5b7c99; background: #eef2f6; color: #33475b;
  padding: 8px 12px; font-size: 13px; margin: 8px 0;
}
```

Greeked copy: `<div class="greek">▓▓▓▓▓▓▓▓ ▓▓▓▓ ▓▓▓▓▓▓</div>` at whatever
width the real copy would occupy.

## Page Skeleton

```html
<title>settings-page — wireframe</title>
<style>/* base CSS above */</style>
<div class="frame">
  <div class="box"><strong>Header</strong> · [logo] · nav: Account / Billing / Team</div>
  <div class="row">
    <div class="box"><!-- sidebar --></div>
    <div class="box" style="flex:3"><!-- main content --></div>
  </div>
  <div class="note">Sidebar collapses below 768px — Billing moves into the header nav.</div>
</div>
```

## Review Posture

Present a wireframe as a question, not an answer: "this is the structure I
understood — what's wrong with it?" When two structures genuinely compete,
produce both files and let discovery's mockup-picker run the choice.
