# Spawn Rules

Reference for deciding when and which agent to spawn. Read this before every spawn decision.

## Agent Cost Tiers

| Tier          | Examples                  | When to Use                                                                                 |
| ------------- | ------------------------- | ------------------------------------------------------------------------------------------- |
| **FREE**      | —                         | Built-in tool calls (bash, grep, file reads) — do these yourself, no agent needed           |
| **CHEAP**     | `explorer`, `researcher`  | Read-only, narrow scope, clear output. Good for lookup tasks that would bloat your context  |
| **EXPENSIVE** | `coder`, `planner`        | Write-capable or high-context output. Justify carefully                                     |

## Agent Capability Boundaries

| Agent        | Can Read          | Can Write    | Can Bash   | Use For                                                         |
| ------------ | ----------------- | ------------ | ---------- | --------------------------------------------------------------- |
| `explorer`   | ✓ filesystem, git | ✗            | ✗          | Codebase traversal: find patterns, map structure, locate usages |
| `researcher` | ✓ MCP, web, docs  | ✗            | ✗          | External research: library docs, API specs, best practices      |
| `coder`      | ✓                 | ✓ full file  | ✓          | Implementation tasks with isolated scope                        |
| `planner`    | ✓                 | ✓ write only | ✗          | Architecture decisions, task breakdowns, ADRs                   |

**Hard rule:** Specialists receive task context via delegation prompt only. They do not and should not query the plan file directly.

## Spawn Decision Tree

```
Do I need to do something?
│
├─ Can I do it with a tool call (bash, grep, read)?
│   YES → Do it yourself. No agent needed.
│
├─ Is it a read-only exploration across many files?
│   YES → Is it blocking my current work?
│          YES → Spawn explorer (CHEAP), continue with other work, retrieve later
│          NO  → Do it yourself with grep/read
│
├─ Is it external research (library, API, docs)?
│   YES → Spawn researcher (CHEAP), continue with other work, retrieve later
│
├─ Is it an isolated implementation task?
│   YES → Is it independent of my current work?
│          YES → Can it run in parallel?
│                 YES → Spawn coder (EXPENSIVE), but only if context savings justify it
│                 NO  → Do it yourself
│          NO  → Do it yourself
│
└─ Is it a code review?
    → Use /code-review skill inline — do not spawn a subagent for reviews
```

## Parallel Safety Checklist

Before spawning two agents simultaneously:

```
□ Task A and Task B write to different files
□ Task A does not depend on Task B's output (and vice versa)
□ No active coder agent is running
□ Both tasks have clear, independent scope
□ You can integrate both outputs without conflicts
```

If any box is unchecked → run sequentially, not in parallel.

## Common Mistakes

| Mistake                                     | Why It Wastes Tokens                                                                       | Correct Behavior                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Spawning explorer while coder is running    | Explorer results arrive while coder is mid-task, causing a re-read and integration overhead | Wait for coder to finish, then explore if needed |
| Spawning a subagent for code review         | Review loop compounds with fix loop, multiplying token cost                                | Use /code-review skill inline, once, on request  |
| Spawning coder for a 10-line change         | Delegation overhead costs more than the implementation                                     | Do it yourself                                   |
| Spawning generic agent with injected prompt | Bypasses capability boundaries, unpredictable behavior                                     | Use only named pre-defined agents                |
| Blocking on researcher while work is ready  | Main session idles waiting for non-critical research                                       | Fire research non-blocking, continue other tasks |
