# 03-SERVER / 01 — ARCHITECTURE PLAN

> **Purpose**: Define the complete NestJS server architecture including module
> structure, service layer patterns, middleware pipeline, guards, interceptors,
> exception filters, configuration management, logging strategy, health checks,
> process management for Claude Code instances, and file system operations for
> the knowledge graph.
>
> **Phase**: 1 (Foundation) + ongoing
> **Dependencies**: `01-PROJECT-STRUCTURE/PLAN.md`
> **Estimated tasks**: 180+

---

## Table of Contents

1. [Bun Runtime Configuration](#1-bun-runtime-configuration)
2. [NestJS Bootstrap & Entry Point](#2-nestjs-bootstrap--entry-point)
3. [Module Structure](#3-module-structure)
4. [Service Layer Patterns](#4-service-layer-patterns)
5. [Configuration Management](#5-configuration-management)
6. [Middleware Pipeline](#6-middleware-pipeline)
7. [Guards](#7-guards)
8. [Interceptors](#8-interceptors)
9. [Pipes & Validation](#9-pipes--validation)
10. [Exception Filters](#10-exception-filters)
11. [Logging Strategy](#11-logging-strategy)
12. [Health Checks & Monitoring](#12-health-checks--monitoring)
13. [File System Service](#13-file-system-service)
14. [Process Management](#14-process-management)
15. [Module Dependency Graph](#15-module-dependency-graph)
16. [Performance & Scalability](#16-performance--scalability)

---

## 1. Bun Runtime Configuration

### 1.1 Bun Setup for NestJS

- [ ] **SV-ARCH-001**: Configure `bunfig.toml` at server workspace root
  - Set `target = "bun"` for server builds
  - Configure module resolution for ESM
  - Set test runner configuration for `bun test`
  - Configure source map support for debugging
- [ ] **SV-ARCH-002**: Verify NestJS compatibility with Bun runtime
  - Test all NestJS decorators function correctly under Bun
  - Validate `reflect-metadata` polyfill works with Bun
  - Confirm TypeORM/Drizzle driver compatibility
  - Document any Bun-specific workarounds needed
- [ ] **SV-ARCH-003**: Configure `tsconfig.json` for server workspace
  - Set `"module": "ESNext"` for ESM output
  - Set `"target": "ESNext"` for Bun compatibility
  - Enable `"experimentalDecorators": true`
  - Enable `"emitDecoratorMetadata": true`
  - Set `"moduleResolution": "bundler"`
  - Configure path aliases (`@server/*`, `@shared/*`)
  - Set `"strict": true` for full type safety
  - Set `"skipLibCheck": true` for performance
- [ ] **SV-ARCH-004**: Create `server/package.json` with ESM configuration
  - Set `"type": "module"` for native ESM
  - Define `"main"` entry point
  - Add NestJS core dependencies (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`)
  - Add NestJS auxiliary packages (`@nestjs/config`, `@nestjs/websockets`, `@nestjs/swagger`)
  - Add database driver dependencies
  - Add authentication dependencies (`bcrypt`, `@nestjs/jwt`, `@nestjs/passport`)
  - Add validation dependencies (`class-validator`, `class-transformer`)
  - Configure scripts: `dev`, `build`, `start`, `test`, `lint`

### 1.2 ESM Module Resolution

- [ ] **SV-ARCH-005**: Configure ESM import resolution for NestJS under Bun
  - Ensure all internal imports use explicit `.js` extensions or path aliases
  - Configure barrel exports (`index.ts`) per module
  - Test dynamic `import()` works for lazy-loaded modules
  - Verify circular dependency detection works correctly
- [ ] **SV-ARCH-006**: Set up path alias resolution for Bun
  - Map `@server/*` to `server/src/*`
  - Map `@shared/*` to `shared/src/*`
  - Ensure aliases resolve in both dev mode and built output
  - Configure aliases in `tsconfig.json` and `bunfig.toml` consistently

### 1.3 Development Workflow

- [ ] **SV-ARCH-007**: Configure Bun's hot reload for NestJS development
  - Use `bun --watch` for file change detection
  - Configure which directories to watch (`server/src/`)
  - Exclude `node_modules`, `dist`, `knowledge-graph` from watch
  - Ensure module re-initialization on reload (NestJS lifecycle hooks)
- [ ] **SV-ARCH-008**: Create `server/src/main.ts` as the Bun entry point
  - Import and bootstrap the NestJS application
  - Handle graceful shutdown on SIGTERM/SIGINT
  - Log startup time and listening address
  - Support `--inspect` flag for debugging

#### Design Decisions

> **Q**: Has NestJS been fully validated with Bun as the runtime? Are there known issues with decorator metadata reflection, TypeORM drivers, or the WebSocket adapter under Bun?
> **A**: NestJS works with Bun but requires attention. Decorator metadata reflection works via `reflect-metadata` polyfill which Bun supports. Use `@nestjs/platform-express` as the HTTP adapter since it has the broadest compatibility. TypeORM works when using the `pg` npm package (not Bun's native driver). The Socket.IO WebSocket adapter works under Bun. Pin NestJS to v10+ and Bun to 1.1+. Maintain a small compatibility test suite that runs on CI to catch regressions early.

> **Q**: Should the project use `@nestjs/platform-express` or `@nestjs/platform-fastify` under Bun?
> **A**: Use `@nestjs/platform-express`. Express has the largest middleware ecosystem and the most NestJS community testing under Bun. Fastify's performance advantage is marginal for this use case. Express's middleware API is simpler and has more examples/documentation. Switching to Fastify later is straightforward if profiling shows HTTP layer as a bottleneck.

> **Q**: Does Bun's built-in SQLite or PostgreSQL driver work with TypeORM, or do we need the `pg` npm package as a fallback?
> **A**: Use the `pg` npm package. Bun's native PostgreSQL driver is not compatible with TypeORM's driver interface. `pg` works reliably under Bun since it's pure JavaScript at the network layer. This also keeps the door open for running under Node.js if needed.

> **Q**: Are there any NestJS packages that are known to be incompatible with Bun's ESM-only module resolution?
> **A**: Most NestJS core packages work. Known areas of concern: packages with native C++ addons (e.g., `bcrypt` — use `bcryptjs` instead), packages that use `require.resolve` heuristics in non-standard ways, and some older `passport` strategies. Test each dependency as it's added. Use `bun install` which handles CJS/ESM interop transparently for most cases.

> **Q**: Does `bun --watch` provide reliable hot reload for NestJS, or should we use `nodemon` / `tsx watch` as a fallback?
> **A**: Use `bun --watch`. It provides reliable file-watching and fast restarts for NestJS. It's simpler than configuring nodemon, has no extra dependency, and leverages Bun's fast startup. If edge cases arise (e.g., missed file changes in deep directories), fall back to `nodemon` with `--exec bun run`.

> **Q**: Does Bun's debugger (`bun --inspect`) integrate smoothly with VS Code / Cursor debugging, or does it need special configuration?
> **A**: `bun --inspect` supports the Chrome DevTools Protocol and works with VS Code / Cursor. Add a `.vscode/launch.json` configuration with `"runtimeExecutable": "bun"` and `"runtimeArgs": ["--inspect"]`. Step debugging and breakpoints work. Source maps require `"sourcemap": "inline"` in tsconfig. Document the debug configuration in the project README.

---

## 2. NestJS Bootstrap & Entry Point

### 2.1 Application Factory

- [ ] **SV-ARCH-009**: Implement `server/src/main.ts` application bootstrap
  - Use `NestFactory.create()` with the root `AppModule`
  - Pass `{ abortOnError: false }` for graceful startup error handling
  - Set global prefix `/api/v1` for all routes
  - Enable CORS with configurable origins
  - Enable shutdown hooks (`app.enableShutdownHooks()`)
  - Bind the application to configured port (default 3000)
  - Log "Server running on port {PORT}" on successful start
- [ ] **SV-ARCH-010**: Configure Express adapter settings
  - Set trust proxy for reverse proxy environments
  - Configure body parser limits (JSON: 10mb, URL-encoded: 10mb)
  - Disable `x-powered-by` header
  - Set request timeout to configurable value (default 30s)
- [ ] **SV-ARCH-011**: Register global middleware in bootstrap
  - Register Helmet middleware for security headers
  - Register compression middleware (gzip/brotli)
  - Register cookie-parser middleware for JWT cookies
  - Register request ID middleware (generate UUID per request)
- [ ] **SV-ARCH-012**: Register global pipes in bootstrap
  - Register `ValidationPipe` globally with transform enabled
  - Configure `whitelist: true` to strip unknown properties
  - Configure `forbidNonWhitelisted: true` to reject unknown fields
  - Set `transform: true` for automatic type coercion
- [ ] **SV-ARCH-013**: Register global interceptors in bootstrap
  - Register logging interceptor for request/response logging
  - Register timeout interceptor (configurable per-route override)
  - Register response transformation interceptor (standard envelope)
- [ ] **SV-ARCH-014**: Register global exception filters in bootstrap
  - Register custom `HttpExceptionFilter` for consistent error responses
  - Register catch-all filter for unhandled exceptions
  - Ensure error responses match the shared error type contract

### 2.2 Swagger/OpenAPI Setup

- [ ] **SV-ARCH-015**: Configure Swagger documentation in bootstrap
  - Use `SwaggerModule.createDocument()` with API metadata
  - Set title, description, version, contact info
  - Configure bearer auth and cookie auth security schemes
  - Mount Swagger UI at `/api/docs`
  - Mount JSON spec at `/api/docs-json`
  - Disable Swagger in production (env-gated)
- [ ] **SV-ARCH-016**: Add API tags for endpoint grouping in Swagger
  - Define tags for each domain: Auth, Users, Projects, Specs, Documents, Graph, Agent, GenUI, Collaboration, Plans

---

## 3. Module Structure

### 3.1 Root Application Module

- [ ] **SV-ARCH-017**: Create `server/src/app.module.ts` as the root module
  - Import `ConfigModule.forRoot()` as first import (global)
  - Import `DatabaseModule` for PostgreSQL connection
  - Import `AuthModule` for authentication
  - Import `UsersModule` for user management
  - Import `ProjectsModule` for project management
  - Import `SpecsModule` for spec CRUD
  - Import `DocumentsModule` for spec document management
  - Import `GraphModule` for knowledge graph operations
  - Import `AgentModule` for agent orchestration
  - Import `GitModule` for git operations
  - Import `WebSocketModule` for real-time communication
  - Import `HealthModule` for health checks
  - Import `GenUiModule` for generative UI management
  - Import `PlansModule` for plan generation management
  - Import `CollaborationModule` for sync operations
- [ ] **SV-ARCH-018**: Configure module loading order for dependency resolution
  - ConfigModule first (provides env config to all)
  - DatabaseModule second (provides DB connection)
  - AuthModule third (provides guards used by all)
  - Domain modules follow (Users, Projects, Specs, etc.)
  - WebSocket and Agent modules last (depend on domain modules)

### 3.2 Core Module

- [ ] **SV-ARCH-019**: Create `server/src/core/core.module.ts` as a shared core module
  - Export shared services: LoggerService, ConfigService wrappers
  - Export shared guards, interceptors, filters, pipes
  - Mark as `@Global()` so all modules can use core services
- [ ] **SV-ARCH-020**: Create `server/src/core/` directory structure
  - `core/decorators/` — custom decorators
  - `core/filters/` — exception filters
  - `core/guards/` — authentication and authorization guards
  - `core/interceptors/` — logging, transform, timeout interceptors
  - `core/middleware/` — request-level middleware
  - `core/pipes/` — custom validation pipes
  - `core/interfaces/` — shared interfaces
  - `core/constants/` — application constants
  - `core/utils/` — utility functions

### 3.3 Auth Module

- [ ] **SV-ARCH-021**: Create `server/src/modules/auth/auth.module.ts`
  - Import `JwtModule.registerAsync()` with config factory
  - Import `PassportModule.register({ defaultStrategy: 'jwt' })`
  - Import `UsersModule` for user lookup
  - Provide `AuthService`, `JwtStrategy`, `LocalStrategy`
  - Export `AuthService` and guards for other modules
- [ ] **SV-ARCH-022**: Define auth module file structure
  - `auth/auth.controller.ts` — login, register, refresh, logout endpoints
  - `auth/auth.service.ts` — authentication logic
  - `auth/strategies/jwt.strategy.ts` — JWT validation strategy
  - `auth/strategies/local.strategy.ts` — username/password strategy
  - `auth/guards/jwt-auth.guard.ts` — JWT authentication guard
  - `auth/guards/roles.guard.ts` — role-based authorization guard
  - `auth/guards/spec-permission.guard.ts` — spec-level permission guard
  - `auth/dto/login.dto.ts` — login request DTO
  - `auth/dto/register.dto.ts` — registration request DTO
  - `auth/dto/token-response.dto.ts` — token response DTO
  - `auth/decorators/current-user.decorator.ts` — extract user from request
  - `auth/decorators/roles.decorator.ts` — role metadata decorator

### 3.4 Users Module

- [ ] **SV-ARCH-023**: Create `server/src/modules/users/users.module.ts`
  - Provide `UsersService`
  - Provide `UsersRepository` (or use TypeORM repository)
  - Export `UsersService` for auth module consumption
- [ ] **SV-ARCH-024**: Define users module file structure
  - `users/users.controller.ts` — profile, settings, list endpoints
  - `users/users.service.ts` — user business logic
  - `users/users.repository.ts` — database access layer
  - `users/entities/user.entity.ts` — User database entity
  - `users/dto/create-user.dto.ts` — user creation DTO
  - `users/dto/update-user.dto.ts` — user update DTO
  - `users/dto/user-response.dto.ts` — user response serialization

### 3.5 Projects Module

- [ ] **SV-ARCH-025**: Create `server/src/modules/projects/projects.module.ts`
  - Import `GitModule` for repository operations
  - Import `UsersModule` for owner resolution
  - Provide `ProjectsService`, `ProjectsRepository`
  - Export `ProjectsService` for use by specs, graph modules
- [ ] **SV-ARCH-026**: Define projects module file structure
  - `projects/projects.controller.ts` — CRUD, clone, settings
  - `projects/projects.service.ts` — project business logic
  - `projects/projects.repository.ts` — database access layer
  - `projects/entities/project.entity.ts` — Project database entity
  - `projects/entities/project-member.entity.ts` — project membership
  - `projects/dto/create-project.dto.ts`
  - `projects/dto/update-project.dto.ts`
  - `projects/dto/project-response.dto.ts`
  - `projects/dto/clone-project.dto.ts`

### 3.6 Specs Module

- [ ] **SV-ARCH-027**: Create `server/src/modules/specs/specs.module.ts`
  - Import `GitModule` for version tracking
  - Import `GraphModule` for graph node creation on spec create
  - Import `ProjectsModule` for project context
  - Provide `SpecsService`, `SpecsFileService`
- [ ] **SV-ARCH-028**: Define specs module file structure
  - `specs/specs.controller.ts` — CRUD, version history, revert
  - `specs/specs.service.ts` — spec business logic
  - `specs/specs-file.service.ts` — file system read/write for spec JSON
  - `specs/dto/create-spec.dto.ts`
  - `specs/dto/update-spec.dto.ts`
  - `specs/dto/spec-response.dto.ts`
  - `specs/dto/spec-version.dto.ts`
  - `specs/interfaces/spec.interface.ts` — spec data shape

### 3.7 Documents Module

- [ ] **SV-ARCH-029**: Create `server/src/modules/documents/documents.module.ts`
  - Import `SpecsModule` for spec management within documents
  - Import `ProjectsModule` for project context
  - Provide `DocumentsService`
- [ ] **SV-ARCH-030**: Define documents module file structure
  - `documents/documents.controller.ts` — CRUD, spec grouping
  - `documents/documents.service.ts` — document business logic
  - `documents/dto/create-document.dto.ts`
  - `documents/dto/update-document.dto.ts`
  - `documents/dto/document-response.dto.ts`

### 3.8 Knowledge Graph Module

- [ ] **SV-ARCH-031**: Create `server/src/modules/graph/graph.module.ts`
  - Import `ProjectsModule` for project scoping
  - Import `GitModule` for version tracking of edges
  - Provide `GraphService`, `GraphFileService`, `GraphTraversalService`
  - Export `GraphService` for agent module consumption
- [ ] **SV-ARCH-032**: Define graph module file structure
  - `graph/graph.controller.ts` — nodes, edges, traversal, search
  - `graph/graph.service.ts` — graph business logic
  - `graph/graph-file.service.ts` — file system operations for graph JSON
  - `graph/graph-traversal.service.ts` — graph traversal algorithms
  - `graph/dto/create-node.dto.ts`
  - `graph/dto/create-edge.dto.ts`
  - `graph/dto/update-edge.dto.ts`
  - `graph/dto/graph-query.dto.ts`
  - `graph/dto/traversal-result.dto.ts`
  - `graph/interfaces/node.interface.ts`
  - `graph/interfaces/edge.interface.ts`

### 3.9 Agent Module

- [ ] **SV-ARCH-033**: Create `server/src/modules/agent/agent.module.ts`
  - Import `WebSocketModule` for status updates
  - Import `GraphModule` for knowledge graph access
  - Import `SpecsModule` for spec mutations
  - Import `GitModule` for version operations
  - Provide `AgentOrchestratorService`, `AgentSessionService`, `AgentQueueService`
  - Provide `ClaudeCodeWrapperService`
- [ ] **SV-ARCH-034**: Define agent module file structure
  - `agent/agent.controller.ts` — session start, message, status, history
  - `agent/agent-orchestrator.service.ts` — request routing and delegation
  - `agent/agent-session.service.ts` — session lifecycle management
  - `agent/agent-queue.service.ts` — rate limiting and queue management
  - `agent/claude-code-wrapper.service.ts` — Claude Code process management
  - `agent/dto/start-session.dto.ts`
  - `agent/dto/send-message.dto.ts`
  - `agent/dto/agent-response.dto.ts`
  - `agent/dto/session-status.dto.ts`
  - `agent/interfaces/agent-session.interface.ts`
  - `agent/interfaces/agent-message.interface.ts`

### 3.10 Git Module

- [ ] **SV-ARCH-035**: Create `server/src/modules/git/git.module.ts`
  - Provide `GitService`, `GitDiffService`, `GitBranchService`
  - Export `GitService` for use by specs, graph, collaboration modules
- [ ] **SV-ARCH-036**: Define git module file structure
  - `git/git.service.ts` — core git operations (commit, push, pull)
  - `git/git-diff.service.ts` — diff generation and parsing
  - `git/git-branch.service.ts` — branch management
  - `git/git-merge.service.ts` — merge operations
  - `git/git-health.service.ts` — repository health checks
  - `git/interfaces/git-commit.interface.ts`
  - `git/interfaces/git-diff.interface.ts`
  - `git/interfaces/git-branch.interface.ts`

### 3.11 WebSocket Module

- [ ] **SV-ARCH-037**: Create `server/src/modules/websocket/websocket.module.ts`
  - Import `AuthModule` for connection authentication
  - Provide `EventsGateway`, `WebSocketService`
  - Export `WebSocketService` for broadcasting from other modules
- [ ] **SV-ARCH-038**: Define websocket module file structure
  - `websocket/events.gateway.ts` — WebSocket gateway with handlers
  - `websocket/websocket.service.ts` — broadcasting and room management
  - `websocket/guards/ws-auth.guard.ts` — WebSocket authentication
  - `websocket/dto/ws-message.dto.ts`
  - `websocket/interfaces/ws-events.interface.ts`

### 3.12 Health Module

- [ ] **SV-ARCH-039**: Create `server/src/modules/health/health.module.ts`
  - Provide `HealthController`
  - Import `TerminusModule` from `@nestjs/terminus`
  - Register health indicators: DB, disk, memory, git
- [ ] **SV-ARCH-040**: Define health module file structure
  - `health/health.controller.ts` — health check endpoints
  - `health/indicators/database.health.ts` — DB connectivity check
  - `health/indicators/disk.health.ts` — disk space check
  - `health/indicators/git.health.ts` — git availability check
  - `health/indicators/agent.health.ts` — Claude Code availability check

### 3.13 GenUI Module

- [ ] **SV-ARCH-041**: Create `server/src/modules/gen-ui/gen-ui.module.ts`
  - Import `AgentModule` for triggering generative UI creation
  - Import `ProjectsModule` for project scoping
  - Provide `GenUiService`
- [ ] **SV-ARCH-042**: Define gen-ui module file structure
  - `gen-ui/gen-ui.controller.ts` — list, create trigger, get output
  - `gen-ui/gen-ui.service.ts` — generative UI management
  - `gen-ui/dto/create-gen-ui.dto.ts`
  - `gen-ui/dto/gen-ui-response.dto.ts`

### 3.14 Plans Module

- [ ] **SV-ARCH-043**: Create `server/src/modules/plans/plans.module.ts`
  - Import `AgentModule` for plan generation execution
  - Import `GraphModule` for graph traversal during planning
  - Provide `PlansService`
- [ ] **SV-ARCH-044**: Define plans module file structure
  - `plans/plans.controller.ts` — generate, list, approve, execute
  - `plans/plans.service.ts` — plan management logic
  - `plans/dto/generate-plan.dto.ts`
  - `plans/dto/plan-response.dto.ts`
  - `plans/dto/approve-plan.dto.ts`

### 3.15 Collaboration Module

- [ ] **SV-ARCH-045**: Create `server/src/modules/collaboration/collaboration.module.ts`
  - Import `GitModule` for sync operations
  - Import `WebSocketModule` for sync notifications
  - Import `ProjectsModule` for project scoping
  - Provide `CollaborationService`
- [ ] **SV-ARCH-046**: Define collaboration module file structure
  - `collaboration/collaboration.controller.ts` — sync status, pull, push
  - `collaboration/collaboration.service.ts` — sync logic
  - `collaboration/dto/sync-status.dto.ts`
  - `collaboration/dto/pull-result.dto.ts`
  - `collaboration/dto/push-result.dto.ts`

### 3.16 Database Module

- [ ] **SV-ARCH-047**: Create `server/src/modules/database/database.module.ts`
  - Configure TypeORM or Drizzle ORM with PostgreSQL
  - Use `ConfigService` for database connection parameters
  - Mark as `@Global()` for universal availability
  - Enable logging in development, disable in production
- [ ] **SV-ARCH-048**: Define database module configuration
  - Connection pool size (min: 2, max: 10, configurable)
  - SSL configuration for production
  - Migration auto-run setting (dev only)
  - Entity auto-load configuration
  - Retry connection on failure (3 attempts with backoff)

#### Design Decisions

> **Q**: Should Specs and Documents be separate NestJS modules, or combined into a single module since documents are just groups of specs?
> **A**: Combine into a single `SpecModule` that exposes both `SpecService` and `DocumentService`. Documents are lightweight grouping containers for specs — they don't justify a separate module boundary. The services share the same file-system context (the knowledge graph directory) and are tightly coupled. If document logic grows substantially, extract later.

> **Q**: Should the GitModule be project-scoped (one instance per project with its own working directory) or a singleton service that receives the project path per operation?
> **A**: Singleton service that receives the project path per operation. Project-scoped modules in NestJS use `REQUEST` scope which propagates to all dependents and kills performance. The `GitService` should be a stateless singleton that takes `projectPath` as a parameter. Use a per-project lock (keyed by project ID) internally to serialize write operations.

> **Q**: Should the AgentModule be a single module or split into sub-modules (AgentSessionModule, AgentOrchestratorModule, ClaudeCodeWrapperModule)?
> **A**: Split into two sub-modules: `AgentSessionModule` (session lifecycle, history persistence, WebSocket streaming) and `AgentCoreModule` (Claude Code process wrapper, MCP tool registry, orchestration logic). The orchestrator and Claude Code wrapper are tightly coupled and belong together. Session management is a distinct concern. This keeps testability high without excessive fragmentation.

> **Q**: How should shared types between client and server be consumed? Via a workspace package (`@shared/types`), or via path aliases pointing to a common `shared/` directory?
> **A**: Use a workspace package (`@botnet/shared`) in a monorepo setup. Bun supports workspaces natively. A proper package gives explicit versioning, clear dependency direction, and works with any build tool. Path aliases break when tools outside the TypeScript compiler need to resolve them (e.g., Jest, bundlers).

> **Q**: Should DTOs live in the server package only, or should request/response shapes be defined in the shared package and DTOs be thin wrappers?
> **A**: Define TypeScript interfaces/types for request/response shapes in `@botnet/shared`. Server-side DTOs (decorated with `class-validator`) live in the server package and implement those shared interfaces. This way the client imports clean types, the server gets validation, and the shapes stay synchronized.

> **Q**: Should non-critical modules (GenUI, Plans, Collaboration) be lazy-loaded to improve startup time?
> **A**: No. Do not lazy-load modules. Bun's startup is already fast (~50ms for module resolution), and the added complexity of lazy loading in NestJS isn't worth it for the expected module count (~15-20 modules). Eager loading also catches DI errors at startup rather than at runtime.

> **Q**: Is there a measurable startup time benefit to lazy loading under Bun given Bun's fast module resolution?
> **A**: No measurable benefit. Bun resolves modules in single-digit milliseconds. The startup bottleneck will be database connection initialization and git repository validation, not module loading. Optimize those instead (connection pooling, async init).

---

## 4. Service Layer Patterns

### 4.1 Repository Pattern

- [ ] **SV-ARCH-049**: Define repository base class for database entities
  - Abstract `BaseRepository<T>` with standard CRUD methods
  - `findById(id: string): Promise<T | null>`
  - `findAll(options?: FindOptions): Promise<T[]>`
  - `create(data: Partial<T>): Promise<T>`
  - `update(id: string, data: Partial<T>): Promise<T>`
  - `delete(id: string): Promise<void>`
  - `count(options?: FindOptions): Promise<number>`
- [ ] **SV-ARCH-050**: Define file-based repository pattern for knowledge graph data
  - Abstract `FileRepository<T>` for JSON file operations
  - `readFile(path: string): Promise<T>`
  - `writeFile(path: string, data: T): Promise<void>`
  - `deleteFile(path: string): Promise<void>`
  - `listFiles(directory: string, pattern: string): Promise<string[]>`
  - Include file locking mechanism for concurrent writes

### 4.2 Dependency Injection Patterns

- [ ] **SV-ARCH-051**: Establish service injection conventions
  - Use constructor injection exclusively (no property injection)
  - Use interfaces with `@Inject()` token for abstraction when needed
  - Use `forwardRef()` only for unavoidable circular dependencies
  - Document any circular dependency with a comment explaining why
- [ ] **SV-ARCH-052**: Define custom injection tokens
  - `CONFIG_OPTIONS` for module-specific configuration
  - `KNOWLEDGE_GRAPH_ROOT` for knowledge graph file system root path
  - `GIT_BINARY_PATH` for git executable path
  - `CLAUDE_CODE_PATH` for Claude Code executable path
  - `PROJECT_ROOT` for project root directory
- [ ] **SV-ARCH-053**: Create provider factories for dynamic configuration
  - `createDatabaseProviders()` for entity-specific repositories
  - `createGitProviders(options)` for project-scoped git services
  - `createAgentProviders(options)` for agent configuration

### 4.3 Service Communication Patterns

- [ ] **SV-ARCH-054**: Define event-based communication between modules
  - Use NestJS `EventEmitter2` for internal events
  - Define event types: `spec.created`, `spec.updated`, `spec.deleted`
  - Define event types: `edge.created`, `edge.updated`, `edge.deleted`
  - Define event types: `agent.session.started`, `agent.session.ended`
  - Define event types: `git.committed`, `git.pushed`, `git.pulled`
  - Define event types: `sync.available`, `sync.conflict`
- [ ] **SV-ARCH-055**: Implement event listener registration pattern
  - Use `@OnEvent()` decorator for event handlers
  - Configure async event handling for non-blocking operations
  - Implement retry logic for failed event handlers
  - Add dead-letter handling for repeatedly failing events
- [ ] **SV-ARCH-056**: Define service-to-service call conventions
  - Direct service injection for synchronous, same-module calls
  - Event emission for cross-module, async notifications
  - Keep service methods focused — single responsibility per method
  - Return typed results, never raw database entities from service boundaries

### 4.4 Transaction Management

- [ ] **SV-ARCH-057**: Implement database transaction patterns
  - Use TypeORM `QueryRunner` for multi-statement transactions
  - Create `@Transactional()` decorator or transaction manager service
  - Ensure rollback on any error within the transaction scope
  - Support nested transactions via savepoints
- [ ] **SV-ARCH-058**: Implement file system transaction patterns
  - Write to temp file, then rename (atomic write)
  - Track modified files for batch git commit
  - Rollback file changes on service-level error
  - Coordinate file writes with database writes where needed

#### Design Decisions

> **Q**: Should the project use TypeORM or Drizzle ORM?
> **A**: Use Drizzle ORM. It has better TypeScript type safety (no decorators needed for schema, inferred types), lighter runtime footprint, and excellent Bun compatibility since it's pure TypeScript. The `drizzle-orm/pg-core` + `drizzle-kit` for migrations is a clean setup. NestJS integration is straightforward: register the Drizzle client as a provider.

> **Q**: If using TypeORM, should we use the Active Record or Data Mapper pattern?
> **A**: N/A — using Drizzle. Drizzle naturally follows the Data Mapper pattern with explicit query functions, which is more testable.

> **Q**: Should the repository pattern add a layer on top of the ORM repository, or is the ORM's built-in repository sufficient?
> **A**: Add a thin repository layer. Each domain entity gets a repository class that wraps Drizzle queries. This provides a clean seam for testing (mock the repository, not the ORM), encapsulates query logic, and keeps services focused on business logic. Repositories are NestJS `@Injectable()` providers.

> **Q**: The knowledge graph uses JSON files in git repos. Should the server parse and cache these in memory, or read from disk on every request?
> **A**: Use a hybrid approach: maintain an in-memory index of the graph structure (node IDs, edge relationships, metadata) that is loaded on project open and invalidated on mutations. Full spec content is read from disk on demand. The index enables fast traversal queries while disk reads ensure content freshness. The index is rebuilt on git pull/merge operations.

> **Q**: Should there be a database-backed index of the knowledge graph for fast queries, or should all queries traverse the file system?
> **A**: No database-backed index. The in-memory index is sufficient for expected graph sizes (hundreds to low thousands of nodes). Adding a PostgreSQL mirror creates a synchronization problem between the git files (source of truth) and the database. Keep the architecture simple: git files are the single source of truth.

> **Q**: How should concurrent file writes be handled? File-level locks, operation queuing, or optimistic concurrency with retry?
> **A**: Operation queuing with per-project write serialization. Use an in-memory async queue (one per project) that serializes all write operations to the knowledge graph. Reads can happen concurrently. This avoids file lock complexity and race conditions. The queue drains naturally; no retry logic needed at the file level since git commit is the atomic boundary.

> **Q**: Should module-to-module communication use NestJS's `EventEmitter2` or a message queue (Redis Pub/Sub, BullMQ)?
> **A**: Use `EventEmitter2` for the initial release. It's synchronous-capable, in-process, zero-latency, and sufficient for a single-instance deployment. Add an interface abstraction (`EventBus`) so the implementation can be swapped to Redis Pub/Sub later if horizontal scaling is needed. Do not add Redis as a dependency until it's actually required.

> **Q**: Should events be fire-and-forget or should there be guaranteed delivery with acknowledgment?
> **A**: Fire-and-forget for all in-process events. Graph mutations don't need event delivery guarantees because the mutation itself is the source of truth (the committed file). Events are notifications for cache invalidation and WebSocket broadcasting — if one is missed, the client will get correct state on next REST fetch.

---

## 5. Configuration Management

### 5.1 Environment Configuration

- [ ] **SV-ARCH-059**: Configure `@nestjs/config` with `ConfigModule.forRoot()`
  - Set `isGlobal: true` for app-wide access
  - Set `envFilePath` to resolve `.env` from project root
  - Enable `expandVariables: true` for variable interpolation
  - Add validation schema using Joi or class-validator
- [ ] **SV-ARCH-060**: Define all environment variables with types and defaults
  - `NODE_ENV` — `development | staging | production`
  - `PORT` — server port (default: 3000)
  - `DATABASE_URL` — PostgreSQL connection string
  - `DATABASE_HOST` — DB host (default: localhost)
  - `DATABASE_PORT` — DB port (default: 5432)
  - `DATABASE_NAME` — DB name
  - `DATABASE_USER` — DB user
  - `DATABASE_PASSWORD` — DB password
  - `DATABASE_SSL` — enable SSL (default: false)
  - `JWT_SECRET` — JWT signing secret
  - `JWT_ACCESS_EXPIRATION` — access token TTL (default: 15m)
  - `JWT_REFRESH_EXPIRATION` — refresh token TTL (default: 7d)
  - `BCRYPT_ROUNDS` — bcrypt salt rounds (default: 12)
  - `CORS_ORIGINS` — allowed origins (comma-separated)
  - `CLAUDE_CODE_BINARY_PATH` — path to Claude Code CLI executable
  - `ANTHROPIC_API_KEY` — API key passed to Claude Code subprocess (not used by server directly)
  - `KNOWLEDGE_GRAPH_ROOT` — root path for knowledge graph files
  - `GIT_REMOTE_URL` — default remote URL for git operations
  - `MAX_AGENT_SESSIONS` — max concurrent agent sessions (default: 5)
  - `RATE_LIMIT_TTL` — rate limit window in seconds (default: 60)
  - `RATE_LIMIT_MAX` — max requests per window (default: 100)
  - `LOG_LEVEL` — logging level (default: info)
  - `SWAGGER_ENABLED` — enable Swagger UI (default: true in dev)
- [ ] **SV-ARCH-061**: Create `.env.example` with all variables documented
  - Include comments explaining each variable
  - Set safe defaults for development
  - Mark required variables clearly

### 5.2 Configuration Validation

- [ ] **SV-ARCH-062**: Implement configuration validation on startup
  - Validate all required environment variables are present
  - Validate port numbers are valid integers in range
  - Validate database URL format
  - Validate JWT secret meets minimum length (32 chars)
  - Validate bcrypt rounds is between 10 and 15
  - Fail fast with descriptive error if validation fails
- [ ] **SV-ARCH-063**: Create typed configuration namespaces
  - `DatabaseConfig` — all database-related config
  - `AuthConfig` — JWT, bcrypt configuration
  - `AgentConfig` — Claude Code paths, limits
  - `GitConfig` — git-related configuration
  - `ServerConfig` — port, CORS, rate limiting
  - `LogConfig` — logging level and format
- [ ] **SV-ARCH-064**: Implement config factory functions for each namespace
  - `registerAs('database', () => ({...}))` pattern
  - Type-safe access via `configService.get<DatabaseConfig>('database')`
  - Validate namespace configs individually

### 5.3 Runtime Configuration

- [ ] **SV-ARCH-065**: Support runtime configuration overrides where safe
  - Log level can be changed at runtime via admin endpoint
  - Rate limits can be adjusted without restart
  - Agent session limits can be adjusted without restart
- [ ] **SV-ARCH-066**: Implement configuration reload capability
  - Watch `.env` file for changes in development
  - Emit config change events when values update
  - Services subscribe to config changes and reinitialize if needed

#### Design Decisions

> **Q**: Should the project use `@nestjs/config` with Joi validation or a custom config loader with `class-validator` DTOs?
> **A**: Use `@nestjs/config` with `class-validator` DTOs. NestJS's config module handles `.env` loading and module injection. Use `class-validator` + `class-transformer` for validation (consistent with the DTO validation approach used in controllers). Define a `ConfigDto` class with decorators and validate in `ConfigModule.forRoot()` using a custom validation function.

> **Q**: Should sensitive configuration be loaded from environment variables only, or should there be support for a secrets manager?
> **A**: Environment variables only for the initial release. This keeps the deployment simple and works for Docker, bare-metal, and CI. Add an abstract `SecretsProvider` interface that reads from `process.env` by default. A Vault or AWS Secrets Manager implementation can be swapped in later without changing consuming code.

> **Q**: Should the server support configuration hot-reload in production, or require a restart for any config change?
> **A**: Require a restart. Hot-reload for configuration introduces race conditions and complicates reasoning about server state. Bun restarts are fast (<1 second). For zero-downtime deploys, use rolling restarts behind a load balancer.

> **Q**: How many environments should be supported?
> **A**: Four environments: `development`, `test`, `staging`, `production`. `test` is essential for CI (separate database, mocked externals). `staging` mirrors production for pre-release validation. Each environment maps to a `NODE_ENV` value.

> **Q**: Should each environment have its own `.env` file, or use a single `.env` with overrides?
> **A**: Use per-environment `.env` files: `.env.development`, `.env.test`, `.env.staging`. Production uses environment variables injected by the deployment platform (never a `.env.production` file on disk). `.env.development` is committed to the repo with safe defaults. `.env.test` is committed. `.env.staging` is not committed. Add `.env.local` to `.gitignore` for personal overrides that take highest precedence.

---

## 6. Middleware Pipeline

### 6.1 Security Middleware

- [ ] **SV-ARCH-067**: Configure Helmet middleware
  - Set `contentSecurityPolicy` with appropriate directives
  - Set `crossOriginEmbedderPolicy` for iframe security
  - Set `crossOriginOpenerPolicy` to `same-origin`
  - Set `crossOriginResourcePolicy` to `same-origin`
  - Set `referrerPolicy` to `strict-origin-when-cross-origin`
  - Disable `x-powered-by` header
- [ ] **SV-ARCH-068**: Configure CORS middleware
  - Read allowed origins from config
  - Allow credentials (for http-only cookies)
  - Set allowed methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
  - Set allowed headers: Content-Type, Authorization, X-Request-ID
  - Set exposed headers: X-Request-ID, X-Total-Count
  - Set max age for preflight caching (24 hours)
- [ ] **SV-ARCH-069**: Configure rate limiting middleware
  - Use `@nestjs/throttler` for rate limiting
  - Default: 100 requests per 60 seconds
  - Auth endpoints: 10 requests per 60 seconds (stricter)
  - Agent endpoints: 20 requests per 60 seconds
  - Health endpoints: exempt from rate limiting
  - Return `Retry-After` header on limit exceeded
  - Store rate limit counters in memory (upgrade to Redis if needed)

### 6.2 Request Processing Middleware

- [ ] **SV-ARCH-070**: Create request ID middleware
  - Generate UUID v4 for each incoming request
  - Attach to `req.id` and response header `X-Request-ID`
  - Accept client-provided `X-Request-ID` if present (for tracing)
  - Pass request ID to logger context
- [ ] **SV-ARCH-071**: Create request timing middleware
  - Record `Date.now()` on request start
  - Calculate and log duration on response finish
  - Add `X-Response-Time` header with milliseconds
- [ ] **SV-ARCH-072**: Configure compression middleware
  - Enable gzip compression for responses > 1kb
  - Support brotli compression if client accepts it
  - Skip compression for already-compressed content (images, etc.)
  - Skip compression for Server-Sent Events and WebSocket upgrades
- [ ] **SV-ARCH-073**: Configure cookie parser middleware
  - Parse cookies from incoming requests
  - Support signed cookies for CSRF tokens
  - Make parsed cookies available on `req.cookies`

### 6.3 Middleware Execution Order

- [ ] **SV-ARCH-074**: Document and enforce middleware execution order
  1. Request ID generation
  2. Request timing start
  3. Helmet security headers
  4. CORS handling
  5. Compression
  6. Cookie parsing
  7. Body parsing (JSON, URL-encoded)
  8. Rate limiting
  9. Route handling (guards → interceptors → pipes → handler)
  10. Request timing end + logging

#### Design Decisions

> **Q**: What CSP directives are needed? The iframe sandbox for generative UI and WebSocket connections may require specific CSP exceptions.
> **A**: Base CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' wss://{host}; frame-src 'self' blob:; img-src 'self' data: blob:; font-src 'self'`. The `frame-src blob:` allows sandboxed generative UI iframes loaded from blob URLs. `connect-src wss:` allows WebSocket. Use `helmet` middleware with these CSP overrides. Generative UI iframes must use the `sandbox` attribute with `allow-scripts` only — no `allow-same-origin`.

> **Q**: Should the server implement CSRF protection via double-submit cookies or synchronizer tokens?
> **A**: Double-submit cookie pattern. On login, set a non-HTTP-only `csrf_token` cookie. The client reads this cookie and sends it as the `X-CSRF-Token` header on all mutating requests. The server validates that the header matches the cookie. This is stateless, works well with JWT cookie auth, and is standard practice. Only enforce on cookie-authenticated requests — Bearer token requests are immune to CSRF.

> **Q**: Should rate limiting be per-IP, per-user, or both?
> **A**: Both. Apply two layers: (1) per-IP rate limiting via middleware (runs first, before auth) to block brute-force and DDoS — 100 requests/minute per IP. (2) per-user rate limiting via guard (runs after auth) for finer control — 300 requests/minute per authenticated user. Agent session endpoints get stricter per-user limits (20 requests/minute) since each triggers expensive LLM operations.

> **Q**: Should the server support request body size limits per endpoint or a single global limit?
> **A**: Per-endpoint limits. Global default: 1MB. File upload endpoints: 50MB. Spec content endpoints: 5MB. Implement via per-route middleware or decorator that overrides the Express body parser limit for specific routes.

> **Q**: Should request IDs be UUIDs or shorter identifiers (e.g., nanoid)?
> **A**: Use nanoid (21 characters, URL-safe alphabet). It's shorter in logs, has sufficient collision resistance, and is faster to generate than UUIDs. Prefix with `req_` for grep-ability: `req_V1StGXR8_Z5jdHi6B-myT`. Use the `nanoid` package.

---

## 7. Guards

### 7.1 Authentication Guards

- [ ] **SV-ARCH-075**: Implement `JwtAuthGuard` extending `AuthGuard('jwt')`
  - Extract JWT from http-only cookie (`access_token`)
  - Fallback to `Authorization: Bearer <token>` header
  - Validate token signature and expiration
  - Attach decoded user payload to `request.user`
  - Return 401 for missing/invalid tokens
- [ ] **SV-ARCH-076**: Implement `OptionalJwtAuthGuard`
  - Same as JwtAuthGuard but does not throw on missing token
  - Sets `request.user` to null if no valid token
  - Used for endpoints that behave differently for authenticated vs anonymous
- [ ] **SV-ARCH-077**: Implement `LocalAuthGuard` for login endpoint
  - Validate username/password via `LocalStrategy`
  - Attach authenticated user to `request.user`
  - Return 401 for invalid credentials

### 7.2 Authorization Guards

- [ ] **SV-ARCH-078**: Implement `RolesGuard` for role-based access
  - Read required roles from route metadata (`@Roles()` decorator)
  - Compare user roles from `request.user.roles`
  - Return 403 if user lacks required role
  - Support multiple roles (user has ANY of required roles)
- [ ] **SV-ARCH-079**: Implement `SpecPermissionGuard` for spec-level access
  - Read spec ID from route params or body
  - Check if user has `full` or `summary` access to the spec
  - Deny write operations for `summary` access users
  - Return 403 with message indicating permission level needed
- [ ] **SV-ARCH-080**: Implement `ProjectMemberGuard`
  - Verify user is a member of the target project
  - Read project ID from route params
  - Return 403 if user is not a project member
- [ ] **SV-ARCH-081**: Implement `AgentSessionOwnerGuard`
  - Verify user owns the agent session being accessed
  - Read session ID from route params
  - Return 403 if session belongs to another user

### 7.3 Guard Utilities

- [ ] **SV-ARCH-082**: Create `@Public()` decorator to bypass authentication
  - Set metadata flag `isPublic: true`
  - `JwtAuthGuard` checks this flag and skips validation
  - Apply to: login, register, health check, Swagger endpoints
- [ ] **SV-ARCH-083**: Create `@Roles()` decorator for role metadata
  - Accept one or more role strings
  - Store as route metadata for `RolesGuard` to read
- [ ] **SV-ARCH-084**: Create `@SpecAccess()` decorator for spec permission metadata
  - Accept required access level: `full` or `summary`
  - Store as route metadata for `SpecPermissionGuard`

---

## 8. Interceptors

### 8.1 Logging Interceptor

- [ ] **SV-ARCH-085**: Implement `LoggingInterceptor`
  - Log on request entry: method, URL, user ID, request ID
  - Log on response: status code, duration, response size
  - Log on error: error type, message, stack trace (dev only)
  - Use structured JSON format for log entries
  - Redact sensitive fields (password, token, cookie values)
- [ ] **SV-ARCH-086**: Configure log level per route
  - Health check routes: `debug` level (suppress in production)
  - Auth routes: `info` level (audit trail)
  - Agent routes: `info` level with extra context
  - All others: `info` level

### 8.2 Response Transformation Interceptor

- [ ] **SV-ARCH-087**: Implement `TransformInterceptor` for standard response envelope
  - Wrap successful responses in `{ data: T, meta?: { ... } }`
  - Add `meta.timestamp` with ISO date
  - Add `meta.requestId` from request context
  - Add `meta.pagination` for list endpoints (page, limit, total)
  - Skip transformation for streaming/SSE responses
- [ ] **SV-ARCH-088**: Implement response serialization via `class-transformer`
  - Use `@Exclude()` to hide sensitive entity fields (password hash, tokens)
  - Use `@Expose()` to whitelist response fields
  - Use `ClassSerializerInterceptor` at controller level
  - Configure serialization groups for different access levels

### 8.3 Timeout Interceptor

- [ ] **SV-ARCH-089**: Implement `TimeoutInterceptor`
  - Default timeout: 30 seconds for standard endpoints
  - Agent endpoints: 120 seconds (longer processing)
  - Git operations: 60 seconds (network-dependent)
  - Health checks: 5 seconds
  - Return 408 Request Timeout on expiry
  - Support per-route override via `@Timeout(ms)` decorator
- [ ] **SV-ARCH-090**: Create `@Timeout()` decorator for per-route timeout
  - Accept milliseconds as parameter
  - Store as route metadata for `TimeoutInterceptor`

### 8.4 Cache Interceptor

- [ ] **SV-ARCH-091**: Implement `CacheInterceptor` for GET endpoint caching
  - Cache responses for read-only endpoints with configurable TTL
  - Use request URL + query params as cache key
  - Invalidate cache on related write operations
  - Skip caching for authenticated per-user data unless specified
  - Use in-memory cache store (upgrade to Redis if needed)
- [ ] **SV-ARCH-092**: Create `@CacheTTL()` decorator for per-route cache duration
  - Accept seconds as parameter
  - Default TTL: 60 seconds for cacheable endpoints
  - Set TTL: 0 to disable caching for specific routes

---

## 9. Pipes & Validation

### 9.1 Global Validation

- [ ] **SV-ARCH-093**: Configure global `ValidationPipe` settings
  - `whitelist: true` — strip properties not in DTO
  - `forbidNonWhitelisted: true` — error on unknown properties
  - `transform: true` — transform payloads to DTO instances
  - `transformOptions.enableImplicitConversion: true`
  - `validationError.target: false` — hide target object in errors
  - `validationError.value: false` — hide value in errors (security)
  - `exceptionFactory` — custom factory for consistent error format

### 9.2 Custom Pipes

- [ ] **SV-ARCH-094**: Create `ParseUUIDPipe` for UUID parameter validation
  - Validate UUID v4 format
  - Return 400 with clear message on invalid UUID
  - Use as route param pipe: `@Param('id', ParseUUIDPipe)`
- [ ] **SV-ARCH-095**: Create `ParseProjectPathPipe` for project path validation
  - Validate project path format (alphanumeric, hyphens, slashes)
  - Prevent path traversal attacks (`../`)
  - Normalize path separators
- [ ] **SV-ARCH-096**: Create `ParsePaginationPipe` for query parameter parsing
  - Parse `page` (default: 1, min: 1)
  - Parse `limit` (default: 20, min: 1, max: 100)
  - Parse `sort` (field name, validate against allowed fields)
  - Parse `order` (`asc` or `desc`, default: `desc`)
  - Return typed `PaginationParams` object
- [ ] **SV-ARCH-097**: Create `SanitizeHtmlPipe` for user-provided content
  - Strip dangerous HTML tags and attributes
  - Allow safe markdown-compatible HTML subset
  - Prevent XSS injection in spec content
- [ ] **SV-ARCH-098**: Create `TrimStringsPipe` for string field normalization
  - Trim leading/trailing whitespace from all string fields
  - Normalize multiple spaces to single space in specific fields
  - Apply to all string DTO properties

### 9.3 Validation Decorators

- [ ] **SV-ARCH-099**: Define custom validation decorators
  - `@IsSlug()` — validate slug format (lowercase, hyphens)
  - `@IsCommitHash()` — validate git commit hash format
  - `@IsEdgeType()` — validate against allowed edge types
  - `@IsSpecContent()` — validate spec content structure
  - `@IsGraphQuery()` — validate graph traversal query format

---

## 10. Exception Filters

### 10.1 HTTP Exception Filter

- [ ] **SV-ARCH-100**: Implement `HttpExceptionFilter`
  - Catch all `HttpException` instances
  - Format response as `{ error: { code, message, details?, requestId } }`
  - Map NestJS exceptions to application error codes
  - Include request ID for error tracking
  - Log error details server-side with full context
- [ ] **SV-ARCH-101**: Define standard error response schema
  - `code` — application-specific error code (e.g., `AUTH_INVALID_TOKEN`)
  - `message` — human-readable error message
  - `details` — optional array of field-level errors
  - `requestId` — request tracking ID
  - `statusCode` — HTTP status code
  - `timestamp` — ISO date string

### 10.2 Application Error Codes

- [ ] **SV-ARCH-102**: Define error code taxonomy
  - `AUTH_*` — authentication errors (AUTH_INVALID_TOKEN, AUTH_EXPIRED_TOKEN, AUTH_INVALID_CREDENTIALS)
  - `AUTHZ_*` — authorization errors (AUTHZ_INSUFFICIENT_ROLE, AUTHZ_SPEC_DENIED)
  - `VALIDATION_*` — input validation errors (VALIDATION_FAILED, VALIDATION_MISSING_FIELD)
  - `RESOURCE_*` — resource errors (RESOURCE_NOT_FOUND, RESOURCE_CONFLICT, RESOURCE_GONE)
  - `AGENT_*` — agent errors (AGENT_SESSION_LIMIT, AGENT_TIMEOUT, AGENT_PROCESS_ERROR)
  - `GIT_*` — git errors (GIT_CONFLICT, GIT_PUSH_FAILED, GIT_NOT_INITIALIZED)
  - `GRAPH_*` — graph errors (GRAPH_CYCLE_DETECTED, GRAPH_INVALID_EDGE)
  - `INTERNAL_*` — internal errors (INTERNAL_SERVER_ERROR, INTERNAL_DEPENDENCY_FAILURE)

### 10.3 Specialized Exception Filters

- [ ] **SV-ARCH-103**: Implement `DatabaseExceptionFilter`
  - Catch TypeORM/Drizzle query errors
  - Map constraint violations to meaningful error messages
  - Handle connection failures with retry suggestion
  - Log full query details server-side (never expose to client)
- [ ] **SV-ARCH-104**: Implement `ValidationExceptionFilter`
  - Catch `BadRequestException` from `ValidationPipe`
  - Format field-level errors into `details` array
  - Each detail: `{ field, message, constraint, value? }`
  - Sort errors by field name for consistency
- [ ] **SV-ARCH-105**: Implement `UnhandledExceptionFilter` as catch-all
  - Catch any non-HttpException errors
  - Log full stack trace server-side
  - Return generic 500 response to client (no internal details)
  - Trigger alert/notification for unhandled errors in production
- [ ] **SV-ARCH-106**: Implement `WebSocketExceptionFilter`
  - Catch errors in WebSocket gateway handlers
  - Send error event to the client socket
  - Format consistently with HTTP error format
  - Log with WebSocket connection context

#### Design Decisions

> **Q**: Should error responses include a `help` URL linking to documentation for each error code?
> **A**: No. Not for the initial release. Maintaining error documentation is overhead that doesn't justify itself until there are external API consumers. Error codes and messages should be self-explanatory. Revisit when/if a public API is offered.

> **Q**: Should the server distinguish between "expected" errors and "unexpected" errors in the response format?
> **A**: Yes. Expected errors return structured responses: `{ error: { code: "VALIDATION_FAILED", message: "...", details: [...] } }` with appropriate 4xx status. Unexpected errors return: `{ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred", requestId: "req_..." } }` with 500 status. Never leak internal details in unexpected error responses.

> **Q**: Should stack traces be included in error responses in development mode, or always kept server-side only?
> **A**: Include stack traces in error responses only in `development` mode (when `NODE_ENV=development`). In `test`, `staging`, and `production`, stack traces are logged server-side only and never returned to the client. The `requestId` in the response allows correlating with server logs.

---

## 11. Logging Strategy

### 11.1 Logger Configuration

- [ ] **SV-ARCH-107**: Implement custom `LoggerService` extending NestJS Logger
  - Support structured JSON output for production
  - Support pretty-printed output for development
  - Include contextual fields: timestamp, level, module, requestId
  - Support child loggers with inherited context
- [ ] **SV-ARCH-108**: Configure log levels per environment
  - Development: `debug` (all logs)
  - Staging: `info` (info and above)
  - Production: `warn` (warn and error only)
  - Allow override via `LOG_LEVEL` env var
- [ ] **SV-ARCH-109**: Configure log output destinations
  - Development: stdout with colors
  - Production: stdout as JSON (for log aggregation)
  - Optional: file output for local debugging
  - Consider pino or winston for structured logging library

### 11.2 Contextual Logging

- [ ] **SV-ARCH-110**: Implement request-scoped logging context
  - Attach `requestId`, `userId`, `method`, `url` to all logs in a request
  - Use `AsyncLocalStorage` for request context propagation
  - Ensure context propagates through async operations
- [ ] **SV-ARCH-111**: Implement module-scoped logging
  - Each service gets a logger with the module/service name
  - `this.logger = new Logger(MyService.name)`
  - Log format: `[Nest] [RequestId] [ModuleName] message`
- [ ] **SV-ARCH-112**: Define standard log points per operation type
  - Service method entry: `debug` level
  - Service method success: `debug` level
  - Service method failure: `error` level with error details
  - External call (DB, git, Claude): `info` level with duration
  - Authentication success/failure: `info` level (audit)
  - Agent session events: `info` level

### 11.3 Audit Logging

- [ ] **SV-ARCH-113**: Implement audit log for security-relevant operations
  - User login/logout events
  - Permission changes (spec access grants/revokes)
  - Admin operations (user management)
  - Agent session creation and termination
  - Git push/pull operations
- [ ] **SV-ARCH-114**: Store audit logs in PostgreSQL audit table
  - Fields: id, userId, action, resource, resourceId, details (JSON), ip, userAgent, timestamp
  - Index by userId and timestamp for querying
  - Retention policy: configurable (default 90 days)
- [ ] **SV-ARCH-115**: Create `@AuditLog()` decorator for automatic audit logging
  - Attach to controller methods that need auditing
  - Accept action name and resource type as parameters
  - Automatically capture user, resource ID, and request details

---

## 12. Health Checks & Monitoring

### 12.1 Health Check Endpoints

- [ ] **SV-ARCH-116**: Implement `GET /api/v1/health` — basic liveness check
  - Return `{ status: 'ok', timestamp }` with 200
  - No authentication required
  - No dependency checks (pure liveness)
- [ ] **SV-ARCH-117**: Implement `GET /api/v1/health/ready` — readiness check
  - Check database connectivity
  - Check git binary availability
  - Check knowledge graph root directory exists
  - Return `{ status: 'ok' | 'degraded', checks: [...] }` with 200 or 503
- [ ] **SV-ARCH-118**: Implement `GET /api/v1/health/detailed` — detailed health (auth required)
  - All readiness checks plus:
  - Database connection pool stats
  - Active agent session count
  - Memory usage (RSS, heap)
  - Disk space available at knowledge graph root
  - Uptime in seconds
  - Git remote reachability
  - Claude Code process status

### 12.2 Metrics Collection

- [ ] **SV-ARCH-119**: Track request metrics
  - Total request count by route and method
  - Request duration histogram by route
  - Error count by status code
  - Active concurrent requests gauge
- [ ] **SV-ARCH-120**: Track business metrics
  - Active agent sessions count
  - Agent requests processed count
  - Git operations count (commit, push, pull)
  - Specs created/updated/deleted count
  - WebSocket active connections count
- [ ] **SV-ARCH-121**: Expose metrics endpoint (optional, for Prometheus)
  - `GET /api/v1/metrics` — Prometheus-compatible text format
  - Protect with authentication or internal-only access
  - Include all request and business metrics

### 12.3 Graceful Shutdown

- [ ] **SV-ARCH-122**: Implement graceful shutdown sequence
  - Stop accepting new HTTP connections
  - Stop accepting new WebSocket connections
  - Wait for in-flight requests to complete (max 30s)
  - Terminate active agent sessions gracefully (send SIGTERM to Claude Code)
  - Close database connections
  - Close git operation locks
  - Log shutdown complete
- [ ] **SV-ARCH-123**: Handle shutdown signals
  - Listen for `SIGTERM` (container orchestration)
  - Listen for `SIGINT` (manual stop)
  - Set shutdown timeout (default 30 seconds)
  - Force kill if timeout exceeded

#### Design Decisions

> **Q**: Should the health check endpoint be used by a load balancer, a container orchestrator (Kubernetes), or both?
> **A**: Support both via two endpoints: `GET /health/live` (liveness probe — returns 200 if process is running, used by Kubernetes) and `GET /health/ready` (readiness probe — returns 200 if database and git are accessible, used by load balancers and Kubernetes). Both return JSON: `{ status: "ok"|"degraded"|"unhealthy", checks: {...} }`.

> **Q**: Should the detailed health endpoint include database query latency measurements, or just connectivity checks?
> **A**: Include latency measurements. The readiness endpoint runs `SELECT 1` and reports the query time in milliseconds. This catches slow-but-connected database scenarios. Also check git access and report its latency. Cap the health check timeout at 5 seconds.

> **Q**: Should the server expose Prometheus metrics natively, or rely on a sidecar/agent for metrics collection?
> **A**: Expose Prometheus metrics natively via `GET /metrics` using the `prom-client` package. Instrument: HTTP request count/latency (by route, method, status), WebSocket connection count, active agent sessions, git operation count/latency, and event loop lag. Native exposition is simpler than configuring a sidecar.

> **Q**: Should the server have built-in alerting, or should alerting be handled entirely by the monitoring infrastructure?
> **A**: Alerting handled by monitoring infrastructure. The server's job is to emit structured logs and Prometheus metrics. Alertmanager (or equivalent) defines alert rules and notification channels. Building alerting into the server couples it to specific notification channels and duplicates what monitoring tools do better.

> **Q**: Should unhandled exceptions trigger immediate notifications, or only be captured in logs for periodic review?
> **A**: Captured in structured JSON logs. The monitoring stack handles immediate notification based on error rate thresholds. A single unhandled exception logs at `error` level; a spike in error rate triggers an alert. This avoids alert fatigue from one-off errors.

---

## 13. File System Service

### 13.1 Knowledge Graph File Operations

- [ ] **SV-ARCH-124**: Implement `FileSystemService` for knowledge graph I/O
  - `readJson<T>(filePath: string): Promise<T>` — parse JSON file
  - `writeJson<T>(filePath: string, data: T): Promise<void>` — write JSON with formatting
  - `deleteFile(filePath: string): Promise<void>` — remove file
  - `moveFile(from: string, to: string): Promise<void>` — move/rename
  - `copyFile(from: string, to: string): Promise<void>` — copy file
  - `exists(filePath: string): Promise<boolean>` — check existence
  - `listDirectory(dirPath: string): Promise<string[]>` — list contents
  - `createDirectory(dirPath: string): Promise<void>` — mkdir recursive
  - `removeDirectory(dirPath: string): Promise<void>` — rmdir recursive
- [ ] **SV-ARCH-125**: Implement path resolution and validation
  - Resolve all paths relative to project knowledge graph root
  - Validate paths are within the allowed root (prevent traversal)
  - Normalize path separators for cross-platform compatibility
  - Reject paths containing `..` segments
- [ ] **SV-ARCH-126**: Implement atomic file writes
  - Write to temporary file first (same directory, `.tmp` suffix)
  - Rename temp file to target (atomic on most filesystems)
  - Clean up temp file on write failure
  - Ensure consistent JSON formatting (2-space indent, sorted keys)

### 13.2 File Watching

- [ ] **SV-ARCH-127**: Implement file watcher for knowledge graph changes
  - Watch knowledge graph root directory recursively
  - Detect file create, modify, delete events
  - Debounce rapid changes (100ms window)
  - Emit typed events for graph data changes
  - Ignore `.git` directory and temp files
- [ ] **SV-ARCH-128**: Handle external file changes (from git operations)
  - After git pull/merge, scan for changed files
  - Compare file hashes before and after git operation
  - Emit change events for modified knowledge graph files
  - Trigger cache invalidation for changed data

### 13.3 File Locking

- [ ] **SV-ARCH-129**: Implement file-level locking for concurrent access
  - Use lock files (`.lock` suffix) for write operations
  - Implement lock timeout (default 10 seconds)
  - Implement lock retry with exponential backoff
  - Clean up stale locks on service startup
  - Log warnings for long-held locks
- [ ] **SV-ARCH-130**: Implement directory-level locking for batch operations
  - Lock entire directory for batch writes (e.g., batch spec update)
  - Allow concurrent reads while locked for writing
  - Queue write operations when lock is held

#### Design Decisions

> **Q**: With multiple users potentially modifying the same project's knowledge graph files, how should file-level concurrency be managed?
> **A**: Per-project write queue (in-memory async mutex keyed by project ID). All write operations to a project's knowledge graph are serialized through this queue. Reads are unrestricted. Git's conflict resolution handles the multi-user case across different clones, but within a single server instance, the write queue prevents concurrent file mutations.

> **Q**: Should the server use Bun's native file system APIs (`Bun.file()`, `Bun.write()`) or Node.js `fs/promises` for compatibility?
> **A**: Use Bun's native APIs (`Bun.file()`, `Bun.write()`). They are significantly faster for I/O-heavy operations. Portability to Node.js is not a requirement — the PRD specifies Bun as the runtime. Wrap file operations in a thin `FileSystemService` so the API is consistent and testable.

> **Q**: Should file operations be batched or individual?
> **A**: Write each change immediately, then batch the git commit. Individual writes ensure durability (data is on disk immediately). The git commit is the batching boundary — multiple file writes can be staged and committed together. This gives both safety (no data loss on crash) and clean history (one commit per logical operation).

> **Q**: Should the server watch the knowledge graph directory for external changes?
> **A**: Yes, watch for changes caused by git operations (pull, merge, checkout). Do not watch for arbitrary external file edits — the server is the authoritative writer. When a git operation completes, invalidate the in-memory index and notify connected clients via WebSocket. Use a targeted approach: after git pull/merge, diff the before/after tree to identify changed files and update the index.

> **Q**: If file watching is used, should it use Bun's native watcher, `chokidar`, or `fs.watch`?
> **A**: Do not use a persistent file watcher. Instead, use event-driven invalidation: the `GitService` emits an event after any git operation that modifies the working tree. The `KnowledgeGraphService` listens for this event and rebuilds the affected portion of its in-memory index. This is more reliable than file watching and avoids platform-specific watcher bugs.

---

## 14. Process Management

### 14.1 Claude Code Process Lifecycle

- [ ] **SV-ARCH-131**: Implement process spawning for Claude Code
  - Use Bun's `spawn()` or Node.js `child_process.spawn()`
  - Configure working directory per project
  - Set environment variables for Claude Code (API key, etc.)
  - Capture stdout and stderr streams
  - Track process PID for monitoring and cleanup
- [ ] **SV-ARCH-132**: Implement process tracking registry
  - Map session IDs to process PIDs
  - Track process state: spawning, running, idle, terminating, terminated
  - Track resource usage per process (if available)
  - Set maximum concurrent processes (from config)
  - Queue new requests when at capacity
- [ ] **SV-ARCH-133**: Implement process termination
  - Send SIGTERM for graceful shutdown
  - Wait configurable timeout (default 10s) for graceful exit
  - Send SIGKILL if process doesn't exit gracefully
  - Clean up process resources (file handles, temp files)
  - Update session state on process termination

### 14.2 Process Communication

- [ ] **SV-ARCH-134**: Implement stdin/stdout communication protocol
  - Write prompts to process stdin as structured messages
  - Read responses from stdout as structured output
  - Parse Claude Code's streaming output format
  - Handle multi-line and multi-part responses
  - Detect end-of-response markers
- [ ] **SV-ARCH-135**: Implement stderr error handling
  - Capture stderr output for error detection
  - Parse error messages from Claude Code
  - Categorize errors: configuration, API, runtime, timeout
  - Forward relevant errors to agent session for user notification
- [ ] **SV-ARCH-136**: Implement process heartbeat monitoring
  - Periodically check process is still responsive
  - Send lightweight ping if no recent output
  - Detect hung processes (no output for configurable duration)
  - Auto-restart or notify on unresponsive process

### 14.3 Resource Management

- [ ] **SV-ARCH-137**: Implement memory monitoring for child processes
  - Track memory usage per Claude Code process
  - Set memory limit threshold per process
  - Warn on high memory usage
  - Kill process if memory exceeds hard limit
- [ ] **SV-ARCH-138**: Implement process pool management
  - Maintain pool of warm Claude Code processes (optional optimization)
  - Pre-spawn processes based on expected demand
  - Recycle processes after configurable number of requests
  - Balance load across available processes
- [ ] **SV-ARCH-139**: Implement cleanup on server restart
  - On server startup, find orphaned Claude Code processes
  - Terminate any processes from previous server instance
  - Clean up stale session records
  - Clean up temporary files from interrupted operations

#### Design Decisions

> **Q**: How does the server communicate with Claude Code? Via CLI stdin/stdout, a REST API, or the Claude Code SDK?
> **A**: Via CLI stdin/stdout using the `claude` CLI in non-interactive (headless) mode with the `--output-format stream-json` flag. The server spawns `claude` as a child process via `Bun.spawn()`, writes prompts to stdin, and parses JSON events from stdout. This is the most reliable and well-documented integration path.

> **Q**: Should Claude Code processes be long-lived or short-lived?
> **A**: Short-lived with session resume. Spawn a Claude Code process per user message, using the `--resume` flag with the session ID to maintain conversation continuity. This avoids holding idle processes in memory while preserving context across messages. The process exits after producing its response.

> **Q**: What is the maximum number of concurrent Claude Code processes the server should support?
> **A**: 10 concurrent Claude Code processes system-wide as the default limit, configurable via `MAX_CONCURRENT_AGENTS`. Use a semaphore to enforce the limit; requests beyond the limit are queued with a 60-second queue timeout.

> **Q**: Should there be a warm pool of pre-spawned Claude Code processes for faster first response?
> **A**: No warm pool. Claude Code startup is fast (~1-2 seconds) and processes are short-lived. A warm pool adds complexity for minimal latency improvement. The 1-2 second spawn time is acceptable since the Claude API call itself takes 3-15 seconds. Spawn on demand.

> **Q**: Should Claude Code processes have CPU and memory cgroups/limits?
> **A**: Run unconstrained for the initial release. Claude Code processes are short-lived and their resource usage is bounded by the API call duration. The 10-process concurrency limit is sufficient resource protection. If deployed in containers, the container's own resource limits provide a ceiling.

> **Q**: How should the server handle Claude Code process crashes?
> **A**: Notify the user via WebSocket with an error event and allow them to retry. Since processes are short-lived (per-message), a "crash" means the current message failed. The user's conversation history is persisted, so they can simply send the message again. The server should log the crash with full context for debugging.

> **Q**: Should there be a timeout for individual agent operations?
> **A**: Yes. 5-minute timeout per agent operation (single message round-trip). Most operations complete in 10-60 seconds. Plan generation for large specs may take 2-3 minutes. The 5-minute ceiling prevents runaway operations. Kill the Claude Code process on timeout and notify the user. Configurable via `AGENT_OPERATION_TIMEOUT_MS=300000`.

---

## 15. Module Dependency Graph

### 15.1 Dependency Documentation

- [ ] **SV-ARCH-140**: Document and enforce module dependency rules
  - Core module: no dependencies on domain modules
  - Auth module: depends on Users module only
  - Domain modules (Specs, Graph, Documents): may depend on Git module
  - Agent module: may depend on any domain module
  - WebSocket module: no domain module dependencies (receives events)
  - No circular dependencies between domain modules
- [ ] **SV-ARCH-141**: Create module dependency visualization
  ```
  CoreModule (global)
  ├── ConfigModule (global)
  ├── DatabaseModule (global)
  │
  AuthModule
  ├── → UsersModule
  ├── → JwtModule
  │
  UsersModule
  ├── → DatabaseModule
  │
  ProjectsModule
  ├── → DatabaseModule
  ├── → GitModule
  ├── → UsersModule
  │
  SpecsModule
  ├── → ProjectsModule
  ├── → GitModule
  ├── → GraphModule
  │
  DocumentsModule
  ├── → SpecsModule
  ├── → ProjectsModule
  │
  GraphModule
  ├── → ProjectsModule
  ├── → GitModule
  │
  AgentModule
  ├── → GraphModule
  ├── → SpecsModule
  ├── → GitModule
  ├── → WebSocketModule
  │
  GitModule
  ├── → (standalone — no domain deps)
  │
  WebSocketModule
  ├── → AuthModule
  │
  GenUiModule
  ├── → AgentModule
  ├── → ProjectsModule
  │
  PlansModule
  ├── → AgentModule
  ├── → GraphModule
  │
  CollaborationModule
  ├── → GitModule
  ├── → WebSocketModule
  ├── → ProjectsModule
  │
  HealthModule
  ├── → DatabaseModule
  ├── → GitModule
  ```

### 15.2 Circular Dependency Prevention

- [ ] **SV-ARCH-142**: Implement circular dependency detection
  - Use NestJS built-in circular dependency detection
  - Fail startup with clear error message on circular dependency
  - Log the circular chain for debugging
- [ ] **SV-ARCH-143**: Resolve known dependency tensions
  - Specs ↔ Graph: use event-based communication instead of direct import
  - Agent → multiple modules: use facade/mediator service
  - Use `forwardRef()` only as last resort, document reason

---

## 16. Performance & Scalability

### 16.1 Request Performance

- [ ] **SV-ARCH-144**: Configure connection pooling for PostgreSQL
  - Min pool size: 2 connections
  - Max pool size: 10 connections (configurable)
  - Idle timeout: 30 seconds
  - Connection timeout: 5 seconds
  - Log pool statistics periodically
- [ ] **SV-ARCH-145**: Implement response compression
  - Compress JSON responses > 1kb
  - Use gzip for broad compatibility
  - Support brotli for modern clients
  - Skip compression for small responses
- [ ] **SV-ARCH-146**: Implement API response caching strategy
  - Cache graph traversal results (TTL: 60s, invalidate on mutation)
  - Cache user profile data (TTL: 300s)
  - Cache project metadata (TTL: 300s)
  - No caching for spec content (frequently edited)
  - No caching for agent responses (always fresh)

### 16.2 Memory Management

- [ ] **SV-ARCH-147**: Monitor and limit memory usage
  - Track heap usage via `process.memoryUsage()`
  - Log memory stats every 60 seconds
  - Alert on memory usage > 80% of available
  - Implement memory pressure relief (clear caches)
- [ ] **SV-ARCH-148**: Implement streaming for large responses
  - Stream large file reads (spec documents with many specs)
  - Stream git diff output for large diffs
  - Stream agent responses as they arrive
  - Use NestJS `StreamableFile` for binary/large text

### 16.3 Startup Optimization

- [ ] **SV-ARCH-149**: Optimize NestJS module initialization
  - Lazy-load non-critical modules (GenUI, Plans)
  - Eager-load critical modules (Auth, Database, Core)
  - Measure and log module initialization times
  - Target startup time under 3 seconds
- [ ] **SV-ARCH-150**: Implement connection pre-warming
  - Establish database connection on startup (not first request)
  - Validate git binary availability on startup
  - Pre-validate configuration on startup
  - Log all startup checks with pass/fail status

### 16.4 Error Recovery

- [ ] **SV-ARCH-151**: Implement database reconnection strategy
  - Detect connection lost events
  - Retry with exponential backoff (1s, 2s, 4s, 8s, max 30s)
  - Log each retry attempt
  - Emit health degradation event on persistent failure
  - Resume normal operation on reconnection
- [ ] **SV-ARCH-152**: Implement git operation retry strategy
  - Retry transient git failures (network timeout, lock contention)
  - Max 3 retries with 1s, 2s, 4s backoff
  - Do not retry on permanent failures (auth failure, invalid ref)
  - Log retry attempts with error details
- [ ] **SV-ARCH-153**: Implement circuit breaker pattern for external services
  - Claude Code API: trip after 5 consecutive failures
  - Git remote operations: trip after 3 consecutive failures
  - Half-open after 30 seconds, test with single request
  - Log circuit state changes
  - Expose circuit state in health check

#### Design Decisions

> **Q**: Should the server implement automatic retry for transient database errors at the repository level, or should callers handle retries explicitly?
> **A**: Automatic retry at the repository level for transient errors (connection timeout, deadlock). Use a simple retry wrapper: 3 attempts, exponential backoff starting at 100ms. This keeps retry logic centralized. Non-transient errors (constraint violation, syntax error) propagate immediately.

> **Q**: Should failed git operations be queued for automatic retry, or should the user be notified immediately?
> **A**: Notify the user immediately. Git push conflicts require human decision-making (merge vs rebase vs force). Network timeouts should surface as an error with a "retry" action the user can trigger. The server should not silently retry git network operations.

> **Q**: Should the architecture support running multiple server instances behind a load balancer?
> **A**: Design for single-instance but don't preclude horizontal scaling. Use the `EventBus` abstraction (swappable from in-process to Redis), store auth sessions in the database, and keep agent processes stateless. The main barrier to horizontal scaling is the per-project git working directory. Address this only when load demands it.

> **Q**: If horizontal scaling is planned, should session state be stored in Redis from the start?
> **A**: Begin in-memory. Auth state is already in PostgreSQL (refresh tokens). Agent session state is transient. WebSocket state is in-memory via Socket.IO. When horizontal scaling is needed, add Redis for Socket.IO adapter and shared WebSocket state.

> **Q**: Should WebSocket connections be sticky-session based or use a pub/sub adapter for cross-instance messaging?
> **A**: Sticky sessions for the initial single-instance deployment. When scaling horizontally, switch to the Socket.IO Redis adapter for cross-instance pub/sub. The Redis adapter is a drop-in addition that doesn't require application code changes.

> **Q**: What is the expected number of concurrent users for the initial deployment?
> **A**: Target 20-50 concurrent users. A single Bun instance comfortably handles this. The bottleneck is concurrent Claude Code processes (capped at 10), not HTTP connections or WebSocket subscriptions.

> **Q**: What is the expected knowledge graph size (number of specs, edges, files)?
> **A**: Target: up to 2,000 specs, 5,000 edges, and 3,000 files per project. At this scale, the in-memory index consumes ~10-20MB per project and file system reads take <5ms each. No database index needed. If a project exceeds 10,000 specs, consider adding an SQLite sidecar index.

> **Q**: Should the server architecture document assumptions about single-instance vs multi-instance deployment?
> **A**: Yes. Document: (1) single-instance deployment for initial release, (2) horizontal scaling requires Redis and per-instance git clones, (3) maximum 50 concurrent users per instance, (4) maximum 10 concurrent agent processes per instance. Review these assumptions quarterly against actual usage metrics.

---

## Summary

| Section | Task Range | Count |
|---------|-----------|-------|
| 1. Bun Runtime Configuration | SV-ARCH-001 – 008 | 8 |
| 2. NestJS Bootstrap & Entry Point | SV-ARCH-009 – 016 | 8 |
| 3. Module Structure | SV-ARCH-017 – 048 | 32 |
| 4. Service Layer Patterns | SV-ARCH-049 – 058 | 10 |
| 5. Configuration Management | SV-ARCH-059 – 066 | 8 |
| 6. Middleware Pipeline | SV-ARCH-067 – 074 | 8 |
| 7. Guards | SV-ARCH-075 – 084 | 10 |
| 8. Interceptors | SV-ARCH-085 – 092 | 8 |
| 9. Pipes & Validation | SV-ARCH-093 – 099 | 7 |
| 10. Exception Filters | SV-ARCH-100 – 106 | 7 |
| 11. Logging Strategy | SV-ARCH-107 – 115 | 9 |
| 12. Health Checks & Monitoring | SV-ARCH-116 – 123 | 8 |
| 13. File System Service | SV-ARCH-124 – 130 | 7 |
| 14. Process Management | SV-ARCH-131 – 139 | 9 |
| 15. Module Dependency Graph | SV-ARCH-140 – 143 | 4 |
| 16. Performance & Scalability | SV-ARCH-144 – 153 | 10 |
| **TOTAL** | | **153** |
