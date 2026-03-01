# ADR-001: Bun Workspaces Monorepo

**Status:** Accepted
**Date:** 2026-03-01
**Authors:** Initial project team

## Context

The Knowledge Graph Agent System consists of multiple distinct but tightly coupled packages: a React frontend, a NestJS backend, a shared types package, MCP server implementations, and a Claude Code wrapper. These packages need to share types, import each other's code, and be developed and tested together.

## Decision

Use a **Bun workspace monorepo** with the following top-level packages:
- `client` (`@kg/client`) — React + Vite frontend
- `server` (`@kg/server`) — NestJS backend
- `shared` (`@kg/shared`) — shared types and utilities
- `packages/mcp-servers` (`@kg/mcp-servers`) — MCP tool implementations
- `packages/claude-code-wrapper` (`@kg/claude-code-wrapper`) — Claude Code integration

## Alternatives Considered

1. **Polyrepo** — separate repositories per package. Rejected because shared type changes would require coordinating across multiple repos and PRs.

2. **Nx Monorepo** — feature-rich build orchestration. Rejected because it adds significant complexity and Bun workspaces is sufficient for this project's needs.

3. **Turborepo** — fast, incremental builds. Rejected in favor of Bun's native workspace support, which avoids adding another dependency.

4. **npm/yarn workspaces** — industry standard. Rejected in favor of Bun for runtime speed, ESM-native support, and built-in test runner.

## Consequences

**Positive:**
- Single `bun install` at the root installs all dependencies
- TypeScript project references enable cross-package go-to-definition
- `@kg/shared` types are available to both client and server with zero build overhead in development (via path aliases)
- Unified `bun test` runs all tests across packages

**Negative:**
- Bun workspace ecosystem is less mature than npm/yarn
- Some npm packages may have compatibility issues with Bun (low risk, fallback documented)
- All code lives in one repo — requires disciplined separation of concerns between packages

**Neutral:**
- Bun lockfile (`bun.lock`) is binary — diffs are not human-readable
