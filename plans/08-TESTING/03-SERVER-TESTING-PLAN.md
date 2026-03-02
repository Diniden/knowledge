# 08-TESTING / 03 — SERVER TESTING PLAN

> **Purpose**: Define the complete server-side testing strategy including NestJS
> module unit testing, service layer testing with mocked dependencies, controller
> testing with supertest, guard and middleware testing, WebSocket gateway testing,
> database integration testing, git integration testing, API endpoint integration
> tests, authentication flow testing, agent orchestration testing, file system
> operation testing, and error handling testing.
>
> **Phase**: 1 (Foundation) + 2 (Core Systems) + 3 (Agent Integration)
> **Dependencies**: `03-SERVER/01-ARCHITECTURE-PLAN.md`, `08-TESTING/01-STRATEGY-PLAN.md`
> **Estimated tasks**: 195+

---

## Table of Contents

1. [Server Test Infrastructure](#1-server-test-infrastructure)
2. [NestJS Module Unit Testing](#2-nestjs-module-unit-testing)
3. [Service Layer Testing](#3-service-layer-testing)
4. [Controller Testing](#4-controller-testing)
5. [Guard & Middleware Testing](#5-guard--middleware-testing)
6. [Pipe & Interceptor Testing](#6-pipe--interceptor-testing)
7. [WebSocket Gateway Testing](#7-websocket-gateway-testing)
8. [Database Integration Testing](#8-database-integration-testing)
9. [Git Integration Testing](#9-git-integration-testing)
10. [Authentication Flow Testing](#10-authentication-flow-testing)
11. [API Endpoint Integration Tests](#11-api-endpoint-integration-tests)
12. [Agent Orchestration Testing](#12-agent-orchestration-testing)
13. [File System Operation Testing](#13-file-system-operation-testing)
14. [Error Handling Testing](#14-error-handling-testing)
15. [Server E2E / Smoke Tests](#15-server-e2e--smoke-tests)

---

## 1. Server Test Infrastructure

### 1.1 NestJS Test Configuration

- [ ] **TS-SV-001**: Configure NestJS testing module for bun test
  - Install `@nestjs/testing`
  - Verify `Test.createTestingModule()` works under bun runtime
  - Configure module compilation with bun transpiler
  - Create base test configuration file `server/src/test/setup.ts`
- [ ] **TS-SV-002**: Create `TestModuleBuilder` utility class
  - Factory for creating NestJS test modules with common configuration
  - Method `withDatabase()` — includes real database module (test instance)
  - Method `withMockDatabase()` — includes mocked database providers
  - Method `withAuth()` — includes real auth with test JWT signing
  - Method `withMockAuth()` — auto-authenticates all requests
  - Method `withModule(module)` — adds a specific feature module
- [ ] **TS-SV-003**: Create mock provider factory
  - `createMockService(ServiceClass)` — creates a mock with all methods stubbed
  - `createMockRepository(EntityClass)` — creates mock with find, save, delete, etc.
  - `createMockGuard()` — creates a guard that always allows or always denies
  - Auto-track method calls for assertions
- [ ] **TS-SV-004**: Create supertest integration helper
  - `createTestApp(modules)` — bootstraps NestJS app for supertest
  - `createAuthenticatedAgent(app, user)` — supertest agent with valid JWT
  - `createUnauthenticatedAgent(app)` — supertest agent without JWT
  - Cache compiled app between tests in the same file for speed

### 1.2 Test Database Setup

- [ ] **TS-SV-005**: Create test database lifecycle manager
  - `TestDatabase.init()` — connect to test PostgreSQL, run migrations
  - `TestDatabase.reset()` — TRUNCATE all tables (between test suites)
  - `TestDatabase.close()` — close connection pool
  - Use singleton pattern to share connection across tests in a file
- [ ] **TS-SV-006**: Create test data seeder
  - `TestSeeder.seedUser(overrides?)` — insert user, return entity
  - `TestSeeder.seedProject(owner, overrides?)` — insert project
  - `TestSeeder.seedProjectMember(project, user, role)` — insert member
  - `TestSeeder.seedAgentSession(user, project, overrides?)` — insert session
  - All seeders return typed entities for use in assertions
- [ ] **TS-SV-007**: Create database transaction wrapper for test isolation
  - Begin transaction before each test
  - Rollback transaction after each test
  - Alternative to TRUNCATE for faster isolation
  - Handle nested transactions (savepoints) for tests that test transactions
- [ ] **TS-SV-008**: Create database assertion helpers
  - `expectRowCount(table, count)` — assert table has N rows
  - `expectRowExists(table, where)` — assert a row matching criteria exists
  - `expectRowNotExists(table, where)` — assert no matching row
  - `expectColumnValue(table, where, column, value)` — assert specific cell value

### 1.3 Common Test Utilities

- [ ] **TS-SV-009**: Create JWT test utilities
  - `createTestJWT(user, expiresIn?)` — sign JWT with test secret
  - `createExpiredJWT(user)` — sign JWT that is already expired
  - `createMalformedJWT()` — return invalid JWT string
  - `createJWTWithWrongSecret(user)` — sign with different secret
- [ ] **TS-SV-010**: Create request builder helpers
  - `buildGetRequest(app, path)` — supertest GET with common headers
  - `buildPostRequest(app, path, body)` — supertest POST
  - `buildPatchRequest(app, path, body)` — supertest PATCH
  - `buildDeleteRequest(app, path)` — supertest DELETE
  - All support `.asUser(user)` for authenticated requests
- [ ] **TS-SV-011**: Create response assertion helpers
  - `expectSuccess(response, statusCode?)` — assert 2xx
  - `expectCreated(response)` — assert 201 with Location header
  - `expectPaginated(response, options?)` — assert pagination envelope
  - `expectValidationError(response, field, message?)` — assert 400 with field error
  - `expectNotFound(response)` — assert 404
  - `expectForbidden(response)` — assert 403
  - `expectUnauthorized(response)` — assert 401

#### Design Decisions

> **Q**: Does NestJS `Test.createTestingModule()` compilation work correctly under Bun, or are there decorator metadata issues (`reflect-metadata`, `emitDecoratorMetadata`)?
> **A**: Bun supports `reflect-metadata` and `emitDecoratorMetadata` in its TypeScript transpiler. NestJS `Test.createTestingModule()` works under Bun. Ensure `"experimentalDecorators": true` and `"emitDecoratorMetadata": true` are set in `tsconfig.json`. Validate in the bootstrap PR with a single NestJS controller + service test.

> **Q**: Should each test file compile its own NestJS test module, or should there be a shared compiled module per feature?
> **A**: **Each test file compiles its own test module.** Per-file compilation is the NestJS-recommended pattern and provides full isolation — each file configures exactly the providers it needs. The compilation overhead (~50–100ms per file) is acceptable. Shared compiled modules create hidden coupling.

> **Q**: How long does test module compilation take under Bun? If it's slow (>500ms per file), should compiled modules be cached?
> **A**: Measure in the bootstrap PR. Expected: 50–150ms per file, which is acceptable. If compilation exceeds 300ms, create a `TestModuleBuilder` helper that pre-configures common providers and allows per-test overrides. Do not cache compiled modules — invalidation logic would be more complex than the time saved.

> **Q**: Should mock providers be created with `mock()`-style mocking (bun's `mock()`) or as plain objects with implemented methods?
> **A**: Use **Bun's `mock()` / `spyOn()`** for mock providers. Call tracking (`toHaveBeenCalledWith`, `toHaveBeenCalledTimes`) is essential for verifying service interactions. Create mock providers as objects with `mock()` methods: `{ findAll: mock(() => []), create: mock(() => ({})) }`.

> **Q**: When testing a service that depends on another service, should the dependency be mocked at the provider level (DI replacement) or at the method level (spy on real service)?
> **A**: **Provider-level DI replacement** for unit tests. Replace dependencies entirely via `overrideProvider().useValue(mockService)`. Use **method-level spying** only in integration tests where you want to verify cross-service behavior with real logic.

> **Q**: Should guards be globally overridden in tests (always allow) or tested with real guard logic?
> **A**: **Override guards globally** in unit/integration tests for non-auth services. Use `overrideGuard(AuthGuard).useValue({ canActivate: () => true })`. Test guard logic in **dedicated guard test files** (`auth.guard.test.ts`) that exercise the real guard with valid, invalid, and expired tokens.

---

## 2. NestJS Module Unit Testing

### 2.1 Module Configuration Tests

- [ ] **TS-SV-012**: Test `AppModule` configuration
  - All feature modules are imported
  - Global modules (Database, Config) are registered
  - Module compiles without errors
- [ ] **TS-SV-013**: Test `DatabaseModule` configuration
  - Connects to database with correct configuration
  - Exports database providers for injection
  - Handles connection failure gracefully
- [ ] **TS-SV-014**: Test `AuthModule` configuration
  - JWT module configured with correct secret and expiration
  - Auth guard registered as global guard (or per-controller)
  - Passport strategies registered
- [ ] **TS-SV-015**: Test `UsersModule` configuration
  - User repository provided
  - UserService provided and injectable
  - UsersController registered
- [ ] **TS-SV-016**: Test `ProjectsModule` configuration
  - Project and ProjectMember repositories provided
  - ProjectService provided
  - ProjectsController registered
- [ ] **TS-SV-017**: Test `SpecsModule` configuration
  - SpecPermission and PermissionShare repositories provided
  - SpecService provided
  - SpecsController registered
- [ ] **TS-SV-018**: Test `AgentModule` configuration
  - AgentSession and AgentMessage repositories provided
  - AgentOrchestrationService provided
  - AgentController registered
  - WebSocket gateway registered
- [ ] **TS-SV-019**: Test `GitModule` configuration
  - SyncState repository provided
  - GitService provided
  - GitController registered

---

## 3. Service Layer Testing

### 3.1 UserService Tests

- [ ] **TS-SV-020**: Test `UserService.create()`
  - Creates user with hashed password (not plain text)
  - Returns user without password_hash
  - Throws on duplicate email
  - Throws on duplicate username
  - Validates email format
  - Validates username format
- [ ] **TS-SV-021**: Test `UserService.findByEmail()`
  - Returns user when email exists
  - Returns null when email not found
  - Case-insensitive email lookup
- [ ] **TS-SV-022**: Test `UserService.findById()`
  - Returns user when ID exists
  - Returns null when ID not found
  - Excludes password_hash from response
- [ ] **TS-SV-023**: Test `UserService.update()`
  - Updates allowed fields (display_name, avatar_url)
  - Does not update email or username (immutable)
  - Sets updated_at to current time
  - Returns updated user
- [ ] **TS-SV-024**: Test `UserService.validatePassword()`
  - Returns true for correct password
  - Returns false for incorrect password
  - Uses bcrypt comparison
- [ ] **TS-SV-025**: Test `UserService.updateLastLogin()`
  - Sets last_login to current timestamp
  - Does not modify other fields

### 3.2 ProjectService Tests

- [ ] **TS-SV-026**: Test `ProjectService.create()`
  - Creates project with owner
  - Auto-creates project_members entry for owner with role 'owner'
  - Initializes local git repository
  - Returns created project
- [ ] **TS-SV-027**: Test `ProjectService.findByUser()`
  - Returns all projects where user is a member
  - Returns empty array for user with no projects
  - Includes member role in response
  - Supports pagination
- [ ] **TS-SV-028**: Test `ProjectService.findById()`
  - Returns project with member list
  - Throws NotFoundException when ID not found
  - Throws ForbiddenException when user is not a member
- [ ] **TS-SV-029**: Test `ProjectService.update()`
  - Only owner or admin can update
  - Updates name, description, settings
  - Does not allow changing owner_id
  - Throws ForbiddenException for unauthorized users
- [ ] **TS-SV-030**: Test `ProjectService.delete()`
  - Only owner can delete
  - Cascades: deletes members, sessions, sync state
  - Archives or removes git repository
- [ ] **TS-SV-031**: Test `ProjectService.addMember()`
  - Adds user with specified role
  - Cannot add duplicate member
  - Cannot set role to 'owner' (only one owner)
  - Creates notification for invited user
- [ ] **TS-SV-032**: Test `ProjectService.removeMember()`
  - Removes member from project
  - Cannot remove owner
  - Only owner or admin can remove others
  - Users can remove themselves
- [ ] **TS-SV-033**: Test `ProjectService.updateMemberRole()`
  - Only owner can change roles
  - Cannot change own role
  - Cannot set another member to 'owner'
  - Valid role transitions enforced

### 3.3 SpecPermissionService Tests

- [ ] **TS-SV-034**: Test `SpecPermissionService.getPermission()`
  - Returns full access for spec owner
  - Returns shared access level for shared users
  - Returns summary access when permission_level is 'summary'
  - Returns spec content when access is 'full'
  - Returns summary_text when access is 'summary'
- [ ] **TS-SV-035**: Test `SpecPermissionService.setPermission()`
  - Creates permission record for new spec
  - Updates existing permission level
  - Requires summary_text when setting to 'summary'
  - Only spec owner can change permission
- [ ] **TS-SV-036**: Test `SpecPermissionService.share()`
  - Creates permission_share record
  - Cannot share with self
  - Cannot share if already shared (active)
  - Sets shared_at timestamp
  - Creates notification for recipient
- [ ] **TS-SV-037**: Test `SpecPermissionService.revoke()`
  - Sets revoked_at on permission_share
  - Does not delete the share record (audit trail)
  - Only original sharer or owner can revoke
  - Creates notification for affected user

### 3.4 AgentSessionService Tests

- [ ] **TS-SV-038**: Test `AgentSessionService.create()`
  - Creates session with correct user, project, type
  - Sets status to 'active'
  - Sets started_at to current time
  - Initializes empty context_json
  - Returns session with ID
- [ ] **TS-SV-039**: Test `AgentSessionService.addMessage()`
  - Adds message to session
  - Sets role and content
  - Updates session token_usage if token_count provided
  - Returns created message
- [ ] **TS-SV-040**: Test `AgentSessionService.end()`
  - Sets status to 'completed' or 'failed'
  - Sets ended_at to current time
  - Calculates final token_usage
  - Creates audit log entry
- [ ] **TS-SV-041**: Test `AgentSessionService.getHistory()`
  - Returns all messages for session in chronological order
  - Supports pagination
  - Throws if user does not own session
- [ ] **TS-SV-042**: Test `AgentSessionService.getActiveSessions()`
  - Returns only sessions with status 'active'
  - Filters by user and/or project
  - Does not return completed/failed sessions

### 3.5 SyncService Tests

- [ ] **TS-SV-043**: Test `SyncService.getSyncState()`
  - Returns current sync state for user + project
  - Creates initial sync state if none exists
  - Returns null/default for branch that has never synced
- [ ] **TS-SV-044**: Test `SyncService.updateAfterPull()`
  - Updates last_pull_hash
  - Sets sync_status appropriately
  - Updates updated_at timestamp
- [ ] **TS-SV-045**: Test `SyncService.updateAfterPush()`
  - Updates last_push_hash
  - Sets sync_status to 'synced'
  - Clears conflict_details_json
- [ ] **TS-SV-046**: Test `SyncService.detectConflicts()`
  - Returns conflict details when local and remote have diverged
  - Returns no conflicts when in sync
  - Updates sync_status to 'conflict' when conflicts detected

### 3.6 NotificationService Tests

- [ ] **TS-SV-047**: Test `NotificationService.create()`
  - Creates notification for specified user
  - Sets correct type, title, payload
  - Emits WebSocket event for real-time delivery
- [ ] **TS-SV-048**: Test `NotificationService.getForUser()`
  - Returns notifications for specified user
  - Excludes expired notifications
  - Supports pagination
  - Supports filtering by type, read status
  - Orders by created_at descending
- [ ] **TS-SV-049**: Test `NotificationService.markAsRead()`
  - Sets read = true, read_at = NOW()
  - Only notification owner can mark as read
  - Idempotent (already-read notification stays read)
- [ ] **TS-SV-050**: Test `NotificationService.getUnreadCount()`
  - Returns count of unread, non-dismissed, non-expired notifications
  - Returns 0 when no unread notifications

### 3.7 AuditService Tests

- [ ] **TS-SV-051**: Test `AuditService.log()`
  - Creates audit log entry with correct fields
  - Handles null user_id (system actions)
  - Handles null project_id (user-level actions)
  - Stores IP address and user agent from request
- [ ] **TS-SV-052**: Test `AuditService.query()`
  - Filters by user_id, project_id, action, entity_type, date range
  - Supports pagination
  - Returns entries in chronological order (newest first)

---

## 4. Controller Testing

### 4.1 UsersController Tests

- [ ] **TS-SV-053**: Test `GET /api/v1/users/me`
  - Returns current authenticated user profile
  - Returns 401 when unauthenticated
  - Response excludes password_hash
- [ ] **TS-SV-054**: Test `PATCH /api/v1/users/me`
  - Updates display_name and avatar_url
  - Validates input (display_name not empty)
  - Returns updated user
  - Returns 400 for invalid input
- [ ] **TS-SV-055**: Test `GET /api/v1/users/:id`
  - Returns public profile for any user
  - Returns 404 for non-existent user
  - Response excludes sensitive fields

### 4.2 ProjectsController Tests

- [ ] **TS-SV-056**: Test `GET /api/v1/projects`
  - Returns paginated list of user's projects
  - Supports sorting (name, created_at, updated_at)
  - Supports filtering (archived/active)
  - Returns empty list for user with no projects
- [ ] **TS-SV-057**: Test `POST /api/v1/projects`
  - Creates project with valid data
  - Returns 201 with created project
  - Returns 400 for invalid data (missing name, bad format)
  - Returns 409 for duplicate project name (same owner)
- [ ] **TS-SV-058**: Test `GET /api/v1/projects/:id`
  - Returns project with member list
  - Returns 404 for non-existent project
  - Returns 403 for non-member
- [ ] **TS-SV-059**: Test `PATCH /api/v1/projects/:id`
  - Updates project fields
  - Returns 403 for non-admin/non-owner
  - Returns 400 for invalid data
- [ ] **TS-SV-060**: Test `DELETE /api/v1/projects/:id`
  - Deletes project (only owner)
  - Returns 403 for non-owner
  - Returns 204 on success
- [ ] **TS-SV-061**: Test `POST /api/v1/projects/:id/members`
  - Adds member with role
  - Returns 409 for duplicate member
  - Returns 403 for non-admin
- [ ] **TS-SV-062**: Test `DELETE /api/v1/projects/:id/members/:userId`
  - Removes member
  - Returns 403 for unauthorized removal
  - Returns 400 for attempting to remove owner

### 4.3 SpecsController Tests

- [ ] **TS-SV-063**: Test `GET /api/v1/projects/:pid/specs`
  - Returns specs list for project
  - Respects permission levels (full content vs. summary)
  - Supports filtering by tag
- [ ] **TS-SV-064**: Test `GET /api/v1/projects/:pid/specs/:sid`
  - Returns full spec for users with full access
  - Returns summary for users with summary access
  - Returns 404 for non-existent spec
- [ ] **TS-SV-065**: Test `POST /api/v1/projects/:pid/specs`
  - Creates spec in knowledge graph
  - Creates spec_permission record
  - Returns 201 with created spec
- [ ] **TS-SV-066**: Test `PATCH /api/v1/projects/:pid/specs/:sid`
  - Updates spec content and metadata
  - Triggers git commit
  - Returns 403 for insufficient permission
- [ ] **TS-SV-067**: Test `DELETE /api/v1/projects/:pid/specs/:sid`
  - Deletes spec from knowledge graph
  - Removes associated edges
  - Creates audit log entry

### 4.4 GraphController Tests

- [ ] **TS-SV-068**: Test `GET /api/v1/projects/:pid/graph`
  - Returns full graph (nodes + edges) for project
  - Nodes respect permission levels
  - Supports depth-limited subgraph queries
- [ ] **TS-SV-069**: Test `GET /api/v1/projects/:pid/graph/nodes/:nid/neighbors`
  - Returns neighboring nodes and connecting edges
  - Supports depth parameter
  - Respects permission levels
- [ ] **TS-SV-070**: Test `POST /api/v1/projects/:pid/graph/edges`
  - Creates edge between two specs
  - Validates source and target exist
  - Validates edge type
  - Returns 409 for duplicate edge
- [ ] **TS-SV-071**: Test `DELETE /api/v1/projects/:pid/graph/edges/:eid`
  - Deletes edge
  - Returns 404 for non-existent edge
  - Creates audit log entry

### 4.5 AgentController Tests

- [ ] **TS-SV-072**: Test `POST /api/v1/projects/:pid/agent/sessions`
  - Creates new agent session
  - Returns session ID and WebSocket endpoint
  - Returns 403 for non-member
- [ ] **TS-SV-073**: Test `POST /api/v1/agent/sessions/:sid/messages`
  - Sends message to agent session
  - Returns agent response (or acknowledgment for async)
  - Returns 404 for non-existent session
  - Returns 403 for session not owned by user
  - Returns 400 for empty message content
- [ ] **TS-SV-074**: Test `GET /api/v1/agent/sessions/:sid/messages`
  - Returns message history for session
  - Supports pagination
  - Returns 403 for unauthorized access
- [ ] **TS-SV-075**: Test `POST /api/v1/agent/sessions/:sid/end`
  - Ends agent session
  - Returns final session summary (token usage, duration)
  - Returns 409 for already-ended session

### 4.6 VersionController Tests

- [ ] **TS-SV-076**: Test `GET /api/v1/projects/:pid/specs/:sid/history`
  - Returns version history for spec
  - Each entry includes hash, author, timestamp, summary
  - Supports pagination
- [ ] **TS-SV-077**: Test `GET /api/v1/projects/:pid/specs/:sid/diff`
  - Returns diff between two versions (fromHash, toHash query params)
  - Returns structured diff data (additions, deletions, modifications)
  - Returns 404 for invalid hashes
- [ ] **TS-SV-078**: Test `POST /api/v1/projects/:pid/specs/:sid/revert`
  - Reverts spec to specified version
  - Creates new commit (git revert, not destructive)
  - Returns updated spec content
  - Creates audit log entry
- [ ] **TS-SV-079**: Test `GET /api/v1/projects/:pid/branches`
  - Returns list of branches
  - Shows active branch
  - Shows last commit per branch
- [ ] **TS-SV-080**: Test `POST /api/v1/projects/:pid/branches`
  - Creates new branch from current HEAD
  - Returns branch name and hash
  - Returns 409 for duplicate branch name

### 4.7 NotificationController Tests

- [ ] **TS-SV-081**: Test `GET /api/v1/notifications`
  - Returns current user's notifications
  - Supports pagination and filtering
  - Excludes expired notifications
- [ ] **TS-SV-082**: Test `GET /api/v1/notifications/unread-count`
  - Returns unread count as integer
  - Fast response (optimized query)
- [ ] **TS-SV-083**: Test `PATCH /api/v1/notifications/:id/read`
  - Marks notification as read
  - Returns 404 for non-existent notification
  - Returns 403 for notification belonging to another user
- [ ] **TS-SV-084**: Test `POST /api/v1/notifications/mark-all-read`
  - Marks all unread notifications as read for current user
  - Returns count of notifications marked

---

## 5. Guard & Middleware Testing

### 5.1 Authentication Guard

- [ ] **TS-SV-085**: Test `JwtAuthGuard`
  - Allows request with valid JWT in cookie
  - Allows request with valid JWT in Authorization header (Bearer)
  - Rejects request with no JWT → 401
  - Rejects request with expired JWT → 401
  - Rejects request with malformed JWT → 401
  - Rejects request with JWT signed by wrong secret → 401
  - Extracts user from JWT payload and attaches to request
- [ ] **TS-SV-086**: Test `JwtAuthGuard` with inactive user
  - Rejects request when user.is_active is false → 401
  - User deactivation takes effect immediately

### 5.2 Authorization Guards

- [ ] **TS-SV-087**: Test `ProjectMemberGuard`
  - Allows request when user is member of project
  - Rejects request when user is not a member → 403
  - Extracts project_id from route params
- [ ] **TS-SV-088**: Test `ProjectRoleGuard`
  - Allows request when user has sufficient role
  - `@Roles('admin')` allows admin and owner, rejects editor and viewer
  - `@Roles('editor')` allows editor, admin, and owner
  - Rejects when role is insufficient → 403
- [ ] **TS-SV-089**: Test `SpecPermissionGuard`
  - Allows request when user has required permission level
  - Full access allows all operations
  - Summary access allows read-only
  - No access rejects → 403
- [ ] **TS-SV-090**: Test `SessionOwnerGuard`
  - Allows request when user owns the agent session
  - Rejects when user does not own session → 403

### 5.3 Middleware Testing

- [ ] **TS-SV-091**: Test `RequestLoggingMiddleware`
  - Logs method, path, status code, response time
  - Does not log request body in production
  - Logs request body in development (if configured)
  - Does not log health check requests
- [ ] **TS-SV-092**: Test `CorrelationIdMiddleware`
  - Adds correlation ID header to request and response
  - Uses existing correlation ID from request header if present
  - Generates UUID correlation ID if not present
- [ ] **TS-SV-093**: Test `RateLimitMiddleware` (if applicable)
  - Allows requests within rate limit
  - Returns 429 when rate limit exceeded
  - Rate limit resets after window
  - Rate limit is per-user (not global)

---

## 6. Pipe & Interceptor Testing

### 6.1 Validation Pipes

- [ ] **TS-SV-094**: Test global `ValidationPipe`
  - Validates DTOs with class-validator decorators
  - Returns 400 with detailed field errors for invalid input
  - Strips unknown properties (whitelist: true)
  - Transforms string IDs to correct types
- [ ] **TS-SV-095**: Test `ParseUUIDPipe`
  - Accepts valid UUID strings
  - Rejects invalid UUID formats → 400
  - Rejects non-string values → 400
- [ ] **TS-SV-096**: Test `ParsePaginationPipe`
  - Extracts page and limit from query params
  - Applies defaults (page=1, limit=20)
  - Validates maximum limit (e.g., 100)
  - Rejects negative or zero values

### 6.2 Interceptors

- [ ] **TS-SV-097**: Test `TransformResponseInterceptor`
  - Wraps response in standard envelope `{ data, meta }`
  - Adds pagination metadata when applicable
  - Adds request timing metadata
- [ ] **TS-SV-098**: Test `AuditInterceptor`
  - Creates audit log entry after successful mutation (POST, PATCH, DELETE)
  - Does not create entry for GET requests
  - Captures entity type and ID from response
  - Captures user from request
- [ ] **TS-SV-099**: Test `TimeoutInterceptor`
  - Allows requests that complete within timeout
  - Returns 408 for requests that exceed timeout
  - Timeout is configurable per route

---

## 7. WebSocket Gateway Testing

### 7.1 Connection Management

- [ ] **TS-SV-100**: Test WebSocket connection authentication
  - Accepts connection with valid JWT in handshake query/headers
  - Rejects connection without JWT → disconnect with error
  - Rejects connection with invalid JWT → disconnect with error
  - Extracts user from JWT and associates with socket
- [ ] **TS-SV-101**: Test WebSocket room management
  - Client joins project room on connection
  - Client leaves project room on disconnect
  - Room membership tracks active users per project
  - Client can switch rooms (join new, leave old)

### 7.2 Agent Status Events

- [ ] **TS-SV-102**: Test agent status broadcast
  - `agent:thinking` emitted when agent starts processing
  - `agent:streaming` emitted with content chunks during generation
  - `agent:tool_call` emitted when agent calls a tool
  - `agent:complete` emitted when agent finishes
  - `agent:error` emitted on agent failure
  - Events only sent to the session owner's socket
- [ ] **TS-SV-103**: Test agent streaming protocol
  - Streaming messages include chunk content and sequence number
  - Client can reconstruct full response from chunks
  - Stream end marker indicates completion
  - Handles stream interruption gracefully

### 7.3 Sync Events

- [ ] **TS-SV-104**: Test sync notification events
  - `sync:remote_changes` broadcast to project room when remote has new commits
  - `sync:conflict` sent to specific user when their push conflicts
  - `sync:resolved` sent when conflict is resolved
  - Events include relevant metadata (branch, commit hash)

### 7.4 Notification Events

- [ ] **TS-SV-105**: Test real-time notification delivery
  - `notification:new` sent to target user when notification created
  - Payload matches notification structure
  - Only sent if user has active WebSocket connection
  - Queued for later if user is offline (delivered on reconnect)
- [ ] **TS-SV-106**: Test notification badge update
  - `notification:count` sent with updated unread count
  - Sent after mark-as-read to update client badge

#### Design Decisions

> **Q**: Should WebSocket tests start a real NestJS server with a real WebSocket gateway, or should the gateway be tested in isolation with a mock socket?
> **A**: **Both.** Unit-test the gateway class in isolation — inject a mock socket, call handler methods directly, assert emitted events. For integration tests, start a real NestJS server (using `app.listen(0)` for random port) with a real Socket.IO gateway and connect with `socket.io-client`. Keep integration tests to the critical flows.

> **Q**: How should WebSocket client connections be managed in tests? `socket.io-client`, `ws` library, or a custom mock?
> **A**: **`socket.io-client`** for integration tests (matches the production client). **Mock socket objects** for unit tests (plain objects with `emit`, `on`, `join` methods as `mock()` functions). Do not use raw `ws` — the project uses Socket.IO.

> **Q**: How should WebSocket events be asserted? Wait for specific events with timeout, or collect all events and assert at the end?
> **A**: **Wait for specific events with timeout.** Create a helper: `await waitForEvent(socket, 'event-name', { timeout: 2000 })` that returns the event data or throws on timeout. For ordering assertions, use `collectEvents(socket, ['event-a', 'event-b'])` that resolves when all expected events arrive in order.

> **Q**: How should tests verify that WebSocket events are NOT sent? (e.g., verify a notification is NOT sent to the wrong user.)
> **A**: Use a **"no events in N ms" pattern.** Create a helper: `await expectNoEvent(socket, 'event-name', { within: 500 })` that fails if the event is received within the window. Use fake timers where possible to avoid real delays.

> **Q**: Should WebSocket tests verify event ordering? (e.g., `agent:thinking` before `agent:streaming` before `agent:complete`.)
> **A**: **Yes, for critical sequences.** The agent response lifecycle must be ordered. Use the `collectEvents` helper that asserts events arrive in the specified order. Limit ordering assertions to the 3–4 most critical event sequences.

---

## 8. Database Integration Testing

### 8.1 Repository Tests

- [ ] **TS-SV-107**: Test User repository operations against real database
  - Insert user with all fields
  - Find user by ID, email, username
  - Update user fields
  - Unique constraint violations throw correct error
  - Check constraint violations throw correct error
  - `updated_at` trigger fires on UPDATE
- [ ] **TS-SV-108**: Test Project repository operations
  - Insert project with owner_id reference
  - Find projects by owner
  - Cascade delete removes project_members
  - Unique constraint on (owner_id, name)
- [ ] **TS-SV-109**: Test ProjectMember repository operations
  - Insert member with composite primary key
  - Find members by project_id
  - Find projects by user_id (reverse lookup)
  - Cascade delete on project deletion
  - Cascade delete on user deletion
- [ ] **TS-SV-110**: Test SpecPermission repository operations
  - Insert permission with foreign keys
  - Find permissions by spec_id and project_id
  - Unique constraint on (spec_id, project_id)
  - Cascade on project delete
- [ ] **TS-SV-111**: Test PermissionShare repository operations
  - Insert share record
  - Partial unique index (one active share per user per permission)
  - Revoke sets revoked_at without deleting
  - New share allowed after revocation
- [ ] **TS-SV-112**: Test AgentSession repository operations
  - Insert session with all fields
  - Find active sessions by user + project
  - Status transition updates
  - Self-referencing foreign key (parent_session_id)
  - Cascade delete includes agent_messages
- [ ] **TS-SV-113**: Test AgentMessage repository operations
  - Insert message with session reference
  - Find messages by session ordered by created_at
  - Cascade delete on session deletion
  - Large content (TEXT) stores correctly
- [ ] **TS-SV-114**: Test AuditLog repository operations
  - Insert audit entry
  - Query with multiple filters (user, project, action, entity, date range)
  - NULL user_id allowed (system actions)
  - Large volume insert performance (1000 rows)
- [ ] **TS-SV-115**: Test NotificationQueue repository operations
  - Insert notification
  - Query unread by user
  - Mark as read updates fields
  - Expired notifications excluded from queries

### 8.2 Transaction Tests

- [ ] **TS-SV-116**: Test database transaction behavior
  - Successful transaction commits all changes
  - Failed transaction rolls back all changes
  - Nested operations within transaction are atomic
  - Connection pool handles concurrent transactions
- [ ] **TS-SV-117**: Test transaction isolation
  - Concurrent updates to same row handle correctly
  - Optimistic locking (if implemented) detects conflicts
  - Deadlock detection and retry

### 8.3 Migration Tests

- [ ] **TS-SV-118**: Test all migrations run up cleanly
  - Start from empty database
  - Run all migrations in order
  - Verify all tables exist with correct columns
- [ ] **TS-SV-119**: Test all migrations roll back cleanly
  - Run all migrations up
  - Run all migrations down
  - Verify database is empty (except migration tracking table)
- [ ] **TS-SV-120**: Test migration idempotency
  - Run migrations up twice (should not error)
  - Second run is a no-op

#### Design Decisions

> **Q**: Should integration tests use a dedicated test PostgreSQL container (separate from dev), or share the dev container with a different database?
> **A**: **Shared container, separate database.** Use the same Docker PostgreSQL container for dev and test, but create a separate `kg_test` database. In CI, the GitHub Actions service container provides a fresh PostgreSQL instance.

> **Q**: Should test data isolation use transaction rollback or TRUNCATE between tests?
> **A**: **Transaction rollback by default.** Wrap each test file in a transaction, roll back in `afterAll`. For tests that need real commit behavior, use explicit TRUNCATE cleanup and mark the file as `.integration.test.ts`.

> **Q**: Should the test database schema be verified against the expected schema on test suite startup?
> **A**: **Yes, verify on startup** but keep it fast. Run `drizzle-kit check` once at suite startup in CI. Locally, skip by default but enable with `VERIFY_SCHEMA=1`.

> **Q**: Should test data factories live in the test directory or in a shared package?
> **A**: Factories live in a **shared test utilities package** at `packages/test-utils/`. Server tests, E2E tests, and frontend tests all import from here. The factories use `fishery` and produce typed objects matching `@kg/shared` schema types.

> **Q**: Should factories generate deterministic data or random data?
> **A**: **Deterministic with sequential IDs.** Use `fishery` sequences for IDs and predictable patterns for names. Avoid randomized data — it makes failures hard to reproduce. For fuzz-style testing, add separate fuzz tests with seeded randomness.

> **Q**: Should foreign key relationships be auto-created by factories?
> **A**: **Yes, auto-create related entities by default** with the ability to override. `createTestProject()` auto-creates an owner user unless one is passed explicitly. `fishery` supports this via `associations`.

> **Q**: Should migrations run before each test file or once per test suite?
> **A**: **Once per test suite.** Run all Drizzle migrations at suite startup (`globalSetup`). Individual test files use transaction rollback for isolation. This reduces startup from minutes to seconds.

> **Q**: Should the test database be kept in memory (ramdisk) for faster I/O?
> **A**: **No.** PostgreSQL with `fsync=off` and `synchronous_commit=off` in the test container config provides near-memory-speed performance. Set these in the Docker Compose test configuration.

---

## 9. Git Integration Testing

### 9.1 Git Operations

- [ ] **TS-SV-121**: Test git repository initialization
  - Creates .git directory in project path
  - Creates initial commit
  - Sets default branch to 'main'
  - Configures user.name and user.email
- [ ] **TS-SV-122**: Test git commit operations
  - Stages files and creates commit
  - Commit message format is correct
  - Commit hash is returned
  - Author metadata is set from user
- [ ] **TS-SV-123**: Test git diff operations
  - Returns correct diff between two commits
  - Handles added files, modified files, deleted files
  - Handles binary files (knowledge graph JSON)
  - Returns structured diff (not raw git diff output)
- [ ] **TS-SV-124**: Test git log operations
  - Returns commit history for a path
  - Returns commit history for entire repo
  - Supports limit and offset
  - Each entry includes hash, author, date, message
- [ ] **TS-SV-125**: Test git branch operations
  - Create branch from HEAD
  - List all branches
  - Switch branch (checkout)
  - Delete branch
  - Detect current branch
- [ ] **TS-SV-126**: Test git merge operations
  - Fast-forward merge succeeds
  - Three-way merge with no conflicts succeeds
  - Merge with conflicts returns conflict details
  - Merge abort restores previous state
- [ ] **TS-SV-127**: Test git push/pull operations (against local bare repo)
  - Push to remote succeeds
  - Pull from remote succeeds
  - Push with conflicts detected
  - Pull with conflicts detected

### 9.2 Knowledge Graph Git Integration

- [ ] **TS-SV-128**: Test spec file git operations
  - Creating a spec creates files and commits
  - Updating a spec modifies files and commits
  - Deleting a spec removes files and commits
  - Commit message references spec ID and action
- [ ] **TS-SV-129**: Test edge file git operations
  - Creating an edge creates JSON file and commits
  - Deleting an edge removes file and commits
  - Edge updates modify file and commit
- [ ] **TS-SV-130**: Test concurrent git operations
  - Multiple file changes in single commit (batch operation)
  - Concurrent operations on different specs don't conflict
  - Lock mechanism prevents concurrent commits from the same user

#### Design Decisions

> **Q**: Should git integration tests use real git (exec `git` commands in temp directories) or a git library (isomorphic-git, simple-git)?
> **A**: **Real git via `simple-git`** in temp directories. The project uses `simple-git` in production, so tests should use the same library against real git repos. `isomorphic-git` has different semantics.

> **Q**: Should git tests create temp repositories for each test (isolated but slow) or share a test repository?
> **A**: **Temp repository per test file** (not per test case). Create in `beforeAll`, clean up in `afterAll`. Within a file, tests can share the repo if they build on each other's state. Use `fs.mkdtemp()` for temp directories.

> **Q**: Should git tests verify actual file system state or only verify git command output?
> **A**: **Verify both.** Check git command output (status, log, diff) and spot-check file system state for critical operations. File system verification catches cases where git reports success but the file system is wrong.

> **Q**: Should git remote operations be tested against a local bare repository, a mock git server, or skipped?
> **A**: **Local bare repository** (`git init --bare` in a temp directory). The test repo's remote points to this bare repo. This tests push/pull/fetch operations realistically without network dependency.

> **Q**: How should merge conflicts be reliably created in tests?
> **A**: Use a deterministic helper function: `createConflictScenario(repo, { base, ours, theirs })`. The helper creates a base commit, branches, modifies the same line differently on each branch, and attempts merge. Provide preset scenarios: `LINE_CONFLICT`, `FILE_DELETED_VS_MODIFIED`, `BINARY_CONFLICT`.

> **Q**: Should the test suite include performance tests for git operations with large repos?
> **A**: **No, not in CI.** Large-repo performance testing is a manual benchmark exercise. Create a script that generates a repo with 1000 files and 500 commits, then measures operation times. Keep it out of CI to respect the 5-minute budget.

---

## 10. Authentication Flow Testing

### 10.1 Registration Flow

- [ ] **TS-SV-131**: Test registration → login → authenticated request flow
  - Register new user via POST /auth/register
  - Login with registered credentials via POST /auth/login
  - Use returned JWT to access protected endpoint
  - Verify JWT contains correct user ID and claims
- [ ] **TS-SV-132**: Test registration validation
  - Missing required fields → 400 with specific field errors
  - Duplicate email → 409
  - Duplicate username → 409
  - Weak password → 400 with password policy error

### 10.2 Login Flow

- [ ] **TS-SV-133**: Test successful login
  - Returns JWT in http-only cookie
  - Returns user profile in response body
  - Updates last_login timestamp
  - Creates audit log entry
- [ ] **TS-SV-134**: Test failed login
  - Wrong password → 401 (generic "invalid credentials")
  - Non-existent email → 401 (same generic message, no info leak)
  - Inactive user → 401
  - Does not reveal whether email exists

### 10.3 Token Management

- [ ] **TS-SV-135**: Test JWT expiration
  - Token expires after configured duration
  - Expired token returns 401 on API requests
  - Token refresh (if implemented) issues new token
- [ ] **TS-SV-136**: Test JWT invalidation on logout
  - Logout clears http-only cookie
  - Subsequent requests with old token are rejected (if token blacklisting)
  - Or: cookie is cleared and client stops sending token
- [ ] **TS-SV-137**: Test JWT security
  - Token is http-only (not accessible from JavaScript)
  - Token is secure (only sent over HTTPS in production)
  - Token has sameSite attribute set
  - Token payload does not contain sensitive data (no password, no email)

#### Design Decisions

> **Q**: Should authentication tests use real JWT signing (with test secret) or mock the JWT verification?
> **A**: **Real JWT signing with a test secret.** Use a hardcoded test secret (`TEST_JWT_SECRET`). Generate real JWTs with `jsonwebtoken` and verify them through the real auth pipeline. Mocking JWT verification hides real-world auth bugs.

> **Q**: Should there be negative tests for JWT manipulation (modify payload, change signature, truncate token)?
> **A**: **Yes.** Test: tampered payload, invalid signature, expired token, malformed token string, missing token. These are critical security tests and are stable — write them once in `auth.guard.test.ts`, they'll rarely need updates.

> **Q**: How should token refresh be tested?
> **A**: Test whatever mechanism the auth module implements. If refresh tokens: valid refresh → new access token, expired refresh → 401, revoked refresh → 401, reuse of consumed refresh → 401. If re-login only: expired access token → 401 → client redirects to login.

> **Q**: Should tests verify http-only cookie attributes (httpOnly, secure, sameSite)?
> **A**: **Yes.** Use `supertest` to inspect raw `Set-Cookie` headers in integration tests. Assert: `httpOnly` flag present, `secure` flag present (in production config), `sameSite=strict` or `sameSite=lax`. These are one-time tests in `auth.controller.integration.test.ts`.

> **Q**: Should tests verify that password hashes use a sufficiently high bcrypt cost factor?
> **A**: **Yes, but verify configuration, not execution.** Assert that the bcrypt cost factor constant is ≥ 12 as a unit test. One dedicated test verifies that `hashPassword()` produces a valid bcrypt hash with the correct cost prefix (`$2b$12$`).

---

## 11. API Endpoint Integration Tests

### 11.1 Full-Stack API Tests

- [ ] **TS-SV-138**: Test full user lifecycle
  - Register → Login → Update profile → Get profile → Logout
  - Verify database state at each step
  - Verify audit log entries created
- [ ] **TS-SV-139**: Test full project lifecycle
  - Create project → Add members → Update project → Archive → Delete
  - Verify cascade effects (members removed, sessions ended)
- [ ] **TS-SV-140**: Test full spec lifecycle
  - Create spec → Update content → Add tags → Create edges → Delete
  - Verify git commits created
  - Verify graph state updated
  - Verify permissions created
- [ ] **TS-SV-141**: Test full agent session lifecycle
  - Start session → Send messages → Receive responses → End session
  - Verify session record in database
  - Verify messages stored
  - Verify token usage calculated
- [ ] **TS-SV-142**: Test full version control lifecycle
  - Edit spec → View history → Compare versions → Revert
  - Verify git state matches expected

### 11.2 Error Response Tests

- [ ] **TS-SV-143**: Test all endpoints return correct error format
  - All 4xx and 5xx responses follow standard error envelope
  - Error envelope: `{ statusCode, message, error, details? }`
  - Validation errors include field-level details
  - No stack traces in production errors
- [ ] **TS-SV-144**: Test all endpoints handle unexpected errors
  - Database connection loss → 503
  - Unhandled exception → 500 with generic message
  - Request body too large → 413
  - Unsupported media type → 415

### 11.3 Pagination Tests

- [ ] **TS-SV-145**: Test pagination across all list endpoints
  - Default page size when no params provided
  - Custom page and limit parameters
  - Response includes total count, page, limit, totalPages
  - Last page may have fewer items than limit
  - Page beyond total returns empty array
  - Invalid pagination params return 400

#### Design Decisions

> **Q**: Should the project use contract testing (e.g., Pact) between frontend and backend?
> **A**: **No formal contract testing (no Pact).** The frontend and backend share TypeScript types via `@kg/shared`. Compile-time type checking catches most contract drift. Adding Pact would be redundant. Revisit if the API is consumed by external clients.

> **Q**: Should API response shapes be validated against OpenAPI/Swagger schemas in tests?
> **A**: **Yes, if the project generates OpenAPI docs.** If NestJS Swagger decorators are used, add a test that generates the OpenAPI spec and validates a sample response against it. If OpenAPI is not a priority, skip — the shared TypeScript types serve the same purpose.

> **Q**: Should API tests verify response headers (CORS, Cache-Control, Content-Security-Policy)?
> **A**: **Yes, for security headers.** Test CORS headers, Content-Security-Policy, and X-Frame-Options in a dedicated `security-headers.integration.test.ts`. Cache-Control is tested only for endpoints where caching behavior is explicitly designed.

> **Q**: How should API backward compatibility be tested?
> **A**: **Not initially.** The API is internal (consumed only by the project's own frontend). Backward compatibility testing is warranted only if versioned APIs are introduced for external consumers.

> **Q**: Should API versioning (`/api/v1/`) be tested by having separate test suites per version?
> **A**: **Not initially.** Start with a single unversioned API (or `/api/v1/` as the only version). When a second version is introduced, use parameterized tests: `describe.each(['/api/v1', '/api/v2'])`.

---

## 12. Agent Orchestration Testing

### 12.1 Agent Request Routing

- [ ] **TS-SV-146**: Test agent request classification
  - Knowledge authoring request routes to knowledge agent
  - Graph exploration request routes to graph agent
  - Plan generation request routes to plan agent
  - General question routes to general chat agent
  - Ambiguous request routes to classifier first
- [ ] **TS-SV-147**: Test agent context assembly
  - Context includes current project info
  - Context includes current spec (if editing)
  - Context includes relevant graph neighborhood
  - Context includes RAG results for relevant specs
  - Context respects permission boundaries

### 12.2 Agent Response Handling

- [ ] **TS-SV-148**: Test agent response parsing
  - Text responses stored as assistant messages
  - Tool call responses parsed and dispatched
  - Structured responses (spec creation, edge creation) handled
  - Malformed responses handled gracefully (logged, user gets error)
- [ ] **TS-SV-149**: Test agent streaming response handling
  - Chunks forwarded to WebSocket
  - Complete response assembled and stored
  - Partial response stored if stream interrupted
  - Token count tracked per response

### 12.3 Agent Error Handling

- [ ] **TS-SV-150**: Test agent timeout handling
  - Session marked as 'timed_out' after max duration
  - User notified of timeout via WebSocket
  - Partial work preserved
- [ ] **TS-SV-151**: Test agent crash recovery
  - Subprocess crash detected
  - Session marked as 'failed' with error message
  - User notified of failure
  - Retry option available

#### Design Decisions

> **Q**: Should the Claude Code wrapper be mocked at the subprocess level or at the wrapper service level for orchestration tests?
> **A**: **Both levels.** Unit tests of the orchestrator mock the `ClaudeCodeWrapper` service interface via DI replacement — simple, fast, focused on orchestration logic. Integration tests mock at the subprocess level (intercept `Bun.spawn()` to return scripted stdout/stderr streams).

> **Q**: Should mock agent responses be static or configurable per test?
> **A**: **Configurable per test.** Provide a `MockClaudeCode` class with a `setResponse(scenario)` method. Pre-define common scenarios: `SIMPLE_TEXT_RESPONSE`, `TOOL_USE_RESPONSE`, `STREAMING_CHUNKS`, `ERROR_RESPONSE`, `TIMEOUT`. Each test selects the scenario it needs.

> **Q**: How should agent tool calls be tested? Should the mock agent return tool call instructions that the orchestrator executes against mock tools?
> **A**: **Mock agent returns tool call instructions; orchestrator executes against mock tools.** This tests the full orchestration loop: agent requests tool → orchestrator parses → orchestrator calls tool → tool returns result → orchestrator feeds result back. Mock the tools themselves, but let the orchestrator's tool dispatch logic run for real.

> **Q**: How should agent timeout be tested? Real timers or fake timers?
> **A**: **Fake timers.** Set the timeout to the real production value, then advance fake timers past it. The timeout value should be configurable via environment variable so tests can verify different timeout configurations.

> **Q**: Should tests simulate partial agent responses (stream interruption)?
> **A**: **Yes.** The `MockClaudeCode` subprocess mock should support a `STREAM_INTERRUPTED` scenario: emit 3 chunks, then close the stdout stream without a completion event. Verify the orchestrator handles this gracefully.

> **Q**: How should agent token usage tracking be verified?
> **A**: **Use actual token estimation** with known input/output strings. The token counter is a pure function — feed it a known string, assert the count is within an expected range. No need to mock it.

---

## 13. File System Operation Testing

### 13.1 Knowledge Graph File Operations

- [ ] **TS-SV-152**: Test spec file creation
  - Creates spec directory: `specs/{spec-id}/`
  - Creates `spec.json` with correct structure
  - Creates `content.md` with spec content
  - Creates `metadata.json` with metadata
  - Files are valid JSON / valid Markdown
- [ ] **TS-SV-153**: Test spec file reading
  - Reads and parses spec.json correctly
  - Reads content.md as string
  - Reads metadata.json correctly
  - Handles missing files gracefully (corrupted spec)
- [ ] **TS-SV-154**: Test spec file updating
  - Updates specific file without modifying others
  - Preserves fields not included in update
  - Handles concurrent writes (file locking)
- [ ] **TS-SV-155**: Test spec file deletion
  - Removes entire spec directory
  - Handles already-deleted spec
- [ ] **TS-SV-156**: Test edge file operations
  - Creates `edges/{edge-id}.json` with correct structure
  - Reads and parses edge files
  - Deletes edge files
  - Lists all edges in directory
- [ ] **TS-SV-157**: Test index file operations
  - Updates spec-index.json on spec CRUD
  - Updates edge-index.json on edge CRUD
  - Updates tag-index.json on tag changes
  - Rebuilds indexes from files if index is corrupted/missing
- [ ] **TS-SV-158**: Test document file operations
  - Creates `documents/{doc-id}/document.json`
  - Reads and parses document files
  - Updates spec list in document
  - Handles specs referenced in document that no longer exist

### 13.2 File System Edge Cases

- [ ] **TS-SV-159**: Test file system error handling
  - Read from non-existent path → appropriate error
  - Write to read-only directory → appropriate error
  - Disk full → appropriate error
  - Very long file paths → appropriate error
- [ ] **TS-SV-160**: Test file system concurrency
  - Concurrent reads to same file succeed
  - Concurrent writes use locking or queuing
  - Lock timeout prevents deadlocks
- [ ] **TS-SV-161**: Test file system with large content
  - Spec content > 1MB handles correctly
  - Many specs (1000+) in single project handles correctly
  - Directory listing performance with many files

---

## 14. Error Handling Testing

### 14.1 Exception Filters

- [ ] **TS-SV-162**: Test global exception filter
  - Catches unhandled exceptions
  - Returns standard error response format
  - Logs error with stack trace
  - Does not expose internal details in production
- [ ] **TS-SV-163**: Test HTTP exception handling
  - `BadRequestException` → 400 with message
  - `UnauthorizedException` → 401 with message
  - `ForbiddenException` → 403 with message
  - `NotFoundException` → 404 with message
  - `ConflictException` → 409 with message
  - `InternalServerErrorException` → 500 with generic message
- [ ] **TS-SV-164**: Test validation exception formatting
  - Class-validator errors converted to user-friendly format
  - Each field error includes field name, constraint, and message
  - Nested object validation errors are flattened
- [ ] **TS-SV-165**: Test database exception handling
  - Unique constraint violation → 409 Conflict
  - Foreign key violation → 400 Bad Request
  - Connection error → 503 Service Unavailable
  - Query timeout → 408 Request Timeout

### 14.2 Error Logging

- [ ] **TS-SV-166**: Test error logging behavior
  - 4xx errors logged at WARN level
  - 5xx errors logged at ERROR level with stack trace
  - Correlation ID included in error logs
  - Request context (method, path, user) included in logs
- [ ] **TS-SV-167**: Test error notification
  - Critical errors (5xx) trigger alert (if configured)
  - Repeated errors within time window trigger escalation
  - Error rate monitoring (errors per minute)

---

## 15. Server E2E / Smoke Tests

### 15.1 Health Check Tests

- [ ] **TS-SV-168**: Test `GET /api/v1/health`
  - Returns 200 when all services healthy
  - Returns 503 when database is down
  - Response includes service status breakdown
  - Response includes uptime
- [ ] **TS-SV-169**: Test `GET /api/v1/health/db`
  - Returns database connection status
  - Returns pool utilization
  - Returns migration status

### 15.2 Smoke Tests

- [ ] **TS-SV-170**: Create smoke test suite for deployment verification
  - Health check passes
  - Can register a user
  - Can login
  - Can create a project
  - Can create a spec
  - Can start an agent session (with mocked agent)
  - All critical paths work end-to-end
- [ ] **TS-SV-171**: Create smoke test runner script
  - `bun run test:smoke` — runs smoke tests against a target URL
  - Configurable base URL (local, staging, production)
  - Reports pass/fail with timing

---

## Additional Design Decisions

> **Q**: Should the server test suite include performance benchmarks (e.g., "GET /api/v1/projects should respond in < 100ms")?
> **A**: **Not in CI.** Performance varies by CI runner. Provide a manual benchmark script. Baselines: simple CRUD < 50ms, list with pagination < 100ms, complex Knowledge Graph queries < 300ms. Track results in a markdown file.

> **Q**: Should database query performance be tested?
> **A**: **Yes, as manual benchmarks.** Create a seeding script that generates 10K specs. Measure query times for: listing user's specs, searching specs by text, traversing Knowledge Graph edges. Assert no N+1 queries via query count logging.

> **Q**: Should memory leak detection be part of the test suite?
> **A**: **No automated memory leak detection.** If a leak is suspected, use Node.js heap snapshots manually. The WebSocket gateway is the most likely leak source — monitor it in staging with process metrics, not in tests.

> **Q**: How should shared test utilities (TestModuleBuilder, mock factories, seeders) be documented?
> **A**: **Inline JSDoc + one README.** Each shared utility gets JSDoc with a usage example. The `test/` or `packages/test-utils/` directory gets a single `README.md` listing all available utilities.

> **Q**: Should there be a test helper review process to ensure helpers don't become overly complex?
> **A**: **Code review is sufficient.** Test helpers are reviewed like any other code in PRs. The rule: a test helper should be understandable without reading its implementation. If a helper requires its own tests, it's too complex — refactor it.

> **Q**: How should test data fixtures be kept in sync with schema changes?
> **A**: **TypeScript compilation catches most drift.** Factories produce typed objects; when the schema changes, the factory code fails to compile. For database-level fixtures, add a CI step that runs the seed script against a fresh database after migrations.

---

## Summary

### Task Count by Section

| Section                            | Tasks                            |
| ---------------------------------- | -------------------------------- |
| 1. Server Test Infrastructure      | 11 (TS-SV-001 through TS-SV-011) |
| 2. NestJS Module Unit Testing      | 8 (TS-SV-012 through TS-SV-019)  |
| 3. Service Layer Testing           | 33 (TS-SV-020 through TS-SV-052) |
| 4. Controller Testing              | 32 (TS-SV-053 through TS-SV-084) |
| 5. Guard & Middleware Testing      | 9 (TS-SV-085 through TS-SV-093)  |
| 6. Pipe & Interceptor Testing      | 6 (TS-SV-094 through TS-SV-099)  |
| 7. WebSocket Gateway Testing       | 7 (TS-SV-100 through TS-SV-106)  |
| 8. Database Integration Testing    | 14 (TS-SV-107 through TS-SV-120) |
| 9. Git Integration Testing         | 10 (TS-SV-121 through TS-SV-130) |
| 10. Authentication Flow Testing    | 7 (TS-SV-131 through TS-SV-137)  |
| 11. API Endpoint Integration Tests | 8 (TS-SV-138 through TS-SV-145)  |
| 12. Agent Orchestration Testing    | 6 (TS-SV-146 through TS-SV-151)  |
| 13. File System Operation Testing  | 10 (TS-SV-152 through TS-SV-161) |
| 14. Error Handling Testing         | 6 (TS-SV-162 through TS-SV-167)  |
| 15. Server E2E / Smoke Tests       | 4 (TS-SV-168 through TS-SV-171)  |
| **TOTAL**                          | **171**                          |

### Dependencies (What This Plan Enables)

Completion of this plan provides:

- Full test coverage for all server modules, services, and controllers
- Database integration test suite verifying schema and queries
- Git integration test suite verifying version control operations
- API contract tests for all endpoints
- Confidence in server refactoring and feature additions

### Definition of Done

This plan is complete when:

- [ ] Every NestJS service has unit tests for all public methods
- [ ] Every controller has tests for all endpoints with success and error cases
- [ ] All guards and middleware have tests for allow and deny scenarios
- [ ] Database repositories are tested against real PostgreSQL
- [ ] Git operations are tested with temporary repositories
- [ ] Authentication flow is tested end-to-end
- [ ] WebSocket events are tested for all message types
- [ ] Error handling returns correct status codes and format
- [ ] Server test coverage meets targets (90%+ service, 85%+ controller)
- [ ] Smoke test suite passes against deployed instance
