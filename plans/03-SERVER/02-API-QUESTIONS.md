# 03-SERVER / 02 — API: Open Questions

> **Purpose**: Unresolved questions about the REST API design including endpoint
> conventions, request/response formats, versioning strategy, pagination
> patterns, and domain-specific API decisions. Answers may change tasks in the
> plan.

---

## 1. API Design Conventions

### 1.1 URL Structure

- **Q**: Should nested resources use full paths
  (`/projects/:projectId/specs/:specId`) or flat paths with query params
  (`/specs/:specId?projectId=xxx`)? Nested paths are RESTful but create deep
  URLs.

**A:** Nested paths for resource creation and listing (`/projects/:projectId/specs` for listing specs in a project, `POST /projects/:projectId/specs` to create). Flat paths for direct resource access (`GET /specs/:specId`, `PATCH /specs/:specId`) since spec IDs are globally unique. This keeps URLs shallow for single-resource operations while preserving the parent relationship for collection operations.

- **Q**: Should action endpoints use verbs (`/sessions/:id/terminate`) or treat
  state changes as PATCH operations (`PATCH /sessions/:id { status: 'terminated' }`)?
  Verbs are clearer but less RESTful.

**A:** Use `POST` with verb-style endpoints for actions that have side effects beyond a simple field update: `POST /sessions/:id/terminate`, `POST /projects/:id/sync`, `POST /specs/:id/revert`. Use `PATCH` for simple field updates: `PATCH /specs/:id { title: "..." }`. The distinction is: if it triggers a workflow (agent teardown, git operations, process management), it's a POST action. If it just changes data, it's a PATCH.

- **Q**: Should the API use singular or plural resource names? The plan uses
  plural (`/specs/`, `/users/`) — confirm this is preferred.

**A:** Plural resource names confirmed. `/specs/`, `/users/`, `/projects/`, `/sessions/`, `/documents/`, `/edges/`. This is the most common REST convention and reads naturally for both collections (`GET /specs`) and individual resources (`GET /specs/:id`).

### 1.2 Versioning

- **Q**: Is URL-based versioning (`/api/v1/`) the right choice, or should the
  API use header-based versioning (`Accept: application/vnd.kg.v1+json`)? URL
  versioning is simpler but clutters URLs.

**A:** URL-based versioning: `/api/v1/`. It's simpler, visible in logs and browser devtools, easier to route at the infrastructure level, and the industry default for internal APIs. Header-based versioning is more appropriate for public APIs with many consumers. This project doesn't need that complexity.

- **Q**: Should the version be required in every request, or should
  unversioned requests default to the latest version?

**A:** Version is required. Requests to `/api/specs` (no version) return 404. This prevents accidental breakage when a new API version is released — clients must explicitly opt in. The Swagger docs clearly show the versioned base path.

---

## 2. Response Format

### 2.1 Envelope Structure

- **Q**: Should all responses use the `{ data, meta }` envelope, or should
  simple endpoints return the resource directly? Envelopes add consistency but
  increase payload size for simple operations.

**A:** All responses use the envelope: `{ data, meta }`. Consistency outweighs the minor payload overhead. `meta` is always present (at minimum contains `requestId`). For list endpoints, `meta` also contains pagination info. For single-resource endpoints, `meta` is just `{ requestId }`. This makes client-side response handling uniform.

- **Q**: Should the `meta` object include server version information for
  debugging? This can leak deployment info but aids client debugging.

**A:** No. Do not include server version in `meta`. It leaks deployment information and provides no value to normal API consumers. The `requestId` in `meta` is sufficient for debugging — server logs correlate the request ID to the server version/instance. Server version is available via the health endpoint for ops purposes.

- **Q**: Should list endpoints return `{ data: T[], meta: { pagination } }`
  or `{ data: { items: T[], pagination } }`? The former is flatter; the latter
  groups related data.

**A:** Use `{ data: T[], meta: { pagination, requestId } }`. The flat structure is simpler, and pagination metadata belongs in `meta` alongside other response metadata. `data` is always the resource(s). The client can destructure `const { data: specs, meta } = response` uniformly.

### 2.2 Error Details

- **Q**: Should validation errors return the attempted value in the error
  details (helpful for debugging) or omit it (more secure, no reflection of
  potentially sensitive input)?

**A:** Omit the attempted value. Reflecting user input in error responses can enable XSS in poorly-secured clients and leaks data in logs. Return the field name and the constraint that failed: `{ field: "email", message: "must be a valid email address" }`. The client already knows what value it sent.

- **Q**: Should the API provide error documentation URLs? (e.g.,
  `"help": "https://docs.example.com/errors/AUTH_EXPIRED_TOKEN"`)

**A:** No. Not for the initial release. Error codes and messages should be self-descriptive. The Swagger documentation serves as the API reference. Error documentation URLs are maintenance overhead that provides little value for an internal API.

- **Q**: Should error responses include a `traceId` separate from `requestId`
  for distributed tracing, or is `requestId` sufficient for a single-server
  deployment?

**A:** `requestId` only. The system is single-instance for the initial release. Distributed tracing with separate trace IDs adds complexity for zero benefit. If horizontal scaling is added later, introduce OpenTelemetry trace propagation at that point. The `requestId` (nanoid) is sufficient to correlate a request across logs.

---

## 3. Authentication API

### 3.1 Token Strategy

- **Q**: Should the access token be returned in the response body AND set as
  a cookie, or cookie only? Returning in the body allows non-browser clients
  (CLI tools, API consumers) to use the API without cookies.

**A:** Both. The login endpoint sets the access token as an HTTP-only cookie AND returns it in the response body. Browser clients use the cookie automatically. CLI tools and programmatic clients extract the token from the response body and send it as a `Bearer` token in the `Authorization` header. The server accepts either mechanism (see dual auth below).

- **Q**: What should the access token TTL be? Short (15 minutes) increases
  security but requires frequent refreshes. Longer (1 hour) reduces overhead
  but extends compromise windows.

**A:** 15 minutes. This is the security-first default. The client implements transparent refresh — when a 401 is received, the client calls `/auth/refresh` to get a new access token and retries the original request. The refresh is invisible to the user. 15 minutes limits the damage window if an access token is stolen.

- **Q**: Should the refresh token be rotated on every use (more secure, detect
  token theft) or be long-lived (simpler, less network traffic)?

**A:** Rotate on every use. Each call to `/auth/refresh` issues a new refresh token and invalidates the old one. If a stolen refresh token is used after the legitimate user has already refreshed, the server detects the reuse (the old token was invalidated) and revokes all sessions for that user (token family). This is the standard refresh token rotation pattern and detects theft effectively.

- **Q**: Should the API support API keys (long-lived tokens) for programmatic
  access in addition to JWT cookies? This would allow CI/CD or external tools
  to consume the API.

**A:** Yes, but deferred to phase 2. The initial release supports JWT cookie + Bearer token from login. API keys (long-lived, user-generated, scoped) are a phase 2 feature. The auth middleware should already support Bearer tokens, so API keys will slot in naturally by storing them in a `api_keys` table and validating them in the same auth guard.

### 3.2 Registration & Verification

- **Q**: Should email verification be required before the user can log in, or
  should the account be immediately usable with a "verify email" reminder?

**A:** Account is immediately usable. Show a persistent "verify your email" banner in the UI. Require verification before the user can create projects or collaborate (guards on those endpoints check `emailVerified`). This reduces friction for new users while ensuring verified identity for meaningful operations.

- **Q**: Should the registration endpoint support social auth providers
  (GitHub, Google) in addition to email/password, or is that deferred?

**A:** Deferred to phase 2. The initial release supports email/password only. The user schema should include a `providers` JSON column (array of `{ provider: string, providerId: string }`) from day one so the schema doesn't need migration when social auth is added.

- **Q**: Should there be an invite-only registration mode where only existing
  users can invite new members?

**A:** Yes, as a server configuration option (`REGISTRATION_MODE=open|invite`). Default to `open` for development. In production, the first registered user becomes admin and can toggle the mode. Invite-only mode requires an invite code (generated by admin or project owner) during registration. This is a simple guard on the registration endpoint.

---

## 4. Resource Design

### 4.1 Specs vs Documents

- **Q**: Should specs always belong to a document, or can specs exist
  independently (orphan specs not assigned to any document)? The PRD implies
  specs are grouped into documents, but orphan specs may occur during agent
  operations.

**A:** Specs must always belong to a document. Every project has a default "Inbox" document for specs that haven't been categorized yet. Agent-created specs go into the Inbox by default unless the agent explicitly assigns them to a document. This avoids orphan handling logic while keeping the data model clean.

- **Q**: Should the spec creation endpoint automatically create a graph node,
  or should node creation be a separate explicit step? Auto-creating simplifies
  the flow but couples spec and graph operations.

**A:** Auto-create the graph node on spec creation. A spec without a graph node has no purpose in the knowledge graph. The spec creation endpoint writes the spec JSON file AND creates the corresponding node entry in a single commit. This is an atomic operation from the user's perspective. Edge creation remains a separate operation since edges require both endpoints to exist.

- **Q**: When a document is deleted, what happens to its specs? Options:
  (a) specs become orphaned, (b) specs are moved to a default "Ungrouped"
  document, (c) specs are deleted too (dangerous).

**A:** Option (b): specs are moved to the "Inbox" document. Users must explicitly delete individual specs if they want to remove them. Bulk operations (move all specs, delete all specs in document) are available as separate actions. Document deletion is a reorganization operation, not a data destruction operation.

### 4.2 Knowledge Graph

- **Q**: Should the graph API expose raw file paths (for debugging) or only
  abstract IDs? Exposing paths leaks file system structure.

**A:** Abstract IDs only. Never expose file paths in the API. The mapping from spec ID to file path is an internal implementation detail. For debugging, admins can check server logs which include file paths. The API returns spec IDs, document IDs, and edge IDs — all globally unique nanoids.

- **Q**: Should graph traversal be a GET request (idempotent, cacheable) or
  POST request (complex query body)? POST is more flexible for complex queries
  but breaks REST caching.

**A:** GET for simple traversals with query parameters: `GET /graph/nodes/:id/neighbors?depth=2&edgeType=depends-on&direction=outbound`. POST for complex queries that exceed what query params can express: `POST /graph/query { ... }`. The GET endpoint covers 90% of use cases and benefits from HTTP caching. The POST endpoint is for agent-driven complex traversals.

- **Q**: Should edge creation validate that both source and target nodes exist,
  or allow "dangling" edges that reference future nodes? Strict validation is
  safer but may block batch operations where node and edge creation happen
  simultaneously.

**A:** Strict validation: both source and target nodes must exist before an edge can be created. For batch operations, the batch endpoint processes nodes first, then edges (order within the batch matters). The batch endpoint should accept an ordered array of operations and execute them sequentially within a single commit. This prevents invalid graph states while supporting batch workflows.

- **Q**: Should the graph stats endpoint be cached aggressively (stats change
  only on mutation) or computed on every request? Caching is faster but may
  show stale counts.

**A:** Cache aggressively. Maintain a stats object in the in-memory graph index that updates on every mutation (node/edge create, update, delete). The `GET /graph/stats` endpoint returns the cached stats instantly. Stats include: node count, edge count, edge count by type, spec count by status. Since all mutations go through the server, the cache is always consistent.

### 4.3 Agent Sessions

- **Q**: Should agent sessions be scoped to a project, or can a session span
  multiple projects? The current design scopes to a project, but users may
  want to discuss cross-project topics.

**A:** Scoped to a single project. Each session has one `projectId`. Cross-project operations are not supported — they would require complex permission checking across projects and would complicate the agent's sandboxing (each Claude Code process is sandboxed to one project directory). Users can open separate sessions for different projects.

- **Q**: Should agent message history be stored server-side permanently, or
  should there be a retention policy (e.g., delete after 30 days)? The PRD
  says dialog history is persisted as a reference log.

**A:** Permanent storage with optional cleanup. Dialog history is stored in PostgreSQL indefinitely by default. Provide a `DELETE /sessions/:id` endpoint that deletes the session and its messages. Add a configurable retention policy (`DIALOG_RETENTION_DAYS=90`) that runs as a daily cron job to delete sessions older than the threshold. Default is 90 days; set to 0 for indefinite retention.

- **Q**: Should the agent session creation endpoint be synchronous (wait for
  agent to start, then return) or asynchronous (return immediately, agent
  starts in background)? Async is better UX but requires WebSocket for status.

**A:** Asynchronous. `POST /sessions` immediately returns `{ data: { sessionId, status: "starting" } }` with 202 Accepted. The client subscribes to the WebSocket room `session:{sessionId}` and receives a `session:ready` event when the Claude Code process is initialized. This prevents HTTP timeouts on slow starts and aligns with the PRD's WebSocket-driven session model.

- **Q**: Should there be a limit on message length sent to the agent? Very
  long messages may cause issues with Claude Code's context window.

**A:** Yes. Maximum 32,000 characters per user message (approximately 8,000 tokens). This leaves room for system prompt, conversation history, and project context within Claude's context window. Messages exceeding the limit are rejected with a 400 error and a clear message about the character limit. The limit is configurable via `MAX_AGENT_MESSAGE_LENGTH=32000`.

---

## 5. Pagination

### 5.1 Strategy

- **Q**: Should the API use offset-based (`page` + `limit`) or cursor-based
  pagination as the primary pattern? Offset is simpler but has issues with
  concurrent inserts. Cursor is more robust but requires ordered data.

**A:** Cursor-based pagination as the primary pattern. Use `?cursor=xxx&limit=20` where the cursor is an opaque base64-encoded value (typically the last item's ID or timestamp). Cursor pagination handles concurrent inserts/deletes correctly and performs well on large datasets (no `OFFSET` scan). For agent session messages (time-ordered, append-only), cursor pagination is natural.

- **Q**: Should the total count be included in every paginated response? For
  large datasets, counting can be expensive. Consider an optional `?count=true`
  query param.

**A:** Optional via `?count=true`. Total count is expensive for large tables and usually unnecessary for infinite-scroll UIs. When `count=true`, the response includes `meta.pagination.totalCount`. When omitted, `totalCount` is absent. The UI uses `hasMore` (derived from whether `limit + 1` items were returned) for infinite scroll.

- **Q**: Should there be a maximum page depth (e.g., can't request page 1000)?
  Deep pages are expensive with offset pagination.

**A:** Not applicable with cursor-based pagination — there's no concept of "page depth." Every cursor lookup is an indexed seek, equally fast regardless of position. The cursor approach eliminates this problem entirely.

### 5.2 Defaults

- **Q**: What should the default page size be? 20 items is common but may be
  too many for agent sessions (heavy objects) or too few for spec lists.

**A:** Default 20, with per-endpoint overrides. Spec lists: default 50 (lightweight objects). Agent session messages: default 20 (includes full message content). Agent session list: default 10 (includes metadata). Edge lists: default 50. Maximum allowed limit: 100 for all endpoints. Requesting `limit > 100` is clamped to 100.

- **Q**: Should pagination defaults be configurable per endpoint, or use a
  single global default?

**A:** Per-endpoint defaults, defined as constants in each controller. A global default (20) serves as the fallback when no per-endpoint default is specified. This gives flexibility without requiring configuration.

---

## 6. Filtering & Search

### 6.1 Search Capabilities

- **Q**: Should the text search endpoint use full-text search (PostgreSQL
  `tsvector`) or simple `LIKE` matching? Full-text is better for natural
  language queries but requires indexing setup.

**A:** PostgreSQL full-text search with `tsvector` for database-backed resources (users, projects, sessions). For knowledge graph content (specs stored as JSON files), use the in-memory index with simple text matching on spec titles and tags. Full-text indexing of spec content is deferred — the graph structure is the primary discovery mechanism, not free-text search over spec bodies.

- **Q**: Should graph search integrate with the RAG layer for semantic search,
  or keep keyword search and semantic search as separate endpoints?

**A:** Separate endpoints. `GET /graph/search?q=authentication` for keyword search (fast, deterministic). `POST /graph/semantic-search { query: "how does the user log in" }` for RAG-powered semantic search (slower, AI-driven). Keeping them separate lets the UI offer both options and the client choose based on user intent. Semantic search is a phase 2 feature; keyword search is MVP.

- **Q**: Should filters support negation (e.g., `?status!=archived`)? This
  adds query flexibility but complicates URL parsing.

**A:** No negation in query parameters. Use explicit filter values instead: `?status=draft,active` (include listed values). If "everything except archived" is needed, the client lists the desired statuses. This keeps URL parsing simple and avoids ambiguous encoding issues with `!=` in URLs.

### 6.2 Complex Queries

- **Q**: Should the API support complex graph queries (e.g., "find all specs
  that depend-on a spec that contradicts another spec") or keep queries simple
  and let the frontend combine multiple API calls?

**A:** Keep the REST API simple. Complex graph traversals are the agent's job — the user describes what they want in natural language, and the agent uses MCP tools to traverse the graph. The REST API provides building blocks: neighbors, shortest path, filter by edge type. The agent composes these into complex queries. This avoids building a graph query language into the REST API.

- **Q**: Should there be a GraphQL endpoint alongside REST for flexible graph
  queries, or is REST sufficient? GraphQL would allow the client to request
  exactly the data it needs from graph queries.

**A:** No GraphQL. The PRD specifies REST + WebSocket. GraphQL adds a second API paradigm, new dependencies (Apollo or Mercurius), and additional complexity in auth, rate limiting, and documentation. The REST API with `?expand=` for eager loading and cursor-based pagination covers the client's needs. The agent handles complex graph exploration.

---

## 7. Collaboration & Sync

### 7.1 Sync Strategy

- **Q**: Should collaboration endpoints be project-scoped (sync entire project)
  or support file-level granularity (sync specific specs)? Project-level is
  simpler but may sync unnecessary data.

**A:** Project-scoped. `POST /projects/:id/sync/pull` and `POST /projects/:id/sync/push` operate on the entire project repository. Git operates at the repository level, and partial sync (single files) would require cherry-picking or sparse checkout, which adds significant complexity. The project repo is the unit of collaboration.

- **Q**: Should the pull endpoint automatically merge, or pull without merging
  (like `git fetch` vs `git pull`)? Auto-merge is simpler but may create
  unwanted merge commits.

**A:** Auto-merge by default (`git pull --ff-only` first, then `git pull --no-edit` if fast-forward fails). The pull endpoint returns the merge result: `{ status: "fast-forward" | "merged" | "conflict", changes: [...] }`. If conflicts occur, the response includes the conflicting files and the server leaves the working tree in a conflicted state for the user to resolve via a separate conflict resolution endpoint.

- **Q**: Should conflict resolution be handled entirely through the API, or
  should the server provide a conflict state that the client resolves locally?

**A:** Via the API. The server detects conflicts and returns a structured conflict object: `{ file, ours, theirs, base }` with the full content of each version. The client renders a diff/merge UI. The user chooses a resolution (ours, theirs, or manual edit). The client sends the resolution back: `POST /projects/:id/sync/resolve { file, resolution }`. The server writes the resolved content and completes the merge commit.

### 7.2 Branch Management

- **Q**: Should branches be a first-class API concept, or should collaboration
  be branch-agnostic (always work on main, merge via pull requests)?

**A:** First-class API concept. `GET /projects/:id/branches`, `POST /projects/:id/branches`, `DELETE /projects/:id/branches/:name`, `POST /projects/:id/branches/:name/merge`. Branches are essential for the PRD's experimentation model. The default workflow is: work on `main`, branch for experiments, merge back. The API exposes full branch lifecycle.

- **Q**: Should the API support pull request-like review workflows for branches,
  or is direct merge sufficient?

**A:** Direct merge for the initial release. The PRD's collaboration model is async git-based (clone, pull, push, branch, merge), not pull-request-based. A PR review workflow is a significant feature that can be added later. For now, the merge endpoint provides a diff preview (`POST /projects/:id/branches/:name/merge?dryRun=true`) so users can review changes before merging.

- **Q**: Should branch deletion be hard (remove immediately) or soft (mark as
  deleted, cleanup later)? Hard delete is cleaner but can't be undone.

**A:** Hard delete. `DELETE /projects/:id/branches/:name` removes the branch ref from the git repository immediately. The commits are not lost — they're still in the git reflog for 90 days (git's default). The branch can only be deleted if it has been merged or if `?force=true` is passed. This prevents accidental data loss while keeping the branch list clean.

---

## 8. File Uploads

### 8.1 Upload Strategy

- **Q**: Should uploaded files be stored in the git repository (version
  controlled but increases repo size) or in a separate storage location
  (lighter repo but separate backup/sync needs)?

**A:** Separate storage. Store uploaded files on the server's local file system under a project-specific directory (`/data/uploads/{projectId}/`). Reference files in specs by their upload ID, not file path. This keeps the git repository lightweight (only JSON specs and metadata). Uploads are backed up separately. If version control of media is needed later, Git LFS can be added.

- **Q**: Should the upload endpoint return a URL that can be embedded in spec
  content, or should media associations be managed through a separate
  linking endpoint?

**A:** Return a URL. `POST /projects/:id/uploads` returns `{ data: { id, url: "/api/v1/uploads/{uploadId}", mimeType, size } }`. The user embeds the URL in spec markdown content: `![diagram](/api/v1/uploads/abc123)`. The server serves uploads via `GET /uploads/:id` with auth checking (user must have access to the project). No separate linking endpoint needed.

- **Q**: What media types should be supported beyond the basics (images, PDFs)?
  Should the system accept video, audio, or office documents?

**A:** Images (JPEG, PNG, GIF, WebP, SVG), PDFs, and plain text/markdown attachments. No video, audio, or office documents for the initial release. These are knowledge graph specs — media should support diagrams, screenshots, and reference documents. A whitelist of allowed MIME types is enforced at upload. Total per-project storage quota: 1GB (configurable).

- **Q**: Should there be an image processing step on upload (resize, compress,
  generate thumbnails) or serve originals?

**A:** Serve originals for the initial release. Add thumbnail generation as a phase 2 optimization if upload serving becomes a bandwidth concern. Images in knowledge specs are typically diagrams and screenshots, not high-volume photo galleries. Keep the upload pipeline simple: validate MIME type, check file size (max 50MB), store to disk, return URL.

---

## 9. Rate Limiting

### 9.1 Strategy

- **Q**: Should rate limits be per-IP, per-user, or both? Per-IP protects
  against anonymous abuse, per-user prevents authenticated abuse. Both is
  most secure but complex.

**A:** Both. Per-IP (100 req/min for unauthenticated, 300 req/min for authenticated) enforced at the middleware level. Per-user (300 req/min global, with stricter limits for expensive endpoints like agent sessions at 20 req/min) enforced at the guard level after authentication. Use the `@nestjs/throttler` module which supports multiple throttle groups.

- **Q**: Should rate limit violations be logged as security events for
  monitoring?

**A:** Yes. Log every rate limit violation at `warn` level with: IP address, user ID (if authenticated), endpoint, current rate, limit. Repeated violations (>5 in a minute) log at `error` level. These logs feed into the monitoring stack for alerting on potential abuse patterns.

- **Q**: Should certain endpoints have no rate limit (health checks, Swagger
  docs) or should everything be rate-limited?

**A:** Health check endpoints (`/health/live`, `/health/ready`) and Prometheus metrics (`/metrics`) are exempt from rate limiting — they're called by infrastructure tooling at high frequency. Swagger docs (`/api/docs`) are rate-limited at a generous 60 req/min per IP. All other endpoints are rate-limited.

- **Q**: Should the rate limit store use in-memory storage only, or Redis for
  consistency across server restarts and potential future horizontal scaling?

**A:** In-memory for the initial release. Rate limits resetting on server restart is acceptable — it's a brief window and restarts are infrequent. The `@nestjs/throttler` module uses in-memory storage by default. When horizontal scaling is added, swap to the Redis-backed throttler storage (drop-in replacement).

---

## 10. Performance

### 10.1 Response Optimization

- **Q**: Should the API support field selection (e.g., `?fields=id,title,status`)
  to reduce response size? This reduces bandwidth but complicates serialization.

**A:** No. Field selection adds serialization complexity, complicates caching, and the response objects are small enough that the bandwidth savings is negligible. If a lighter representation is needed, create a dedicated list endpoint that returns a summary DTO. The `?expand=` parameter (see below) is the preferred way to control response size.

- **Q**: Should the API support conditional requests (`If-None-Match` /
  `ETag`) for caching efficiency? This reduces bandwidth for frequently
  polled endpoints.

**A:** Yes, for key read-heavy endpoints: `GET /graph/stats`, `GET /specs/:id`, `GET /projects/:id`. Use weak ETags based on the resource's `updatedAt` timestamp or content hash. NestJS's `@Header()` decorator or an interceptor can set `ETag` headers. This is especially valuable for the graph stats endpoint which is polled frequently.

- **Q**: Should list endpoints support `?expand=relations` to eagerly load
  related data (e.g., specs with their edges), or should related data always
  require separate requests?

**A:** Yes, support `?expand=` on key endpoints. `GET /specs/:id?expand=edges` returns the spec with its edges inline. `GET /documents/:id?expand=specs` returns the document with its specs. Allowed expand values are documented per endpoint in Swagger. Default is no expansion. This reduces N+1 round trips for common UI patterns without the complexity of GraphQL.

### 10.2 Batch Operations

- **Q**: What is the maximum batch size for bulk spec operations (create,
  update)? 50 specs per batch is proposed — is this appropriate?

**A:** 50 specs per batch is appropriate. This balances throughput with request processing time. At 50 specs, the server can validate, write files, and commit within a reasonable HTTP timeout (~30 seconds). The batch endpoint is primarily used by agents creating multiple specs at once. Requests exceeding 50 items are rejected with a 400 error.

- **Q**: Should batch operations be all-or-nothing (transaction) or
  best-effort (return partial success)? All-or-nothing is simpler but a
  single bad spec blocks the entire batch.

**A:** All-or-nothing within a single git commit. The batch validates all items first (returning all validation errors at once), then writes all files and commits. If any write fails, no commit is made and all changes are rolled back (delete written files). This ensures the knowledge graph is always in a consistent state. The client gets a clear success/failure signal. Partial success creates confusing states that are hard to debug.
