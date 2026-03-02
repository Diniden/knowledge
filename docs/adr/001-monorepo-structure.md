# ADR-001: Monorepo Structure

**Status**: Accepted

## Context

We need a project structure that supports a React frontend, NestJS backend, shared types, knowledge graph data, and internal packages (MCP servers, Claude wrapper). The codebase will grow significantly across multiple domains.

## Decision

Use a **Bun workspace monorepo** with the following layout:

- `client/` — React + Vite (ui + gen)
- `server/` — NestJS
- `shared/` — @kg/shared package (types, constants, utils, errors)
- `packages/*` — Internal packages
- `knowledge-graph/` — Git-tracked JSON data
- `plans/` — Design documents
- `scripts/` — Build and dev scripts

**Alternatives considered**:
- **Polyrepo**: Too much overhead for this team size; shared types would require npm publishing.
- **Nx/Turborepo**: Additional tooling; Bun workspaces are sufficient for current scale.

## Consequences

- Single `bun install` at root
- Shared types via `@kg/shared` workspace dependency
- Build order: shared → server → client
- Dev script orchestrates parallel servers
