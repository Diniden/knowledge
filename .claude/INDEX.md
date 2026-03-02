# Skills Index

> Development-time AI skill files for Claude Code. Each skill provides step-by-step instructions for a common development task in this project.

These are **development-time** configuration files. They do NOT affect the application's runtime behavior. See `BOUNDARY.md` for the full dev-vs-runtime boundary reference.

---

## Frontend

| Skill            | Description                                                                | File                                                       |
| ---------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Create Component | Scaffold a React component with BEM SCSS, props, barrel export, and test   | [`skill-create-component.md`](./skill-create-component.md) |
| Create Store     | Scaffold a MobX store with observables, computed values, actions, and test | [`skill-create-store.md`](./skill-create-store.md)         |

## Server

| Skill               | Description                                                              | File                                                             |
| ------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Create API Endpoint | Scaffold a NestJS endpoint with DTOs, service, Swagger, auth, and tests  | [`skill-create-api-endpoint.md`](./skill-create-api-endpoint.md) |
| Create Migration    | Create a Drizzle ORM migration: update schema, generate SQL, apply, test | [`skill-create-migration.md`](./skill-create-migration.md)       |

## Knowledge Graph

| Skill         | Description                                                                      | File                                                 |
| ------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------- |
| KG Operations | Develop and extend the knowledge graph module (types, service, endpoints, tests) | [`skill-kg-operations.md`](./skill-kg-operations.md) |

## Testing

| Skill       | Description                                           | File                                             |
| ----------- | ----------------------------------------------------- | ------------------------------------------------ |
| Create Test | Create unit, integration, or E2E tests for any module | [`skill-create-test.md`](./skill-create-test.md) |

## Full-Stack

| Skill       | Description                                                                      | File                                             |
| ----------- | -------------------------------------------------------------------------------- | ------------------------------------------------ |
| Add Feature | Orchestrate a full vertical slice across shared types, DB, server, store, and UI | [`skill-add-feature.md`](./skill-add-feature.md) |
| Debug       | Systematic debugging: reproduce, isolate, fix, add regression test               | [`skill-debug.md`](./skill-debug.md)             |
| Refactor    | Safe refactoring with incremental changes and test verification at each step     | [`skill-refactor.md`](./skill-refactor.md)       |

## Meta

| Skill           | Description                                                                    | File                                                     |
| --------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Update Config   | Safely modify AI development configuration (CLAUDE.md, rules, skills, scripts) | [`skill-update-config.md`](./skill-update-config.md)     |
| Create MCP Tool | Add a tool to the application's runtime MCP server (not dev tools)             | [`skill-create-mcp-tool.md`](./skill-create-mcp-tool.md) |
