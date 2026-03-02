# Agent Type Template

Use this template when defining a new development agent type. Copy the structure below and fill in each section.

---

## {Agent Name} Agent

### Description

{1-2 sentence description of what this agent does and its primary responsibility.}

### Context Directories

Directories this agent should read for context before starting work:

```
- {path/to/dir1/}    # {what this contains}
- {path/to/dir2/}    # {what this contains}
```

### Skills

Skills this agent is expected to use:

- `{skill-name}` — {when this skill applies}
- `{skill-name}` — {when this skill applies}

### Rules

Cursor rules that govern this agent's output:

- `.cursor/rules/{rule}.mdc` — {what it covers}

### Capabilities

What this agent can do:

- {Capability 1}
- {Capability 2}
- {Capability 3}

### Limitations

What this agent should NOT do:

- {Limitation 1}
- {Limitation 2}

### Example Tasks

| Task Description | Expected Approach          |
| ---------------- | -------------------------- |
| "{example task}" | {how the agent handles it} |
| "{example task}" | {how the agent handles it} |

### Handoff Format

When the Master Planner delegates to this agent, the handoff should include:

```
Agent: {Agent Name}
Task: {specific description of what to do}
Files: {list of files to create or modify}
Dependencies: {what must be completed first}
Expected Output: {what the agent should produce}
```

---

## Checklist for New Agent Types

- [ ] Agent has a clear, non-overlapping domain
- [ ] Context directories are specific and minimal
- [ ] Skills are listed and exist in `.cursor/skills/`
- [ ] Limitations prevent boundary violations (especially runtime agent files)
- [ ] At least 2 example tasks demonstrate typical usage
- [ ] Agent is added to `docs/ai-dev/agent-types/README.md`
- [ ] Agent is added to `docs/ai-dev/agent-types/selection-guide.md`
