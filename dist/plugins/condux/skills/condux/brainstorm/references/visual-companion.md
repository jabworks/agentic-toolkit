# Visual Companion

Reference for `/brainstorm`. Use when spatial or visual content communicates better than text alone.

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
xdg-open /tmp/brainstorm-<topic>-$(date +%Y%m).html   # Linux
open /tmp/brainstorm-<topic>-$(date +%Y%m).html        # macOS
```

Use semantic filenames: `brainstorm-checkout-flow-202601.html`

## HTML Guidelines

- Max 2–4 options per page — more causes decision paralysis
- Show real content, not lorem ipsum
- Label each option clearly: **Option A**, **Option B**
- One-line rationale under each option
- Keep it light — mockup fidelity, not production polish

## What NOT to Do

```
✗ Building a multi-file app just for a mockup
✗ Requiring the user to start a server
✗ Showing more than 4 options at once
✗ Lorem ipsum placeholders when real content is possible
```

## Return to Terminal

After the user reviews the visual, return to the brainstorm sign-off flow. Capture the decision, note which option was chosen, and continue with `/write-plan` or the next step.
