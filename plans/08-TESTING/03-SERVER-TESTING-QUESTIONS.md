# 08-TESTING / 03 — SERVER TESTING: Open Questions

> **Purpose**: Unresolved questions about server-side testing including NestJS
> test module patterns, database test isolation, git test strategies, mocking
> boundaries, WebSocket testing, and agent orchestration testing. Answers may
> change tasks in the plan.

---

## 1. NestJS Test Module Patterns

### 1.1 Module Compilation

- **Q**: NestJS test modules use `Test.createTestingModule()` which compiles
  decorators at runtime. Does this compilation work correctly under Bun, or
  are there decorator metadata issues (reflect-metadata, emitDecoratorMetadata)?

**A:** Bun supports `reflect-metadata` and `emitDecoratorMetadata` in its TypeScript transpiler. NestJS `Test.createTestingModule()` works under Bun. Ensure `"experimentalDecorators": true` and `"emitDecoratorMetadata": true` are set in `tsconfig.json`. Validate in the bootstrap PR with a single NestJS controller + service test. If edge cases appear with specific decorators, file them as Bun issues and add targeted workarounds.

- **Q**: Should each test file compile its own NestJS test module, or should
  there be a shared compiled module per feature? Shared modules are faster
  but harder to customize per test.

**A:** **Each test file compiles its own test module.** Per-file compilation is the NestJS-recommended pattern and provides full isolation — each file configures exactly the providers it needs. The compilation overhead (~50–100ms per file) is acceptable. Shared compiled modules create hidden coupling between tests and make it hard to override specific providers.

- **Q**: How long does test module compilation take under Bun? If it's slow
  (>500ms per file), should compiled modules be cached?

**A:** Measure in the bootstrap PR. Expected: 50–150ms per file, which is acceptable. If compilation exceeds 300ms, create a `TestModuleBuilder` helper that pre-configures common providers and allows per-test overrides, reducing boilerplate without sharing compiled instances. Do not cache compiled modules — the invalidation logic would be more complex than the time saved.

### 1.2 Dependency Injection Mocking

- **Q**: Should mock providers be created with `jest.fn()`-style mocking
  (bun's `mock()`) or as plain objects with implemented methods? `mock()`
  enables call tracking and assertions; plain objects are simpler.

**A:** Use **Bun's `mock()` / `spyOn()`** for mock providers. Call tracking (`toHaveBeenCalledWith`, `toHaveBeenCalledTimes`) is essential for verifying service interactions. Create mock providers as objects with `mock()` methods: `{ findAll: mock(() => []), create: mock(() => ({})) }`. This gives both readable structure and assertion power.

- **Q**: When testing a service that depends on another service, should the
  dependency be mocked at the provider level (DI replacement) or at the
  method level (spy on real service)? Provider-level is more isolated;
  method-level is more realistic.

**A:** **Provider-level DI replacement** for unit tests. Replace dependencies entirely via `overrideProvider().useValue(mockService)`. This ensures true isolation — the test exercises only the service under test. Use **method-level spying** (spy on real service) only in integration tests where you want to verify cross-service behavior with real logic.

- **Q**: Should guards be globally overridden in tests (always allow) or
  tested with real guard logic? Global override simplifies tests but misses
  guard bugs.

**A:** **Override guards globally** in unit/integration tests for non-auth services. Use `overrideGuard(AuthGuard).useValue({ canActivate: () => true })`. Test guard logic in **dedicated guard test files** (`auth.guard.test.ts`) that exercise the real guard with valid, invalid, and expired tokens. This separates concerns: service tests focus on business logic, guard tests focus on auth logic.

---

## 2. Database Testing

### 2.1 Test Database Strategy

- **Q**: Should integration tests use a dedicated test PostgreSQL container
  (separate from dev), or share the dev container with a different database?
  Separate container is more isolated; shared container is easier to manage.

**A:** **Shared container, separate database.** Use the same Docker PostgreSQL container for dev and test, but create a separate `kg_test` database. This avoids running two containers while maintaining full isolation. The Docker Compose file defines one PostgreSQL service; the test setup script creates/resets the `kg_test` database. In CI, the GitHub Actions service container provides a fresh PostgreSQL instance.

- **Q**: Should test data isolation use transaction rollback (fast, no cleanup
  needed) or TRUNCATE between tests (slower, but allows testing transaction
  behavior)? Some tests may need to test actual commit behavior.

**A:** **Transaction rollback by default.** Wrap each test file in a transaction, roll back in `afterAll`. This is fast and requires no cleanup. For the small subset of tests that need real commit behavior (transaction isolation tests, conflict detection, concurrent access), use explicit TRUNCATE cleanup and mark the file as `.integration.test.ts`. These run in the slower integration test job.

- **Q**: Should the test database schema be verified against the expected
  schema on test suite startup? This catches migration drift but adds startup
  time.

**A:** **Yes, verify on startup** but keep it fast. Run `drizzle-kit check` (or equivalent schema diff) once at suite startup in CI. Locally, skip by default but enable with an env flag `VERIFY_SCHEMA=1`. This catches migration drift in CI without slowing local iteration.

### 2.2 Test Data Management

- **Q**: Should test data factories live in the test directory or in a shared
  package? If factories are needed by both server tests and E2E tests, they
  should be shared.

**A:** Factories live in a **shared test utilities package** at `packages/test-utils/` (or `test/` at the repo root). Server tests, E2E tests, and potentially frontend tests all import from here. The factories use `fishery` and produce typed objects matching the shared schema types from `@kg/shared`. Database persistence methods (`factory.create()`) are server-side only and use Drizzle ORM.

- **Q**: Should factories generate deterministic data (same output every run)
  or random data (different every run)? Deterministic is reproducible; random
  catches more edge cases but is harder to debug.

**A:** **Deterministic with sequential IDs.** Use `fishery` sequences for IDs and predictable patterns for names (e.g., `Test User 1`, `Test User 2`). Avoid randomized data — it makes failures hard to reproduce. If fuzz-style testing is desired, add separate fuzz tests with seeded randomness (`Math.seedrandom` with a logged seed) that can be reproduced from CI output.

- **Q**: Should foreign key relationships be auto-created by factories? For
  example, `createTestProject()` should auto-create an owner user if not
  provided. Auto-creation is convenient but hides dependencies.

**A:** **Yes, auto-create related entities by default** with the ability to override. `createTestProject()` auto-creates an owner user unless one is passed explicitly. This reduces boilerplate dramatically. `fishery` supports this via `associations`. The auto-created entities use minimal defaults. Tests that care about the related entity's properties pass it explicitly.

### 2.3 Database Test Performance

- **Q**: Running migrations before each test file is slow. Should migrations
  run once per test suite (share database state across files) or once per
  file? Once per suite is faster but requires careful cleanup.

**A:** **Once per test suite.** Run all Drizzle migrations at suite startup (`globalSetup` in Bun test config). Individual test files use transaction rollback for isolation, so the shared schema is safe. This reduces startup from minutes (per-file migrations) to seconds (single migration run).

- **Q**: Should the test database be kept in memory (if PostgreSQL supports
  this via ramdisk) for faster I/O?

**A:** **No.** PostgreSQL doesn't natively support in-memory mode, and ramdisk adds operational complexity. PostgreSQL with `fsync=off` and `synchronous_commit=off` in the test container config provides near-memory-speed performance. Set these in the Docker Compose test configuration. The performance gain from ramdisk is marginal compared to these settings.

---

## 3. Git Integration Testing

### 3.1 Git Test Environment

- **Q**: Should git integration tests use real git (exec `git` commands in
  temp directories) or a git library (isomorphic-git, simple-git)? Real git
  is most accurate; libraries are faster and more portable.

**A:** **Real git via `simple-git`** in temp directories. The project uses `simple-git` in production, so tests should use the same library against real git repos. This catches compatibility issues between `simple-git` and the actual git binary. `isomorphic-git` has different semantics and would not catch real-world issues.

- **Q**: Should git tests create temp repositories for each test (isolated
  but slow) or share a test repository (fast but requires careful cleanup)?

**A:** **Temp repository per test file** (not per test case). Create in `beforeAll`, clean up in `afterAll`. Within a file, tests can share the repo if they build on each other's state (e.g., test 1 creates a commit, test 2 creates a branch from it). This balances isolation with speed. Use `fs.mkdtemp()` for temp directories.

- **Q**: Should git tests verify actual file system state (check that files
  exist, have correct content) or only verify git command output?

**A:** **Verify both.** Check git command output (status, log, diff) and spot-check file system state for critical operations (file creation, merge results). Git output verification ensures the commands worked; file system verification catches cases where git reports success but the file system is wrong (rare, but catastrophic when it happens).

- **Q**: Should git remote operations be tested against a local bare
  repository, a mock git server, or skipped in favor of unit-level mocks?

**A:** **Local bare repository** (`git init --bare` in a temp directory). The test repo's remote points to this bare repo. This tests push/pull/fetch operations realistically without network dependency. No mock git server needed — the bare repo serves the same purpose locally. Mock git only in unit tests of services that call git as a dependency.

### 3.2 Merge & Conflict Testing

- **Q**: How should merge conflicts be reliably created in tests? Manual file
  manipulation, then force-merge? Is there a pattern for deterministically
  creating specific conflict scenarios?

**A:** Use a deterministic helper function: `createConflictScenario(repo, { base, ours, theirs })`. The helper creates a base commit with a file, branches, modifies the same line differently on each branch, and attempts merge. This produces a predictable conflict. Provide preset scenarios: `LINE_CONFLICT`, `FILE_DELETED_VS_MODIFIED`, `BINARY_CONFLICT`. Each scenario is a factory that sets up the exact conflict state needed.

- **Q**: Should the test suite include performance tests for git operations
  with large repos (many files, long history)? This is important for
  production but slow for CI.

**A:** **No, not in CI.** Large-repo performance testing is a manual benchmark exercise. Create a script that generates a repo with 1000 files and 500 commits, then measures operation times. Run it before releases or when optimizing git operations. Keep it out of CI to respect the 5-minute budget.

---

## 4. WebSocket Testing

### 4.1 WebSocket Test Infrastructure

- **Q**: Should WebSocket tests start a real NestJS server with a real
  WebSocket gateway, or should the gateway be tested in isolation with a
  mock socket? Real server tests the full flow; mock testing is faster.

**A:** **Both.** Unit-test the gateway class in isolation — inject a mock socket, call handler methods directly, assert emitted events. For integration tests, start a real NestJS server (using `app.listen(0)` for random port) with a real Socket.IO gateway and connect with `socket.io-client`. Keep integration tests to the critical flows: connection, authentication, room joining, event broadcasting.

- **Q**: How should WebSocket client connections be managed in tests? Should
  tests use the `socket.io-client` library, `ws` library, or a custom mock?

**A:** **`socket.io-client`** for integration tests (matches the production client). **Mock socket objects** for unit tests (plain objects with `emit`, `on`, `join` methods as `mock()` functions). Do not use raw `ws` — the project uses Socket.IO, which has its own protocol on top of WebSocket.

- **Q**: How should WebSocket events be asserted? Wait for specific events
  with timeout, or collect all events and assert at the end? Waiting is more
  precise; collecting is more comprehensive.

**A:** **Wait for specific events with timeout.** Create a helper: `await waitForEvent(socket, 'event-name', { timeout: 2000 })` that returns the event data or throws on timeout. This is precise, readable, and avoids the ambiguity of collecting all events. For ordering assertions, use `collectEvents(socket, ['event-a', 'event-b'])` that resolves when all expected events arrive in order.

### 4.2 WebSocket State Testing

- **Q**: How should tests verify that WebSocket events are NOT sent? (e.g.,
  verify that a notification is NOT sent to the wrong user.) Should there be
  a "no events in N milliseconds" assertion pattern?

**A:** Use a **"no events in N ms" pattern.** Create a helper: `await expectNoEvent(socket, 'event-name', { within: 500 })` that fails if the event is received within the window. 500ms is sufficient for local testing. Use fake timers where possible to avoid real delays. This is the standard pattern for negative WebSocket assertions.

- **Q**: Should WebSocket tests verify event ordering? (e.g., `agent:thinking`
  must come before `agent:streaming` must come before `agent:complete`.)
  Ordering assertions add confidence but are fragile.

**A:** **Yes, for critical sequences.** The agent response lifecycle (`agent:thinking` → `agent:streaming` → `agent:complete`) must be ordered. Use the `collectEvents` helper that asserts events arrive in the specified order. Limit ordering assertions to the 3–4 most critical event sequences. Don't assert ordering on loosely-coupled events (e.g., unrelated notifications).

---

## 5. Agent Orchestration Testing

### 5.1 Mock Agent Strategy

- **Q**: Should the Claude Code wrapper be mocked at the subprocess level
  (mock `spawn()` to return predefined stdout) or at the wrapper interface
  level (mock the wrapper service to return predefined responses)? Subprocess
  mocking is more realistic but more complex.

**A:** **Both levels.** Unit tests of the orchestrator mock the `ClaudeCodeWrapper` service interface via DI replacement — simple, fast, focused on orchestration logic. Integration tests of the wrapper itself mock at the subprocess level (intercept `Bun.spawn()` to return scripted stdout/stderr streams). This tests the actual stream parsing, error handling, and process lifecycle in the wrapper.

- **Q**: Should mock agent responses be static (same response every time) or
  configurable per test? Configurable enables testing different scenarios but
  requires more setup.

**A:** **Configurable per test.** Provide a `MockClaudeCode` class with a `setResponse(scenario)` method. Pre-define common scenarios: `SIMPLE_TEXT_RESPONSE`, `TOOL_USE_RESPONSE`, `STREAMING_CHUNKS`, `ERROR_RESPONSE`, `TIMEOUT`. Each test selects the scenario it needs. This keeps tests readable while supporting diverse scenarios.

- **Q**: How should agent tool calls be tested? Should the mock agent return
  tool call instructions that the orchestrator actually executes against mock
  tools, or should tool execution be mocked too?

**A:** **Mock agent returns tool call instructions; orchestrator executes against mock tools.** This tests the full orchestration loop: agent requests tool → orchestrator parses → orchestrator calls tool → tool returns result → orchestrator feeds result back to agent. Mock the tools themselves (return canned results), but let the orchestrator's tool dispatch logic run for real. This catches routing and serialization bugs.

### 5.2 Agent Error Scenarios

- **Q**: How should agent timeout be tested? Use real timers with short
  timeout (slow, realistic) or fake timers that advance past the timeout
  (fast, may miss real timing issues)?

**A:** **Fake timers.** Set the timeout to the real production value (e.g., 60 seconds), then advance fake timers past it. This tests the exact timeout logic without waiting. Real timer tests are reserved for E2E smoke tests. The timeout value itself should be configurable via environment variable so tests can verify different timeout configurations.

- **Q**: Should tests simulate partial agent responses (stream interruption)?
  This is important for robustness but hard to simulate deterministically.

**A:** **Yes.** The `MockClaudeCode` subprocess mock should support a `STREAM_INTERRUPTED` scenario: emit 3 chunks, then close the stdout stream without a completion event. Verify the orchestrator handles this gracefully: emits an error event to the client, cleans up the subprocess, logs the interruption. This is deterministic because the mock controls exactly when the stream closes.

- **Q**: How should agent token usage tracking be verified? Mock the token
  counting logic, or use actual token estimation?

**A:** **Use actual token estimation** with known input/output strings. The token counter is a pure function — feed it a known string, assert the count is within an expected range. No need to mock it. For orchestrator tests that verify token budget enforcement, use the real counter with inputs designed to exceed or fit within the budget.

---

## 6. Authentication Testing

### 6.1 JWT Testing

- **Q**: Should authentication tests use real JWT signing (with test secret)
  or mock the JWT verification? Real signing tests the full flow; mocking
  isolates the code under test.

**A:** **Real JWT signing with a test secret.** Use a hardcoded test secret (`TEST_JWT_SECRET`) in test configuration. Generate real JWTs with `jsonwebtoken` and verify them through the real auth pipeline. This tests the full flow including token parsing, signature verification, and payload extraction. Mocking JWT verification hides real-world auth bugs.

- **Q**: Should there be negative tests for JWT manipulation (modify payload,
  change signature, truncate token)? These are important for security but
  add test maintenance.

**A:** **Yes, include negative JWT tests.** Test: tampered payload (modified but same signature), invalid signature (signed with wrong key), expired token, malformed token string, missing token. These are critical security tests and are stable — JWT behavior doesn't change with feature development. Write them once in `auth.guard.test.ts`, they'll rarely need updates.

- **Q**: How should token refresh be tested? Should there be a refresh token
  mechanism, or only re-login?

**A:** Test whatever mechanism the auth module implements. If refresh tokens are used, test: valid refresh → new access token, expired refresh → 401, revoked refresh → 401, reuse of consumed refresh → 401 (rotation). If re-login only, test: expired access token → 401 → client redirects to login. The tests verify the implemented flow, not prescribe one.

### 6.2 Session Security

- **Q**: Should tests verify http-only cookie attributes (httpOnly, secure,
  sameSite)? These are critical for security but may require inspecting raw
  HTTP headers.

**A:** **Yes.** Use `supertest` to inspect raw `Set-Cookie` headers in integration tests. Assert: `httpOnly` flag is present, `secure` flag is present (in production config), `sameSite=strict` or `sameSite=lax`. These are one-time tests in `auth.controller.integration.test.ts` that verify the security configuration. Parse the `Set-Cookie` header string with a helper function.

- **Q**: Should tests verify that password hashes use a sufficiently high
  bcrypt cost factor? This is a security requirement but makes tests slower.

**A:** **Yes, but verify configuration, not execution.** Assert that the bcrypt cost factor constant is ≥ 12 (or the project's chosen minimum) as a unit test on the auth configuration. Do not hash a password with cost 12 in every test — it's slow. One dedicated test verifies that `hashPassword()` produces a valid bcrypt hash with the correct cost prefix (`$2b$12$`).

---

## 7. API Contract Testing

### 7.1 Contract Verification

- **Q**: Should the project use contract testing (e.g., Pact) between
  frontend and backend? Contract tests catch API changes that break the
  client but add maintenance overhead.

**A:** **No formal contract testing (no Pact).** The frontend and backend share TypeScript types via `@kg/shared`. Compile-time type checking catches most contract drift. Integration tests on the server verify response shapes. Adding Pact would be redundant given the shared type system. Revisit if the API is consumed by external clients.

- **Q**: Should API response shapes be validated against OpenAPI/Swagger
  schemas in tests? This ensures documentation and implementation match.

**A:** **Yes, if the project generates OpenAPI docs.** If NestJS Swagger decorators are used, add a test that generates the OpenAPI spec and validates a sample response against it. This catches drift between docs and implementation. If OpenAPI is not a priority, skip this — the shared TypeScript types serve the same purpose for the internal frontend client.

- **Q**: Should API tests verify response headers (CORS, Cache-Control,
  Content-Security-Policy) in addition to body content?

**A:** **Yes, for security headers.** Test CORS headers (allowed origins, methods, credentials), Content-Security-Policy, and X-Frame-Options in a dedicated `security-headers.integration.test.ts`. Cache-Control is tested only for endpoints where caching behavior is explicitly designed (static assets, public data). Don't test headers on every endpoint.

### 7.2 Backward Compatibility

- **Q**: How should API backward compatibility be tested? Should there be
  tests that verify old request formats still work after API changes?

**A:** **Not initially.** The API is internal (consumed only by the project's own frontend). Backward compatibility testing is warranted only if versioned APIs are introduced for external consumers. For now, the shared TypeScript types and integration tests are sufficient to catch breaking changes. Add compatibility tests if/when API versioning becomes necessary.

- **Q**: Should API versioning (`/api/v1/`) be tested by having separate
  test suites per version?

**A:** **Not initially.** Start with a single unversioned API (or `/api/v1/` as the only version). When a second version is introduced, add tests for both versions in the same test file, using parameterized tests: `describe.each(['/api/v1', '/api/v2'])`. Separate test suites per version is premature.

---

## 8. Performance & Load Testing

- **Q**: Should the server test suite include performance benchmarks? For
  example, "GET /api/v1/projects should respond in < 100ms with 100
  projects." If so, what are the baselines?

**A:** **Not in CI.** Performance varies by CI runner. Provide a manual benchmark script that runs key endpoints against a seeded database. Baselines: simple CRUD < 50ms, list with pagination < 100ms, complex Knowledge Graph queries < 300ms. Track results in a markdown file. Run before releases.

- **Q**: Should database query performance be tested? For example, "query
  for user's accessible specs with 10K specs should complete in < 50ms."

**A:** **Yes, as manual benchmarks.** Create a seeding script that generates 10K specs with realistic relationships. Measure query times for: listing user's specs (paginated), searching specs by text, traversing Knowledge Graph edges. Assert no N+1 queries via query count logging. These benchmarks run on-demand, not in CI.

- **Q**: Should memory leak detection be part of the test suite? Long-running
  tests that monitor memory usage can detect leaks but are expensive.

**A:** **No automated memory leak detection.** Memory leaks are rare in NestJS request-handler patterns. If a leak is suspected, use Node.js heap snapshots manually. The WebSocket gateway (long-lived connections) is the most likely leak source — monitor it in staging with process metrics, not in tests.

---

## 9. Test Maintenance

- **Q**: How should shared test utilities (TestModuleBuilder, mock factories,
  seeders) be documented? Inline JSDoc, separate docs, or examples-only?

**A:** **Inline JSDoc + one README.** Each shared utility function/class gets JSDoc with a usage example. The `test/` or `packages/test-utils/` directory gets a single `README.md` listing all available utilities with brief descriptions and links to the JSDoc. No separate documentation site — the README is the entry point, JSDoc is the reference.

- **Q**: Should there be a test helper review process to ensure helpers don't
  become overly complex or tightly coupled?

**A:** **Code review is sufficient.** Test helpers are reviewed like any other code in PRs. The rule: a test helper should be understandable without reading its implementation. If a helper requires its own tests, it's too complex — refactor it. No formal review process beyond standard PR review.

- **Q**: How should test data fixtures be kept in sync with schema changes?

**A:** **TypeScript compilation catches most drift.** Factories produce typed objects; when the schema changes, the factory code fails to compile. For database-level fixtures (seed scripts), add a CI step that runs the seed script against a fresh database after migrations. If the seed fails, the schema and fixtures are out of sync.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
| ---- | -------- | -------- | --------- |
| —    | —        | —        | —         |
