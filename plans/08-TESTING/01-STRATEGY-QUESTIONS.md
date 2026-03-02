# 08-TESTING / 01 — STRATEGY: Open Questions

> **Purpose**: Unresolved questions about the overall testing strategy including
> tool selection, test organization, coverage policies, CI integration, and
> cross-cutting testing decisions. Answers affect all other testing plans.

---

## 1. Test Runner & Tooling

### 1.1 bun test Compatibility

- **Q**: Has `bun test` been verified to work with all project dependencies?
  Specifically: NestJS test utilities (`@nestjs/testing`), `@testing-library/react`,
  and `supertest`? Are there known incompatibilities?

**A:** `bun test` is the designated runner. NestJS `@nestjs/testing` works under Bun since Bun supports `reflect-metadata` and decorator emit. `@testing-library/react` works when paired with `happy-dom`. `supertest` works with Bun's HTTP compatibility. If an edge-case incompatibility surfaces, isolate it behind a thin adapter rather than switching runners. Verify compatibility in a bootstrap PR before writing the first real tests.

- **Q**: Does `bun test` support all required features: `beforeAll`/`afterAll`,
  `beforeEach`/`afterEach`, `describe.skip`, `test.only`, `test.todo`, mock
  module replacement, timer mocking, snapshot testing?

**A:** Yes. Bun test supports the full lifecycle hooks (`beforeAll`, `afterAll`, `beforeEach`, `afterEach`), `describe.skip`, `test.only`, `test.todo`, `bun:test` mock/spyOn for function mocking, `mock.module()` for module replacement, `useFakeTimers()` for timer mocking, and `toMatchSnapshot()` for snapshots. This covers all required features.

- **Q**: How does `bun test` handle TypeScript compilation? Does it use its
  built-in transpiler, or does it need a separate build step? Are path aliases
  (`@kg/shared`) resolved correctly?

**A:** Bun test uses its built-in TypeScript transpiler — no separate build step. Path aliases are resolved via `tsconfig.json` `paths` and Bun reads these automatically. Configure workspace-level `tsconfig.json` paths for `@kg/shared` and similar aliases; Bun resolves them natively.

- **Q**: Does `bun test` support parallel test execution across files? If so,
  how does this interact with shared test database state?

**A:** Yes, Bun runs test files in parallel by default. For unit tests this is fine. For database integration tests, each test file must use its own transaction that rolls back at the end, ensuring isolation despite parallel execution. If parallel DB access causes contention, use `--concurrency 1` for integration-tagged test runs only.

### 1.2 DOM Environment

- **Q**: Should the project use `happy-dom` (faster, lighter) or `jsdom`
  (more complete DOM implementation) for component tests? Are there specific
  DOM APIs used by the project (e.g., `IntersectionObserver`, `ResizeObserver`,
  `Web Animations API`) that require jsdom?

**A:** Use `happy-dom`. It is significantly faster and covers the DOM APIs needed for React component testing. For missing APIs like `IntersectionObserver` or `ResizeObserver`, add lightweight polyfill stubs in the test setup file. The graph tree view (DOM-based with @tanstack/virtual) is testable via standard DOM queries — no Canvas mocking needed. Only escalate to `jsdom` if a specific, critical API gap is discovered.

- **Q**: Does the chosen DOM environment work with `@testing-library/react`
  under Bun? The testing-library ecosystem expects certain globals (`document`,
  `window`, `navigator`).

**A:** Yes. `happy-dom` provides `document`, `window`, and `navigator` globals. Configure it in `bunfig.toml` with `[test] preload = ["./test/setup.ts"]` where the setup file initializes `happy-dom` and any required polyfills. This is a well-trodden path.

### 1.3 E2E Framework

- **Q**: Should the project use Playwright (better cross-browser, auto-wait)
  or Cypress (better DX, time-travel)? Does the team have existing experience
  with either?

**A:** Playwright. The PRD specifies Playwright for E2E/browser tests. Its auto-wait, cross-browser support, and native iframe handling (critical for generative UI testing) make it the right choice. Playwright also supports test sharding for CI parallelism.

- **Q**: Should E2E tests run in headed mode during development for debugging?
  If so, which browsers should be supported for headed mode?

**A:** Yes, E2E tests should support headed mode for local debugging via `--headed` flag. Support Chromium only in headed mode for development; CI runs headless Chromium. Cross-browser testing (Firefox, WebKit) is deferred to a nightly CI job once the suite stabilizes.

- **Q**: Should E2E tests generate videos and screenshots on every run, or
  only on failure? Videos are useful for debugging but consume storage.

**A:** Screenshots and videos on failure only. Configure Playwright with `screenshot: 'only-on-failure'` and `video: 'retain-on-failure'`. This keeps CI artifacts small while providing full debugging context when something breaks.

---

## 2. Test Organization

### 2.1 Co-location vs Centralized

- **Q**: Should tests be co-located with source files (e.g., `auth.service.test.ts`
  next to `auth.service.ts`) or centralized in a `__tests__/` directory per
  module? Co-location makes discovery easier; centralized keeps source
  directories cleaner.

**A:** Co-located. Place `auth.service.test.ts` next to `auth.service.ts`. This matches the PRD directive for colocated test files. It makes it obvious when a file lacks tests and keeps related code together. Use `.test.ts` suffix as the naming convention.

- **Q**: Should E2E tests be in a top-level `e2e/` directory or inside each
  workspace (`client/e2e/`, `server/e2e/`)?

**A:** Top-level `e2e/` directory at the repository root. E2E tests span both frontend and server, so they don't belong in a single workspace. Structure as `e2e/specs/`, `e2e/fixtures/`, `e2e/helpers/`. Playwright config lives at `e2e/playwright.config.ts`.

### 2.2 Integration Test Boundaries

- **Q**: What exactly constitutes an "integration test" vs a "unit test" in
  this project? If a NestJS service is tested with a real database but mocked
  HTTP clients, is that unit or integration?

**A:** A **unit test** exercises a single class/function with all external dependencies mocked (database, HTTP, file system, subprocess). An **integration test** exercises a component with at least one real external dependency (real database, real file system, real git repo). A NestJS service tested with a real database but mocked HTTP clients is an integration test. The distinguishing factor is whether a real external resource is involved.

- **Q**: Should integration tests use the same `bun test` runner as unit tests,
  or a separate command/configuration? Separate commands allow different
  timeouts and parallelism settings.

**A:** Same `bun test` runner, but separate scripts with different configurations. Use `bun test --filter '*.test.ts' --exclude '*.integration.test.ts'` for unit tests and `bun test --filter '*.integration.test.ts' --timeout 30000` for integration tests. Package.json scripts: `test:unit`, `test:integration`, `test` (runs both).

### 2.3 Test File Naming

- **Q**: Should integration tests have a distinct file suffix
  (`.integration.test.ts`) or be in a separate directory (`__integration__/`)?
  A distinct suffix allows easy filtering with `bun test --filter`.

**A:** Distinct file suffix: `.integration.test.ts`. This enables easy filtering with `bun test --filter` and keeps integration tests co-located near the code they exercise. No separate directory needed.

- **Q**: Should E2E test files use `.e2e.test.ts` suffix or `.spec.ts` suffix
  (common Playwright convention)?

**A:** Use `.spec.ts` suffix, following the standard Playwright convention. E2E tests are already isolated in the `e2e/` directory, so the suffix only needs to be recognizable to the Playwright runner.

---

## 3. Coverage Policy

### 3.1 Coverage Targets

- **Q**: Are the proposed coverage targets (80% global, 90% new code) too
  aggressive or too lenient for the team's velocity? Should targets start
  lower and increase over time?

**A:** Start at **70% global line coverage** and **80% for new code** in PRs. Increase to 80%/90% once the codebase stabilizes (after the first 3 months). Starting lower avoids forcing low-value tests early on while still establishing the habit.

- **Q**: Should coverage targets be enforced as hard blocks (merge blocked)
  or soft warnings? Hard blocks can slow velocity; soft warnings can be
  ignored.

**A:** **Soft warnings** for overall coverage; **hard block** only if a PR drops overall coverage by more than 2 percentage points. This prevents erosion without blocking individual PRs that touch hard-to-test code paths. New code coverage (80%) is a hard block from day one.

- **Q**: Should the project track branch coverage, line coverage, or both?
  Branch coverage is more meaningful but harder to achieve.

**A:** Track both, enforce on **line coverage**. Report branch coverage as informational. Branch coverage targets are aspirational (60%+), not blocking. Line coverage is the gating metric.

### 3.2 Coverage Tooling

- **Q**: Does `bun test --coverage` produce accurate coverage data for the
  project's TypeScript code? Are there known issues with coverage of
  decorators (NestJS), JSX (React), or dynamic imports?

**A:** `bun test --coverage` uses V8 coverage under the hood and produces accurate line/function coverage for TypeScript and JSX. Decorator coverage may show some noise from generated metadata — exclude decorator boilerplate lines via coverage ignore comments where necessary. Validate accuracy in the bootstrap PR by spot-checking a few files.

- **Q**: Should the project use a third-party coverage service (Codecov,
  Coveralls) for historical tracking and PR comments, or is local reporting
  sufficient?

**A:** Use **Codecov** integrated with GitHub Actions. It provides PR-level coverage diffs, historical tracking, and merge-blocking via status checks. The free tier is sufficient for a single private repo. Configure it to post PR comments showing coverage changes.

---

## 4. CI Integration

### 4.1 CI Platform

- **Q**: Which CI platform will the project use? GitHub Actions, GitLab CI,
  CircleCI, Jenkins? The choice affects Docker service support, caching, and
  artifact handling.

**A:** **GitHub Actions**, per the PRD. It has native Docker service container support (for PostgreSQL), excellent caching (`actions/cache` for `node_modules` and Bun cache), and Codecov integration.

- **Q**: Should CI run tests on every push, only on PRs, or both? Running on
  every push catches issues early but consumes CI resources.

**A:** Run the full test suite on PRs targeting `main`. Run only unit tests (fast) on every push to feature branches. This balances early feedback with CI resource usage.

### 4.2 Test Parallelism in CI

- **Q**: Should CI split tests across multiple machines for speed (e.g.,
  Playwright sharding, test file splitting)? This is beneficial for large
  test suites but adds complexity.

**A:** Not initially. The target is under 5 minutes for CI. Start with a single runner per test type. Add Playwright sharding (2–4 shards) only if E2E tests exceed the 5-minute budget. Bun's parallel file execution within a single runner should suffice for unit/integration tests.

- **Q**: Should different test types (unit, integration, E2E) run in parallel
  CI jobs, or sequentially? Parallel is faster but uses more CI resources.

**A:** **Parallel CI jobs.** Three concurrent jobs: (1) unit tests, (2) integration tests (with PostgreSQL service container), (3) E2E tests (with full stack). All three run simultaneously; the PR status check passes only when all three succeed. This maximizes speed within the 5-minute budget.

### 4.3 Test Artifacts

- **Q**: How long should CI retain test artifacts (screenshots, videos,
  coverage reports)? 7 days? 30 days? This affects CI storage costs.

**A:** **14 days** for failure artifacts (screenshots, videos). **30 days** for coverage reports (needed for trend analysis). Use GitHub Actions `retention-days` parameter on artifact uploads.

- **Q**: Should test reports be published to a dashboard accessible to the
  team, or only visible in the CI interface?

**A:** CI interface only (GitHub Actions summary + Codecov dashboard for coverage). A separate dashboard is overkill at this stage. If the team grows beyond 5 developers, revisit with Allure or similar.

---

## 5. Test Data Management

### 5.1 Fixture Strategy

- **Q**: Should fixtures be static JSON files or dynamic TypeScript objects?
  Static JSON is more portable but less flexible; TypeScript objects can
  use functions and computed values.

**A:** **Dynamic TypeScript factory functions**, not static JSON. Factories produce type-safe objects, support overrides, and can generate related entities. Static JSON fixtures are brittle and drift from schema changes silently.

- **Q**: Should fixtures represent valid states only, or also include invalid
  states for negative testing? If both, how should they be organized?

**A:** Both. Factories produce valid objects by default. Invalid states are created by passing explicit overrides to the factory: `createTestUser({ email: '' })`. No separate invalid fixture directory — just use factory overrides in the test itself. This keeps the intent of the negative test visible in the test code.

- **Q**: Should fixtures be shared between frontend and backend tests, or
  should each workspace have independent fixtures?

**A:** Shared type definitions and factory base logic live in the `@kg/shared` package. Each workspace wraps these with workspace-specific factories: the server factory adds database persistence (`factory.create()` inserts into DB); the frontend factory produces plain objects for store/component tests. This avoids duplication while respecting workspace boundaries.

### 5.2 Factory Pattern

- **Q**: Should the project use an existing factory library (e.g., `fishery`,
  `factory.ts`) or build a custom factory pattern? Existing libraries provide
  sequences, traits, and associations out of the box.

**A:** Use **`fishery`**. It provides sequences, traits, associations, and `build()` vs `create()` patterns out of the box. Writing a custom factory system is unnecessary reinvention. `fishery` is small, well-typed, and has no heavy dependencies.

- **Q**: Should factories automatically persist to the database
  (`factory.create()`) or only build in-memory objects (`factory.build()`)?
  Both patterns are useful; should there be explicit methods for each?

**A:** Both. `factory.build()` returns an in-memory object (for unit tests). `factory.create()` persists via Drizzle ORM (for integration tests). `fishery` supports this pattern natively through `onCreate` hooks. Both methods are always available; tests choose which to use based on their scope.

### 5.3 Test Database Management

- **Q**: Should each test file get an isolated database transaction (rolled
  back after the file), or should tests share a database and clean up
  between files? Transaction rollback is faster but limits what can be tested
  (e.g., testing commit behavior requires actual commits).

**A:** Default to **transaction rollback per test file** — wrap each file's tests in a transaction and roll back in `afterAll`. For the small number of tests that need real commit behavior (e.g., testing conflict detection, transaction isolation), use a separate database or explicit TRUNCATE cleanup. Mark these with `.integration.test.ts` suffix.

- **Q**: Should the test database be created automatically when `bun test` is
  run, or must the developer manually start Docker first? Automatic is more
  convenient but adds startup time.

**A:** Semi-automatic. Provide a `docker compose up -d test-db` that developers run once. The test setup script (`test/setup.ts`) checks for the database connection and prints a clear error message if it's missing, with the exact command to run. In CI, the PostgreSQL service container starts automatically via the workflow definition. Do not auto-start Docker from the test runner — it's slow, fragile, and surprising.

---

## 6. Mocking Strategy

### 6.1 Mock Boundaries

- **Q**: Should the project mock at module boundaries (mock entire modules)
  or at function boundaries (mock individual functions)? Module-level mocking
  is simpler but less precise.

**A:** **Function/method boundaries** for unit tests (spy on specific methods). **Module boundaries** only when mocking external packages (e.g., `simple-git`, `child_process`). This gives precision where it matters while keeping external dependency mocking simple.

- **Q**: For NestJS tests, should mocks be provided through the DI container
  (replacing providers) or through direct function mocking? DI-based mocking
  is more idiomatic for NestJS.

**A:** **DI container replacement** for NestJS tests. Use `Test.createTestingModule().overrideProvider(ServiceX).useValue(mockServiceX)`. This is idiomatic, leverages NestJS's design, and ensures the service under test receives mocks through the same injection path as production. Reserve direct function spying for non-DI utility functions.

- **Q**: Should the project maintain a centralized mock registry (all mocks in
  one place) or distribute mocks alongside their real implementations?

**A:** Distribute mocks alongside their implementations. Place `auth.service.mock.ts` next to `auth.service.ts`. Shared mock utilities (mock database connection, mock WebSocket client) live in `test/mocks/`. No centralized registry — it becomes a dumping ground that nobody maintains.

### 6.2 External Service Mocking

- **Q**: Should the Claude Code wrapper be mocked at the subprocess level
  (mock `child_process.spawn`) or at the wrapper interface level (mock the
  wrapper class)? Subprocess-level is more realistic; interface-level is simpler.

**A:** Both levels, used in different contexts. **Unit tests** mock the wrapper interface (replace `ClaudeCodeWrapper` via DI). **Integration tests** mock at the subprocess level (intercept `spawn()` to return scripted stdout). This matches the PRD directive of "mocked Claude Code subprocess" for agent testing while keeping unit tests fast.

- **Q**: Should git operations in tests use a real git repository (temp dir
  with `git init`) or a fully mocked git? Real git ensures compatibility but
  is slower and flakier.

**A:** **Real git in temp directories** for integration tests of the git layer (using `simple-git` against actual repos). **Mocked `simple-git`** for unit tests of services that use git as a dependency. The git layer is critical enough that integration tests with real repos are worth the cost. Use `os.tmpdir()` + unique directory per test file; clean up in `afterAll`.

- **Q**: Should the project use a mock server (e.g., MSW — Mock Service Worker)
  for HTTP mocking in frontend tests, or mock `fetch` directly?

**A:** Use **MSW (Mock Service Worker)**. It intercepts at the network level, works with any HTTP client, and can be reused in development mode for API mocking. Direct `fetch` mocking is fragile and doesn't catch issues with request construction. MSW handlers are defined per test or in shared handler files.

---

## 7. Performance & Accessibility Testing

### 7.1 Performance Testing Scope

- **Q**: Should performance tests run in CI, or only on-demand before releases?
  CI performance tests add value but are slow and can be flaky due to
  environment differences.

**A:** On-demand only, not in CI. CI environments have variable performance characteristics that make timing-based assertions unreliable. Run performance benchmarks manually before releases and when investigating regressions. Track results in a shared document or dashboard.

- **Q**: What is the acceptable baseline for API response times? Should
  baselines be established from initial implementation and tracked for
  regression?

**A:** Establish baselines from initial implementation. Targets: simple CRUD endpoints < 100ms, complex queries (with joins/aggregation) < 300ms, Knowledge Graph traversal < 500ms. These are soft guidelines tracked manually, not CI-enforced assertions.

- **Q**: Should the project test frontend performance (Lighthouse, Core Web
  Vitals) in addition to backend performance?

**A:** Defer until post-MVP. The app is a desktop-first professional tool, not a public-facing website. Core Web Vitals matter less here than functional correctness. Add Lighthouse CI once the feature set stabilizes if perceived performance becomes a concern.

### 7.2 Accessibility Testing Scope

- **Q**: Should accessibility tests run on every PR, or only on PRs that
  change UI components? Running on every PR catches regressions but adds
  CI time.

**A:** Only on PRs that change files under `client/src/components/` or `client/src/pages/`. Use GitHub Actions path filtering to conditionally run the accessibility job. This avoids wasting CI time on server-only changes.

- **Q**: What WCAG level should the project target? AA is standard; AAA is
  more stringent and may conflict with some design choices.

**A:** **WCAG 2.1 AA.** This is the industry standard for professional tools and covers the most impactful accessibility requirements without overly constraining design decisions.

- **Q**: Should accessibility testing include keyboard navigation testing
  in E2E tests, or only axe-core automated scans?

**A:** Primarily axe-core automated scans in component tests. Add keyboard navigation E2E tests for the 5 most critical flows (login, spec creation, graph navigation, spec editing, search). Full keyboard navigation coverage is deferred.

---

## 8. Test Maintenance

- **Q**: How should test failures in CI be triaged? Should there be a
  rotating "test sheriff" responsible for investigating failures?

**A:** The PR author owns their failing tests. For failures on `main` (post-merge breakage), the person who merged the breaking change investigates. No formal sheriff rotation until the team exceeds 5 developers. Flaky test failures that are not author-caused should be flagged as issues and addressed within one sprint.

- **Q**: Should there be a policy for test execution time limits? If the
  full test suite exceeds a time budget (e.g., 10 minutes), what actions
  should be taken?

**A:** Yes. Target: **under 5 minutes** total CI time (all parallel jobs). If any single job exceeds 5 minutes, it triggers a task to optimize. Actions: identify slowest tests, refactor to reduce database calls, add Playwright sharding, or split into more parallel jobs. Unit tests alone should stay under 1 minute.

- **Q**: How should deprecated tests be handled? Archive, delete, or convert
  to documentation?

**A:** **Delete.** Tests that no longer apply to the codebase are dead weight. If the test documents important historical behavior, extract the knowledge into a comment on the relevant code or an ADR before deleting the test. Never archive tests — archives rot.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
| ---- | -------- | -------- | --------- |
| —    | —        | —        | —         |
