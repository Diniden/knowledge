# 03-SERVER / 01 — ARCHITECTURE: Open Questions

> **Purpose**: Unresolved questions about the NestJS server architecture
> including Bun runtime compatibility, module organization, service patterns,
> middleware configuration, process management, and scalability strategies.
> Answers may change tasks in the plan.

---

## 1. Bun Runtime

### 1.1 Compatibility
- **Q**: Has NestJS been fully validated with Bun as the runtime? Are there
  known issues with decorator metadata reflection, TypeORM drivers, or the
  WebSocket adapter under Bun?

**A:** NestJS works with Bun but requires attention. Decorator metadata reflection works via `reflect-metadata` polyfill which Bun supports. Use `@nestjs/platform-express` (see below) as the HTTP adapter since it has the broadest compatibility. TypeORM works when using the `pg` npm package (not Bun's native driver). The Socket.IO WebSocket adapter works under Bun. Pin NestJS to v10+ and Bun to 1.1+. Maintain a small compatibility test suite that runs on CI to catch regressions early.

- **Q**: Should the project use `@nestjs/platform-express` or
  `@nestjs/platform-fastify` under Bun? Fastify may have better Bun
  compatibility but changes the middleware API.

**A:** Use `@nestjs/platform-express`. Express has the largest middleware ecosystem and the most NestJS community testing under Bun. Fastify's performance advantage is marginal for this use case (agent orchestration is the bottleneck, not HTTP parsing). Express's middleware API is simpler and has more examples/documentation. Switching to Fastify later is straightforward if profiling shows HTTP layer as a bottleneck.

- **Q**: Does Bun's built-in SQLite or PostgreSQL driver work with TypeORM, or
  do we need the `pg` npm package as a fallback?

**A:** Use the `pg` npm package. Bun's native PostgreSQL driver is not compatible with TypeORM's driver interface. `pg` works reliably under Bun since it's pure JavaScript at the network layer. This also keeps the door open for running under Node.js if needed.

- **Q**: Are there any NestJS packages that are known to be incompatible with
  Bun's ESM-only module resolution?

**A:** Most NestJS core packages work. Known areas of concern: packages with native C++ addons (e.g., `bcrypt` — use `bcryptjs` instead), packages that use `require.resolve` heuristics in non-standard ways, and some older `passport` strategies. Test each dependency as it's added. Use `bun install` which handles CJS/ESM interop transparently for most cases.

### 1.2 Development Experience
- **Q**: Does `bun --watch` provide reliable hot reload for NestJS, or should
  we use `nodemon` / `tsx watch` as a fallback?

**A:** Use `bun --watch`. It provides reliable file-watching and fast restarts for NestJS. It's simpler than configuring nodemon, has no extra dependency, and leverages Bun's fast startup. If edge cases arise (e.g., missed file changes in deep directories), fall back to `nodemon` with `--exec bun run`.

- **Q**: Does Bun's debugger (`bun --inspect`) integrate smoothly with
  VS Code / Cursor debugging, or does it need special configuration?

**A:** `bun --inspect` supports the Chrome DevTools Protocol and works with VS Code / Cursor. Add a `.vscode/launch.json` configuration with `"runtimeExecutable": "bun"` and `"runtimeArgs": ["--inspect"]`. Step debugging and breakpoints work. Source maps require `"sourcemap": "inline"` in tsconfig. Document the debug configuration in the project README.

---

## 2. Module Organization

### 2.1 Module Granularity
- **Q**: Should Specs and Documents be separate NestJS modules, or combined into
  a single module since documents are just groups of specs? Separate modules give
  cleaner boundaries but add import boilerplate.

**A:** Combine into a single `SpecModule` that exposes both `SpecService` and `DocumentService`. Documents are lightweight grouping containers for specs — they don't justify a separate module boundary. The services share the same file-system context (the knowledge graph directory) and are tightly coupled. If document logic grows substantially, extract later.

- **Q**: Should the GitModule be project-scoped (one instance per project with
  its own working directory) or a singleton service that receives the project
  path per operation?

**A:** Singleton service that receives the project path per operation. Project-scoped modules in NestJS use `REQUEST` scope which propagates to all dependents and kills performance. The `GitService` should be a stateless singleton that takes `projectPath` as a parameter. Use a per-project lock (keyed by project ID) internally to serialize write operations.

- **Q**: Should the AgentModule be a single module or split into sub-modules
  (AgentSessionModule, AgentOrchestratorModule, ClaudeCodeWrapperModule)?
  Splitting improves testability but adds complexity.

**A:** Split into two sub-modules: `AgentSessionModule` (session lifecycle, history persistence, WebSocket streaming) and `AgentCoreModule` (Claude Code process wrapper, MCP tool registry, orchestration logic). The orchestrator and Claude Code wrapper are tightly coupled and belong together. Session management is a distinct concern. This keeps testability high without excessive fragmentation.

### 2.2 Shared Code
- **Q**: How should shared types between client and server be consumed? Via a
  workspace package (`@shared/types`), or via path aliases pointing to a common
  `shared/` directory?

**A:** Use a workspace package (`@botnet/shared`) in a monorepo setup. Bun supports workspaces natively. A proper package gives explicit versioning, clear dependency direction, and works with any build tool. Path aliases break when tools outside the TypeScript compiler need to resolve them (e.g., Jest, bundlers).

- **Q**: Should DTOs live in the server package only, or should request/response
  shapes be defined in the shared package and DTOs be thin wrappers?

**A:** Define TypeScript interfaces/types for request/response shapes in `@botnet/shared`. Server-side DTOs (decorated with `class-validator`) live in the server package and implement those shared interfaces. This way the client imports clean types, the server gets validation, and the shapes stay synchronized.

### 2.3 Lazy Loading
- **Q**: Should non-critical modules (GenUI, Plans, Collaboration) be
  lazy-loaded to improve startup time? NestJS supports lazy module loading but
  it complicates dependency injection.

**A:** No. Do not lazy-load modules. Bun's startup is already fast (~50ms for module resolution), and the added complexity of lazy loading in NestJS (deferred module loading, async provider resolution) isn't worth it for the expected module count (~15-20 modules). Eager loading also catches DI errors at startup rather than at runtime.

- **Q**: Is there a measurable startup time benefit to lazy loading under Bun
  given Bun's fast module resolution?

**A:** No measurable benefit. Bun resolves modules in single-digit milliseconds. The startup bottleneck will be database connection initialization and git repository validation, not module loading. Optimize those instead (connection pooling, async init).

---

## 3. Service Layer Patterns

### 3.1 ORM Choice
- **Q**: Should the project use TypeORM (mature, good NestJS integration) or
  Drizzle ORM (type-safe, lightweight, better Bun compatibility)? TypeORM's
  decorator-heavy approach aligns with NestJS but Drizzle is more performant.

**A:** Use Drizzle ORM. It has better TypeScript type safety (no decorators needed for schema, inferred types), lighter runtime footprint, and excellent Bun compatibility since it's pure TypeScript. The `drizzle-orm/pg-core` + `drizzle-kit` for migrations is a clean setup. NestJS integration is straightforward: register the Drizzle client as a provider. The decorator alignment of TypeORM is not a strong enough reason given Drizzle's superior type inference and performance.

- **Q**: If using TypeORM, should we use the Active Record or Data Mapper
  pattern? Data Mapper is more testable but more verbose.

**A:** N/A — using Drizzle. Drizzle naturally follows the Data Mapper pattern with explicit query functions, which is more testable.

- **Q**: Should the repository pattern add a layer on top of the ORM repository,
  or is the ORM's built-in repository sufficient?

**A:** Add a thin repository layer. Each domain entity (User, Project, Session, etc.) gets a repository class that wraps Drizzle queries. This provides a clean seam for testing (mock the repository, not the ORM), encapsulates query logic, and keeps services focused on business logic. Repositories are NestJS `@Injectable()` providers.

### 3.2 File-Based Data
- **Q**: The knowledge graph uses JSON files in git repos. Should the server
  parse and cache these in memory, or read from disk on every request? Caching
  improves performance but risks stale data.

**A:** Use a hybrid approach: maintain an in-memory index of the graph structure (node IDs, edge relationships, metadata) that is loaded on project open and invalidated on mutations. Full spec content is read from disk on demand. The index enables fast traversal queries while disk reads ensure content freshness. The index is rebuilt on git pull/merge operations. This keeps memory usage bounded (index is much smaller than full content).

- **Q**: Should there be a database-backed index of the knowledge graph
  (PostgreSQL tables mirroring the JSON structure) for fast queries, or should
  all queries traverse the file system?

**A:** No database-backed index. The in-memory index described above is sufficient for expected graph sizes (hundreds to low thousands of nodes). Adding a PostgreSQL mirror creates a synchronization problem between the git files (source of truth) and the database. Keep the architecture simple: git files are the single source of truth, the in-memory index serves queries.

- **Q**: How should concurrent file writes be handled? File-level locks,
  operation queuing, or optimistic concurrency with retry?

**A:** Operation queuing with per-project write serialization. Use an in-memory async queue (one per project) that serializes all write operations to the knowledge graph. Reads can happen concurrently. This avoids file lock complexity and race conditions. If a write fails, the queue rejects that operation and proceeds to the next. The queue drains naturally; no retry logic needed at the file level since git commit is the atomic boundary.

### 3.3 Event System
- **Q**: Should module-to-module communication use NestJS's `EventEmitter2`
  (simple, in-process) or a message queue (Redis Pub/Sub, BullMQ) for
  reliability and potential future scaling?

**A:** Use `EventEmitter2` for the initial release. It's synchronous-capable, in-process, zero-latency, and sufficient for a single-instance deployment. Add an interface abstraction (`EventBus`) so the implementation can be swapped to Redis Pub/Sub later if horizontal scaling is needed. Do not add Redis as a dependency until it's actually required.

- **Q**: Should events be fire-and-forget or should there be guaranteed delivery
  with acknowledgment? Some events (like graph mutations) may need reliability.

**A:** Fire-and-forget for all in-process events. Graph mutations don't need event delivery guarantees because the mutation itself is the source of truth (the committed file). Events are notifications for cache invalidation and WebSocket broadcasting — if one is missed, the client will get correct state on next REST fetch. Guaranteed delivery adds complexity that isn't justified for a single-instance system.

---

## 4. Configuration & Environment

### 4.1 Configuration Strategy
- **Q**: Should the project use `@nestjs/config` with Joi validation or a
  custom config loader with `class-validator` DTOs? The latter is more
  consistent with the rest of the validation approach.

**A:** Use `@nestjs/config` with `class-validator` DTOs. NestJS's config module handles `.env` loading and module injection. Use `class-validator` + `class-transformer` for validation (consistent with the DTO validation approach used in controllers). Define a `ConfigDto` class with decorators like `@IsString()`, `@IsNumber()`, etc., and validate in `ConfigModule.forRoot()` using a custom validation function.

- **Q**: Should sensitive configuration (JWT secret, DB password, API keys) be
  loaded from environment variables only, or should there be support for a
  secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault)?

**A:** Environment variables only for the initial release. This keeps the deployment simple and works for Docker, bare-metal, and CI. Add an abstract `SecretsProvider` interface that reads from `process.env` by default. A Vault or AWS Secrets Manager implementation can be swapped in later without changing consuming code.

- **Q**: Should the server support configuration hot-reload in production, or
  require a restart for any config change?

**A:** Require a restart. Hot-reload for configuration introduces race conditions and complicates reasoning about server state. Bun restarts are fast (<1 second). For zero-downtime deploys, use rolling restarts behind a load balancer.

### 4.2 Multi-Environment
- **Q**: How many environments should be supported? Just `development` and
  `production`, or also `staging` and `test`?

**A:** Four environments: `development`, `test`, `staging`, `production`. `test` is essential for CI (separate database, mocked externals). `staging` mirrors production for pre-release validation. Each environment maps to a `NODE_ENV` value.

- **Q**: Should each environment have its own `.env` file (`.env.development`,
  `.env.production`), or use a single `.env` with overrides?

**A:** Use per-environment `.env` files: `.env.development`, `.env.test`, `.env.staging`. Production uses environment variables injected by the deployment platform (never a `.env.production` file on disk). `.env.development` is committed to the repo with safe defaults. `.env.test` is committed. `.env.staging` is not committed. Add `.env.local` to `.gitignore` for personal overrides that take highest precedence.

---

## 5. Middleware & Security

### 5.1 Security Headers
- **Q**: What CSP directives are needed? The iframe sandbox for generative UI
  and WebSocket connections may require specific CSP exceptions.

**A:** Base CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' wss://{host}; frame-src 'self' blob:; img-src 'self' data: blob:; font-src 'self'`. The `frame-src blob:` allows sandboxed generative UI iframes loaded from blob URLs. `connect-src wss:` allows WebSocket. Use `helmet` middleware with these CSP overrides. Generative UI iframes must use the `sandbox` attribute with `allow-scripts` only — no `allow-same-origin`.

- **Q**: Should the server implement CSRF protection via double-submit cookies
  or synchronizer tokens? HTTP-only JWT cookies are vulnerable to CSRF without
  additional protection.

**A:** Double-submit cookie pattern. On login, set a non-HTTP-only `csrf_token` cookie. The client reads this cookie and sends it as the `X-CSRF-Token` header on all mutating requests. The server validates that the header matches the cookie. This is stateless (no server-side storage), works well with JWT cookie auth, and is standard practice. Only enforce on cookie-authenticated requests — Bearer token requests are immune to CSRF.

- **Q**: Should rate limiting be per-IP, per-user, or both? Per-user rate
  limiting requires authentication to happen before rate limiting in the
  pipeline.

**A:** Both. Apply two layers: (1) per-IP rate limiting via middleware (runs first, before auth) to block brute-force and DDoS — 100 requests/minute per IP. (2) per-user rate limiting via guard (runs after auth) for finer control — 300 requests/minute per authenticated user. Agent session endpoints get stricter per-user limits (20 requests/minute) since each triggers expensive LLM operations.

### 5.2 Request Processing
- **Q**: Should the server support request body size limits per endpoint (e.g.,
  larger limit for file uploads) or a single global limit?

**A:** Per-endpoint limits. Global default: 1MB. File upload endpoints: 50MB. Spec content endpoints: 5MB (specs can have large markdown bodies). Implement via per-route middleware or decorator that overrides the Express body parser limit for specific routes.

- **Q**: Should request IDs be UUIDs or shorter identifiers (e.g., nanoid)?
  UUIDs are standard but verbose in logs.

**A:** Use nanoid (21 characters, URL-safe alphabet). It's shorter in logs, has sufficient collision resistance (1% collision probability after 149 billion IDs at 21 chars), and is faster to generate than UUIDs. Prefix with `req_` for grep-ability: `req_V1StGXR8_Z5jdHi6B-myT`. Use the `nanoid` package.

---

## 6. Error Handling

### 6.1 Error Strategy
- **Q**: Should error responses include a `help` URL linking to documentation
  for each error code? This aids API consumers but requires maintaining docs.

**A:** No. Not for the initial release. Maintaining error documentation is overhead that doesn't justify itself until there are external API consumers. Error codes and messages should be self-explanatory. Revisit when/if a public API is offered.

- **Q**: Should the server distinguish between "expected" errors (validation
  failure, not found) and "unexpected" errors (null reference, network failure)
  in the response format?

**A:** Yes. Expected errors return structured responses: `{ error: { code: "VALIDATION_FAILED", message: "...", details: [...] } }` with appropriate 4xx status. Unexpected errors return: `{ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred", requestId: "req_..." } }` with 500 status. Never leak internal details in unexpected error responses.

- **Q**: Should stack traces be included in error responses in development mode,
  or always kept server-side only?

**A:** Include stack traces in error responses only in `development` mode (when `NODE_ENV=development`). In `test`, `staging`, and `production`, stack traces are logged server-side only and never returned to the client. The `requestId` in the response allows correlating with server logs.

### 6.2 Error Recovery
- **Q**: Should the server implement automatic retry for transient database
  errors at the repository level, or should callers handle retries explicitly?

**A:** Automatic retry at the repository level for transient errors (connection timeout, deadlock). Use a simple retry wrapper: 3 attempts, exponential backoff starting at 100ms. This keeps retry logic centralized and prevents every service from implementing its own. Non-transient errors (constraint violation, syntax error) propagate immediately.

- **Q**: Should failed git operations (push conflict, network timeout) be
  queued for automatic retry, or should the user be notified immediately to
  retry manually?

**A:** Notify the user immediately. Git push conflicts require human decision-making (merge vs rebase vs force). Network timeouts should surface as an error with a "retry" action the user can trigger. The server should not silently retry git network operations because the user needs to know the state of their repository. Failed pushes leave local state intact so no data is lost.

---

## 7. Process Management

### 7.1 Claude Code Integration
- **Q**: How does the server communicate with Claude Code? Via CLI stdin/stdout,
  a REST API, or the Claude Code SDK? The communication protocol determines the
  wrapper design.

**A:** Via CLI stdin/stdout using the `claude` CLI in non-interactive (headless) mode with the `--output-format stream-json` flag. Claude Code supports `--print` mode for single prompts and streaming JSON output for structured event parsing. The server spawns `claude` as a child process via `Bun.spawn()`, writes prompts to stdin, and parses JSON events from stdout. This is the most reliable and well-documented integration path.

- **Q**: Should Claude Code processes be long-lived (one per user session,
  stays running) or short-lived (spawn per request, terminate after response)?
  Long-lived processes are faster but consume more resources.

**A:** Short-lived with session resume. Spawn a Claude Code process per user message, using the `--resume` flag with the session ID to maintain conversation continuity. This avoids holding idle processes in memory while preserving context across messages. Claude Code persists its own conversation state to disk, so resume is fast. The process exits after producing its response.

- **Q**: What is the maximum number of concurrent Claude Code processes the
  server should support? This depends on available system resources and Claude
  API rate limits.

**A:** 10 concurrent Claude Code processes system-wide as the default limit, configurable via environment variable `MAX_CONCURRENT_AGENTS`. Each process is short-lived (seconds to minutes), so 10 concurrent handles significant throughput. The bottleneck is Claude API rate limits, not local resources. Use a semaphore to enforce the limit; requests beyond the limit are queued with a 60-second queue timeout.

- **Q**: Should there be a warm pool of pre-spawned Claude Code processes for
  faster first response, or should processes be spawned on demand?

**A:** No warm pool. Claude Code startup is fast (~1-2 seconds) and processes are short-lived. A warm pool adds complexity (health checking, recycling, resource waste) for minimal latency improvement. The 1-2 second spawn time is acceptable since the Claude API call itself takes 3-15 seconds. Spawn on demand.

### 7.2 Resource Limits
- **Q**: Should Claude Code processes have CPU and memory cgroups/limits, or
  run unconstrained? Limits prevent resource exhaustion but may slow agent
  operations.

**A:** Run unconstrained for the initial release. Claude Code processes are short-lived and their resource usage is bounded by the API call duration. The 10-process concurrency limit is sufficient resource protection. If deployed in containers, the container's own resource limits provide a ceiling. Add cgroups later if monitoring shows runaway processes.

- **Q**: How should the server handle Claude Code process crashes? Automatic
  restart with the same context, or notify the user and require manual restart?

**A:** Notify the user via WebSocket with an error event and allow them to retry. Since processes are short-lived (per-message), a "crash" means the current message failed. The user's conversation history is persisted, so they can simply send the message again. The server should log the crash with full context (exit code, stderr) for debugging. No automatic retry — the user decides whether to retry or rephrase.

- **Q**: Should there be a timeout for individual agent operations (e.g.,
  "generate a plan" takes too long)? If so, what is a reasonable timeout?

**A:** Yes. 5-minute timeout per agent operation (single message round-trip). Most operations complete in 10-60 seconds. Plan generation for large specs may take 2-3 minutes. The 5-minute ceiling prevents runaway operations. Kill the Claude Code process on timeout and notify the user. The timeout is configurable via environment variable `AGENT_OPERATION_TIMEOUT_MS=300000`.

---

## 8. Health Checks & Monitoring

### 8.1 Health Strategy
- **Q**: Should the health check endpoint be used by a load balancer, a
  container orchestrator (Kubernetes), or both? Different consumers need
  different response formats.

**A:** Support both via two endpoints: `GET /health/live` (liveness probe — returns 200 if process is running, used by Kubernetes) and `GET /health/ready` (readiness probe — returns 200 if database and git are accessible, used by load balancers and Kubernetes). Both return JSON: `{ status: "ok"|"degraded"|"unhealthy", checks: {...} }`.

- **Q**: Should the detailed health endpoint include database query latency
  measurements, or just connectivity checks?

**A:** Include latency measurements. The readiness endpoint runs `SELECT 1` and reports the query time in milliseconds. This catches slow-but-connected database scenarios. Also check git access (can read a known file) and report its latency. Cap the health check timeout at 5 seconds — if any check takes longer, report unhealthy.

- **Q**: Should the server expose Prometheus metrics natively, or rely on a
  sidecar/agent for metrics collection?

**A:** Expose Prometheus metrics natively via `GET /metrics` using the `prom-client` package. Instrument: HTTP request count/latency (by route, method, status), WebSocket connection count, active agent sessions, git operation count/latency, and event loop lag. Native exposition is simpler than configuring a sidecar and works with any Prometheus-compatible scraper.

### 8.2 Alerting
- **Q**: Should the server have built-in alerting (e.g., webhook on critical
  error), or should alerting be handled entirely by the monitoring
  infrastructure?

**A:** Alerting handled by monitoring infrastructure. The server's job is to emit structured logs and Prometheus metrics. Alertmanager (or equivalent) defines alert rules and notification channels. Building alerting into the server couples it to specific notification channels and duplicates what monitoring tools do better.

- **Q**: Should unhandled exceptions trigger immediate notifications (e.g.,
  Slack webhook, email), or only be captured in logs for periodic review?

**A:** Captured in structured JSON logs. The monitoring stack (Prometheus alerting rules or log-based alerts via Loki/ELK) handles immediate notification based on error rate thresholds. A single unhandled exception logs at `error` level; a spike in error rate triggers an alert. This avoids alert fatigue from one-off errors.

---

## 9. File System Operations

### 9.1 Concurrency
- **Q**: With multiple users potentially modifying the same project's knowledge
  graph files, how should file-level concurrency be managed? File locks,
  database-level locks, or git's built-in conflict resolution?

**A:** Per-project write queue (in-memory async mutex keyed by project ID). All write operations to a project's knowledge graph are serialized through this queue. Reads are unrestricted. Git's conflict resolution handles the multi-user case across different clones (push/pull), but within a single server instance, the write queue prevents concurrent file mutations. This is simpler and more reliable than file locks.

- **Q**: Should the server use Bun's native file system APIs (`Bun.file()`,
  `Bun.write()`) or Node.js `fs/promises` for compatibility? Bun's APIs may
  be faster but less portable.

**A:** Use Bun's native APIs (`Bun.file()`, `Bun.write()`). They are significantly faster for I/O-heavy operations (reading/writing many JSON files). Portability to Node.js is not a requirement — the PRD specifies Bun as the runtime. Wrap file operations in a thin `FileSystemService` so the API is consistent and testable.

- **Q**: Should file operations be batched (collect changes, write all at once)
  or individual (write each change immediately)? Batching reduces I/O but risks
  data loss on crash.

**A:** Write each change immediately, then batch the git commit. Individual writes ensure durability (data is on disk immediately). The git commit is the batching boundary — multiple file writes can be staged and committed together. This gives both safety (no data loss on crash) and clean history (one commit per logical operation).

### 9.2 File Watching
- **Q**: Should the server watch the knowledge graph directory for external
  changes (e.g., user edits files directly, or git operations modify files)?
  File watching adds complexity but ensures consistency.

**A:** Yes, watch for changes caused by git operations (pull, merge, checkout). Do not watch for arbitrary external file edits — the server is the authoritative writer. When a git operation completes, invalidate the in-memory index and notify connected clients via WebSocket. Use a targeted approach: after git pull/merge, diff the before/after tree to identify changed files and update the index.

- **Q**: If file watching is used, should it use Bun's native watcher,
  `chokidar`, or `fs.watch`? Each has different reliability characteristics
  across platforms.

**A:** Do not use a persistent file watcher. Instead, use event-driven invalidation: the `GitService` emits an event after any git operation that modifies the working tree. The `KnowledgeGraphService` listens for this event and rebuilds the affected portion of its in-memory index. This is more reliable than file watching and avoids platform-specific watcher bugs.

---

## 10. Scalability

### 10.1 Horizontal Scaling
- **Q**: Should the architecture support running multiple server instances
  behind a load balancer? If so, shared state (sessions, agent processes) needs
  to be externalized.

**A:** Design for single-instance but don't preclude horizontal scaling. Use the `EventBus` abstraction (swappable from in-process to Redis), store auth sessions in the database (already planned via refresh tokens in PostgreSQL), and keep agent processes stateless (Claude Code manages its own state on disk). The main barrier to horizontal scaling is the per-project git working directory — each instance would need its own clone. Address this only when load demands it.

- **Q**: If horizontal scaling is planned, should session state be stored in
  Redis from the start, or can it begin in-memory and migrate to Redis later?

**A:** Begin in-memory. Auth state is already in PostgreSQL (refresh tokens). Agent session state is transient (active process references). WebSocket state is in-memory via Socket.IO. When horizontal scaling is needed, add Redis for Socket.IO adapter and shared WebSocket state. The migration is well-documented in Socket.IO's docs.

- **Q**: Should WebSocket connections be sticky-session based (user always
  connects to same instance) or use a pub/sub adapter (Socket.IO Redis adapter)
  for cross-instance messaging?

**A:** Sticky sessions for the initial single-instance deployment (it's the default). When scaling horizontally, switch to the Socket.IO Redis adapter for cross-instance pub/sub. Sticky sessions alone are fragile (instance failure drops all its users). The Redis adapter is a drop-in addition that doesn't require application code changes.

### 10.2 Single-Instance Limits
- **Q**: What is the expected number of concurrent users for the initial
  deployment? This determines whether single-instance is sufficient.

**A:** Target 20-50 concurrent users for the initial deployment. A single Bun instance comfortably handles this with headroom. The bottleneck is concurrent Claude Code processes (capped at 10), not HTTP connections or WebSocket subscriptions. Single-instance is sufficient for initial launch.

- **Q**: What is the expected knowledge graph size (number of specs, edges,
  files)? This affects file system performance and whether a database index
  is needed.

**A:** Target: up to 2,000 specs, 5,000 edges, and 3,000 files per project. At this scale, the in-memory index consumes ~10-20MB per project and file system reads take <5ms each. No database index needed. If a project exceeds 10,000 specs, consider adding an SQLite sidecar index. Monitor file system latency per project.

- **Q**: Should the server architecture document assumptions about
  single-instance vs multi-instance deployment, so the design can be validated
  against deployment plans?

**A:** Yes. Document the following assumptions in the architecture plan: (1) single-instance deployment for initial release, (2) horizontal scaling requires Redis and per-instance git clones, (3) maximum 50 concurrent users per instance, (4) maximum 10 concurrent agent processes per instance. Review these assumptions quarterly against actual usage metrics.
