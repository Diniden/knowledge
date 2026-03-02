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

| Layer              | Technology                                                        |
| ------------------ | ----------------------------------------------------------------- |
| Frontend           | React, Vite, BEM CSS (SCSS, PascalCase\_\_Item, PascalCase--prop) |
| Backend            | NestJS, ESM                                                       |
| Runtime            | Bun                                                               |
| Database           | PostgreSQL (native install, no Docker)                            |
| Knowledge Store    | JSON + folders (git-backed)                                       |
| Auth               | bcrypt, JWT (http-only cookies)                                   |
| Agent Runtime      | Claude Code CLI (terminal app, stdio-wrapped via `execa`)         |
| Embeddings         | Local model (`nomic-embed-text` or configurable local path)       |
| Agent Tools        | MCP servers                                                       |
| Version Control    | git                                                               |
| Process Management | mprocs (multi-process orchestration for dev)                      |
| Testing            | bun test                                                          |

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

#### Design Decisions

> **Q**: For the RAG layer, should we build a custom embedding pipeline or use an existing service (e.g., OpenAI embeddings, Cohere, local model)?
> **A**: Use a **local embedding model** as the primary provider to minimize external infrastructure dependencies. The default model is `nomic-embed-text` (768 dimensions, high quality for knowledge retrieval, runs locally via ONNX or `@huggingface/transformers`). The embedding model path is configurable via environment variable (`EMBEDDING_MODEL_PATH`) so users can point to any local model. Store embeddings in PostgreSQL via `pgvector` to avoid a separate vector database. The pipeline is straightforward: chunk spec content → embed locally → store in pgvector → query with cosine similarity. An API-based provider (e.g., OpenAI) can be configured as an alternative but is not the default.

> **Q**: For graph visualization, should we use an existing library or build a custom layout?
> **A**: Use a **custom vertical tree layout algorithm** with a React DOM rendering layer and `@tanstack/virtual` for virtual scrolling. The layout performs a BFS from a primary node (leaf-based primary selection) and arranges specs into depth-level rows. Each spec is rendered as a compressed rectangular card with an agent-generated summary. No third-party graph library (D3, Cytoscape, Sigma) is needed — the custom algorithm is simpler, DOM-based, and gives full control over styling, interaction, and BEM compliance.

> **Q**: For the rich text / markdown editor, should we use an existing editor (e.g., ProseMirror, TipTap, CodeMirror) or build from scratch?
> **A**: Use **TipTap** (built on ProseMirror). It provides a mature extensible markdown/rich-text editor with a React integration, custom node types (for spec boundaries), and collaborative editing primitives. Building from scratch would take months and add no unique value. TipTap's extension API allows custom spec-boundary blocks and inline agent suggestions.

> **Q**: How committed are we to Bun? If a critical compatibility issue arises (e.g., a NestJS plugin doesn't work with Bun), is fallback to Node.js acceptable?
> **A**: Bun is the primary runtime, but Node.js fallback is acceptable for the server if a critical NestJS incompatibility surfaces. The codebase should use standard Node.js APIs where possible (avoid Bun-specific APIs in shared code). Vite handles client bundling regardless, so client-side is unaffected. Test NestJS on Bun in the first week of Phase 1 — if it fails, switch server to Node.js immediately.

> **Q**: Should we use Bun's built-in bundler for the server, or only use it as the runtime with Vite handling client bundling?
> **A**: Use Bun only as the runtime and test runner. Vite handles client bundling. The server runs TypeScript directly via Bun (no build step needed in development) and uses `tsc` for production builds. Bun's bundler is immature compared to Vite/Rollup and doesn't add enough value to justify the risk.

> **Q**: Are there any Bun-specific APIs (e.g., `Bun.serve()`, `Bun.file()`) we should adopt, or keep the code Node.js-compatible?
> **A**: Keep server code Node.js-compatible. NestJS provides its own HTTP abstraction, so `Bun.serve()` is irrelevant. Use `Bun.file()` only in scripts (not production code) where it's convenient. `bun test` is Bun-specific but that's acceptable since it's a dev dependency. This keeps the Node.js fallback viable.

> **Q**: Should the MCP servers be separate packages in the monorepo, or part of the server package?
> **A**: Separate package in the monorepo (`packages/mcp-servers/`). MCP servers need to run as independent processes (the MCP protocol requires a separate stdio-based process). Keeping them in a separate package enables independent testing, clear dependency boundaries, and the ability to spawn them as child processes from the server.

> **Q**: Should the shared types package be published to a registry, or only used via workspace references?
> **A**: Workspace references only. There's no external consumer of these types — they're internal to the monorepo. Publishing to npm adds release process overhead with zero benefit. Bun workspaces resolve `@kg/shared` directly to the local package. If the shared package ever needs to be consumed by external projects, publishing can be added later.

> **Q**: Should the knowledge graph data directory be inside the monorepo or in a separate repo per project?
> **A**: Inside the monorepo as `knowledge-graph/`. Per the PRD: "each user project is a git repo" — the monorepo IS the project. The knowledge graph directory is version-controlled alongside the application code. When a project is created for a user, the entire monorepo is cloned/initialized. Separate repos add submodule complexity with no benefit.

---

## 2. Plan Index

Every plan document and its companion questions file, organized by domain.

### 00 — Master

| File                          | Description                                                           |
| ----------------------------- | --------------------------------------------------------------------- |
| `00-MASTER-PLAN.md`           | This file. Project-wide index, phases, dependencies, critical path.   |
| `00-MASTER-PLAN-QUESTIONS.md` | Open questions about phasing, priorities, MVP scope, team allocation. |

### 01 — Project Structure

| File                                | Description                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| `01-PROJECT-STRUCTURE/PLAN.md`      | Monorepo layout, workspace config, build system, dev workflow, CI/CD scaffolding. |
| `01-PROJECT-STRUCTURE/QUESTIONS.md` | Questions on workspace naming, package boundaries, shared code strategy.          |

### 02 — Frontend

| File                                        | Description                                                                                        |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `02-FRONTEND/01-ARCHITECTURE-PLAN.md`       | Frontend architecture: module system, state management, routing, code splitting, error boundaries. |
| `02-FRONTEND/02-COMPONENTS-PLAN.md`         | Component library: design system, atomic components, composite components, layout system.          |
| `02-FRONTEND/03-STYLING-PLAN.md`            | BEM CSS with SCSS: naming conventions, theming, responsive design, dark mode.                      |
| `02-FRONTEND/04-GENERATIVE-UI-PLAN.md`      | Sandboxed iframe ESM projects, agent-generated UI, dynamic loading, security.                      |
| `02-FRONTEND/05-CHAT-DIALOG-PLAN.md`        | Always-visible chat panel, interactive messages, graph links in messages, hotkey activation.       |
| `02-FRONTEND/06-SPEC-EDITOR-PLAN.md`        | Markdown spec document editor, rich text, spec boundaries, inline agent assistance.                |
| `02-FRONTEND/07-KNOWLEDGE-GRAPH-UI-PLAN.md` | Graph visualization, node/edge rendering, navigation, filtering, zoom/pan.                         |
| `02-FRONTEND/08-VERSION-CONTROL-UI-PLAN.md` | Diff view (light indications), revert UI, branch management, merge conflict resolution.            |

### 03 — Server

| File                                       | Description                                                                            |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| `03-SERVER/01-ARCHITECTURE-PLAN.md`        | NestJS architecture: modules, providers, middleware, guards, interceptors, ESM config. |
| `03-SERVER/02-API-PLAN.md`                 | REST API design: endpoints, DTOs, validation, pagination, error handling.              |
| `03-SERVER/03-AUTH-PLAN.md`                | Authentication: bcrypt hashing, JWT issuance, http-only cookies, session management.   |
| `03-SERVER/04-AGENT-ORCHESTRATION-PLAN.md` | Agent session lifecycle, request routing, sub-agent delegation, result merging.        |
| `03-SERVER/05-GIT-INTEGRATION-PLAN.md`     | Git operations: commit, branch, merge, diff, sync between users.                       |
| `03-SERVER/06-WEBSOCKET-PLAN.md`           | WebSocket connections: real-time agent status, typing indicators, progress updates.    |

### 04 — Knowledge Graph

| File                                            | Description                                                                              |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `04-KNOWLEDGE-GRAPH/01-ARCHITECTURE-PLAN.md`    | Graph data model: JSON/folder structure, node schema, edge schema, indexing.             |
| `04-KNOWLEDGE-GRAPH/02-OPERATIONS-PLAN.md`      | CRUD operations, graph traversal, edge creation, orphan detection, inquiry queue.        |
| `04-KNOWLEDGE-GRAPH/03-VERSION-CONTROL-PLAN.md` | Spec-level versioning, commit association, revert mechanics, branch/merge at spec level. |

### 05 — RAG Layer

| File                   | Description                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `05-RAG-LAYER/PLAN.md` | Embedding pipeline, chunking strategy, vector store, retrieval API, version-aware indexing. |

### 06 — Agent System

| File                                             | Description                                                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `06-AGENT-SYSTEM/01-ARCHITECTURE-PLAN.md`        | Agent types, routing logic, session management, context assembly, output handling.                   |
| `06-AGENT-SYSTEM/02-CLAUDE-CODE-WRAPPER-PLAN.md` | Claude Code integration: process spawning, sandboxing, prompt construction, output parsing.          |
| `06-AGENT-SYSTEM/03-MCP-SERVERS-PLAN.md`         | MCP server implementations: knowledge graph tools, RAG tools, gen-UI tools, plan tools.              |
| `06-AGENT-SYSTEM/04-SKILLS-CONFIG-PLAN.md`       | Agent skill definitions, project-specific skill configuration, skill selection logic.                |
| `06-AGENT-SYSTEM/05-PLAN-GENERATION-PLAN.md`     | Plan output format, delta detection, subgraph traversal, plan-as-knowledge-graph, execution linking. |

### 07 — Database

| File                  | Description                                                                       |
| --------------------- | --------------------------------------------------------------------------------- |
| `07-DATABASE/PLAN.md` | PostgreSQL schema, migrations, connection pooling, query optimization, seed data. |

### 08 — Testing

| File                                     | Description                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| `08-TESTING/01-STRATEGY-PLAN.md`         | Overall testing strategy: test pyramid, coverage targets, CI integration.      |
| `08-TESTING/02-FRONTEND-TESTING-PLAN.md` | Component tests, integration tests, E2E tests, visual regression.              |
| `08-TESTING/03-SERVER-TESTING-PLAN.md`   | Unit tests, integration tests, API contract tests, database tests.             |
| `08-TESTING/04-AGENT-TESTING-PLAN.md`    | Agent behavior tests, MCP tool tests, plan output validation, mock strategies. |

### 09 — Security

| File                  | Description                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------ |
| `09-SECURITY/PLAN.md` | Threat model, input sanitization, CSP, iframe sandboxing, token management, audit logging. |

### 10 — Collaboration

| File                       | Description                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `10-COLLABORATION/PLAN.md` | Multi-user sync via git, conflict resolution, dialog forking, permission propagation. |

### 11 — Deployment

| File                    | Description                                                                    |
| ----------------------- | ------------------------------------------------------------------------------ |
| `11-DEPLOYMENT/PLAN.md` | Docker images, orchestration, environment configuration, monitoring, rollback. |

### 12 — Code Generation

| File                         | Description                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| `12-CODE-GENERATION/PLAN.md` | Plan execution engine, code output, testing validation, CI/CD integration, delta application. |

### 13 — AI Development Configuration

> **IMPORTANT**: This is configuration for BUILDING the project (development-time AI tooling), NOT the application's runtime agent system (covered in 06-AGENT-SYSTEM). These two domains are strictly sandboxed.

| File                                   | Description                                                                                                                                                          |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `13-AI-DEV-CONFIGURATION/PLAN.md`      | Development-time AI config: CLAUDE.md, .cursor/rules/, skills, agent types, self-updating config, master planner. Strictly sandboxed from app-runtime agent configs. |
| `13-AI-DEV-CONFIGURATION/QUESTIONS.md` | Questions on sandboxing boundaries, config design, cross-tool compatibility, maintenance.                                                                            |

---

## 3. Execution Phases

### Phase 1: Foundation (Weeks 1–4)

> Get the monorepo running with basic client/server communication, database,
> and authentication.

| #    | Milestone                                                               | Primary Plans                                           |
| ---- | ----------------------------------------------------------------------- | ------------------------------------------------------- |
| 1.1  | Monorepo scaffolding, workspaces, build system                          | `01-PROJECT-STRUCTURE/PLAN.md`                          |
| 1.2  | Shared types package                                                    | `01-PROJECT-STRUCTURE/PLAN.md`                          |
| 1.3  | NestJS server skeleton with ESM                                         | `03-SERVER/01-ARCHITECTURE-PLAN.md`                     |
| 1.4  | PostgreSQL schema and migrations                                        | `07-DATABASE/PLAN.md`                                   |
| 1.5  | Authentication (bcrypt + JWT + http-only)                               | `03-SERVER/03-AUTH-PLAN.md`                             |
| 1.6  | Vite + React client skeleton                                            | `02-FRONTEND/01-ARCHITECTURE-PLAN.md`                   |
| 1.7  | BEM/SCSS styling foundation                                             | `02-FRONTEND/03-STYLING-PLAN.md`                        |
| 1.8  | Base component library                                                  | `02-FRONTEND/02-COMPONENTS-PLAN.md`                     |
| 1.9  | REST API skeleton with validation                                       | `03-SERVER/02-API-PLAN.md`                              |
| 1.10 | WebSocket infrastructure                                                | `03-SERVER/06-WEBSOCKET-PLAN.md`                        |
| 1.11 | Testing harness (bun test)                                              | `08-TESTING/01-STRATEGY-PLAN.md`                        |
| 1.12 | Security baseline (CSP, sanitization)                                   | `09-SECURITY/PLAN.md`                                   |
| 1.13 | mprocs dev environment (process orchestration)                          | `01-PROJECT-STRUCTURE/PLAN.md`, `11-DEPLOYMENT/PLAN.md` |
| 1.14 | AI dev configuration bootstrap (CLAUDE.md, .cursor/rules/, core skills) | `13-AI-DEV-CONFIGURATION/PLAN.md`                       |

**Exit criteria**: `bun dev` launches client + server + database; a user can
register, log in, and receive a JWT; CI runs tests green.

---

### Phase 2: Core Systems (Weeks 5–10)

> Build the knowledge graph, spec editor, and version control — the product's
> core value.

| #    | Milestone                                        | Primary Plans                                                                    |
| ---- | ------------------------------------------------ | -------------------------------------------------------------------------------- |
| 2.1  | Knowledge graph data model (JSON + folders)      | `04-KNOWLEDGE-GRAPH/01-ARCHITECTURE-PLAN.md`                                     |
| 2.2  | Graph CRUD operations                            | `04-KNOWLEDGE-GRAPH/02-OPERATIONS-PLAN.md`                                       |
| 2.3  | Spec-level version control (git-backed)          | `04-KNOWLEDGE-GRAPH/03-VERSION-CONTROL-PLAN.md`                                  |
| 2.4  | Git integration service                          | `03-SERVER/05-GIT-INTEGRATION-PLAN.md`                                           |
| 2.5  | Spec document editor UI                          | `02-FRONTEND/06-SPEC-EDITOR-PLAN.md`                                             |
| 2.6  | Knowledge graph visualization UI                 | `02-FRONTEND/07-KNOWLEDGE-GRAPH-UI-PLAN.md`                                      |
| 2.7  | Version control UI (diff, revert, branch)        | `02-FRONTEND/08-VERSION-CONTROL-UI-PLAN.md`                                      |
| 2.8  | Permissions system (full/summary access)         | `09-SECURITY/PLAN.md`                                                            |
| 2.9  | REST API: spec, graph, version endpoints         | `03-SERVER/02-API-PLAN.md`                                                       |
| 2.10 | RAG pipeline: embed, index, retrieve             | `05-RAG-LAYER/PLAN.md`                                                           |
| 2.11 | Database tables for sessions, permissions, audit | `07-DATABASE/PLAN.md`                                                            |
| 2.12 | Server + frontend testing for core flows         | `08-TESTING/02-FRONTEND-TESTING-PLAN.md`, `08-TESTING/03-SERVER-TESTING-PLAN.md` |

**Exit criteria**: a user can create spec documents, specs form graph nodes with
edges, specs are git-versioned, diff view works, RAG retrieval returns relevant
specs.

---

### Phase 3: Agent Integration (Weeks 11–16)

> Wire up Claude Code as the agent runtime, build MCP tools, and enable
> conversational knowledge authoring.

| #    | Milestone                                    | Primary Plans                                    |
| ---- | -------------------------------------------- | ------------------------------------------------ |
| 3.1  | Agent architecture and routing               | `06-AGENT-SYSTEM/01-ARCHITECTURE-PLAN.md`        |
| 3.2  | Claude Code wrapper (spawn, sandbox, parse)  | `06-AGENT-SYSTEM/02-CLAUDE-CODE-WRAPPER-PLAN.md` |
| 3.3  | MCP servers: graph tools                     | `06-AGENT-SYSTEM/03-MCP-SERVERS-PLAN.md`         |
| 3.4  | MCP servers: RAG tools                       | `06-AGENT-SYSTEM/03-MCP-SERVERS-PLAN.md`         |
| 3.5  | MCP servers: spec CRUD tools                 | `06-AGENT-SYSTEM/03-MCP-SERVERS-PLAN.md`         |
| 3.6  | Agent orchestration service                  | `03-SERVER/04-AGENT-ORCHESTRATION-PLAN.md`       |
| 3.7  | Chat dialog UI (always visible, interactive) | `02-FRONTEND/05-CHAT-DIALOG-PLAN.md`             |
| 3.8  | Agent session management + WebSocket updates | `03-SERVER/06-WEBSOCKET-PLAN.md`                 |
| 3.9  | Skills and configuration                     | `06-AGENT-SYSTEM/04-SKILLS-CONFIG-PLAN.md`       |
| 3.10 | Agent testing framework                      | `08-TESTING/04-AGENT-TESTING-PLAN.md`            |

**Exit criteria**: user can converse with an agent in the chat panel; the agent
can read the graph, propose specs, create edges, and answer questions using RAG.

---

### Phase 4: Advanced Features (Weeks 17–22)

> Generative UI, plan generation, multi-user collaboration, and delta-based
> code output.

| #    | Milestone                                   | Primary Plans                                |
| ---- | ------------------------------------------- | -------------------------------------------- |
| 4.1  | Generative UI sandbox (iframe + ESM)        | `02-FRONTEND/04-GENERATIVE-UI-PLAN.md`       |
| 4.2  | MCP servers: gen-UI tools                   | `06-AGENT-SYSTEM/03-MCP-SERVERS-PLAN.md`     |
| 4.3  | Plan generation engine                      | `06-AGENT-SYSTEM/05-PLAN-GENERATION-PLAN.md` |
| 4.4  | Code generation + execution                 | `12-CODE-GENERATION/PLAN.md`                 |
| 4.5  | Multi-user collaboration (git sync)         | `10-COLLABORATION/PLAN.md`                   |
| 4.6  | Conflict resolution UI                      | `02-FRONTEND/08-VERSION-CONTROL-UI-PLAN.md`  |
| 4.7  | Permission token sharing                    | `09-SECURITY/PLAN.md`                        |
| 4.8  | Graph crawl for cascading implications      | `04-KNOWLEDGE-GRAPH/02-OPERATIONS-PLAN.md`   |
| 4.9  | Delta detection for plan generation         | `06-AGENT-SYSTEM/05-PLAN-GENERATION-PLAN.md` |
| 4.10 | Inquiry queue (agent flags issues for user) | `04-KNOWLEDGE-GRAPH/02-OPERATIONS-PLAN.md`   |

**Exit criteria**: agent can generate sandboxed UI, produce execution plans from
the graph, apply deltas to a codebase; multiple users can sync and resolve
conflicts.

---

### Phase 5: Polish & Deployment (Weeks 23–28)

> Harden, optimize, deploy, and validate end-to-end.

| #    | Milestone                              | Primary Plans                                              |
| ---- | -------------------------------------- | ---------------------------------------------------------- |
| 5.1  | Performance optimization (frontend)    | `02-FRONTEND/01-ARCHITECTURE-PLAN.md`                      |
| 5.2  | Performance optimization (server + DB) | `03-SERVER/01-ARCHITECTURE-PLAN.md`, `07-DATABASE/PLAN.md` |
| 5.3  | Security audit and hardening           | `09-SECURITY/PLAN.md`                                      |
| 5.4  | Full E2E test suite                    | `08-TESTING/01-STRATEGY-PLAN.md`                           |
| 5.5  | CI/CD pipeline finalization            | `11-DEPLOYMENT/PLAN.md`                                    |
| 5.6  | Production packaging and deployment    | `11-DEPLOYMENT/PLAN.md`                                    |
| 5.7  | Monitoring and logging                 | `11-DEPLOYMENT/PLAN.md`                                    |
| 5.8  | Documentation and onboarding           | All plans                                                  |
| 5.9  | Load testing and stress testing        | `08-TESTING/01-STRATEGY-PLAN.md`                           |
| 5.10 | User acceptance testing                | `08-TESTING/01-STRATEGY-PLAN.md`                           |

**Exit criteria**: system deployed, all tests pass, security audit clean,
monitoring active, onboarding documentation complete.

#### Design Decisions

> **Q**: The master plan proposes 5 phases across ~28 weeks. Is this timeline realistic given team size, or should phases be stretched/compressed?
> **A**: The timeline is aspirational but reasonable for a small focused team (2–3 full-stack developers). Phases 1 and 2 are the tightest — plan for 5 weeks on Phase 1 (instead of 4) to account for Bun/NestJS integration friction. The 28-week envelope is a target, not a hard commitment; let velocity from Phase 1 calibrate the rest.

> **Q**: Are there hard deadlines (demos, funding milestones, partner commitments) that would force phase boundaries to shift?
> **A**: No external hard deadlines exist. The primary pressure is internal: demonstrating the end-to-end vision (spec → graph → agent → plan) as early as possible to validate the concept. Phase 2 exit is the first meaningful demo checkpoint; treat it as a soft milestone.

> **Q**: Should phases overlap (e.g., start Phase 3 agent work while Phase 2 graph UI is still being polished), or must each phase fully complete before the next begins?
> **A**: Phases should overlap. Once Phase 2 core data model and CRUD are stable, begin Phase 3 agent architecture in parallel while graph UI polish continues. The dependency graph in the master plan already identifies which tracks can run concurrently. Use the 8 parallelization tracks — don't gate entire phases.

> **Q**: What are the explicit go/no-go criteria between phases? The exit criteria listed in the master plan are functional — should there also be quality gates (test coverage thresholds, performance benchmarks, security checks)?
> **A**: Yes, add quality gates. Phase 1 exit: 70% test coverage on shared + server packages, all lint rules passing, zero known security issues in auth. Phase 2 exit: 60% coverage on knowledge graph operations, no data loss on spec CRUD, graph traversal under 200ms for 500 nodes. Phase 3+: coverage thresholds maintained, agent responses under 30s for basic queries. Performance benchmarks are advisory, not blocking.

> **Q**: Who has authority to approve phase transitions? A single product owner, a committee, or consensus among all contributors?
> **A**: Single product owner (project lead) makes the call after reviewing exit criteria. For a small team, a formal committee is overhead. The product owner reviews the exit criteria checklist and any open blockers, then makes a go/no-go decision documented in the decision log below.

> **Q**: The plan puts Agent Integration (Phase 3) after Core Systems (Phase 2). Could a minimal agent be integrated earlier to validate the architecture, even without full graph/RAG support?
> **A**: Yes — introduce a "hello world" agent probe in late Phase 1 or early Phase 2. This means spinning up a single Claude Code session that reads a hardcoded spec and responds. It validates the process spawning, sandboxing, and MCP plumbing without requiring the full graph. Keep it as a spike/proof-of-concept, not production code.

> **Q**: Should Generative UI be in Phase 4, or should a proof-of-concept move to Phase 3 since it validates the iframe sandbox model early?
> **A**: Move a minimal PoC to late Phase 3. The iframe + ESM sandbox is a novel pattern with security implications (CSP, same-origin restrictions), and validating it early reduces Phase 4 risk. The PoC should load a static React mini-project in an iframe — no agent generation yet, just the loading pipeline.

---

## 4. Estimated Task Counts by Plan Area

| Plan Area              | Plan Files | Est. Tasks  | Phase(s)      |
| ---------------------- | ---------- | ----------- | ------------- |
| 01 — Project Structure | 1          | 120+        | 1             |
| 02 — Frontend (all)    | 8          | 450+        | 1, 2, 3, 4, 5 |
| 03 — Server (all)      | 6          | 350+        | 1, 2, 3       |
| 04 — Knowledge Graph   | 3          | 200+        | 2             |
| 05 — RAG Layer         | 1          | 80+         | 2, 3          |
| 06 — Agent System      | 5          | 300+        | 3, 4          |
| 07 — Database          | 1          | 100+        | 1, 2          |
| 08 — Testing           | 4          | 200+        | 1, 2, 3, 4, 5 |
| 09 — Security          | 1          | 100+        | 1, 2, 4, 5    |
| 10 — Collaboration     | 1          | 80+         | 4             |
| 11 — Deployment        | 1          | 80+         | 1, 5          |
| 12 — Code Generation   | 1          | 80+         | 4             |
| **TOTAL**              | **33**     | **~2,140+** |               |

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

| Plan                             | Hard Dependencies         |
| -------------------------------- | ------------------------- |
| 01-PROJECT-STRUCTURE             | —                         |
| 02-FRONTEND/\*                   | 01, (varies per sub-plan) |
| 03-SERVER/01-ARCHITECTURE        | 01                        |
| 03-SERVER/02-API                 | 03/01, 07                 |
| 03-SERVER/03-AUTH                | 03/01, 07                 |
| 03-SERVER/04-AGENT-ORCHESTRATION | 03/01, 06/01              |
| 03-SERVER/05-GIT-INTEGRATION     | 03/01, 04/01              |
| 03-SERVER/06-WEBSOCKET           | 03/01                     |
| 04-KNOWLEDGE-GRAPH/\*            | 01, (varies)              |
| 05-RAG-LAYER                     | 04/01, 07                 |
| 06-AGENT-SYSTEM/\*               | 03/01, (varies)           |
| 07-DATABASE                      | 01                        |
| 08-TESTING/\*                    | 01, (respective domain)   |
| 09-SECURITY                      | 03/03, 04/01              |
| 10-COLLABORATION                 | 03/05, 04/03, 09          |
| 11-DEPLOYMENT                    | 01, 03/01, 07             |
| 12-CODE-GENERATION               | 06/05, 03/05              |

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

| Parallel Track               | Plans                                | Start After            |
| ---------------------------- | ------------------------------------ | ---------------------- |
| Track A: Frontend Foundation | 02-FRONTEND/01 → 03 → 02             | 01-PROJECT-STRUCTURE   |
| Track B: Server + DB         | 03-SERVER/01 → 07-DB → 03/02 → 03/03 | 01-PROJECT-STRUCTURE   |
| Track C: Knowledge Graph     | 04-KG/01 → 04/02 → 04/03             | 01-PROJECT-STRUCTURE   |
| Track D: Frontend Features   | 02-FRONTEND/05 → 06 → 07 → 08        | Track A + Track C      |
| Track E: Agent System        | 06-AGENT/01 → 02 → 03 → 04 → 05      | Track B + Track C      |
| Track F: RAG Layer           | 05-RAG-LAYER                         | Track C + Track B (DB) |
| Track G: Collaboration       | 10-COLLABORATION                     | Track C (VC) + 03/05   |
| Track H: Testing             | 08-TESTING/\*                        | (respective domains)   |

#### Design Decisions

> **Q**: How many developers are allocated to this project? What is the split between frontend, backend, and full-stack?
> **A**: Plan for 2–3 full-stack developers. In a small team, rigid frontend/backend splits create bottlenecks. Each developer should be comfortable across the stack, with natural leanings (one more frontend-oriented, one more backend-oriented). Agent integration work can be a specialization area for one person.

> **Q**: Is there dedicated design/UX support, or will developers handle UI design?
> **A**: Developers handle UI design. Establish a design system early (Phase 1 component library, BEM SCSS tokens) and use it consistently. Reference existing productivity tools (Notion, Obsidian, Linear) for UX patterns. A dedicated designer is a Phase 4/5 luxury for polish, not a Phase 1–3 necessity.

> **Q**: Is there a dedicated DevOps/infrastructure person, or is that shared with development?
> **A**: Shared with development. mprocs handles local dev process orchestration, GitHub Actions handles CI. There's no complex infrastructure — no Docker required. PostgreSQL is installed natively, and all processes run in their correct working directories via mprocs. One developer takes ownership of the CI pipeline and mprocs configuration as a secondary responsibility.

> **Q**: Does the team have existing experience with NestJS, or will there be a ramp-up period?
> **A**: Assume a 1-week ramp-up for NestJS if the team has Express/Fastify experience. NestJS's decorator-based DI pattern has a learning curve, but it's well-documented. Allocate the first week of Phase 1 for the server developer to build the skeleton while learning. The module/provider/guard structure pays dividends in maintainability.

> **Q**: Does the team have experience with MCP server development?
> **A**: Unlikely — MCP is relatively new. Plan for a 1–2 day spike in early Phase 3 to build a trivial MCP server (echo tool), validate the protocol, and establish patterns. The MCP SDK documentation and examples are sufficient for ramp-up. This is Phase 3 work, so there's time to learn.

> **Q**: Does the team have experience with Claude Code integration?
> **A**: Assume no. Plan for a dedicated spike in Phase 3 (2–3 days) to validate process spawning, sandboxing, and prompt/response parsing. The Claude Code wrapper package exists precisely to encapsulate this complexity. Start with the simplest use case (send prompt, get text response) and build up.

> **Q**: Is there graph database / graph algorithm expertise on the team?
> **A**: Not required. The knowledge graph uses JSON + folders, not a graph database. Graph traversal is BFS/DFS over an adjacency list loaded from JSON files — standard CS fundamentals. If advanced graph algorithms are needed later (community detection, PageRank for importance), they can be added as utilities in Phase 4.

> **Q**: The master plan identifies 8 parallelization tracks. How many can realistically be staffed simultaneously?
> **A**: With 2–3 developers, 2–3 tracks can run simultaneously. The most effective parallelization: Track A (Frontend Foundation) + Track B (Server + DB) in Phase 1; Track C (Knowledge Graph) + Track D (Frontend Features) in Phase 2. Tracks E–H require Phase 2 completion and are more sequential in practice.

> **Q**: Should certain plans be assigned to specific people to maintain ownership, or should work be distributed task-by-task?
> **A**: Assign plan ownership. Each developer owns 2–3 plan areas and is responsible for their completion. This creates accountability and deep context. Cross-review PRs for knowledge sharing. Ownership doesn't mean exclusive work — others can contribute, but the owner drives completion and architectural decisions for their plans.

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

#### Design Decisions

> **Q**: The MVP includes RAG retrieval but not agent integration. Is RAG useful without an agent consuming it? Should MVP instead include a basic agent that uses RAG, deferring only advanced agent features?
> **A**: RAG without an agent has limited standalone value. Include a basic conversational agent in MVP that uses RAG to answer questions about existing specs. Defer agent-initiated spec creation, graph crawling, and plan generation. This gives the MVP a compelling demo: "ask a question, get an answer grounded in your knowledge graph."

> **Q**: Does the MVP need multi-user support at all, or is single-user sufficient for initial validation?
> **A**: Single-user is sufficient for MVP. Auth scaffolding should support multiple users (registration, JWT), but collaboration features (sync, permissions, dialog forking) are deferred. One user creating specs, building a graph, and querying via agent is the core validation loop.

> **Q**: Is the graph visualization required for MVP, or can a simpler list/tree view of specs suffice initially?
> **A**: A basic graph visualization is required — it's the product's signature differentiator. However, it can be minimal: a vertical tree layout with virtual scrolling, click-to-expand spec document cards, and two-finger trackpad scrolling. Advanced features (filtering, edge-type coloring) are deferred. The tree view IS the primary (and only) graph navigation mode — a BFS from a primary node organizes specs into depth-level rows displayed as compressed rectangular cards with agent-generated summaries.

> **Q**: Who are the target MVP users? Internal team only, or external early adopters?
> **A**: Internal team only. The MVP validates the core loop: human authors specs → graph forms → agent reads graph → agent answers questions. External early adopters come after Phase 3 when the agent experience is polished. Internal use also surfaces workflow pain points before they reach outsiders.

> **Q**: What is the primary success signal for the MVP? User engagement with spec creation? Quality of graph connections? Speed of knowledge capture compared to manual methods?
> **A**: Primary success signal is **quality of graph connections** — specifically, whether the graph structure meaningfully captures relationships between specs such that an agent (or human) can traverse the graph and discover relevant context. Secondary signal is speed of knowledge capture vs. writing unstructured documents.

> **Q**: Should the MVP include any plan generation capability (even if limited) to demonstrate the end-to-end vision?
> **A**: No. Plan generation requires a mature graph and agent system. Including a half-baked version would undermine confidence in the vision. Instead, demonstrate the end-to-end potential with a scripted walkthrough or mockup showing what plan generation will look like once the graph is populated.

> **Q**: Is there a maximum acceptable time for MVP delivery? If the full Phase 1+2 timeline (~10 weeks) is too long, which features can be stripped to hit a shorter target?
> **A**: Target 8 weeks for a functional MVP. If needed, strip: version control UI (keep git commits happening server-side, defer the diff/revert UI), permissions system (single-user makes this moot), and advanced graph visualization features. The irreducible core is: spec editor, knowledge graph storage + basic visualization, and RAG retrieval.

> **Q**: Should the MVP be deployable (even if just to a staging environment), or is local-only acceptable?
> **A**: Local-only is acceptable for MVP. `bun run dev` should be a one-command startup via mprocs that launches all services (client, server, database). No Docker required — PostgreSQL is installed natively, and all processes run in their correct working directories. A staging deployment is a nice-to-have for demo purposes but not required. Production deployment is explicitly Phase 5.

> **Q**: If resource constraints force cutting, what is the priority order among these features? (1) Spec editor + knowledge graph, (2) Agent chat integration, (3) Version control (git-backed), (4) RAG retrieval, (5) Generative UI, (6) Plan generation + code output, (7) Multi-user collaboration, (8) Permissions / anti-siloing
> **A**: The listed order is correct. Spec editor + knowledge graph is the irreducible core. Agent chat integration is second because it validates the human-input/agent-output vision. Version control (git-backed) is third because it's architecturally foundational (specs must be versioned). RAG is fourth as a key enabler for agent quality. Items 5–8 are Phase 4+ and can be deferred or cut.

> **Q**: Are any features "must-have for launch" that are currently in Phase 4 or 5?
> **A**: No. Everything in Phases 4 and 5 is deferrable for an initial launch. The system is valuable at the end of Phase 3: users can author specs, build a graph, converse with an agent, and get RAG-grounded answers. Plan generation and generative UI are compelling extensions but not launch blockers.

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

#### Design Decisions

> **Q**: For Phase 1 scaffolding, should we optimize for speed (get something running fast, refactor later) or correctness (get the architecture right even if it takes longer)?
> **A**: Optimize for correctness in Phase 1. The project structure, workspace config, shared types, and build system are load-bearing foundations — every other plan depends on them. Getting these wrong creates compounding tech debt. Spend the extra time to get ESM, workspace resolution, and type sharing right. The refactoring cost of a bad foundation is much higher than the initial investment.

> **Q**: What is the minimum acceptable test coverage for each phase? Should coverage gates block merges?
> **A**: Phase 1: 70% on shared and server packages. Phase 2: 60% overall, 80% on knowledge graph CRUD operations. Phase 3+: maintain 60% floor. Coverage gates should warn on PRs (CI annotation) but not hard-block merges — a developer can override with justification. Hard-block only if coverage drops more than 5% in a single PR.

> **Q**: The PRD specifies JSON + folders for the knowledge graph. Has a graph database (Neo4j, Dgraph) been explicitly ruled out, or should we prototype both and compare?
> **A**: Graph databases are explicitly ruled out for the primary store. JSON + folders is the canonical source because it's git-versionable, human-readable, and requires no additional infrastructure. PostgreSQL can maintain a denormalized index for query performance, but JSON files are the source of truth. No prototyping needed — the PRD decision is final.

> **Q**: What is the expected scale? How many specs, edges, and versions should the system handle without performance degradation?
> **A**: Target: 10,000 specs, 50,000 edges, and 100,000 version entries without degradation. For a single-project knowledge graph, this is generous. The JSON/folder approach is fine at this scale — load the adjacency index into memory on server start (< 50MB). If scale exceeds this, introduce PostgreSQL-backed indexing as an optimization layer, not a replacement.

> **Q**: Should the JSON files be one-per-spec, one-per-document, or a different granularity?
> **A**: One JSON file per spec. This minimizes git merge conflicts (two users editing different specs won't collide), enables spec-level version history via `git log -- path/to/spec.json`, and keeps file sizes small. Spec documents are a separate index file mapping document IDs to ordered lists of spec IDs. Edges get their own directory with one file per edge.

> **Q**: Should spec version control use a separate git repo from the project code, or the same repo with different directories?
> **A**: Same repo, different directory (`knowledge-graph/`). The PRD says "each user project is a git repo" — that's the monorepo containing both code and knowledge. Submodules add unnecessary complexity. The `knowledge-graph/` directory is just a folder in the project repo, versioned alongside everything else.

> **Q**: For multi-user sync, should we use a central bare repo, or peer-to-peer git remotes?
> **A**: Central bare repo (e.g., hosted on GitHub/GitLab or a self-hosted bare repo). This is the standard git collaboration model — push/pull to a shared remote. Peer-to-peer git is complex and fragile. The server mediates sync operations, pushing spec changes as commits to the central remote.

> **Q**: How should git merge conflicts in JSON knowledge graph files be handled? Custom merge drivers, or restructure to minimize conflicts?
> **A**: Both. Primary strategy: minimize conflicts via one-file-per-spec granularity (two users rarely edit the same spec simultaneously). Secondary strategy: a custom merge driver for the adjacency index file (which aggregates edges). The server should detect conflicts, present them in the UI, and let the user resolve. Auto-merge is acceptable for non-overlapping additions.

> **Q**: Should Claude Code be spawned as a child process per agent session, or should there be a pool of long-running processes?
> **A**: Spawn a child process per agent session using a proper stdio management library (`execa`). Claude Code is the actual terminal CLI app — the server wraps its execution by injecting prompts via stdin and parsing responses from stdout. Sessions are stateful and tied to a specific user context/project working directory. A pool would require complex state management and session affinity. Process-per-session is simpler, provides natural isolation, and the overhead is acceptable since agent sessions are user-initiated (not high-throughput). The `execa` library handles the complex stdio piping, signal management, and process lifecycle needed for robust Claude Code terminal integration.

> **Q**: What is the expected latency budget for an agent response? Is the user willing to wait 30+ seconds for complex operations?
> **A**: Yes, users will wait 30+ seconds for complex operations (graph crawling, plan generation). For simple queries (RAG-assisted Q&A), target under 10 seconds. Use WebSocket streaming to show progress — partial responses, "thinking" indicators, and step-by-step updates. The key is perceived responsiveness, not raw latency. The chat dialog should show real-time status.

> **Q**: Should agent operations be cancellable by the user mid-execution?
> **A**: Yes. The user must be able to cancel any in-flight agent operation. Implementation: send a cancel signal via WebSocket, which triggers `SIGTERM` on the Claude Code child process. The agent orchestration service handles cleanup (rollback any partial spec changes). A "Stop" button in the chat dialog is essential UX.

> **Q**: Which embedding model should be used for RAG? OpenAI `text-embedding-3-small`? A local model (e.g., `nomic-embed-text`)? Both?
> **A**: A **local embedding model** as the default to minimize external infrastructure dependencies. Use `nomic-embed-text` (768 dimensions, high quality for knowledge content, runs locally). The model path is configurable via `EMBEDDING_MODEL_PATH` so users can point to any local ONNX or HuggingFace-compatible model. An API-based provider (e.g., OpenAI) can be configured as an alternative via `EMBEDDING_PROVIDER=api` but is not the default. This narrows the infrastructure scope — no external API key required for embeddings.

> **Q**: Should embeddings be computed on the server or delegated to an external service?
> **A**: Computed on the server locally. The server's RAG module loads the local embedding model (e.g., `nomic-embed-text` via ONNX runtime or `@huggingface/transformers`) and generates embeddings in-process. Vectors are stored in pgvector. No external API call required for the default configuration — this minimizes infrastructure dependencies. An API-based provider is available as an opt-in alternative.

> **Q**: What is the chunking strategy — spec-level, paragraph-level, or sentence-level?
> **A**: Spec-level chunking as the primary unit. Each spec is a discrete knowledge unit by design (single idea), so it's a natural chunk boundary. For specs exceeding ~500 tokens, split at paragraph boundaries within the spec. Embed the spec title + content together. Store the spec ID with each embedding for traceability back to the graph.

> **Q**: Should the PostgreSQL database store the knowledge graph data redundantly (for query performance), or rely entirely on the JSON/folder source of truth?
> **A**: Store a denormalized index in PostgreSQL for query performance (spec metadata, edge adjacency lists, full-text search). JSON files remain the source of truth. On server start, sync the PostgreSQL index from the JSON files. On spec mutation, write to JSON first (commit to git), then update PostgreSQL. This gives fast queries without sacrificing the git-versioned source of truth.

> **Q**: Should we use PostgreSQL's `pgvector` extension for RAG embeddings, or a separate vector database (Pinecone, Weaviate, Qdrant)?
> **A**: Use `pgvector`. It avoids a separate database service, integrates natively with PostgreSQL queries (join embeddings with spec metadata), and handles the expected scale (10K–50K vectors) easily. A dedicated vector DB is overkill for this use case and adds operational complexity. Install the pgvector extension in the native PostgreSQL installation (`CREATE EXTENSION vector`).

> **Q**: What data goes in PostgreSQL vs. what stays in the git-tracked JSON/folder structure?
> **A**: **PostgreSQL**: users, sessions, auth tokens, permissions, agent session logs, dialog history, RAG embeddings (pgvector), denormalized spec/edge index for queries, inquiry queue state. **JSON/folders (git-tracked)**: spec content, edge definitions, document groupings, graph metadata. Rule of thumb: if it needs git versioning, it's in JSON. If it's operational state or user data, it's in PostgreSQL.

> **Q**: Should the API be REST-only, or should some operations use GraphQL (especially for the knowledge graph queries)?
> **A**: REST-only. GraphQL adds a schema definition layer, resolver complexity, and a new paradigm for the team to learn. The knowledge graph queries can be served by well-designed REST endpoints with query parameters for filtering and depth. REST is simpler to implement, cache, and debug. If complex nested queries become a pain point in Phase 4+, reconsider.

> **Q**: Should file uploads (for mixed media specs) use the same API or a separate upload service?
> **A**: Same API, dedicated endpoint. `POST /api/v1/media/upload` accepts multipart form data and returns a `MediaRef`. The NestJS server stores files in a local directory (git-tracked for small files, `.gitignore`-d for large media with a path reference). No separate upload service — it's a single endpoint on the existing server.

> **Q**: Should the API support batch operations (create multiple specs at once)?
> **A**: Yes, for spec creation and edge creation. `POST /api/v1/specs/batch` accepts an array of specs and creates them atomically (single git commit). This is essential for agent operations that create multiple related specs in one action. Individual CRUD endpoints remain the primary interface; batch is an optimization for agents and imports.

> **Q**: What frontend state management approach? React context, MobX, Jotai, Redux Toolkit, or something else?
> **A**: **MobX** with class-based stores using `makeObservable` and explicit decorator annotations (`@observable`, `@action`, `@computed`, `@action.bound`). Strict mode is enabled via `configure({ enforceActions: 'always' })` to enforce a Flux-like unidirectional data flow. Stores are organized into three categories: **Domain stores** (backend data, API actions — e.g., SpecStore, GraphStore), **Session stores** (auth, user profile, browser state — e.g., AuthStore), and **UI stores** (`@computed` domain transformations for deriving UI-ready data, plus application-level state like theme/layout — e.g., UILayoutStore, AppNavigationStore). Primitive and compositional UI components are strictly props-driven — stores are consumed by top-level `observer()` containers that pass data down as props. Simple UI state (hover, open/closed, form values) stays as local component state. All stores are provided via a RootStore pattern + React Context.

> **Q**: Should the client maintain a local cache of the knowledge graph, or always fetch from the server?
> **A**: Maintain a local cache with stale-while-revalidate semantics. On initial load, fetch the graph from the server and cache it in the GraphStore (MobX domain store). On mutations, optimistically update the store via `@action` methods and sync with the server. Periodically revalidate (or on WebSocket push). The cache enables instant graph navigation without round-trips. Invalidate on git sync events.

> **Q**: How should optimistic updates work for spec edits?
> **A**: On save: immediately update the MobX domain store via an `@action` method and UI reflects changes automatically via `observer()`, then fire the API request in the background. On success: no-op (already showing the right state). On failure: revert the store to the previous state via another `@action`, show an error toast with "Retry" option, and highlight the spec as having unsaved changes. Use a pending-changes queue to handle offline/flaky scenarios.

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

| Risk                                           | Impact   | Likelihood | Mitigation                                       |
| ---------------------------------------------- | -------- | ---------- | ------------------------------------------------ |
| Claude Code API changes                        | High     | Medium     | Wrapper abstraction layer; pin versions          |
| Git merge complexity with JSON knowledge graph | High     | High       | Structured merge drivers; spec-level granularity |
| Iframe sandbox escape                          | Critical | Low        | CSP headers; no same-origin; content review      |
| RAG retrieval quality                          | Medium   | Medium     | Tunable chunking; fallback to graph traversal    |
| Agent hallucination in spec generation         | High     | Medium     | Human review gate; confidence signals            |
| Bun ecosystem maturity                         | Medium   | Medium     | Fallback to Node.js if critical issues arise     |
| Multi-user conflict frequency                  | Medium   | Medium     | Async-first design; per-spec locking hints       |

---

## 11. Glossary

| Term                | Definition                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| **Spec**            | A discrete unit of knowledge (requirement, design decision, constraint, fact).                          |
| **Spec Document**   | A group of related specs, presented as a markdown document.                                             |
| **Knowledge Graph** | The node-edge graph where specs are nodes and relationships are edges.                                  |
| **Edge**            | A typed relationship between two specs (derived-from, depends-on, related-to, contradicts, supersedes). |
| **RAG**             | Retrieval-Augmented Generation — semantic search over embedded specs.                                   |
| **MCP**             | Model Context Protocol — tool interface for AI agents.                                                  |
| **Generative UI**   | Agent-generated UI code loaded in sandboxed iframes.                                                    |
| **Plan**            | A step-by-step execution document for agents to produce code.                                           |
| **Inquiry Queue**   | A list of graph issues flagged by agents for human attention.                                           |
| **Delta**           | Changes to specs since the last plan execution.                                                         |

---

## Additional Design Decisions

### User Experience

#### Chat Dialog

> **Q**: Should the chat dialog be resizable/collapsible, or always a fixed size?
> **A**: Resizable and collapsible. Default state is a docked panel on the right side (~350px wide). Users can drag to resize, collapse to a thin strip (icon + unread badge), or expand to full-width. The collapsed state should still show a hotkey hint. Persist the user's size preference in localStorage.

> **Q**: Should the chat support multiple concurrent conversations (tabs), or one active conversation at a time?
> **A**: One active conversation at a time, with a conversation history list. Starting a "new conversation" archives the current one. Users can browse and resume past conversations from a dropdown. Multiple tabs add UI complexity without clear value — the agent has full graph context regardless of conversation history.

> **Q**: Should the chat preserve full history across sessions, or only the current session?
> **A**: Preserve full history across sessions. Dialog history is persisted in PostgreSQL (per the PRD: "persisted but NOT part of knowledge graph"). Users can scroll back through previous conversations. History is a reference log — the agent doesn't automatically load old context, but the user can reference past messages.

> **Q**: What is the hotkey to open the dialog? Should it be configurable?
> **A**: Default hotkey: `Cmd+K` (macOS) / `Ctrl+K` (Windows/Linux) — a familiar pattern from Spotlight, VS Code command palette, and Slack. Yes, it should be configurable via a settings panel. The hotkey toggles the dialog open/closed. When opened via hotkey, the input field is auto-focused.

#### Spec Editor

> **Q**: Should the spec editor be a full WYSIWYG markdown editor, or a split-pane (source + preview)?
> **A**: Full WYSIWYG with an optional "source view" toggle. Most users prefer WYSIWYG for knowledge authoring (it's not code). TipTap provides this naturally. The source toggle is for power users who want to see/edit raw markdown. Default to WYSIWYG.

> **Q**: How should spec boundaries be visually indicated within a spec document? Horizontal rules, colored sections, collapsible blocks?
> **A**: Collapsible blocks with a subtle colored left border (2px accent color). Each spec within a document gets a collapsible header (spec title + metadata badge) and an indented content area. Collapsed specs show title + first-line summary. This is cleaner than horizontal rules and more informative than plain sections. The border color can indicate spec status (draft, reviewed, resolved).

> **Q**: Should inline agent assistance appear as suggestions (like Copilot), slash commands, or something else?
> **A**: Slash commands as the primary trigger (`/suggest-edges`, `/clarify`, `/expand`). The slash command opens a small command palette inline. Additionally, the agent can proactively surface suggestions as non-intrusive inline annotations (small icon in the gutter) that the user can click to expand. Not Copilot-style ghost text — specs are authored deliberately, not auto-completed.

#### Graph Visualization

> **Q**: What should the graph layout approach be?
> **A**: Vertical tree layout as the sole layout. A BFS from a primary node (selected via leaf-based primary selection) arranges specs into depth-level rows, displayed as compressed rectangular cards with agent-generated summaries. Rows are virtualized via `@tanstack/virtual` for performance. Mac trackpad UX: two-finger scroll vertical + horizontal. Clicking a card expands it to fill the screen with full document content — the tree fades out, connected nodes appear as horizontal scroll cards at the bottom, and a breadcrumb trail appears at the top.

> **Q**: Should the graph show all specs at once, or should it be context-focused (show neighbors of the selected spec)?
> **A**: Context-focused by default: the tree layout performs a BFS from a primary node and shows specs organized by depth level. The tree naturally focuses on the neighborhood of the primary node. Clicking a spec card expands it to fill the screen, showing its full content with connected nodes as horizontal scroll cards at the bottom. Clicking a connected node makes it the new primary and re-renders the tree around it. A breadcrumb trail at the top tracks navigation history.

> **Q**: How should different edge types be visually distinguished? Color, line style, labels, icons?
> **A**: Color + line style. Each edge type gets a distinct color (e.g., `derived-from` = blue, `depends-on` = orange, `related-to` = gray, `contradicts` = red, `supersedes` = purple) and line style (solid for strong relationships, dashed for `related-to`). Labels appear on hover. An edge-type legend is always visible in the corner. Icons are unnecessary overhead on edges.

#### Version Control UI

> **Q**: The PRD specifies light-colored indications for diffs (not heavy github-style). Can we get mockups or more specific guidance on this?
> **A**: No formal mockups needed — follow this specification: additions get a light green background tint (`rgba(0,200,0,0.08)`), deletions get a light red tint (`rgba(200,0,0,0.08)`), and modifications get a light yellow tint (`rgba(200,200,0,0.08)`). Inline character-level diffs use slightly stronger tints. No `+`/`-` gutters, no line-number-heavy styling. The goal is to see changes in context, not as a code review tool.

> **Q**: Should the version history be per-spec (timeline of that spec's changes) or per-document (all changes in the document)?
> **A**: Per-spec as the primary view (since each spec is a discrete unit with its own git history). Provide a per-document timeline as a secondary view that shows all spec changes within the document interleaved chronologically. Per-spec is more useful for understanding how a single idea evolved.

> **Q**: How should branch management look? A dropdown, a dedicated panel, a modal?
> **A**: A dropdown in the top toolbar showing the current branch name, with a flyout panel for branch operations (create, switch, merge, delete). Not a modal — branching should feel lightweight and non-blocking. The dropdown shows recent branches and a search filter. Merge conflicts open an inline resolution UI in the spec editor, not a separate page.

### Collaboration & Permissions

#### Multi-User Sync

> **Q**: What is the expected latency tolerance for sync? Is near-real-time (seconds) required, or is periodic sync (minutes) acceptable?
> **A**: Periodic sync (30–60 seconds) is acceptable. The PRD specifies "git-based async collaboration," which inherently isn't real-time. The server polls or receives webhooks from the git remote and pushes change notifications via WebSocket. Near-real-time is a Phase 5 optimization if needed. Git push/pull is the sync primitive.

> **Q**: Should users be notified when someone else changes a spec they're viewing? How (banner, toast, badge)?
> **A**: Toast notification + badge. When a spec the user is viewing is modified by another user, show a non-blocking toast ("Spec updated by {username}") with a "Refresh" action button. Also show a small badge on the spec's tab/header indicating it's stale. Don't auto-refresh — the user might be mid-edit.

> **Q**: Should there be any locking mechanism to prevent concurrent edits to the same spec, or is merge-on-conflict sufficient?
> **A**: No locking. Merge-on-conflict is sufficient. Locking creates coordination overhead and feels hostile in async workflows. If two users edit the same spec, the second push triggers a merge conflict that's presented in the version control UI. Per-spec file granularity makes conflicts rare since specs are small, discrete units.

#### Permission Model

> **Q**: Who creates the initial permission settings for a spec? The author by default?
> **A**: The author sets initial permissions at creation time. Default is full access for all users in the project (anti-siloing principle). The author can then restrict individual specs to summary access for specific users. Permissions are opt-in restrictions, not opt-in grants — everything is open by default.

> **Q**: Are permissions inherited from the spec document, or always set per-spec?
> **A**: Inherited from the spec document by default, with per-spec overrides. A spec document has a permission level; all specs within inherit it. Authors can override individual specs to be more restrictive (never more open than the document level). This reduces permission management burden while allowing fine-grained control.

> **Q**: How are permission tokens generated and distributed? Through the UI, or also via API/CLI?
> **A**: Both. The UI provides a "Share" button that generates a token and shows a copyable link. The API exposes token generation for programmatic use. Tokens are opaque strings (UUIDs), stored server-side in PostgreSQL (never in git). The server validates tokens on every request. CLI access uses the same API with a personal auth token.

> **Q**: Should the system support permission groups/roles (e.g., "engineering team" gets full access to all engineering specs)?
> **A**: Not initially. Start with per-user, per-spec permissions. Groups/roles are a Phase 5 feature if user feedback demands it. The anti-siloing principle means most specs are full-access anyway, so complex group management is premature. If needed later, implement as simple named groups with user membership.

#### Dialog Forking

> **Q**: When a user interacts with another user's dialog and it forks, should the original user be notified?
> **A**: No. Dialog forking is a private action — the forking user gets their own copy, and the original conversation is unaffected. Notification would create noise and imply oversight. The original user's dialog remains unchanged; the fork is an independent conversation thread.

> **Q**: Can the forked conversation be merged back, or is it permanently separate?
> **A**: Permanently separate. Merging conversations is semantically complex (conflicting agent states, interleaved messages) and adds no clear value. If insights from a forked conversation are valuable, the user should create specs from them, which enter the knowledge graph — the proper mechanism for sharing knowledge.

> **Q**: Should there be a UI to browse other users' dialog histories?
> **A**: Yes, with read-only access. Users can view other users' dialog histories (consistent with anti-siloing: never "no access"). Display in a separate "Team Dialogs" panel with user avatars and conversation summaries. This enables knowledge discovery — seeing what questions others have asked and what answers the agent provided.

### Agent Behavior

#### Agent Types

> **Q**: The PRD mentions routing requests to different agent types. What is the initial set of agent types?
> **A**: Initial agent types for Phase 3: (1) **Dialog conversationalist** — handles chat, answers questions using RAG, proposes spec edits. (2) **Knowledge graph reader/writer** — creates/updates specs, creates edges, performs graph operations. (3) **Graph crawler/analyzer** — crawls graph on spec changes, detects implications, flags issues for inquiry queue. Phase 4 adds: (4) **Plan generator** and (5) **Generative UI builder**. The dialog conversationalist is the primary user-facing agent; others are invoked as sub-agents.

> **Q**: Can a single request require multiple agent types in sequence?
> **A**: Yes. A user message like "create a spec about X and link it to related specs" would invoke the dialog agent (parse intent) → knowledge graph agent (create spec) → graph crawler (find related specs and create edges). The agent orchestration service handles this routing. The user sees a single conversation; sub-agent delegation is invisible.

#### Agent Autonomy

> **Q**: How much should the agent do autonomously vs. request confirmation? For example, should it auto-create edges, or always propose and wait?
> **A**: **Propose and confirm** for destructive or structural changes (creating/deleting specs, creating edges, modifying permissions). **Auto-execute** for read-only and low-risk operations (graph traversal, RAG queries, generating summaries). The agent presents proposals as interactive messages in the chat with "Accept" / "Reject" / "Edit" buttons. This keeps humans in the loop for knowledge graph mutations.

> **Q**: Should the agent proactively crawl the graph on spec changes, or only when explicitly asked?
> **A**: Proactively crawl on spec changes. Per the PRD: "spec revision triggers agent graph crawl for implications and cascading revisions." This is a background operation — the graph crawler agent runs after every spec commit, checks for contradictions, stale edges, and cascading implications, and surfaces findings in the inquiry queue. The user isn't interrupted unless the crawler flags something critical.

> **Q**: The PRD mentions an inquiry queue. How should inquiries be prioritized and presented to the user?
> **A**: Priority levels: **Critical** (contradictions, broken dependencies), **Important** (stale edges, suggested revisions), **Info** (related spec suggestions, minor improvements). Present as a notification badge on a dedicated "Inquiries" panel. Critical items also trigger a toast notification. Within each priority, sort by recency. Users can dismiss, resolve, or snooze inquiries.

#### Agent Failure Handling

> **Q**: What happens when an agent session crashes or times out? Retry, notify user, or silently restart?
> **A**: Notify the user with a toast message ("Agent encountered an error — retrying...") and auto-retry once. If the retry also fails, show an error message in the chat with details and a "Try Again" button. Never silently restart — the user should always know when the agent failed. Log the failure for debugging. Rollback any partial spec changes from the failed session.

> **Q**: Should agent actions be transactional (all-or-nothing) or can partial results be committed?
> **A**: All-or-nothing for multi-step mutations. If an agent is creating 3 specs and linking them, and it fails on the 3rd, roll back all three. For read-only operations, partial results are fine (e.g., a graph crawl can return what it found before timing out). Use git's staging mechanism: accumulate changes, commit atomically at the end of a successful operation.

> **Q**: How should agent rate limiting work? Per-user, per-session, global?
> **A**: Per-user rate limiting. Each user gets a budget of N concurrent agent sessions (default: 2) and M API calls per hour (default: 100, configurable). Global limits protect the Claude API key budget. Rate limit errors are surfaced in the chat: "You've reached the limit — please wait or cancel an active session." Admins can adjust per-user limits.

### Infrastructure & Operations

#### Hosting

> **Q**: Where will the system be hosted? Cloud (AWS/GCP/Azure), self-hosted, or local-only?
> **A**: Local-only through Phase 3. Phase 5 targets cloud deployment on a single VPS or small cloud instance (DigitalOcean, Railway, or a single AWS EC2). The system isn't designed for massive scale — a single server with PostgreSQL handles the expected load. Cloud provider choice is deferred to Phase 5 deployment planning.

> **Q**: Should the system support air-gapped deployment (no internet access)?
> **A**: Partially. The system requires internet for Claude Code CLI (which calls the Anthropic API). However, embeddings run locally by default (no external API needed), and all other services (PostgreSQL, the NestJS server, the React client) are fully local. The only external dependency at runtime is the Claude API accessed through the Claude Code CLI. The architecture is model-agnostic (env-configurable) to allow swapping components.

> **Q**: What is the expected number of concurrent users?
> **A**: 5–20 concurrent users for the initial deployment. The system is designed for small-to-medium teams. This is well within the capacity of a single server instance. If demand grows beyond 50 users, horizontal scaling (multiple server instances, load balancer) becomes relevant — but that's a Phase 5+ concern.

#### Data Backup

> **Q**: Since the knowledge graph is git-backed, is the git remote the backup strategy? Should there be additional backups?
> **A**: The git remote (GitHub/GitLab) is the primary backup for the knowledge graph. Every push is a distributed backup. For additional safety, enable the git hosting provider's built-in backup features. No custom backup pipeline is needed for the knowledge graph. The git remote plus each developer's local clone provides multi-site redundancy.

> **Q**: Should PostgreSQL backups be automated? What is the RPO (recovery point objective)?
> **A**: Yes, automate PostgreSQL backups. RPO: 24 hours for development, 1 hour for production. Use `pg_dump` on a cron schedule. For local dev, daily backups to a local directory. For production (Phase 5), use the cloud provider's managed backup or WAL archiving. The most critical data (knowledge graph) is in git, so PostgreSQL loss is recoverable.

#### Monitoring

> **Q**: What monitoring stack should be used? Prometheus + Grafana, Datadog, or something simpler?
> **A**: Start simple: structured JSON logging (NestJS built-in) + a lightweight log aggregator. For Phase 5 production, add Prometheus + Grafana (open source, no vendor lock-in). Datadog is overkill for a small team. During development, `console`-based structured logging with log levels is sufficient. Add proper monitoring infrastructure only when deploying to production.

> **Q**: What are the critical alerts? Server down, agent failure, git sync failure, database connection loss?
> **A**: Critical alerts (Phase 5): server process crash, database connection loss, git remote unreachable, agent API key invalid/expired. Important alerts: agent session failure rate > 10%, disk usage > 80%, response time p95 > 5s. During development, errors in structured logs serve as alerts. Formal alerting is a Phase 5 deployment concern.

> **Q**: Should there be user-facing status indicators (system health, agent availability)?
> **A**: Yes, minimal. A small status indicator in the chat dialog footer: green dot = agent available, yellow = degraded (high latency), red = unavailable. Also show "Connecting..." / "Connected" for WebSocket status. No full status page — just enough for the user to know if the agent is operational.

### Legal & Compliance

#### Data Privacy

> **Q**: Does the system handle any PII (personally identifiable information)? If so, what compliance frameworks apply (GDPR, CCPA, SOC 2)?
> **A**: Yes — usernames, emails, and potentially knowledge content that references people. For initial internal use, no formal compliance framework is required. When opening to external users, implement GDPR basics: data access request handling, deletion capability, and a privacy policy. SOC 2 is a Phase 5+ concern if enterprise customers are targeted.

> **Q**: Should the system support data export (right to portability)?
> **A**: Yes. The knowledge graph is already portable (JSON + git). Add an API endpoint that exports a user's specs, edges, and dialog history as a ZIP archive. This is both a good feature (users own their data) and a compliance requirement for GDPR portability. Implement in Phase 4 or 5.

> **Q**: Should the system support data deletion (right to be forgotten)?
> **A**: Yes. Implement user account deletion that removes: PostgreSQL records (user, sessions, dialogs, permissions), and optionally their authored specs (or transfer ownership). Git history is harder to scrub — document that git history may retain metadata. Use `git filter-branch` or BFG Repo Cleaner for full removal if legally required.

#### AI Usage

> **Q**: Are there constraints on what data can be sent to Claude? Should sensitive specs be excluded from agent context?
> **A**: By default, all specs are sendable to Claude — the user explicitly authored them in an AI-assisted system. However, respect permission levels: specs with restricted access for a given user should not be included in that user's agent context. Add a per-spec "exclude from AI" flag for users who want to keep specific content out of API calls. Document that spec content is sent to Anthropic's API.

> **Q**: Should the system log all AI interactions for audit purposes?
> **A**: Yes. Log every agent session: user ID, timestamp, input messages (or hashes), output messages, tools invoked, specs read/written, and duration. Store in PostgreSQL with a 90-day retention policy (configurable). This is essential for debugging agent behavior, understanding usage patterns, and audit compliance. Dialog history already captures the user-facing portion.

> **Q**: Are there organizational policies on AI-generated code that affect the code generation feature?
> **A**: No specific policies assumed. The code generation feature (Phase 4) produces code in `client/gen/` that is git-tracked, reviewed by the user, and attributed to the agent. Add a header comment to generated files: `// Generated by Knowledge Graph Agent — review before use`. Users accept responsibility for generated code. This is standard practice for AI-assisted development.
