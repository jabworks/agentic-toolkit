# UI Copy

The strings application code puts in front of users. Everything here is
judgment tier — nothing in it is lint-enforced. **Codebase mimicry wins:** an
app's existing copy conventions, and any design-system or content guidelines it
follows, override these defaults.

## Error messages _(Medium)_

Three parts, in this order: what happened, why (if known), what the user can do
next. Never blame the user ("You entered an invalid date" → "That date isn't
valid"). Never show a raw error code or stack text as the whole message —
it may ride along as secondary detail, not as the message.

Place it where the user acted: inline at the field or control that failed. A
toast alone disappears before it can be read and points at nothing.

```tsx
// Bad — code as the message, no next step, toast only
toast.error('ERR_UPLOAD_413');

// Good — what, why, next step; shown at the control
<FieldError>
  Couldn't upload report.pdf. The file is larger than the 10 MB limit. Choose a smaller file.
</FieldError>
```

## Empty states _(Medium)_

Say what this area is for, why it is empty right now, and the one action that
fills it. Tell first-use empty apart from filtered-to-nothing: the second reads
"No results for 'invoice'" and offers a way to clear the filter — never the
first-use pitch.

## Confirmation dialogs _(Medium)_

- The title names the action and its object: "Delete 3 files?".
- The body states the consequence, including irreversibility: "This can't be
  undone."
- Buttons are verbs matching the action — "Delete files" / "Keep files" — never
  OK/Cancel or Yes/No.
- The destructive button is styled as destructive and is not the default
  focus.

## Buttons and CTAs _(Medium)_

Start with a verb and name the outcome: "Save changes", "Create project" —
never "Submit". The label matches what happens after the click.

## Loading and progress _(Medium)_

When an operation takes long enough to notice, say what is happening
("Saving…"). Never a bare spinner for anything that runs multiple seconds.

## Consistency _(Medium)_

One term per concept across the app — pick "delete" or "remove" and stay with
it. Sentence case for UI labels, unless the codebase already uses title case.

## In code _(Low)_

Where an i18n layer exists:

- Keep user-facing strings out of logic branches — branch on a key or state,
  look the string up at the edge.
- Never build a sentence by concatenating translated fragments; word order
  differs by language. Use one message with interpolated values.
- Pluralise through the layer's plural API, not `count === 1 ? … : …`.
- Leave room for roughly 30% text expansion in translation — no fixed-width
  buttons or labels sized to the English string.
