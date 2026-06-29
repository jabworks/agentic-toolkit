---
name: plan-review
description: Interactive planning system skill set plan. Annotate plans, specs, and markdown before implementation. Review diffs and PRs. Send feedback to your agent.
when_to_use: 'When the agent proposes a plan, design session, or HTML artifact before implementation.'
---

# /plan-review

Annotate plans, specs, messages, HTML, then send the feedback to your agent.

## Usage

```
/plan-review                       # Review the agent's last plan or proposal
/plan-review <markdown-file>       # Annotate a specific markdown file
/plan-review <html-file>           # Render and annotate HTML as-is
/plan-review <url>                 # Fetch and annotate any URL
```

## How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│                      PLAN REVIEW                                │
├──────────────────────────────────────────────────────────────────┤
│  Step 1: PRESENT PLAN                                           │
│  Show the plan/spec/markdown/HTML to review.                    │
│                                                                  │
│  Step 2: ANNOTATE                                               │
│  You mark up, comment, and provide feedback.                    │
│                                                                  │
│  Step 3: SEND FEEDBACK TO AGENT                                 │
│  Approve: agent proceeds with implementation                    │
│  Deny/Revise: structured feedback sent to agent for revision    │
└──────────────────────────────────────────────────────────────────┘
```

## Annotation Format

When annotating, use this format for feedback to the agent:

```markdown
### Feedback for Agent

- **Line/Section [X]:** [Your comment or suggestion]
- **Approval Status:** [Approve / Request Revisions / Deny]
- **Revision Notes:** [If denied or revisions requested, provide specific guidance]
```

## Workflow

1. **Present the Plan**: Show the agent's proposed plan, design, or markdown specification.
2. **Annotate and Comment**: Review the content and add inline comments or suggestions.
3. **Provide Approval Status**:
   - **Approve**: Agent proceeds with implementation
   - **Request Revisions**: Provide specific guidance for the agent to revise
   - **Deny**: Reject the plan and request a complete revision or alternative approach

## Sharing & Collaboration

Plans can be shared with teammates. Small plans are encoded in the URL hash. Large plans go through a short-link service with encrypted storage in the browser.

## Related Skills

- `write-plan`: Turns a signed-off design into an executable plan of lean task cards.
- `technical-spec`: Persists feature decisions, API contracts, implementation details, and quirks into a structured, queryable spec tree.
- `html-artifacts`: Annotate rendered HTML artifacts.