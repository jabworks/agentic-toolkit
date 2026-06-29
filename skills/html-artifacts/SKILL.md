---
name: html-artifacts
description: Annotate rendered HTML artifacts. Review and comment on HTML before or after implementation.
when_to_use: 'When the agent generates HTML artifacts, reports, or rendered UI that need review and annotation.'
---

# /html-artifacts

Annotate rendered HTML artifacts directly. Review and comment on HTML before or after implementation.

## Usage

```
/html-artifacts <html-file>              # Annotate a local HTML file
/html-artifacts --render <html-content>  # Render and annotate HTML content inline
/html-artifacts --preview <feature-name> # Open live HTML preview with annotation support
```

## Live HTML Preview with Annotations

After generating HTML artifacts, offer a live HTML preview:

```
HTML artifact generated. Want a live HTML preview with annotation support? 
It renders the HTML, allows you to comment on sections, and sends feedback to the agent. [y/n]
```

If yes, run the preview server:

```bash
PREVIEW_SERVER=$(find ~/.claude ~/.agents -name "preview-server.js" -path "*/html-artifacts/*" 2>/dev/null | head -1)
node "$PREVIEW_SERVER" <html-file-or-folder>
```

## How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│                    HTML ARTIFACTS                             │
├──────────────────────────────────────────────────────────────────┤
│  Step 1: GENERATE HTML                                          │
│  Agent generates HTML artifact, report, or rendered UI.         │
│                                                                  │
│  Step 2: PREVIEW WITH ANNOTATION                                │
│  Open live HTML preview server.                                 │
│  You comment on sections and provide feedback.                  │
│                                                                  │
│  Step 3: SEND FEEDBACK TO AGENT                                 │
│  Approve: HTML is accepted                                      │
│  Request Revisions: Provide specific guidance for HTML changes  │
└──────────────────────────────────────────────────────────────────┘
```

## Annotation Format

When annotating HTML artifacts, use this format for feedback to the agent:

```markdown
### Feedback for HTML Artifact

- **Section/Element [X]:** [Your comment or suggestion for HTML/CSS change]
- **Approval Status:** [Approve / Request Revisions / Deny]
- **Revision Notes:** [If denied or revisions requested, provide specific guidance]
```

## Live HTML Preview Server

The preview server is in-memory only — no HTML files are written to disk when using the live preview. When you stop the server, the preview session is closed.

Tell the user:

```
Preview running. Edit your spec files or HTML artifacts and the browser updates live.
Press Ctrl+C in the terminal to stop the server when you're done.
```

## Related Skills

- `plan-review`: Annotate plans, specs, and markdown before implementation.
- `technical-spec`: Persists feature decisions, API contracts, implementation details, and quirks into a structured, queryable spec tree.