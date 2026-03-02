<!-- Domain: Cross-reference document — not a config file -->

# Development vs Runtime Configuration Boundary

This document is the single source of truth for distinguishing **development-time AI configuration** (files that help humans build this project) from **application-runtime AI configuration** (files that the deployed application uses to drive its agent system for end users).

## Directory Map

| Development Config (dev-time)    | Application Runtime Config          |
| -------------------------------- | ----------------------------------- |
| `CLAUDE.md` (root)               | `server/src/modules/agent/`         |
| `BOUNDARY.md` (this file)        | `server/src/modules/agent/prompts/` |
| `.claude/`                       | `server/src/modules/agent/skills/`  |
| `.cursor/rules/`                 | `server/agents/templates/`          |
| `.cursor/skills/`                | `server/agents/skills/`             |
| `scripts/ai-dev/`                | `server/agents/config.json`         |
| `docs/ai-dev/`                   | `server/src/modules/mcp-servers/`   |
| `plans/13-AI-DEV-CONFIGURATION/` | `packages/mcp-servers/`             |
|                                  | `packages/claude-code-wrapper/`     |
|                                  | `knowledge-graph/` (runtime data)   |

## What Goes Where

### Development Config — helps developers write code

- **CLAUDE.md**: Master context file loaded by Claude Code for every dev session. Contains project identity, tech stack, coding standards, workflow commands, skill index, boundary warning.
- **.claude/**: Claude Code-specific settings and commands for development.
- **.cursor/rules/**: Cursor rule files that guide Cursor's AI when editing project files. Glob-matched to file types.
- **.cursor/skills/**: Cursor skill files (`SKILL.md` format) with step-by-step instructions for common development tasks.
- **scripts/ai-dev/**: Validation scripts for AI config (sandbox validation, CLAUDE.md linting, drift detection, health checks).
- **docs/ai-dev/**: Documentation about the AI dev config system (onboarding, changelog, agent type specs).
- **Claude Code skills** (`skill-*.md` in root or `.claude/`): Step-by-step guides for Claude Code to perform development tasks.

### Application Runtime Config — used by the deployed application

- **server/src/modules/agent/**: NestJS module that orchestrates AI agents at runtime (session management, prompt assembly, tool execution).
- **server/src/modules/agent/prompts/**: CLAUDE.md templates assembled per-session for runtime agents.
- **server/src/modules/agent/skills/**: Runtime skill files deployed with the application.
- **server/agents/**: Runtime agent templates, skills, and configuration.
- **server/src/modules/mcp-servers/**: Application MCP servers (knowledge graph, RAG, etc.).
- **packages/mcp-servers/**: MCP server package implementations.
- **packages/claude-code-wrapper/**: Wrapper for Claude Code CLI used by the runtime agent system.
- **knowledge-graph/**: The actual knowledge data that runtime agents operate on.

## When In Doubt — Decision Tree

```
Is this file used when BUILDING the project?
├── YES → Development Config
│   ├── Does it guide AI tools (Claude Code, Cursor)? → .claude/, .cursor/, CLAUDE.md
│   ├── Does it validate AI config? → scripts/ai-dev/
│   └── Does it document AI config? → docs/ai-dev/
│
└── NO → Is this file used when RUNNING the deployed application?
    ├── YES → Application Runtime Config
    │   ├── Does it configure agent behavior? → server/src/modules/agent/
    │   ├── Does it define MCP tools? → server/src/modules/mcp-servers/
    │   └── Is it knowledge data? → knowledge-graph/
    │
    └── NO → It's regular application code (not a config boundary concern)
```

## Rules

1. **Dev config files never import or reference runtime config files** in imperative code.
2. **Runtime config files never import or reference dev config files** (`.cursor/`, `.claude/`, root `CLAUDE.md`).
3. **Cursor rule files about the agent system** (`agent-system-runtime.md`) may reference runtime concepts (MCP tools, sessions) because they describe _how to write code_ for that system — the boundary is about file modifications, not conceptual references.
4. **A commit touching both domains** triggers an advisory pre-commit warning. The developer must verify the cross-domain change is intentional.
5. **CI validation** (`scripts/ai-dev/validate-sandbox.ts`) enforces the boundary on every PR. Merge is blocked on violations.
