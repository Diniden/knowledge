# 08-TESTING / 01 — STRATEGY PLAN

> **Purpose**: Define the overall testing philosophy, strategy, and
> infrastructure for the Knowledge Graph Agent System. This covers the test
> pyramid, tooling selection, naming conventions, coverage targets, CI
> integration, test data management, environment setup, and cross-cutting
> testing concerns. All other testing plans (frontend, server, agent) inherit
> from this strategy.
>
> **Phase**: 1 (Foundation) + ongoing across all phases
> **Dependencies**: `01-PROJECT-STRUCTURE/PLAN.md`
> **Estimated tasks**: 110+

---

## Table of Contents

1. [Testing Philosophy](#1-testing-philosophy)
2. [Test Pyramid & Layer Definitions](#2-test-pyramid--layer-definitions)
3. [Tooling Selection](#3-tooling-selection)
4. [Test Organization & Naming](#4-test-organization--naming)
5. [Code Coverage Configuration](#5-code-coverage-configuration)
6. [CI Integration](#6-ci-integration)
7. [Test Data Management](#7-test-data-management)
8. [Testing Environment Setup](#8-testing-environment-setup)
9. [Snapshot Testing Strategy](#9-snapshot-testing-strategy)
10. [Performance Testing](#10-performance-testing)
11. [Accessibility Testing](#11-accessibility-testing)
12. [Security Testing](#12-security-testing)
13. [Cross-Cutting Test Utilities](#13-cross-cutting-test-utilities)
14. [Test Documentation](#14-test-documentation)

---

## 1. Testing Philosophy

### 1.1 Core Principles

- [ ] **TS-STR-001**: Document the testing philosophy in `docs/testing/PHILOSOPHY.md`
  - Tests are a first-class deliverable, not an afterthought
  - Every feature has a test before it is considered "done"
  - Tests document behavior — a test suite should read like a specification
  - Flaky tests are bugs — fix or remove, never ignore
  - Test speed matters — fast tests encourage running them often
- [ ] **TS-STR-002**: Define the "test-first" policy for the project
  - New features: write test stubs that describe expected behavior first
  - Bug fixes: write a failing test that reproduces the bug before fixing
  - Refactors: ensure existing tests pass before and after the change
- [ ] **TS-STR-003**: Define the "no skipped tests" policy
  - `test.skip()` is allowed only with a linked issue/ticket
  - CI reports skipped tests as warnings
  - Skipped tests older than 2 weeks trigger review

### 1.2 Test Ownership

- [ ] **TS-STR-004**: Define test ownership convention
  - Tests live next to the code they test (co-located)
  - The developer who writes the code writes the tests
  - PR reviewers must review tests with the same scrutiny as production code
- [ ] **TS-STR-005**: Define test review checklist
  - Does the test actually test the behavior described?
  - Are edge cases covered?
  - Is the test deterministic (no random, no time-dependency)?
  - Does the test clean up after itself?
  - Is the test readable without comments?

---

## 2. Test Pyramid & Layer Definitions

### 2.1 Unit Tests (Base of Pyramid)

- [ ] **TS-STR-006**: Define unit test scope and boundaries
  - Tests a single function, class, or component in isolation
  - All external dependencies are mocked (database, API, file system, agent)
  - No network calls, no file system access, no database access
  - Execution time target: < 50ms per test
- [ ] **TS-STR-007**: Define unit test proportion target
  - 70% of all tests should be unit tests
  - Every utility function must have unit tests
  - Every service method must have unit tests (with mocked deps)
  - Every React component must have render tests

### 2.2 Integration Tests (Middle of Pyramid)

- [ ] **TS-STR-008**: Define integration test scope and boundaries
  - Tests interaction between two or more modules/layers
  - May use real database (test instance), real file system (temp directory)
  - External services (Claude API) remain mocked
  - Execution time target: < 2 seconds per test
- [ ] **TS-STR-009**: Define integration test proportion target
  - 20% of all tests should be integration tests
  - Every API endpoint must have integration tests
  - Database queries must be tested against real PostgreSQL
  - WebSocket flows must have integration tests

### 2.3 End-to-End Tests (Top of Pyramid)

- [ ] **TS-STR-010**: Define E2E test scope and boundaries
  - Tests complete user workflows through the real UI
  - Uses real browser (Playwright)
  - Uses real server and database (test instances)
  - Agent interactions are mocked at the subprocess level
  - Execution time target: < 30 seconds per test
- [ ] **TS-STR-011**: Define E2E test proportion target
  - 10% of all tests should be E2E tests
  - Cover critical user journeys: registration, login, spec creation, graph navigation
  - Cover agent interaction flow (with mocked agent)
  - Cover version control flow: edit → commit → diff → revert

### 2.4 Test Pyramid Enforcement

- [ ] **TS-STR-012**: Create test count report script that categorizes tests by type
  - Count unit tests (files matching `*.test.ts` without integration markers)
  - Count integration tests (files matching `*.integration.test.ts`)
  - Count E2E tests (files in `e2e/` directories)
  - Report pyramid ratio and warn if out of balance
- [ ] **TS-STR-013**: Add pyramid ratio check to CI pipeline
  - Warn if unit tests < 60% of total
  - Warn if E2E tests > 15% of total
  - Block merge if any test layer has 0 tests for a module with production code

#### Design Decisions

> **Q**: What exactly constitutes an "integration test" vs a "unit test" in this project? If a NestJS service is tested with a real database but mocked HTTP clients, is that unit or integration?
> **A**: A **unit test** exercises a single class/function with all external dependencies mocked (database, HTTP, file system, subprocess). An **integration test** exercises a component with at least one real external dependency (real database, real file system, real git repo). A NestJS service tested with a real database but mocked HTTP clients is an integration test. The distinguishing factor is whether a real external resource is involved.

> **Q**: Should integration tests use the same `bun test` runner as unit tests, or a separate command/configuration? Separate commands allow different timeouts and parallelism settings.
> **A**: Same `bun test` runner, but separate scripts with different configurations. Use `bun test --filter '*.test.ts' --exclude '*.integration.test.ts'` for unit tests and `bun test --filter '*.integration.test.ts' --timeout 30000` for integration tests. Package.json scripts: `test:unit`, `test:integration`, `test` (runs both).

---

## 3. Tooling Selection

### 3.1 Test Runner: bun test

- [ ] **TS-STR-014**: Configure `bun test` as the primary test runner
  - Verify `bun test` works with the monorepo workspace structure
  - Configure test file discovery pattern: `**/*.test.ts`, `**/*.test.tsx`
  - Configure test timeout: 10 seconds per test (30 seconds for integration)
  - Configure parallel execution for unit tests
- [ ] **TS-STR-015**: Configure bun test for each workspace
  - `client/`: `bun test` runs frontend tests
  - `server/`: `bun test` runs backend tests
  - `shared/`: `bun test` runs shared package tests
  - Root: `bun test` runs all workspace tests
- [ ] **TS-STR-016**: Configure test environment in bunfig.toml
  - Set `[test]` section with preload files
  - Configure module resolution for test imports
  - Set environment variables for test runs

### 3.2 DOM Testing Environment

- [ ] **TS-STR-017**: Evaluate and select DOM environment for component testing
  - happy-dom: lighter, faster, good enough for most component tests
  - jsdom: heavier, more complete, better compatibility
  - Document chosen environment with rationale
- [ ] **TS-STR-018**: Configure DOM environment for frontend tests
  - Install chosen DOM library
  - Create preload file that sets up global DOM environment
  - Verify React rendering works in the environment
- [ ] **TS-STR-019**: Install `@testing-library/react` for component testing
  - Install `@testing-library/react`
  - Install `@testing-library/jest-dom` for DOM matchers (verify bun compatibility)
  - Install `@testing-library/user-event` for user interaction simulation

### 3.3 E2E Testing Framework

- [ ] **TS-STR-020**: Evaluate and select E2E testing framework
  - Playwright: cross-browser, auto-waiting, good DX, built-in assertions
  - Cypress: large ecosystem, time-travel debugging, single-browser per run
  - Document chosen framework with rationale
- [ ] **TS-STR-021**: Install and configure E2E framework
  - Install framework and its dependencies
  - Create configuration file (`playwright.config.ts` or `cypress.config.ts`)
  - Configure base URL pointing to test server
  - Configure browser(s): Chromium (primary), Firefox, WebKit (optional)
  - Configure screenshot and video capture on failure
- [ ] **TS-STR-022**: Create E2E test directory structure
  - `e2e/tests/` — test files
  - `e2e/fixtures/` — reusable test fixtures (login state, sample data)
  - `e2e/pages/` — page object models
  - `e2e/helpers/` — shared utilities (custom commands, assertions)

### 3.4 Mocking Libraries

- [ ] **TS-STR-023**: Evaluate mocking approach for bun test
  - `bun:test` built-in `mock()` function
  - `mock.module()` for module-level mocking
  - Verify compatibility with NestJS dependency injection
- [ ] **TS-STR-024**: Create standard mock patterns for the project
  - Document how to mock NestJS services (provider override)
  - Document how to mock database repositories
  - Document how to mock HTTP requests (fetch)
  - Document how to mock WebSocket connections
  - Document how to mock file system operations
  - Document how to mock Claude Code subprocess

### 3.5 HTTP Testing

- [ ] **TS-STR-025**: Configure `supertest` for NestJS API testing
  - Install supertest and `@types/supertest`
  - Create helper to bootstrap NestJS test module with supertest
  - Create helper for authenticated requests (inject JWT)
- [ ] **TS-STR-026**: Create HTTP test utility functions
  - `createAuthenticatedRequest(user)` — returns supertest agent with JWT
  - `expectValidationError(response, field)` — asserts DTO validation error
  - `expectPaginatedResponse(response, options)` — asserts pagination envelope

### 3.6 Assertion Libraries

- [ ] **TS-STR-027**: Configure assertion approach
  - Primary: `bun:test` built-in `expect()`
  - Extend with custom matchers for project-specific assertions
  - Document available matchers and when to use each
- [ ] **TS-STR-028**: Create custom assertion matchers
  - `toBeValidUUID()` — validates UUID format
  - `toBeISOTimestamp()` — validates ISO 8601 timestamp
  - `toMatchSpecSchema()` — validates against spec JSON schema
  - `toMatchEdgeSchema()` — validates against edge JSON schema
  - `toHavePermission(level)` — validates permission response

#### Design Decisions

> **Q**: Has `bun test` been verified to work with all project dependencies? Specifically: NestJS test utilities (`@nestjs/testing`), `@testing-library/react`, and `supertest`? Are there known incompatibilities?
> **A**: `bun test` is the designated runner. NestJS `@nestjs/testing` works under Bun since Bun supports `reflect-metadata` and decorator emit. `@testing-library/react` works when paired with `happy-dom`. `supertest` works with Bun's HTTP compatibility. If an edge-case incompatibility surfaces, isolate it behind a thin adapter rather than switching runners. Verify compatibility in a bootstrap PR before writing the first real tests.

> **Q**: Does `bun test` support all required features: `beforeAll`/`afterAll`, `beforeEach`/`afterEach`, `describe.skip`, `test.only`, `test.todo`, mock module replacement, timer mocking, snapshot testing?
> **A**: Yes. Bun test supports the full lifecycle hooks (`beforeAll`, `afterAll`, `beforeEach`, `afterEach`), `describe.skip`, `test.only`, `test.todo`, `bun:test` mock/spyOn for function mocking, `mock.module()` for module replacement, `useFakeTimers()` for timer mocking, and `toMatchSnapshot()` for snapshots. This covers all required features.

> **Q**: How does `bun test` handle TypeScript compilation? Does it use its built-in transpiler, or does it need a separate build step? Are path aliases (`@kg/shared`) resolved correctly?
> **A**: Bun test uses its built-in TypeScript transpiler — no separate build step. Path aliases are resolved via `tsconfig.json` `paths` and Bun reads these automatically. Configure workspace-level `tsconfig.json` paths for `@kg/shared` and similar aliases; Bun resolves them natively.

> **Q**: Does `bun test` support parallel test execution across files? If so, how does this interact with shared test database state?
> **A**: Yes, Bun runs test files in parallel by default. For unit tests this is fine. For database integration tests, each test file must use its own transaction that rolls back at the end, ensuring isolation despite parallel execution. If parallel DB access causes contention, use `--concurrency 1` for integration-tagged test runs only.

> **Q**: Should the project use `happy-dom` (faster, lighter) or `jsdom` (more complete DOM implementation) for component tests? Are there specific DOM APIs used by the project that require jsdom?
> **A**: Use `happy-dom`. It is significantly faster and covers the DOM APIs needed for React component testing. For missing APIs like `IntersectionObserver` or `ResizeObserver`, add lightweight polyfill stubs in the test setup file. Only escalate to `jsdom` if a specific, critical API gap is discovered.

> **Q**: Does the chosen DOM environment work with `@testing-library/react` under Bun? The testing-library ecosystem expects certain globals (`document`, `window`, `navigator`).
> **A**: Yes. `happy-dom` provides `document`, `window`, and `navigator` globals. Configure it in `bunfig.toml` with `[test] preload = ["./test/setup.ts"]` where the setup file initializes `happy-dom` and any required polyfills.

> **Q**: Should the project use Playwright or Cypress for E2E testing?
> **A**: Playwright. The PRD specifies Playwright for E2E/browser tests. Its auto-wait, cross-browser support, and native iframe handling (critical for generative UI testing) make it the right choice. Playwright also supports test sharding for CI parallelism.

> **Q**: Should E2E tests run in headed mode during development for debugging? If so, which browsers should be supported?
> **A**: Yes, E2E tests should support headed mode for local debugging via `--headed` flag. Support Chromium only in headed mode for development; CI runs headless Chromium. Cross-browser testing (Firefox, WebKit) is deferred to a nightly CI job once the suite stabilizes.

> **Q**: Should E2E tests generate videos and screenshots on every run, or only on failure?
> **A**: Screenshots and videos on failure only. Configure Playwright with `screenshot: 'only-on-failure'` and `video: 'retain-on-failure'`. This keeps CI artifacts small while providing full debugging context when something breaks.

> **Q**: Should the project mock at module boundaries (mock entire modules) or at function boundaries (mock individual functions)?
> **A**: **Function/method boundaries** for unit tests (spy on specific methods). **Module boundaries** only when mocking external packages (e.g., `simple-git`, `child_process`). This gives precision where it matters while keeping external dependency mocking simple.

> **Q**: For NestJS tests, should mocks be provided through the DI container (replacing providers) or through direct function mocking?
> **A**: **DI container replacement** for NestJS tests. Use `Test.createTestingModule().overrideProvider(ServiceX).useValue(mockServiceX)`. This is idiomatic, leverages NestJS's design, and ensures the service under test receives mocks through the same injection path as production. Reserve direct function spying for non-DI utility functions.

> **Q**: Should the project maintain a centralized mock registry (all mocks in one place) or distribute mocks alongside their real implementations?
> **A**: Distribute mocks alongside their implementations. Place `auth.service.mock.ts` next to `auth.service.ts`. Shared mock utilities (mock database connection, mock WebSocket client) live in `test/mocks/`. No centralized registry — it becomes a dumping ground that nobody maintains.

> **Q**: Should the Claude Code wrapper be mocked at the subprocess level or at the wrapper interface level?
> **A**: Both levels, used in different contexts. **Unit tests** mock the wrapper interface (replace `ClaudeCodeWrapper` via DI). **Integration tests** mock at the subprocess level (intercept `spawn()` to return scripted stdout). This matches the PRD directive of "mocked Claude Code subprocess" for agent testing while keeping unit tests fast.

> **Q**: Should git operations in tests use a real git repository (temp dir with `git init`) or a fully mocked git?
> **A**: **Real git in temp directories** for integration tests of the git layer (using `simple-git` against actual repos). **Mocked `simple-git`** for unit tests of services that use git as a dependency. The git layer is critical enough that integration tests with real repos are worth the cost. Use `os.tmpdir()` + unique directory per test file; clean up in `afterAll`.

> **Q**: Should the project use a mock server (e.g., MSW — Mock Service Worker) for HTTP mocking in frontend tests, or mock `fetch` directly?
> **A**: Use **MSW (Mock Service Worker)**. It intercepts at the network level, works with any HTTP client, and can be reused in development mode for API mocking. Direct `fetch` mocking is fragile and doesn't catch issues with request construction. MSW handlers are defined per test or in shared handler files.

---

## 4. Test Organization & Naming

### 4.1 File Organization

- [ ] **TS-STR-029**: Define test file location convention (co-located)
  - Unit tests: `ComponentName.test.tsx` next to `ComponentName.tsx`
  - Service tests: `auth.service.test.ts` next to `auth.service.ts`
  - Integration tests: `auth.integration.test.ts` in same directory
  - E2E tests: centralized in `e2e/tests/` directory
- [ ] **TS-STR-030**: Define test file naming convention
  - Unit test: `{source-file-name}.test.{ts,tsx}`
  - Integration test: `{feature}.integration.test.ts`
  - E2E test: `{workflow}.e2e.test.ts`
  - Test fixtures: `{entity}.fixture.ts`
  - Test factories: `{entity}.factory.ts`
  - Mock files: `{module}.mock.ts`

### 4.2 Test Suite Structure

- [ ] **TS-STR-031**: Define `describe` block naming convention
  - Top level: component/class/module name
  - Second level: method or behavior group
  - Third level: specific scenario
  - Example:
    ```
    describe('AuthService', () => {
      describe('login', () => {
        describe('with valid credentials', () => {
          ...
        });
        describe('with invalid password', () => {
          ...
        });
      });
    });
    ```
- [ ] **TS-STR-032**: Define `it`/`test` naming convention
  - Start with a verb: "returns", "throws", "renders", "navigates"
  - Describe the expected behavior, not the implementation
  - Include the condition: "when user is authenticated"
  - Example: `it('returns 401 when JWT is expired')`
- [ ] **TS-STR-033**: Define test arrangement convention (AAA pattern)
  - **Arrange**: set up test data and preconditions
  - **Act**: execute the behavior under test
  - **Assert**: verify the expected outcome
  - Separate sections with blank lines for readability

### 4.3 Test Tags / Groups

- [ ] **TS-STR-034**: Define test tagging system for selective execution
  - `@unit` — unit tests (default, fast)
  - `@integration` — integration tests (require database)
  - `@e2e` — end-to-end tests (require full stack)
  - `@slow` — tests that take > 5 seconds
  - `@flaky` — known flaky tests (must have linked issue)
- [ ] **TS-STR-035**: Create bun test filter commands for each tag
  - `bun test --filter unit` (or via filename pattern)
  - `bun test --filter integration`
  - Document how to run specific test groups

#### Design Decisions

> **Q**: Should tests be co-located with source files or centralized in a `__tests__/` directory per module?
> **A**: Co-located. Place `auth.service.test.ts` next to `auth.service.ts`. This matches the PRD directive for colocated test files. It makes it obvious when a file lacks tests and keeps related code together. Use `.test.ts` suffix as the naming convention.

> **Q**: Should E2E tests be in a top-level `e2e/` directory or inside each workspace (`client/e2e/`, `server/e2e/`)?
> **A**: Top-level `e2e/` directory at the repository root. E2E tests span both frontend and server, so they don't belong in a single workspace. Structure as `e2e/specs/`, `e2e/fixtures/`, `e2e/helpers/`. Playwright config lives at `e2e/playwright.config.ts`.

> **Q**: Should integration tests have a distinct file suffix (`.integration.test.ts`) or be in a separate directory (`__integration__/`)?
> **A**: Distinct file suffix: `.integration.test.ts`. This enables easy filtering with `bun test --filter` and keeps integration tests co-located near the code they exercise. No separate directory needed.

> **Q**: Should E2E test files use `.e2e.test.ts` suffix or `.spec.ts` suffix (common Playwright convention)?
> **A**: Use `.spec.ts` suffix, following the standard Playwright convention. E2E tests are already isolated in the `e2e/` directory, so the suffix only needs to be recognizable to the Playwright runner.

---

## 5. Code Coverage Configuration

### 5.1 Coverage Tooling

- [ ] **TS-STR-036**: Configure code coverage with `bun test --coverage`
  - Enable coverage reporting in bun test configuration
  - Output formats: lcov (for CI), text (for terminal), html (for local review)
  - Configure coverage output directory: `coverage/`
  - Add `coverage/` to `.gitignore`
- [ ] **TS-STR-037**: Configure coverage collection per workspace
  - Client coverage: `client/coverage/`
  - Server coverage: `server/coverage/`
  - Shared coverage: `shared/coverage/`
  - Merged report at root: `coverage/`

### 5.2 Coverage Targets

- [ ] **TS-STR-038**: Define coverage targets per layer
  - Shared types/utilities: 95% line, 90% branch
  - Server services: 90% line, 85% branch
  - Server controllers: 85% line, 80% branch
  - Server guards/middleware: 90% line, 85% branch
  - Client components: 80% line, 75% branch
  - Client hooks: 90% line, 85% branch
  - Client services/utils: 90% line, 85% branch
  - Agent system: 85% line, 80% branch
- [ ] **TS-STR-039**: Define coverage thresholds for CI enforcement
  - Global minimum: 80% line coverage
  - Per-file minimum: 60% (flag files below this)
  - New code minimum: 90% (diff coverage)
  - Block merge if global coverage drops below threshold
- [ ] **TS-STR-040**: Configure diff coverage reporting
  - Measure coverage only on changed lines in PRs
  - Require 90% coverage on new/modified code
  - Report uncovered new lines in PR comment

### 5.3 Coverage Exclusions

- [ ] **TS-STR-041**: Define coverage exclusion patterns
  - Generated code (ORM entities if auto-generated)
  - Type definitions (`*.d.ts`)
  - Configuration files (`*.config.ts`)
  - Index/barrel files (`index.ts`)
  - Test files themselves
  - Migration files
  - Seed data files
- [ ] **TS-STR-042**: Configure coverage exclusion in bun/coverage config
  - Set `exclude` patterns in coverage configuration
  - Document rationale for each exclusion

#### Design Decisions

> **Q**: Are the proposed coverage targets (80% global, 90% new code) too aggressive or too lenient? Should targets start lower and increase over time?
> **A**: Start at **70% global line coverage** and **80% for new code** in PRs. Increase to 80%/90% once the codebase stabilizes (after the first 3 months). Starting lower avoids forcing low-value tests early on while still establishing the habit.

> **Q**: Should coverage targets be enforced as hard blocks (merge blocked) or soft warnings?
> **A**: **Soft warnings** for overall coverage; **hard block** only if a PR drops overall coverage by more than 2 percentage points. This prevents erosion without blocking individual PRs that touch hard-to-test code paths. New code coverage (80%) is a hard block from day one.

> **Q**: Should the project track branch coverage, line coverage, or both?
> **A**: Track both, enforce on **line coverage**. Report branch coverage as informational. Branch coverage targets are aspirational (60%+), not blocking. Line coverage is the gating metric.

> **Q**: Does `bun test --coverage` produce accurate coverage data for the project's TypeScript code? Are there known issues with coverage of decorators (NestJS), JSX (React), or dynamic imports?
> **A**: `bun test --coverage` uses V8 coverage under the hood and produces accurate line/function coverage for TypeScript and JSX. Decorator coverage may show some noise from generated metadata — exclude decorator boilerplate lines via coverage ignore comments where necessary. Validate accuracy in the bootstrap PR by spot-checking a few files.

> **Q**: Should the project use a third-party coverage service (Codecov, Coveralls) for historical tracking and PR comments, or is local reporting sufficient?
> **A**: Use **Codecov** integrated with GitHub Actions. It provides PR-level coverage diffs, historical tracking, and merge-blocking via status checks. The free tier is sufficient for a single private repo. Configure it to post PR comments showing coverage changes.

---

## 6. CI Integration

### 6.1 Test Pipeline Stages

- [ ] **TS-STR-043**: Define CI test pipeline stages
  - Stage 1: Lint + type-check (fastest, catch syntax errors)
  - Stage 2: Unit tests (fast, no external dependencies)
  - Stage 3: Integration tests (require test database)
  - Stage 4: E2E tests (require full stack, slowest)
  - Stage 5: Coverage report generation and threshold check
- [ ] **TS-STR-044**: Configure CI to run stages in order with fail-fast
  - If lint fails, skip all test stages
  - If unit tests fail, skip integration and E2E
  - Report failure at the earliest stage
- [ ] **TS-STR-045**: Configure CI test database
  - Start PostgreSQL service container
  - Create test database
  - Run migrations before tests
  - Tear down after all tests complete

### 6.2 CI Test Commands

- [ ] **TS-STR-046**: Define CI test commands
  - `bun run lint` — ESLint + TypeScript type check
  - `bun run test:unit` — unit tests only
  - `bun run test:integration` — integration tests only
  - `bun run test:e2e` — E2E tests only
  - `bun run test:coverage` — all tests with coverage report
  - `bun run test:all` — complete test suite
- [ ] **TS-STR-047**: Configure test result reporting in CI
  - JUnit XML output for CI test result visualization
  - Coverage report upload (Codecov, Coveralls, or similar)
  - Screenshot/video artifacts from E2E test failures
- [ ] **TS-STR-048**: Configure CI caching for test dependencies
  - Cache bun install (`~/.bun/install/cache`)
  - Cache Playwright browsers if using Playwright
  - Cache coverage data for diff coverage

### 6.3 PR Checks

- [ ] **TS-STR-049**: Configure required PR checks
  - All test stages must pass
  - Coverage threshold must be met
  - No new skipped tests without issue link
  - No increase in test execution time > 20%
- [ ] **TS-STR-050**: Configure PR comment bot for test results
  - Post test summary (pass/fail/skip counts)
  - Post coverage summary (overall + diff coverage)
  - Highlight new uncovered lines
  - Link to full coverage report

#### Design Decisions

> **Q**: Which CI platform will the project use? The choice affects Docker service support, caching, and artifact handling.
> **A**: **GitHub Actions**, per the PRD. It has native Docker service container support (for PostgreSQL), excellent caching (`actions/cache` for `node_modules` and Bun cache), and Codecov integration.

> **Q**: Should CI run tests on every push, only on PRs, or both?
> **A**: Run the full test suite on PRs targeting `main`. Run only unit tests (fast) on every push to feature branches. This balances early feedback with CI resource usage.

> **Q**: Should CI split tests across multiple machines for speed (e.g., Playwright sharding, test file splitting)?
> **A**: Not initially. The target is under 5 minutes for CI. Start with a single runner per test type. Add Playwright sharding (2–4 shards) only if E2E tests exceed the 5-minute budget. Bun's parallel file execution within a single runner should suffice for unit/integration tests.

> **Q**: Should different test types (unit, integration, E2E) run in parallel CI jobs, or sequentially?
> **A**: **Parallel CI jobs.** Three concurrent jobs: (1) unit tests, (2) integration tests (with PostgreSQL service container), (3) E2E tests (with full stack). All three run simultaneously; the PR status check passes only when all three succeed.

> **Q**: How long should CI retain test artifacts (screenshots, videos, coverage reports)?
> **A**: **14 days** for failure artifacts (screenshots, videos). **30 days** for coverage reports (needed for trend analysis). Use GitHub Actions `retention-days` parameter on artifact uploads.

> **Q**: Should test reports be published to a dashboard accessible to the team, or only visible in the CI interface?
> **A**: CI interface only (GitHub Actions summary + Codecov dashboard for coverage). A separate dashboard is overkill at this stage. If the team grows beyond 5 developers, revisit with Allure or similar.

---

## 7. Test Data Management

### 7.1 Test Fixtures

- [ ] **TS-STR-051**: Create fixture directory at `server/src/test/fixtures/`
- [ ] **TS-STR-052**: Create fixture files for each entity
  - `user.fixture.ts` — sample user objects (without password hash)
  - `project.fixture.ts` — sample project objects
  - `agent-session.fixture.ts` — sample session objects
  - `spec.fixture.ts` — sample spec JSON objects (knowledge graph format)
  - `edge.fixture.ts` — sample edge JSON objects
- [ ] **TS-STR-053**: Create fixture loading utility
  - `loadFixture<T>(name: string): T` — loads and returns typed fixture data
  - Support fixture variants: `loadFixture('user', 'admin')`, `loadFixture('user', 'viewer')`

### 7.2 Test Factories

- [ ] **TS-STR-054**: Create factory pattern for dynamic test data
  - Each factory generates valid entity data with sensible defaults
  - All fields can be overridden: `createUser({ email: 'custom@test.com' })`
  - Use sequential counters for uniqueness: `user-1`, `user-2`
- [ ] **TS-STR-055**: Create factory files for each entity
  - `user.factory.ts` — `createUser(overrides?)`, `createUsers(count, overrides?)`
  - `project.factory.ts` — `createProject(overrides?)`
  - `agent-session.factory.ts` — `createAgentSession(overrides?)`
  - `agent-message.factory.ts` — `createAgentMessage(overrides?)`
  - `notification.factory.ts` — `createNotification(overrides?)`
- [ ] **TS-STR-056**: Create database-backed factory functions (for integration tests)
  - `insertUser(overrides?)` — creates user in test database, returns entity
  - `insertProject(overrides?)` — creates project with owner
  - Auto-manage foreign key relationships (create parent records as needed)
  - Track all inserted records for cleanup

### 7.3 Mock Data

- [ ] **TS-STR-057**: Create mock directory at `server/src/test/mocks/`
- [ ] **TS-STR-058**: Create standard mock implementations
  - `mock-database.ts` — in-memory mock for database operations
  - `mock-git.ts` — mock for git operations (commit, push, pull, diff)
  - `mock-claude-code.ts` — mock for Claude Code subprocess
  - `mock-websocket.ts` — mock WebSocket server and client
  - `mock-file-system.ts` — in-memory file system for knowledge graph
- [ ] **TS-STR-059**: Create mock response generators for external services
  - `mockClaudeResponse(content, tokenUsage)` — generates Claude-format response
  - `mockGitDiff(changes)` — generates git diff output
  - `mockGitLog(commits)` — generates git log output

### 7.4 Test Data Cleanup

- [ ] **TS-STR-060**: Create cleanup utilities for integration tests
  - `DatabaseCleaner` class with `clean()` method
  - Support strategies: TRUNCATE (fast), DELETE (slower, respects triggers), TRANSACTION (rollback)
  - Default strategy: TRUNCATE CASCADE for maximum speed
- [ ] **TS-STR-061**: Create `afterEach` / `afterAll` cleanup hooks
  - Auto-register cleanup for database records created during test
  - Auto-remove temp files and directories
  - Auto-close open connections and WebSocket clients
  - Warn if cleanup detects leaked resources

#### Design Decisions

> **Q**: Should fixtures be static JSON files or dynamic TypeScript objects?
> **A**: **Dynamic TypeScript factory functions**, not static JSON. Factories produce type-safe objects, support overrides, and can generate related entities. Static JSON fixtures are brittle and drift from schema changes silently.

> **Q**: Should fixtures represent valid states only, or also include invalid states for negative testing?
> **A**: Both. Factories produce valid objects by default. Invalid states are created by passing explicit overrides to the factory: `createTestUser({ email: '' })`. No separate invalid fixture directory — just use factory overrides in the test itself.

> **Q**: Should fixtures be shared between frontend and backend tests, or should each workspace have independent fixtures?
> **A**: Shared type definitions and factory base logic live in the `@kg/shared` package. Each workspace wraps these with workspace-specific factories: the server factory adds database persistence (`factory.create()` inserts into DB); the frontend factory produces plain objects for store/component tests.

> **Q**: Should the project use an existing factory library (e.g., `fishery`, `factory.ts`) or build a custom factory pattern?
> **A**: Use **`fishery`**. It provides sequences, traits, associations, and `build()` vs `create()` patterns out of the box. Writing a custom factory system is unnecessary reinvention. `fishery` is small, well-typed, and has no heavy dependencies.

> **Q**: Should factories automatically persist to the database (`factory.create()`) or only build in-memory objects (`factory.build()`)?
> **A**: Both. `factory.build()` returns an in-memory object (for unit tests). `factory.create()` persists via Drizzle ORM (for integration tests). `fishery` supports this pattern natively through `onCreate` hooks.

> **Q**: Should each test file get an isolated database transaction (rolled back after the file), or should tests share a database and clean up between files?
> **A**: Default to **transaction rollback per test file** — wrap each file's tests in a transaction and roll back in `afterAll`. For the small number of tests that need real commit behavior, use a separate database or explicit TRUNCATE cleanup. Mark these with `.integration.test.ts` suffix.

> **Q**: Should the test database be created automatically when `bun test` is run, or must the developer manually start Docker first?
> **A**: Semi-automatic. Provide a `docker compose up -d test-db` that developers run once. The test setup script checks for the database connection and prints a clear error if missing. In CI, the PostgreSQL service container starts automatically via the workflow definition. Do not auto-start Docker from the test runner.

---

## 8. Testing Environment Setup

### 8.1 Test Environment Configuration

- [ ] **TS-STR-062**: Create `.env.test` file for test environment variables
  - `DATABASE_NAME=kg_test`
  - `DATABASE_HOST=localhost`
  - `DATABASE_PORT=5432`
  - `JWT_SECRET=test-secret-do-not-use-in-production`
  - `LOG_LEVEL=error` (suppress noise during tests)
  - `NODE_ENV=test`
- [ ] **TS-STR-063**: Create test environment setup preload file
  - Load `.env.test` environment variables
  - Set up DOM environment (for frontend tests)
  - Register custom matchers
  - Configure global test timeout
- [ ] **TS-STR-064**: Create test environment teardown hook
  - Close all database connections
  - Stop any running servers
  - Clean temp directories
  - Report resource leaks

### 8.2 NestJS Test Module Setup

- [ ] **TS-STR-065**: Create `TestModuleBuilder` utility for NestJS tests
  - Wraps `Test.createTestingModule()` with common configuration
  - Pre-configures mock database module
  - Pre-configures mock auth module (auto-authenticates)
  - Supports selective real module injection
- [ ] **TS-STR-066**: Create reusable test module configurations
  - `createUnitTestModule(providers)` — minimal module with only specified providers
  - `createIntegrationTestModule(modules)` — module with real database
  - `createApiTestModule()` — full module for API testing with supertest
- [ ] **TS-STR-067**: Create global test setup for NestJS
  - `server/src/test/setup.ts` — runs before all tests
  - Initialize test database if running integration tests
  - Create test fixtures
  - Set up authentication tokens for test users

### 8.3 Docker Test Environment

- [ ] **TS-STR-068**: Create `docker-compose.test.yml` for test infrastructure
  - PostgreSQL test instance (ephemeral, no volume)
  - Isolated port (5433 to avoid conflict with dev)
  - Auto-cleanup on container stop
- [ ] **TS-STR-069**: Create test environment startup script
  - `scripts/test-env-up.sh` — starts test Docker services
  - Wait for PostgreSQL to be ready
  - Run migrations on test database
  - Print connection details
- [ ] **TS-STR-070**: Create test environment shutdown script
  - `scripts/test-env-down.sh` — stops and removes test containers
  - Remove test volumes
  - Print cleanup summary

---

## 9. Snapshot Testing Strategy

### 9.1 Component Snapshot Tests

- [ ] **TS-STR-071**: Define snapshot testing policy for React components
  - Use snapshots for leaf/presentational components only
  - Do NOT use snapshots for components with complex state/logic
  - Snapshots capture rendered output, not implementation details
  - Review snapshot changes carefully in PRs
- [ ] **TS-STR-072**: Configure snapshot storage
  - Snapshots stored in `__snapshots__/` adjacent to test file
  - Snapshot files committed to version control
  - Add snapshot update command: `bun test --update-snapshots`
- [ ] **TS-STR-073**: Create snapshot update policy
  - Intentional changes: update snapshot and explain in PR description
  - Unintentional changes: investigate and fix (likely a regression)
  - Bulk snapshot updates require team review

### 9.2 API Response Snapshots

- [ ] **TS-STR-074**: Define API response snapshot policy
  - Snapshot API response shapes (field names, types) not values
  - Use snapshot matchers with dynamic field exclusion (timestamps, IDs)
  - Useful for detecting unintentional API contract changes
- [ ] **TS-STR-075**: Create snapshot sanitizers for dynamic fields
  - Replace UUIDs with `"[UUID]"`
  - Replace timestamps with `"[TIMESTAMP]"`
  - Replace tokens with `"[TOKEN]"`
  - Preserve structure while removing non-deterministic values

---

## 10. Performance Testing

### 10.1 Performance Test Infrastructure

- [ ] **TS-STR-076**: Set up performance testing approach
  - Define tool: k6, Artillery, or custom bun scripts
  - Define test environments: local (baseline), staging (realistic)
  - Define metrics: response time (p50, p95, p99), throughput, error rate
- [ ] **TS-STR-077**: Create performance test directory: `e2e/performance/`
- [ ] **TS-STR-078**: Create baseline performance benchmarks
  - API response time targets per endpoint category:
    - Auth endpoints (login, register): < 200ms p95
    - Read endpoints (get spec, list projects): < 100ms p95
    - Write endpoints (create spec, update): < 200ms p95
    - Search/RAG endpoints: < 500ms p95
    - Agent endpoints (start session): < 1000ms p95

### 10.2 Load Testing

- [ ] **TS-STR-079**: Create load test scenarios
  - Concurrent user simulation: 10, 50, 100 users
  - Mixed workload: 70% reads, 20% writes, 10% agent operations
  - Sustained load: 15-minute test duration
  - Spike test: sudden 5x traffic increase
- [ ] **TS-STR-080**: Create load test scripts for critical paths
  - User login flow
  - Spec CRUD operations
  - Knowledge graph traversal queries
  - Agent session lifecycle
  - Notification polling

### 10.3 Database Performance Tests

- [ ] **TS-STR-081**: Create database query performance benchmarks
  - Measure query execution time with EXPLAIN ANALYZE
  - Test with realistic data volumes (10K users, 100K specs, 1M audit logs)
  - Verify all critical queries use indexes
  - Detect N+1 query patterns
- [ ] **TS-STR-082**: Create data volume simulation scripts
  - Generate realistic test data at scale
  - 10K users, 1K projects, 100K specs, 500K edges
  - 1M agent messages, 5M audit log entries
  - Measure query performance at each scale

#### Design Decisions

> **Q**: Should performance tests run in CI, or only on-demand before releases?
> **A**: On-demand only, not in CI. CI environments have variable performance characteristics that make timing-based assertions unreliable. Run performance benchmarks manually before releases and when investigating regressions.

> **Q**: What is the acceptable baseline for API response times? Should baselines be established from initial implementation?
> **A**: Establish baselines from initial implementation. Targets: simple CRUD endpoints < 100ms, complex queries (with joins/aggregation) < 300ms, Knowledge Graph traversal < 500ms. These are soft guidelines tracked manually, not CI-enforced assertions.

> **Q**: Should the project test frontend performance (Lighthouse, Core Web Vitals) in addition to backend performance?
> **A**: Defer until post-MVP. The app is a desktop-first professional tool, not a public-facing website. Core Web Vitals matter less here than functional correctness. Add Lighthouse CI once the feature set stabilizes if perceived performance becomes a concern.

---

## 11. Accessibility Testing

### 11.1 Automated Accessibility Testing

- [ ] **TS-STR-083**: Install and configure axe-core for accessibility testing
  - `@axe-core/react` for component-level testing
  - `axe-playwright` or `@axe-core/playwright` for E2E testing
  - Configure rule set: WCAG 2.1 AA compliance
- [ ] **TS-STR-084**: Create accessibility test helpers
  - `expectAccessible(container)` — runs axe-core and asserts no violations
  - `expectFocusOrder(container, expectedOrder)` — validates tab order
  - `expectAriaLabels(container, elements)` — validates ARIA attributes
- [ ] **TS-STR-085**: Define accessibility testing coverage requirements
  - Every interactive component must pass axe-core scan
  - Every form must have proper label associations
  - Every image must have alt text
  - Every modal must trap focus
  - Keyboard navigation must work for all interactive elements

### 11.2 Manual Accessibility Checklist

- [ ] **TS-STR-086**: Create manual accessibility testing checklist
  - Screen reader testing (VoiceOver on macOS, NVDA on Windows)
  - Keyboard-only navigation of all flows
  - High contrast mode verification
  - 200% zoom layout verification
  - Color contrast ratio verification (4.5:1 minimum for text)
- [ ] **TS-STR-087**: Schedule periodic manual accessibility reviews
  - Before each major release
  - After significant UI changes
  - Document findings and track remediation

#### Design Decisions

> **Q**: Should accessibility tests run on every PR, or only on PRs that change UI components?
> **A**: Only on PRs that change files under `client/src/components/` or `client/src/pages/`. Use GitHub Actions path filtering to conditionally run the accessibility job.

> **Q**: What WCAG level should the project target?
> **A**: **WCAG 2.1 AA.** This is the industry standard for professional tools and covers the most impactful accessibility requirements without overly constraining design decisions.

> **Q**: Should accessibility testing include keyboard navigation testing in E2E tests, or only axe-core automated scans?
> **A**: Primarily axe-core automated scans in component tests. Add keyboard navigation E2E tests for the 5 most critical flows (login, spec creation, graph navigation, spec editing, search). Full keyboard navigation coverage is deferred.

---

## 12. Security Testing

### 12.1 Security Test Suite

- [ ] **TS-STR-088**: Create security-focused test suite
  - Authentication bypass attempts
  - Authorization escalation attempts (access others' data)
  - SQL injection via ORM (verify parameterized queries)
  - XSS via user input fields
  - CSRF token validation
  - JWT manipulation (expired, tampered, missing)
- [ ] **TS-STR-089**: Create security test helpers
  - `expectForbidden(request)` — asserts 403 response
  - `expectUnauthorized(request)` — asserts 401 response
  - `asDifferentUser(request, user)` — executes request as another user
  - `withExpiredToken(request)` — sets expired JWT
  - `withTamperedToken(request)` — modifies JWT payload without re-signing

### 12.2 Dependency Security

- [ ] **TS-STR-090**: Configure dependency audit in CI
  - `bun audit` or equivalent dependency vulnerability check
  - Block merge if critical/high vulnerabilities found
  - Weekly scheduled audit of all dependencies
- [ ] **TS-STR-091**: Create allowed vulnerability exceptions list
  - Document each exception with rationale and remediation date
  - Review exceptions monthly

---

## 13. Cross-Cutting Test Utilities

### 13.1 Shared Test Utilities

- [ ] **TS-STR-092**: Create `shared/src/test-utils/` package
  - Available to both client and server test suites
  - Contains type-safe assertion helpers
  - Contains common data generators
- [ ] **TS-STR-093**: Create `waitFor` utility for async assertions
  - Poll a condition until it's true or timeout
  - Configurable interval and timeout
  - Descriptive timeout error message
- [ ] **TS-STR-094**: Create `createMockLogger` utility
  - Returns a logger that captures log calls
  - `mockLogger.getMessages()` — returns all logged messages
  - `mockLogger.expectLogged('error', /pattern/)` — asserts a log entry
- [ ] **TS-STR-095**: Create time manipulation utilities
  - `advanceTime(ms)` — advance fake timers
  - `freezeTime(date)` — freeze `Date.now()` to specific time
  - `restoreTime()` — restore real timers
  - Compatible with bun test timer mocking

### 13.2 Error Testing Utilities

- [ ] **TS-STR-096**: Create error assertion helpers
  - `expectToThrow(fn, ErrorClass, message?)` — typed error assertion
  - `expectToReject(promise, ErrorClass, message?)` — async error assertion
  - `expectValidationErrors(response, fields[])` — check multiple validation errors
- [ ] **TS-STR-097**: Create error scenario generators
  - `simulateNetworkError()` — mock fetch to throw network error
  - `simulateTimeout(ms)` — mock fetch to timeout after specified duration
  - `simulateDatabaseError(type)` — mock database to throw specific error
  - `simulateAuthError()` — mock auth to return 401

### 13.3 WebSocket Test Utilities

- [ ] **TS-STR-098**: Create WebSocket testing helpers
  - `createTestWebSocket(url)` — creates WS client with message capture
  - `ws.waitForMessage(type)` — waits for specific message type
  - `ws.sendAndWaitForResponse(message)` — send and capture response
  - `ws.getMessages()` — returns all received messages
- [ ] **TS-STR-099**: Create WebSocket mock server
  - In-memory WebSocket server for unit tests
  - Configurable responses per message type
  - Record received messages for assertions

### 13.4 File System Test Utilities

- [ ] **TS-STR-100**: Create temp directory management for tests
  - `createTempDir()` — creates isolated temp directory
  - `cleanupTempDir(path)` — removes temp directory and all contents
  - Auto-register for cleanup in afterEach
- [ ] **TS-STR-101**: Create knowledge graph test file generators
  - `createTestSpec(dir, overrides?)` — writes spec JSON files to temp dir
  - `createTestEdge(dir, overrides?)` — writes edge JSON file to temp dir
  - `createTestKnowledgeGraph(dir, specs, edges)` — creates complete graph structure

---

## 14. Test Documentation

### 14.1 Testing Guide

- [ ] **TS-STR-102**: Create `docs/testing/GUIDE.md` — developer testing guide
  - How to run tests (unit, integration, E2E)
  - How to write tests (examples for each type)
  - How to use factories and fixtures
  - How to mock dependencies
  - How to debug failing tests
- [ ] **TS-STR-103**: Create `docs/testing/PATTERNS.md` — testing patterns reference
  - AAA pattern with example
  - Mock patterns for NestJS services
  - Database testing patterns (setup/teardown)
  - WebSocket testing patterns
  - Agent mock patterns
- [ ] **TS-STR-104**: Create `docs/testing/TROUBLESHOOTING.md`
  - Common test failures and their causes
  - Database connection issues in tests
  - Flaky test identification and remediation
  - Test isolation issues

### 14.2 Test Reporting

- [ ] **TS-STR-105**: Create test report generation
  - HTML test report with pass/fail/skip breakdown
  - Test execution time per test and per suite
  - Trend chart of test counts over time
- [ ] **TS-STR-106**: Create coverage report dashboard
  - Per-module coverage breakdown
  - Coverage trend over time
  - Uncovered files list with line counts
- [ ] **TS-STR-107**: Create test health metrics
  - Average test execution time (should not increase over time)
  - Flaky test rate (should be near zero)
  - Time-to-fix for broken tests
  - Test-to-code ratio per module

---

## Additional Design Decisions

> **Q**: How should test failures in CI be triaged? Should there be a rotating "test sheriff" responsible for investigating failures?
> **A**: The PR author owns their failing tests. For failures on `main` (post-merge breakage), the person who merged the breaking change investigates. No formal sheriff rotation until the team exceeds 5 developers. Flaky test failures should be flagged as issues and addressed within one sprint.

> **Q**: Should there be a policy for test execution time limits? If the full test suite exceeds a time budget, what actions should be taken?
> **A**: Yes. Target: **under 5 minutes** total CI time (all parallel jobs). If any single job exceeds 5 minutes, it triggers a task to optimize. Actions: identify slowest tests, refactor to reduce database calls, add Playwright sharding, or split into more parallel jobs. Unit tests alone should stay under 1 minute.

> **Q**: How should deprecated tests be handled? Archive, delete, or convert to documentation?
> **A**: **Delete.** Tests that no longer apply to the codebase are dead weight. If the test documents important historical behavior, extract the knowledge into a comment on the relevant code or an ADR before deleting the test. Never archive tests — archives rot.

---

## Summary

### Task Count by Section

| Section | Tasks |
|---------|-------|
| 1. Testing Philosophy | 5 (TS-STR-001 through TS-STR-005) |
| 2. Test Pyramid & Layer Definitions | 8 (TS-STR-006 through TS-STR-013) |
| 3. Tooling Selection | 15 (TS-STR-014 through TS-STR-028) |
| 4. Test Organization & Naming | 7 (TS-STR-029 through TS-STR-035) |
| 5. Code Coverage Configuration | 7 (TS-STR-036 through TS-STR-042) |
| 6. CI Integration | 8 (TS-STR-043 through TS-STR-050) |
| 7. Test Data Management | 11 (TS-STR-051 through TS-STR-061) |
| 8. Testing Environment Setup | 9 (TS-STR-062 through TS-STR-070) |
| 9. Snapshot Testing Strategy | 5 (TS-STR-071 through TS-STR-075) |
| 10. Performance Testing | 7 (TS-STR-076 through TS-STR-082) |
| 11. Accessibility Testing | 5 (TS-STR-083 through TS-STR-087) |
| 12. Security Testing | 4 (TS-STR-088 through TS-STR-091) |
| 13. Cross-Cutting Test Utilities | 10 (TS-STR-092 through TS-STR-101) |
| 14. Test Documentation | 6 (TS-STR-102 through TS-STR-107) |
| **TOTAL** | **107** |

### Dependencies (What This Plan Enables)

Completion of this plan unblocks:
- `08-TESTING/02-FRONTEND-TESTING-PLAN.md` — inherits tooling, conventions, coverage targets
- `08-TESTING/03-SERVER-TESTING-PLAN.md` — inherits tooling, test database setup, mock patterns
- `08-TESTING/04-AGENT-TESTING-PLAN.md` — inherits tooling, mock patterns, CI integration

### Definition of Done

This plan is complete when:
- [ ] `bun test` runs successfully from root, client, and server workspaces
- [ ] Test file discovery finds all `*.test.ts` and `*.test.tsx` files
- [ ] DOM environment works for React component tests
- [ ] E2E framework is configured and a sample test passes
- [ ] Coverage reporting generates lcov and HTML reports
- [ ] CI pipeline runs all test stages in order
- [ ] Test factories and fixtures are available for all core entities
- [ ] Test database setup and teardown work reliably
- [ ] Custom assertion matchers are registered and documented
- [ ] Testing guide documentation is written and reviewed
