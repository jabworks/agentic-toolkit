# Visual Companion

Reference for `/discovery`. Use when spatial or visual content communicates better than text alone.

## When to Go Visual

**Use a browser visual** when:
- Comparing 2–4 UI layout options side-by-side
- Architecture diagrams where spatial relationships matter
- Component hierarchy that's easier to parse visually
- Design polish decisions where aesthetic is the question

**Stay in terminal** when:
- Clarifying requirements (A/B/C prose is fine)
- Tradeoff analysis (a markdown table works)
- The question has a clear right answer
- The user would answer in one word

## How to Generate

Write a **self-contained HTML file** — inline all CSS, no external dependencies:

```bash
# Write the file, then open:
xdg-open /tmp/discovery-<topic>-$(date +%Y%m).html   # Linux
open /tmp/discovery-<topic>-$(date +%Y%m).html        # macOS
```

Use semantic filenames: `discovery-checkout-flow-202601.html`

Tag each option's container element with `data-choice="<label>"` (e.g.
`<div data-choice="Option A">`). This is inert for a plain open-in-browser
glance, but it's what the interactive picker below wires up — so add it by
default.

## HTML Guidelines

- Max 2–4 options per page — more causes decision paralysis
- Show real content, not lorem ipsum
- Label each option clearly: **Option A**, **Option B**
- Tag each option container with `data-choice="Option A"` for click-to-select
- One-line rationale under each option
- Keep it light — mockup fidelity, not production polish

## Interactive Pick (Optional)

For a plain glance, opening the file is enough — the user tells you their pick
in chat. When you want the choice to come **straight back to you** without the
user re-typing it, serve the mockup through the picker server. The agent
launches it; the user never starts anything.

Locate the script from the installed `discovery` skill and launch it in the
background, pointing at the mockup file:

```bash
CHOICE=$(find ~/.claude ~/.agents ~/.codex -name "choice-server.js" -path "*/discovery/*" 2>/dev/null | head -1)
node "$CHOICE" /tmp/discovery-checkout-flow-202601.html          # single-select
node "$CHOICE" /tmp/discovery-checkout-flow-202601.html --multi  # multi-select
```

It opens the browser automatically. In single mode a click submits instantly;
in `--multi` mode clicks toggle a selection and a bottom bar sends the set plus
an optional note. Then **block on the long-poll** and continue once it resolves:

```bash
curl -s http://127.0.0.1:7788/api/choice
# → {"choices":["Option B"],"note":"B, but with A's header","submittedAt":"…"}
```

The server is one-shot: it delivers the pick and exits — no HTML is written to
disk, nothing for the user to clean up. Port defaults to `7788` (distinct from
`plan-review`'s `7777`, so both can run at once); pass `--port <n>` to override.

## What NOT to Do

```
✗ Building a multi-file app just for a mockup
✗ Making the user start or manage a server (the agent launches the picker itself)
✗ Showing more than 4 options at once
✗ Lorem ipsum placeholders when real content is possible
```

## Return to Terminal

After the user reviews the visual, return to the discovery sign-off flow. If
you used the picker, the chosen option(s) and any note arrive over the
long-poll; otherwise capture the decision from chat. Note which option was
chosen, then continue with `/draft-plan` or the next step.
