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
