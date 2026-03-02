# Agent Selection Guide

Use this decision tree to choose the right agent type for a given task.

## Decision Tree

```
START: What is the task?
│
├─ Planning or architecture?
│  └─ YES → Master Planner Agent
│
├─ Spans multiple workspaces?
│  └─ YES → Master Planner Agent (to decompose)
│       └─ Then delegate sub-tasks to specialized agents
│
├─ Single workspace?
│  │
│  ├─ Frontend code (client/ui/)?
│  │  ├─ Component? → Frontend Agent (create-component skill)
│  │  ├─ Store? → Frontend Agent (create-store skill)
│  │  ├─ Service? → Frontend Agent
│  │  ├─ Hook? → Frontend Agent
│  │  └─ Style? → Frontend Agent
│  │
│  ├─ Server code (server/src/modules/)?
│  │  ├─ New module? → Server Agent (create-module skill)
│  │  ├─ New endpoint? → Server Agent (create-api-endpoint skill)
│  │  └─ Business logic? → Server Agent
│  │
│  ├─ Database (server/src/db/)?
│  │  ├─ Schema change? → Database Agent
│  │  └─ Migration? → Database Agent
│  │
│  └─ Shared (shared/src/)?
│     └─ Types or DTOs? → Server Agent (owns shared type alignment)
│
├─ Testing only?
│  └─ YES → Testing Agent (create-test skill)
│
├─ Documentation only?
│  └─ YES → Documentation Agent
│
├─ AI config change?
│  └─ YES → Documentation Agent (update-ai-config skill)
│
├─ Bug fix?
│  │
│  ├─ Know which file? → Agent matching that file's workspace
│  └─ Unknown source? → Master Planner (to investigate, then delegate)
│
└─ Refactoring?
   ├─ Single workspace? → Agent matching that workspace (refactor skill)
   └─ Cross-workspace? → Master Planner (to decompose)
```

## Quick Reference by Artifact

| Primary Artifact         | Agent Type     |
| ------------------------ | -------------- |
| `.tsx` component         | Frontend       |
| `.module.scss` file      | Frontend       |
| `.store.ts` file         | Frontend       |
| `.service.ts` (client)   | Frontend       |
| `use-*.ts` hook          | Frontend       |
| `.controller.ts`         | Server         |
| `.service.ts` (server)   | Server         |
| `.module.ts` (NestJS)    | Server         |
| `.dto.ts`                | Server         |
| `schema.ts` / migration  | Database       |
| `.test.ts` / `.test.tsx` | Testing        |
| `.md` documentation      | Documentation  |
| `.mdc` Cursor rule       | Documentation  |
| `SKILL.md`               | Documentation  |
| `plans/*.md`             | Master Planner |
| Multi-workspace feature  | Master Planner |

## Examples

| Task                                     | Agent          | Rationale                              |
| ---------------------------------------- | -------------- | -------------------------------------- |
| "Add a SpecCard component"               | Frontend       | Single component in `client/ui/`       |
| "Add a tags endpoint to the spec module" | Server         | Controller + service in `server/src/`  |
| "Add a tags table to the database"       | Database       | Schema + migration in `server/src/db/` |
| "Implement full tagging feature"         | Master Planner | Spans DB, server, and client           |
| "Fix failing auth test"                  | Testing        | Test investigation + fix               |
| "Add a Cursor rule for form components"  | Documentation  | AI config change                       |
| "Rename SpecStore to DocumentStore"      | Master Planner | Cross-workspace rename                 |
