# 00 — MASTER PLAN: Knowledge Graph Agent System

> **Purpose**: This document is the single authoritative index for every plan
> file in the project. It defines execution phases, inter-plan dependencies,
> the critical path, and estimated task counts so any contributor (human or
> agent) can orient themselves instantly.

---

## 1. Project Overview

The Knowledge Graph Agent System is a collaborative knowledge management
platform where humans author structured knowledge through AI-assisted dialog.
Knowledge is organized into a graph of interconnected specs, fed into a RAG
model and a node-edge graph model, enabling AI agents to consume the knowledge
and produce step-by-step execution plans to build products.

### Core Principles

- **Human-input, agent-output**: people express ideas; agents produce plans.
- **Spec-centric**: every piece of knowledge is a discrete, versioned spec.
- **Graph-first**: relationships between specs are first-class citizens.
- **Anti-siloing**: there is never "no access" — always at least a summary.
- **Git-native**: version control is the synchronization primitive.
- **Agent-assistive**: the AI always works alongside the user, never in isolation.

### Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, BEM CSS (SCSS, PascalCase__Item, PascalCase--prop) |
| Backend | NestJS, ESM |
| Runtime | Bun |
| Database | PostgreSQL |
| Knowledge Store | JSON + folders (git-backed) |
| Auth | bcrypt, JWT (http-only cookies) |
| Agent Runtime | Claude Code (wrapper) |
| Agent Tools | MCP servers |
| Version Control | git |
| Testing | bun test |

### Monorepo Structure (High Level)

```
project-root/
├── .claude/                # Claude Code dev config (DEVELOPMENT-TIME ONLY)
├── .cursor/rules/          # Cursor rule files (DEVELOPMENT-TIME ONLY)
├── CLAUDE.md               # Master dev CLAUDE.md (DEVELOPMENT-TIME ONLY)
├── client/                 # Frontend application
│   ├── ui/                 # Main platform UI (React + Vite)
│   └── gen/                # Generative UI projects (agent-created)
│       └── {user}/{project}/
├── server/                 # Backend (NestJS)
│   ├── agents/             # APP-RUNTIME agent configs (Claude Code wrapper, skills, templates)
│   └── mcp-servers/        # APP-RUNTIME MCP server implementations
├── knowledge-graph/        # Knowledge graph data (JSON + folders, git-tracked)
├── shared/                 # Shared types, interfaces, utilities
├── packages/               # Internal packages
├── plans/                  # Plan documents (this directory)
├── scripts/                # Build, dev, deploy scripts
└── config/                 # Shared configuration
```

---

## 2. Plan Index

Every plan document and its companion questions file, organized by domain.

### 00 — Master

| File | Description |
|------|-------------|
| `00-MASTER-PLAN.md` | This file. Project-wide index, phases, dependencies, critical path. |
| `00-MASTER-PLAN-QUESTIONS.md` | Open questions about phasing, priorities, MVP scope, team allocation. |

### 01 — Project Structure

| File | Description |
|------|-------------|
| `01-PROJECT-STRUCTURE/PLAN.md` | Monorepo layout, workspace config, build system, dev workflow, CI/CD scaffolding. |
| `01-PROJECT-STRUCTURE/QUESTIONS.md` | Questions on workspace naming, package boundaries, shared code strategy. |

### 02 — Frontend

| File | Description |
|------|-------------|
| `02-FRONTEND/01-ARCHITECTURE-PLAN.md` | Frontend architecture: module system, state management, routing, code splitting, error boundaries. |
| `02-FRONTEND/02-COMPONENTS-PLAN.md` | Component library: design system, atomic components, composite components, layout system. |
| `02-FRONTEND/03-STYLING-PLAN.md` | BEM CSS with SCSS: naming conventions, theming, responsive design, dark mode. |
| `02-FRONTEND/04-GENERATIVE-UI-PLAN.md` | Sandboxed iframe ESM projects, agent-generated UI, dynamic loading, security. |
| `02-FRONTEND/05-CHAT-DIALOG-PLAN.md` | Always-visible chat panel, interactive messages, graph links in messages, hotkey activation. |
| `02-FRONTEND/06-SPEC-EDITOR-PLAN.md` | Markdown spec document editor, rich text, spec boundaries, inline agent assistance. |
| `02-FRONTEND/07-KNOWLEDGE-GRAPH-UI-PLAN.md` | Graph visualization, node/edge rendering, navigation, filtering, zoom/pan. |
| `02-FRONTEND/08-VERSION-CONTROL-UI-PLAN.md` | Diff view (light indications), revert UI, branch management, merge conflict resolution. |

### 03 — Server

| File | Description |
|------|-------------|
| `03-SERVER/01-ARCHITECTURE-PLAN.md` | NestJS architecture: modules, providers, middleware, guards, interceptors, ESM config. |
| `03-SERVER/02-API-PLAN.md` | REST API design: endpoints, DTOs, validation, pagination, error handling. |
| `03-SERVER/03-AUTH-PLAN.md` | Authentication: bcrypt hashing, JWT issuance, http-only cookies, session management. |
| `03-SERVER/04-AGENT-ORCHESTRATION-PLAN.md` | Agent session lifecycle, request routing, sub-agent delegation, result merging. |
| `03-SERVER/05-GIT-INTEGRATION-PLAN.md` | Git operations: commit, branch, merge, diff, sync between users. |
| `03-SERVER/06-WEBSOCKET-PLAN.md` | WebSocket connections: real-time agent status, typing indicators, progress updates. |

### 04 — Knowledge Graph

| File | Description |
|------|-------------|
| `04-KNOWLEDGE-GRAPH/01-ARCHITECTURE-PLAN.md` | Graph data model: JSON/folder structure, node schema, edge schema, indexing. |
| `04-KNOWLEDGE-GRAPH/02-OPERATIONS-PLAN.md` | CRUD operations, graph traversal, edge creation, orphan detection, inquiry queue. |
| `04-KNOWLEDGE-GRAPH/03-VERSION-CONTROL-PLAN.md` | Spec-level versioning, commit association, revert mechanics, branch/merge at spec level. |

### 05 — RAG Layer

| File | Description |
|------|-------------|
| `05-RAG-LAYER/PLAN.md` | Embedding pipeline, chunking strategy, vector store, retrieval API, version-aware indexing. |

### 06 — Agent System

| File | Description |
|------|-------------|
| `06-AGENT-SYSTEM/01-ARCHITECTURE-PLAN.md` | Agent types, routing logic, session management, context assembly, output handling. |
| `06-AGENT-SYSTEM/02-CLAUDE-CODE-WRAPPER-PLAN.md` | Claude Code integration: process spawning, sandboxing, prompt construction, output parsing. |
| `06-AGENT-SYSTEM/03-MCP-SERVERS-PLAN.md` | MCP server implementations: knowledge graph tools, RAG tools, gen-UI tools, plan tools. |
| `06-AGENT-SYSTEM/04-SKILLS-CONFIG-PLAN.md` | Agent skill definitions, project-specific skill configuration, skill selection logic. |
| `06-AGENT-SYSTEM/05-PLAN-GENERATION-PLAN.md` | Plan output format, delta detection, subgraph traversal, plan-as-knowledge-graph, execution linking. |

### 07 — Database

| File | Description |
|------|-------------|
| `07-DATABASE/PLAN.md` | PostgreSQL schema, migrations, connection pooling, query optimization, seed data. |

### 08 — Testing

| File | Description |
|------|-------------|
| `08-TESTING/01-STRATEGY-PLAN.md` | Overall testing strategy: test pyramid, coverage targets, CI integration. |
| `08-TESTING/02-FRONTEND-TESTING-PLAN.md` | Component tests, integration tests, E2E tests, visual regression. |
| `08-TESTING/03-SERVER-TESTING-PLAN.md` | Unit tests, integration tests, API contract tests, database tests. |
| `08-TESTING/04-AGENT-TESTING-PLAN.md` | Agent behavior tests, MCP tool tests, plan output validation, mock strategies. |

### 09 — Security

| File | Description |
|------|-------------|
| `09-SECURITY/PLAN.md` | Threat model, input sanitization, CSP, iframe sandboxing, token management, audit logging. |

### 10 — Collaboration

| File | Description |
|------|-------------|
| `10-COLLABORATION/PLAN.md` | Multi-user sync via git, conflict resolution, dialog forking, permission propagation. |

### 11 — Deployment

| File | Description |
|------|-------------|
| `11-DEPLOYMENT/PLAN.md` | Docker images, orchestration, environment configuration, monitoring, rollback. |

### 12 — Code Generation

| File | Description |
|------|-------------|
| `12-CODE-GENERATION/PLAN.md` | Plan execution engine, code output, testing validation, CI/CD integration, delta application. |

### 13 — AI Development Configuration

> **IMPORTANT**: This is configuration for BUILDING the project (development-time AI tooling), NOT the application's runtime agent system (covered in 06-AGENT-SYSTEM). These two domains are strictly sandboxed.

| File | Description |
|------|-------------|
| `13-AI-DEV-CONFIGURATION/PLAN.md` | Development-time AI config: CLAUDE.md, .cursor/rules/, skills, agent types, self-updating config, master planner. Strictly sandboxed from app-runtime agent configs. |
| `13-AI-DEV-CONFIGURATION/QUESTIONS.md` | Questions on sandboxing boundaries, config design, cross-tool compatibility, maintenance. |

---

## 3. Execution Phases

### Phase 1: Foundation (Weeks 1–4)

> Get the monorepo running with basic client/server communication, database,
> and authentication.

| # | Milestone | Primary Plans |
|---|-----------|---------------|
| 1.1 | Monorepo scaffolding, workspaces, build system | `01-PROJECT-STRUCTURE/PLAN.md` |
| 1.2 | Shared types package | `01-PROJECT-STRUCTURE/PLAN.md` |
| 1.3 | NestJS server skeleton with ESM | `03-SERVER/01-ARCHITECTURE-PLAN.md` |
| 1.4 | PostgreSQL schema and migrations | `07-DATABASE/PLAN.md` |
| 1.5 | Authentication (bcrypt + JWT + http-only) | `03-SERVER/03-AUTH-PLAN.md` |
| 1.6 | Vite + React client skeleton | `02-FRONTEND/01-ARCHITECTURE-PLAN.md` |
| 1.7 | BEM/SCSS styling foundation | `02-FRONTEND/03-STYLING-PLAN.md` |
| 1.8 | Base component library | `02-FRONTEND/02-COMPONENTS-PLAN.md` |
| 1.9 | REST API skeleton with validation | `03-SERVER/02-API-PLAN.md` |
| 1.10 | WebSocket infrastructure | `03-SERVER/06-WEBSOCKET-PLAN.md` |
| 1.11 | Testing harness (bun test) | `08-TESTING/01-STRATEGY-PLAN.md` |
| 1.12 | Security baseline (CSP, sanitization) | `09-SECURITY/PLAN.md` |
| 1.13 | Docker dev environment | `11-DEPLOYMENT/PLAN.md` |
| 1.14 | AI dev configuration bootstrap (CLAUDE.md, .cursor/rules/, core skills) | `13-AI-DEV-CONFIGURATION/PLAN.md` |

**Exit criteria**: `bun dev` launches client + server + database; a user can
register, log in, and receive a JWT; CI runs tests green.

---

### Phase 2: Core Systems (Weeks 5–10)

> Build the knowledge graph, spec editor, and version control — the product's
> core value.

| # | Milestone | Primary Plans |
|---|-----------|---------------|
| 2.1 | Knowledge graph data model (JSON + folders) | `04-KNOWLEDGE-GRAPH/01-ARCHITECTURE-PLAN.md` |
| 2.2 | Graph CRUD operations | `04-KNOWLEDGE-GRAPH/02-OPERATIONS-PLAN.md` |
| 2.3 | Spec-level version control (git-backed) | `04-KNOWLEDGE-GRAPH/03-VERSION-CONTROL-PLAN.md` |
| 2.4 | Git integration service | `03-SERVER/05-GIT-INTEGRATION-PLAN.md` |
| 2.5 | Spec document editor UI | `02-FRONTEND/06-SPEC-EDITOR-PLAN.md` |
| 2.6 | Knowledge graph visualization UI | `02-FRONTEND/07-KNOWLEDGE-GRAPH-UI-PLAN.md` |
| 2.7 | Version control UI (diff, revert, branch) | `02-FRONTEND/08-VERSION-CONTROL-UI-PLAN.md` |
| 2.8 | Permissions system (full/summary access) | `09-SECURITY/PLAN.md` |
| 2.9 | REST API: spec, graph, version endpoints | `03-SERVER/02-API-PLAN.md` |
| 2.10 | RAG pipeline: embed, index, retrieve | `05-RAG-LAYER/PLAN.md` |
| 2.11 | Database tables for sessions, permissions, audit | `07-DATABASE/PLAN.md` |
| 2.12 | Server + frontend testing for core flows | `08-TESTING/02-FRONTEND-TESTING-PLAN.md`, `08-TESTING/03-SERVER-TESTING-PLAN.md` |

**Exit criteria**: a user can create spec documents, specs form graph nodes with
edges, specs are git-versioned, diff view works, RAG retrieval returns relevant
specs.

---

### Phase 3: Agent Integration (Weeks 11–16)

> Wire up Claude Code as the agent runtime, build MCP tools, and enable
> conversational knowledge authoring.

| # | Milestone | Primary Plans |
|---|-----------|---------------|
| 3.1 | Agent architecture and routing | `06-AGENT-SYSTEM/01-ARCHITECTURE-PLAN.md` |
| 3.2 | Claude Code wrapper (spawn, sandbox, parse) | `06-AGENT-SYSTEM/02-CLAUDE-CODE-WRAPPER-PLAN.md` |
| 3.3 | MCP servers: graph tools | `06-AGENT-SYSTEM/03-MCP-SERVERS-PLAN.md` |
| 3.4 | MCP servers: RAG tools | `06-AGENT-SYSTEM/03-MCP-SERVERS-PLAN.md` |
| 3.5 | MCP servers: spec CRUD tools | `06-AGENT-SYSTEM/03-MCP-SERVERS-PLAN.md` |
| 3.6 | Agent orchestration service | `03-SERVER/04-AGENT-ORCHESTRATION-PLAN.md` |
| 3.7 | Chat dialog UI (always visible, interactive) | `02-FRONTEND/05-CHAT-DIALOG-PLAN.md` |
| 3.8 | Agent session management + WebSocket updates | `03-SERVER/06-WEBSOCKET-PLAN.md` |
| 3.9 | Skills and configuration | `06-AGENT-SYSTEM/04-SKILLS-CONFIG-PLAN.md` |
| 3.10 | Agent testing framework | `08-TESTING/04-AGENT-TESTING-PLAN.md` |

**Exit criteria**: user can converse with an agent in the chat panel; the agent
can read the graph, propose specs, create edges, and answer questions using RAG.

---

### Phase 4: Advanced Features (Weeks 17–22)

> Generative UI, plan generation, multi-user collaboration, and delta-based
> code output.

| # | Milestone | Primary Plans |
|---|-----------|---------------|
| 4.1 | Generative UI sandbox (iframe + ESM) | `02-FRONTEND/04-GENERATIVE-UI-PLAN.md` |
| 4.2 | MCP servers: gen-UI tools | `06-AGENT-SYSTEM/03-MCP-SERVERS-PLAN.md` |
| 4.3 | Plan generation engine | `06-AGENT-SYSTEM/05-PLAN-GENERATION-PLAN.md` |
| 4.4 | Code generation + execution | `12-CODE-GENERATION/PLAN.md` |
| 4.5 | Multi-user collaboration (git sync) | `10-COLLABORATION/PLAN.md` |
| 4.6 | Conflict resolution UI | `02-FRONTEND/08-VERSION-CONTROL-UI-PLAN.md` |
| 4.7 | Permission token sharing | `09-SECURITY/PLAN.md` |
| 4.8 | Graph crawl for cascading implications | `04-KNOWLEDGE-GRAPH/02-OPERATIONS-PLAN.md` |
| 4.9 | Delta detection for plan generation | `06-AGENT-SYSTEM/05-PLAN-GENERATION-PLAN.md` |
| 4.10 | Inquiry queue (agent flags issues for user) | `04-KNOWLEDGE-GRAPH/02-OPERATIONS-PLAN.md` |

**Exit criteria**: agent can generate sandboxed UI, produce execution plans from
the graph, apply deltas to a codebase; multiple users can sync and resolve
conflicts.

---

### Phase 5: Polish & Deployment (Weeks 23–28)

> Harden, optimize, deploy, and validate end-to-end.

| # | Milestone | Primary Plans |
|---|-----------|---------------|
| 5.1 | Performance optimization (frontend) | `02-FRONTEND/01-ARCHITECTURE-PLAN.md` |
| 5.2 | Performance optimization (server + DB) | `03-SERVER/01-ARCHITECTURE-PLAN.md`, `07-DATABASE/PLAN.md` |
| 5.3 | Security audit and hardening | `09-SECURITY/PLAN.md` |
| 5.4 | Full E2E test suite | `08-TESTING/01-STRATEGY-PLAN.md` |
| 5.5 | CI/CD pipeline finalization | `11-DEPLOYMENT/PLAN.md` |
| 5.6 | Production Docker images | `11-DEPLOYMENT/PLAN.md` |
| 5.7 | Monitoring and logging | `11-DEPLOYMENT/PLAN.md` |
| 5.8 | Documentation and onboarding | All plans |
| 5.9 | Load testing and stress testing | `08-TESTING/01-STRATEGY-PLAN.md` |
| 5.10 | User acceptance testing | `08-TESTING/01-STRATEGY-PLAN.md` |

**Exit criteria**: system deployed, all tests pass, security audit clean,
monitoring active, onboarding documentation complete.

---

## 4. Estimated Task Counts by Plan Area

| Plan Area | Plan Files | Est. Tasks | Phase(s) |
|-----------|-----------|------------|----------|
| 01 — Project Structure | 1 | 120+ | 1 |
| 02 — Frontend (all) | 8 | 450+ | 1, 2, 3, 4, 5 |
| 03 — Server (all) | 6 | 350+ | 1, 2, 3 |
| 04 — Knowledge Graph | 3 | 200+ | 2 |
| 05 — RAG Layer | 1 | 80+ | 2, 3 |
| 06 — Agent System | 5 | 300+ | 3, 4 |
| 07 — Database | 1 | 100+ | 1, 2 |
| 08 — Testing | 4 | 200+ | 1, 2, 3, 4, 5 |
| 09 — Security | 1 | 100+ | 1, 2, 4, 5 |
| 10 — Collaboration | 1 | 80+ | 4 |
| 11 — Deployment | 1 | 80+ | 1, 5 |
| 12 — Code Generation | 1 | 80+ | 4 |
| **TOTAL** | **33** | **~2,140+** | |

---

## 5. Dependencies Between Plans

### Dependency Graph (→ means "depends on")

```
01-PROJECT-STRUCTURE
├── → (none — this is the root)
│
02-FRONTEND/*
├── → 01-PROJECT-STRUCTURE
├── 02-FRONTEND/01-ARCHITECTURE → 01-PROJECT-STRUCTURE
├── 02-FRONTEND/02-COMPONENTS → 02-FRONTEND/01-ARCHITECTURE, 02-FRONTEND/03-STYLING
├── 02-FRONTEND/03-STYLING → 02-FRONTEND/01-ARCHITECTURE
├── 02-FRONTEND/04-GENERATIVE-UI → 02-FRONTEND/01-ARCHITECTURE, 03-SERVER/04-AGENT-ORCHESTRATION, 06-AGENT-SYSTEM/03-MCP-SERVERS
├── 02-FRONTEND/05-CHAT-DIALOG → 02-FRONTEND/02-COMPONENTS, 03-SERVER/06-WEBSOCKET, 06-AGENT-SYSTEM/01-ARCHITECTURE
├── 02-FRONTEND/06-SPEC-EDITOR → 02-FRONTEND/02-COMPONENTS, 04-KNOWLEDGE-GRAPH/01-ARCHITECTURE
├── 02-FRONTEND/07-KNOWLEDGE-GRAPH-UI → 02-FRONTEND/02-COMPONENTS, 04-KNOWLEDGE-GRAPH/01-ARCHITECTURE
├── 02-FRONTEND/08-VERSION-CONTROL-UI → 02-FRONTEND/02-COMPONENTS, 04-KNOWLEDGE-GRAPH/03-VERSION-CONTROL, 03-SERVER/05-GIT-INTEGRATION
│
03-SERVER/*
├── → 01-PROJECT-STRUCTURE, 07-DATABASE
├── 03-SERVER/01-ARCHITECTURE → 01-PROJECT-STRUCTURE
├── 03-SERVER/02-API → 03-SERVER/01-ARCHITECTURE, 07-DATABASE
├── 03-SERVER/03-AUTH → 03-SERVER/01-ARCHITECTURE, 07-DATABASE
├── 03-SERVER/04-AGENT-ORCHESTRATION → 03-SERVER/01-ARCHITECTURE, 06-AGENT-SYSTEM/01-ARCHITECTURE
├── 03-SERVER/05-GIT-INTEGRATION → 03-SERVER/01-ARCHITECTURE, 04-KNOWLEDGE-GRAPH/01-ARCHITECTURE
├── 03-SERVER/06-WEBSOCKET → 03-SERVER/01-ARCHITECTURE
│
04-KNOWLEDGE-GRAPH/*
├── → 01-PROJECT-STRUCTURE
├── 04-KNOWLEDGE-GRAPH/01-ARCHITECTURE → 01-PROJECT-STRUCTURE
├── 04-KNOWLEDGE-GRAPH/02-OPERATIONS → 04-KNOWLEDGE-GRAPH/01-ARCHITECTURE
├── 04-KNOWLEDGE-GRAPH/03-VERSION-CONTROL → 04-KNOWLEDGE-GRAPH/01-ARCHITECTURE, 03-SERVER/05-GIT-INTEGRATION
│
05-RAG-LAYER
├── → 04-KNOWLEDGE-GRAPH/01-ARCHITECTURE, 07-DATABASE
│
06-AGENT-SYSTEM/*
├── → 03-SERVER/01-ARCHITECTURE
├── 06-AGENT-SYSTEM/01-ARCHITECTURE → 03-SERVER/01-ARCHITECTURE, 03-SERVER/06-WEBSOCKET
├── 06-AGENT-SYSTEM/02-CLAUDE-CODE-WRAPPER → 06-AGENT-SYSTEM/01-ARCHITECTURE
├── 06-AGENT-SYSTEM/03-MCP-SERVERS → 06-AGENT-SYSTEM/01-ARCHITECTURE, 04-KNOWLEDGE-GRAPH/02-OPERATIONS, 05-RAG-LAYER
├── 06-AGENT-SYSTEM/04-SKILLS-CONFIG → 06-AGENT-SYSTEM/01-ARCHITECTURE
├── 06-AGENT-SYSTEM/05-PLAN-GENERATION → 06-AGENT-SYSTEM/03-MCP-SERVERS, 04-KNOWLEDGE-GRAPH/02-OPERATIONS
│
07-DATABASE
├── → 01-PROJECT-STRUCTURE
│
08-TESTING/*
├── → (respective domain plan)
├── 08-TESTING/01-STRATEGY → 01-PROJECT-STRUCTURE
├── 08-TESTING/02-FRONTEND-TESTING → 02-FRONTEND/01-ARCHITECTURE, 08-TESTING/01-STRATEGY
├── 08-TESTING/03-SERVER-TESTING → 03-SERVER/01-ARCHITECTURE, 08-TESTING/01-STRATEGY
├── 08-TESTING/04-AGENT-TESTING → 06-AGENT-SYSTEM/01-ARCHITECTURE, 08-TESTING/01-STRATEGY
│
09-SECURITY
├── → 03-SERVER/03-AUTH, 04-KNOWLEDGE-GRAPH/01-ARCHITECTURE
│
10-COLLABORATION
├── → 03-SERVER/05-GIT-INTEGRATION, 04-KNOWLEDGE-GRAPH/03-VERSION-CONTROL, 09-SECURITY
│
11-DEPLOYMENT
├── → 01-PROJECT-STRUCTURE, 03-SERVER/01-ARCHITECTURE, 07-DATABASE
│
12-CODE-GENERATION
├── → 06-AGENT-SYSTEM/05-PLAN-GENERATION, 03-SERVER/05-GIT-INTEGRATION
```

### Dependency Matrix (Simplified)

| Plan | Hard Dependencies |
|------|-------------------|
| 01-PROJECT-STRUCTURE | — |
| 02-FRONTEND/* | 01, (varies per sub-plan) |
| 03-SERVER/01-ARCHITECTURE | 01 |
| 03-SERVER/02-API | 03/01, 07 |
| 03-SERVER/03-AUTH | 03/01, 07 |
| 03-SERVER/04-AGENT-ORCHESTRATION | 03/01, 06/01 |
| 03-SERVER/05-GIT-INTEGRATION | 03/01, 04/01 |
| 03-SERVER/06-WEBSOCKET | 03/01 |
| 04-KNOWLEDGE-GRAPH/* | 01, (varies) |
| 05-RAG-LAYER | 04/01, 07 |
| 06-AGENT-SYSTEM/* | 03/01, (varies) |
| 07-DATABASE | 01 |
| 08-TESTING/* | 01, (respective domain) |
| 09-SECURITY | 03/03, 04/01 |
| 10-COLLABORATION | 03/05, 04/03, 09 |
| 11-DEPLOYMENT | 01, 03/01, 07 |
| 12-CODE-GENERATION | 06/05, 03/05 |

---

## 6. Critical Path

The critical path is the longest chain of dependent work that determines the
minimum project duration:

```
01-PROJECT-STRUCTURE
  └─→ 03-SERVER/01-ARCHITECTURE
       ├─→ 07-DATABASE
       │    └─→ 03-SERVER/02-API
       │         └─→ 03-SERVER/03-AUTH
       └─→ 04-KNOWLEDGE-GRAPH/01-ARCHITECTURE
            └─→ 04-KNOWLEDGE-GRAPH/02-OPERATIONS
                 └─→ 05-RAG-LAYER
                      └─→ 06-AGENT-SYSTEM/01-ARCHITECTURE
                           └─→ 06-AGENT-SYSTEM/02-CLAUDE-CODE-WRAPPER
                                └─→ 06-AGENT-SYSTEM/03-MCP-SERVERS
                                     └─→ 06-AGENT-SYSTEM/05-PLAN-GENERATION
                                          └─→ 12-CODE-GENERATION
```

**Critical path length**: 12 sequential plan areas.

### Parallelization Opportunities

These work streams can proceed in parallel once their dependencies are met:

| Parallel Track | Plans | Start After |
|----------------|-------|-------------|
| Track A: Frontend Foundation | 02-FRONTEND/01 → 03 → 02 | 01-PROJECT-STRUCTURE |
| Track B: Server + DB | 03-SERVER/01 → 07-DB → 03/02 → 03/03 | 01-PROJECT-STRUCTURE |
| Track C: Knowledge Graph | 04-KG/01 → 04/02 → 04/03 | 01-PROJECT-STRUCTURE |
| Track D: Frontend Features | 02-FRONTEND/05 → 06 → 07 → 08 | Track A + Track C |
| Track E: Agent System | 06-AGENT/01 → 02 → 03 → 04 → 05 | Track B + Track C |
| Track F: RAG Layer | 05-RAG-LAYER | Track C + Track B (DB) |
| Track G: Collaboration | 10-COLLABORATION | Track C (VC) + 03/05 |
| Track H: Testing | 08-TESTING/* | (respective domains) |

---

## 7. MVP Scope (Phase 1 + Phase 2)

The minimum viable product includes:

1. **Monorepo with dev tooling** — `bun dev` starts everything.
2. **User registration and auth** — bcrypt + JWT.
3. **Spec document editor** — create and edit spec documents with specs inside.
4. **Knowledge graph** — specs as nodes, typed edges, JSON/folder storage.
5. **Graph visualization** — view and navigate the graph.
6. **Version control** — spec-level git versioning, diff view, revert.
7. **RAG retrieval** — embed specs, retrieve relevant context.
8. **Basic API** — CRUD for specs, documents, graph queries.

Features explicitly **deferred** past MVP:

- Agent integration (Phase 3)
- Generative UI (Phase 4)
- Plan generation (Phase 4)
- Multi-user collaboration (Phase 4)
- Code generation (Phase 4)
- Production deployment (Phase 5)

---

## 8. Cross-Cutting Concerns

These topics span multiple plans and must be coordinated:

### 8.1 Error Handling Strategy
- Consistent error types across client/server/agent
- Defined in `shared/` types package
- Each plan references the shared error taxonomy

### 8.2 Logging
- Structured logging (JSON) on server
- Client-side error reporting
- Agent action audit trail

### 8.3 Configuration Management
- Environment variables via `.env` files (never committed)
- Type-safe config loading on server (NestJS ConfigModule)
- Feature flags for phased rollout

### 8.4 API Versioning
- All REST endpoints under `/api/v1/`
- WebSocket protocol versioning
- MCP tool versioning

### 8.5 Documentation
- Each plan file serves as the design document
- API documentation auto-generated from DTOs
- Agent tool documentation in MCP server descriptors

---

## 9. Conventions

### File Naming

- Plan files: `PLAN.md` or `##-DESCRIPTIVE-NAME-PLAN.md`
- Question files: `QUESTIONS.md` in the same directory as the plan
- All plan directories use `##-KEBAB-CASE` numbering

### Task Format in Plans

Every plan uses checkboxes for individual tasks:

```markdown
### Section Name

- [ ] **TASK-ID**: Task description
  - Detail or sub-task
  - Detail or sub-task
```

### Task ID Convention

`{PLAN-AREA}-{SECTION}-{NUMBER}` — e.g., `PS-WS-001` for Project Structure,
Workspace Setup, task 1.

### Status Tracking

Plans are living documents. As work proceeds:
- `[ ]` — not started
- `[~]` — in progress
- `[x]` — complete
- `[-]` — cancelled / deferred

---

## 10. Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Claude Code API changes | High | Medium | Wrapper abstraction layer; pin versions |
| Git merge complexity with JSON knowledge graph | High | High | Structured merge drivers; spec-level granularity |
| Iframe sandbox escape | Critical | Low | CSP headers; no same-origin; content review |
| RAG retrieval quality | Medium | Medium | Tunable chunking; fallback to graph traversal |
| Agent hallucination in spec generation | High | Medium | Human review gate; confidence signals |
| Bun ecosystem maturity | Medium | Medium | Fallback to Node.js if critical issues arise |
| Multi-user conflict frequency | Medium | Medium | Async-first design; per-spec locking hints |

---

## 11. Glossary

| Term | Definition |
|------|-----------|
| **Spec** | A discrete unit of knowledge (requirement, design decision, constraint, fact). |
| **Spec Document** | A group of related specs, presented as a markdown document. |
| **Knowledge Graph** | The node-edge graph where specs are nodes and relationships are edges. |
| **Edge** | A typed relationship between two specs (derived-from, depends-on, related-to, contradicts, supersedes). |
| **RAG** | Retrieval-Augmented Generation — semantic search over embedded specs. |
| **MCP** | Model Context Protocol — tool interface for AI agents. |
| **Generative UI** | Agent-generated UI code loaded in sandboxed iframes. |
| **Plan** | A step-by-step execution document for agents to produce code. |
| **Inquiry Queue** | A list of graph issues flagged by agents for human attention. |
| **Delta** | Changes to specs since the last plan execution. |
