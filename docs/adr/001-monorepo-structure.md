# ADR-001: Monorepo Structure

## Status

Accepted

## Context

The Knowledge Graph Agent System requires multiple packages (shared types, client UI, server API, MCP servers, CLI wrapper) that share code and need coordinated development. We need a strategy for organizing these packages.

## Decision

Use a Bun workspace monorepo with the following top-level packages:

- **`shared/`** - Shared types, constants, utilities, and error definitions
- **`client/`** - React + MobX frontend with Vite
- **`server/`** - NestJS backend API
- **`packages/mcp-servers/`** - MCP tool server implementations
- **`packages/claude-code-wrapper/`** - Claude Code CLI wrapper

All packages reference a shared `tsconfig.base.json` for consistent TypeScript configuration. The `shared` package is consumed by all others via workspace dependency resolution.

## Consequences

### Positive

- Single repository for all related code
- Shared types prevent drift between client and server
- Atomic commits across packages
- Simplified CI/CD pipeline
- Bun workspaces handle dependency hoisting efficiently

### Negative

- Repository size grows over time
- All developers need context on the full system
- CI runs may take longer as the project grows

### Neutral

- Requires `mprocs` for concurrent development server management
- Knowledge-graph data directory is co-located but managed as a separate git repo
