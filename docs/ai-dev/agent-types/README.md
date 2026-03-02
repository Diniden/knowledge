# Development Agent Types

This project uses AI agents for development tasks. Different agent types are specialized for different domains. Use this guide to understand each type's strengths and assign the right agent to each task.

## Overview

| Agent Type     | Primary Domain              | Key Context                                          |
| -------------- | --------------------------- | ---------------------------------------------------- |
| Master Planner | Architecture & coordination | `plans/`, `CLAUDE.md`, `docs/`                       |
| Frontend       | React, MobX, SCSS           | `client/ui/`, `shared/src/types/`, `shared/src/dto/` |
| Server         | NestJS, API, business logic | `server/src/`, `shared/`                             |
| Database       | Schema, migrations, queries | `server/src/db/`                                     |
| Testing        | All test types              | `**/*.test.ts`, `**/*.test.tsx`                      |
| Documentation  | Docs, plans, config         | `docs/`, `plans/`, `.cursor/`, `.claude/`            |

## Agent Definitions

### Master Planner Agent

**Purpose**: Breaks down large tasks into sub-tasks, coordinates multi-agent work, and makes architectural decisions.

**Context directories**:

- `plans/` — Architecture and design plans
- `CLAUDE.md` — Full project context
- `docs/` — Project documentation
- `BOUNDARY.md` — Dev vs. runtime boundary

**Skills**: `add-feature`, `update-ai-config`

**Capabilities**:

- Decompose features into ordered sub-tasks
- Assign sub-tasks to the correct agent type
- Resolve cross-workspace dependency ordering (shared -> db -> server -> client)
- Make technology and architecture decisions

**Limitations**:

- Should not write implementation code directly
- Delegates to specialized agents for actual coding

---

### Frontend Agent

**Purpose**: Implements React components, MobX stores, client services, hooks, and styles.

**Context directories**:

- `client/ui/src/` — All frontend source code
- `shared/src/types/` — Shared TypeScript types
- `shared/src/dto/` — Shared DTOs
- `.cursor/rules/frontend*.mdc` — Frontend conventions

**Skills**: `create-component`, `create-store`, `create-test`

**Capabilities**:

- Create and modify React components with BEM SCSS
- Create and modify MobX stores with proper decorators
- Write client-side service modules
- Write custom hooks
- Write component and store tests

**Limitations**:

- Should not modify server code
- Should not create database migrations
- Should not modify runtime agent files

---

### Server Agent

**Purpose**: Implements NestJS modules, controllers, services, DTOs, and server-side business logic.

**Context directories**:

- `server/src/modules/` — NestJS feature modules
- `server/src/` — Server root (main.ts, app.module.ts)
- `shared/src/` — Shared types and DTOs
- `.cursor/rules/server.mdc` — Server conventions

**Skills**: `create-api-endpoint`, `create-module`, `create-test`

**Capabilities**:

- Create and modify NestJS modules, controllers, services
- Define DTOs with class-validator decorators
- Implement business logic and error handling
- Write service and controller unit tests
- Write integration tests

**Limitations**:

- Should not modify frontend components or stores
- Should not modify runtime agent files (`server/src/modules/agent/prompts/`, `server/agents/`)
- Database schema changes should coordinate with the Database Agent

---

### Database Agent

**Purpose**: Manages database schema, migrations, and Drizzle ORM configuration.

**Context directories**:

- `server/src/db/` — Drizzle schema, migrations, config
- `shared/src/types/` — Shared types (for entity alignment)

**Skills**: `create-test`

**Capabilities**:

- Create and modify Drizzle ORM schema files
- Generate and write migrations
- Add indexes, constraints, and relations
- Write migration tests

**Limitations**:

- Should not modify application logic in modules
- Should not touch frontend code
- Schema changes should be reviewed before running migrations

---

### Testing Agent

**Purpose**: Writes and improves tests across all workspaces.

**Context directories**:

- `**/*.test.ts`, `**/*.test.tsx` — All test files
- `**/__fixtures__/` — Test fixtures
- Source files being tested

**Skills**: `create-test`, `debug`

**Capabilities**:

- Write unit tests for any workspace
- Write integration tests for server modules
- Write component tests with @testing-library/react
- Write E2E tests with Playwright
- Diagnose failing tests

**Limitations**:

- Should not refactor production code (only test code)
- Should not add features — only verify existing behavior

---

### Documentation Agent

**Purpose**: Maintains documentation, plans, and AI configuration files.

**Context directories**:

- `docs/` — All documentation
- `plans/` — Architecture and design plans
- `.cursor/rules/` — Cursor rules
- `.cursor/skills/` — Cursor skills
- `.claude/` — Claude Code config
- `CLAUDE.md` — Master context

**Skills**: `update-ai-config`, `create-cursor-rule`

**Capabilities**:

- Write and update documentation
- Create and update Cursor rules and skills
- Update CLAUDE.md and related config
- Maintain the AI dev changelog

**Limitations**:

- Should not modify application source code
- Should not modify runtime agent files
- Changes should maintain consistency with existing docs

## Delegation Guidelines

1. **Single workspace tasks** — Assign to the matching specialized agent
2. **Cross-workspace features** — Use the Master Planner to decompose, then delegate each part
3. **Bug fixes** — Assign to the agent matching the buggy code's workspace
4. **Refactoring** — Assign to the workspace agent; use Master Planner if cross-workspace

See `selection-guide.md` for a decision tree.
