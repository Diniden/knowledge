# 08-TESTING / 02 — FRONTEND TESTING: Open Questions

> **Purpose**: Unresolved questions about frontend testing including component
> testing approach, DOM environment, mocking boundaries, E2E scope, visual
> regression tooling, and testing of framework-specific features. Answers may
> change tasks in the plan.

---

## 1. Component Testing Approach

### 1.1 Testing Library vs Direct DOM
- **Q**: Should the project exclusively use `@testing-library/react` for
  component tests, or are there cases where direct DOM manipulation
  (`container.querySelector`) is acceptable? Testing Library encourages
  accessible queries (`getByRole`, `getByLabelText`) but some complex
  components (canvas, graph) may not have accessible handles.

**A:** Default to `@testing-library/react` with accessible queries (`getByRole`, `getByLabelText`, `getByText`). Allow `container.querySelector` only for components that genuinely lack accessible handles — though the DOM-based graph tree view (using @tanstack/virtual) is fully queryable via standard accessible queries. Document the exception in a comment when used. The goal is > 95% Testing Library queries across the test suite.

- **Q**: For the graph visualization component (which likely uses Canvas2D or
  WebGL), how should rendering be tested? Canvas content is not queryable via
  DOM — should tests verify the data model only, or use screenshot comparison?

**A:** The graph tree view is DOM-based (rendered with React + @tanstack/virtual), so standard Testing Library queries work. Test the **data model, layout computations, and interaction handlers** in unit tests (verify that clicking triggers the correct callbacks, that BFS layout produces correct depth-level rows, that node selection and expansion set the right state). Use **Playwright screenshot comparison** in E2E for visual verification of the rendered tree layout. No Canvas API mocking is needed since the tree view is entirely DOM-based.

- **Q**: Should component tests verify CSS class names (BEM classes), or only
  behavior and content? Testing class names is brittle but ensures styling
  contracts.

**A:** Do **not** assert on BEM class names in component tests. Test behavior and content only. BEM class correctness is a visual concern — catch it via visual regression screenshots in E2E. Asserting class names couples tests to CSS implementation details and breaks on every refactor.

### 1.2 Component Isolation
- **Q**: How should heavy third-party components (Markdown editor, graph
  visualization library) be handled in tests? Mock entirely, shallow render,
  or full render? Full render is more realistic but slow and may have
  environment issues.

**A:** **Mock heavy third-party components** in unit tests. Create lightweight mock components that expose the same props interface but render a simple `<div data-testid="mock-tiptap-editor">` placeholder. TipTap editor should be mocked for component-level tests. The graph tree view is DOM-based and lightweight enough to render directly in unit tests (it uses @tanstack/virtual, which works in happy-dom). Full render of heavy components happens only in E2E tests with Playwright.

- **Q**: Should the custom render wrapper (`renderWithProviders`) always
  include all providers (Router, Store, Theme), or should tests explicitly
  opt-in to the providers they need? Always-include is simpler; opt-in
  catches missing dependency issues.

**A:** **Always include all providers** in `renderWithProviders`. The providers are lightweight (MobX RootStore with domain/session/UI stores via React Context, router memory history, theme context), and including all of them avoids boilerplate in every test. If a test needs a specific store state or route, pass it as an option: `renderWithProviders(<Component />, { rootStore: customRootStore, route: '/specs/1' })`. This is simpler and closer to the real app environment.

### 1.3 Async Component Testing
- **Q**: How should components that fetch data on mount be tested? Should
  tests mock the API layer and verify render after data arrives, or should
  tests mock the store and pre-populate data? The former tests the full
  flow; the latter is simpler and faster.

**A:** **Both, depending on what's being tested.** For testing a component's loading/error/success states: mock the API layer (via MSW) and verify the full flow including loading spinners and error messages. For testing a component's rendered output with specific data: pre-populate the MobX store (set observable properties via `runInAction()`) and skip the fetch. Most tests should use the store pre-population approach since it's faster. Reserve API-layer mocking for tests that specifically verify fetch behavior.

- **Q**: For components with debounced input (spec editor), should tests use
  real timers (slower, more realistic) or fake timers (faster, requires
  explicit timer advancement)?

**A:** **Fake timers** via `bun:test` `useFakeTimers()`. Advance time explicitly with `advanceTimersByTime(debounceMs)`. This keeps tests fast and deterministic. The debounce delay value should be imported from a shared constant so tests advance by the correct amount.

---

## 2. State Management Testing

### 2.1 Store Testing Strategy
- **Q**: Should MobX stores be tested directly (instantiate store class, call actions,
  assert state) or indirectly through component tests (render component,
  interact, verify UI state)? Direct testing is faster and more isolated;
  indirect testing verifies integration.

**A:** **Both.** Test complex store logic directly — instantiate the store class, call actions, assert state transitions with `runInAction()`. This covers business logic without DOM overhead. Simple stores that are mostly getters/setters are tested indirectly through the components that consume them. Rule of thumb: if a store action has branching logic or side effects, it gets a direct unit test.

- **Q**: Should stores be reset between tests? Shared state between tests
  causes flakiness. Should each test get a fresh store instance?

**A:** **Yes, create fresh store instances per test.** Since MobX stores are classes, each test (or `beforeEach`) simply creates a `new RootStore()` which instantiates fresh domain, session, and UI stores. No `reset()` methods needed — a new class instance is inherently clean. The `renderWithProviders` wrapper accepts an optional `rootStore` parameter; if none is provided, it creates a new `RootStore()` automatically. This eliminates cross-test contamination.

- **Q**: For cross-store effects (e.g., logout clears all stores), should
  tests verify the effect through all stores, or should each store test its
  own cleanup independently?

**A:** **Each store tests its own cleanup independently** (unit tests verify that calling `authStore.logout()` triggers `specsStore.reset()`, etc.). Add **one integration-level component test** that verifies the full logout flow clears all visible UI state. This avoids N×M cross-store test explosion while still catching integration issues.

### 2.2 Persistence Testing
- **Q**: How should localStorage/sessionStorage be tested? Use a real
  in-memory implementation (happy-dom provides this) or mock Storage?

**A:** Use **happy-dom's built-in Storage implementation**. It provides a working in-memory `localStorage` and `sessionStorage` that behave like the real APIs. No need for a custom mock. Clear storage in `beforeEach` to prevent cross-test leakage.

- **Q**: Should tests verify that specific keys are written to localStorage
  (implementation detail), or only that state persists across store
  re-instantiation (behavior)?

**A:** Test **behavior**: verify that state persists across store re-instantiation and that clearing storage resets state. Do not assert on specific localStorage key names — that's an implementation detail. Exception: if the key name is part of a cross-system contract (e.g., another service reads it), test the key name explicitly.

---

## 3. API & Network Mocking

### 3.1 Mock Strategy
- **Q**: Should the project use Mock Service Worker (MSW) for network mocking
  (intercepts at the network level, realistic) or mock `fetch` directly
  (simpler, less realistic)? MSW works in both tests and development; direct
  mocking is lighter.

**A:** **MSW.** It intercepts at the network level, works with any HTTP client abstraction, and handlers can be shared between tests and development mode. Define baseline handlers in `test/mocks/handlers.ts` and override per-test as needed with `server.use()`. This is more realistic than mocking `fetch` directly and doesn't couple tests to the HTTP client implementation.

- **Q**: Should mock API responses be defined inline in tests, or in
  centralized mock response files? Inline is more readable; centralized
  prevents duplication.

**A:** **Hybrid.** Define default/happy-path MSW handlers in centralized `test/mocks/handlers/` files (one per API domain: `specs.handlers.ts`, `auth.handlers.ts`). Override specific responses inline in tests when testing error states or edge cases. This prevents duplication for common scenarios while keeping test-specific behavior visible.

- **Q**: Should API mocking verify request parameters (assert that the
  correct query params, headers, and body were sent), or only provide
  canned responses?

**A:** **Verify request parameters** for critical operations (create, update, delete) — assert that the correct body/params were sent. For read operations (GET requests), canned responses are sufficient. MSW handlers can capture and expose request data for assertion in the test.

### 3.2 Error Scenario Coverage
- **Q**: How comprehensively should API error scenarios be tested? Every
  endpoint × every HTTP error code is exhaustive but expensive. Should tests
  cover only common errors (400, 401, 403, 404, 500) per service, or every
  possible error per endpoint?

**A:** Test the **common error codes per service area**, not per endpoint. Each service area (auth, specs, knowledge graph, agent) should have tests for: 400 (validation error), 401 (unauthenticated), 403 (forbidden), 404 (not found), 500 (server error). Endpoint-specific errors (e.g., 409 conflict on duplicate creation) are tested only on the endpoints where they're meaningful.

- **Q**: Should tests simulate network timeouts and connection failures?
  These are important but harder to test reliably.

**A:** Yes, but minimally. Add **one test per service area** that verifies the UI handles a network timeout gracefully (shows error message, allows retry). Use MSW's `delay('infinite')` combined with fake timer advancement to simulate timeouts deterministically. Don't test every endpoint for timeout behavior.

---

## 4. WebSocket Testing

- **Q**: Should WebSocket tests use a real WebSocket server (in-memory) or
  mock the WebSocket constructor entirely? Real server tests the full protocol;
  mocking is simpler but less realistic.

**A:** **Mock the Socket.IO client** in component unit tests. For integration-level frontend tests, use a lightweight in-memory Socket.IO server (Socket.IO supports `createServer` for testing). E2E tests use the real WebSocket connection through the full stack. This gives three levels of confidence without over-investing in WebSocket test infrastructure.

- **Q**: How should streaming agent responses be tested? Should tests simulate
  character-by-character streaming, chunk-by-chunk streaming, or only the
  final complete response?

**A:** **Chunk-by-chunk streaming** — simulate 3–5 chunks arriving with short delays. This verifies that the UI progressively renders content without testing at the character level (too granular) or only the final state (misses streaming bugs). Use the mocked Socket.IO to emit chunks in sequence.

- **Q**: Should reconnection logic be tested with real disconnect scenarios
  (kill mock server) or simulated (trigger close event)?

**A:** **Simulated** — trigger the `disconnect` event on the mock client and verify the UI shows a reconnection indicator. Then trigger `connect` and verify recovery. Testing real disconnection scenarios is reserved for E2E tests where the actual server can be stopped and restarted.

---

## 5. E2E Testing

### 5.1 E2E Scope
- **Q**: Should E2E tests cover every user flow, or only the critical 10-15
  flows? Comprehensive E2E is expensive to write and maintain; critical-only
  may miss edge cases.

**A:** **Critical flows only — target 10–15 flows.** Cover: login/logout, create/edit/delete spec, navigate knowledge graph, search specs, agent chat interaction, plan generation view, generative UI rendering, spec linking/unlinking, real-time collaboration indicators, and settings. Edge cases are caught by unit and integration tests. E2E tests are the most expensive to maintain, so keep them focused on high-value user journeys.

- **Q**: Should E2E tests run against a mocked backend or a real backend with
  a test database? Real backend is more realistic but adds setup complexity
  and flakiness.

**A:** **Real backend with a test database.** The PRD specifies real PostgreSQL in Docker for integration tests; extend this to E2E. Use Docker Compose to spin up the full stack (NestJS server + PostgreSQL + frontend dev server). Seed the database with known test data before the E2E suite runs. This catches real integration issues that mocked backends miss.

- **Q**: Should E2E tests handle their own test data setup (API calls to
  create users, projects, etc.), or assume pre-seeded data?

**A:** **Both.** Pre-seed common reference data (test users, base project) via a seed script that runs once before the E2E suite. Each test creates its own test-specific data via API calls in `beforeEach` (using Playwright's `request` context). This gives a stable foundation while keeping tests independent. Use a naming convention (e.g., `e2e-test-*` prefix) to identify and clean up test-created data.

### 5.2 E2E Reliability
- **Q**: How should E2E test flakiness be handled? Auto-retry on failure?
  Quarantine flaky tests? Delete and rewrite?

**A:** **Auto-retry once** (Playwright `retries: 1` in CI config). If a test fails on retry, it's a real failure. Tests that fail intermittently more than twice in a week are flagged for investigation. If not fixable within one sprint, quarantine with `test.skip` + a linked issue. Never leave flaky tests running in CI — they erode trust in the suite.

- **Q**: Should E2E tests use fixed viewport sizes or test multiple sizes?
  Multiple sizes catch responsive issues but multiply test count.

**A:** **Single fixed viewport: 1440×900** (desktop-first professional tool per PRD). Do not test multiple viewport sizes in E2E. Responsive behavior (if any) is tested at the component level with resized containers, not full E2E. The app is desktop-first; mobile viewports are not a priority.

- **Q**: Should E2E tests run in parallel or serial? Parallel is faster but
  can cause resource contention and data conflicts.

**A:** **Parallel with isolated data.** Use Playwright's built-in parallel workers (default: half the CPU cores). Each test creates its own data and operates on its own entities, so there are no data conflicts. Limit workers to 4 in CI to avoid resource exhaustion. If tests share mutable state despite best efforts, reduce to 2 workers.

---

## 6. Visual Regression Testing

- **Q**: Should the project invest in visual regression testing from the
  start, or defer until the design system stabilizes? Visual regression
  tests are expensive to maintain during rapid iteration.

**A:** **Defer until post-MVP.** The UI will change rapidly during initial development, making screenshot baselines a constant maintenance burden. Introduce visual regression testing once the core design system and component library stabilize (estimated: 3–4 months in). Until then, rely on manual visual review in PR screenshots.

- **Q**: Which visual regression tool should be used? Percy (cloud-based,
  expensive), Chromatic (Storybook integration), Playwright screenshots
  (free, requires baseline management), or BackstopJS?

**A:** **Playwright screenshots** when the time comes. It's free, already in the stack, and handles baseline management through `toHaveScreenshot()`. No additional tooling or cloud costs. Baselines are committed to the repo and updated via `--update-snapshots`.

- **Q**: How should visual diffs be reviewed? In PR comments (requires CI
  integration), in a dashboard, or locally by the developer?

**A:** **Locally by the developer** during development; **in CI artifacts** during PR review. Playwright generates diff images as test artifacts that reviewers can download and inspect. No dashboard needed until the visual regression suite grows large.

- **Q**: Should visual regression tests cover all themes (light + dark) and
  all viewport sizes? This multiplies the number of screenshots significantly.

**A:** When implemented, cover **light theme only at 1440×900**. Dark theme is a stretch goal. This keeps the screenshot count manageable. If dark theme is added and has distinct visual concerns, add a small subset of dark-theme screenshots for the most critical views.

---

## 7. Accessibility Testing

- **Q**: Should accessibility testing be automated-only (axe-core scans in
  tests), or also include manual testing checklists? Automated catches ~30%
  of accessibility issues; manual testing catches more.

**A:** **Automated axe-core scans** in component tests as the baseline. Supplement with a manual accessibility checklist for quarterly reviews or before major releases. The automated scan runs on every PR; manual testing is periodic. This balances thoroughness with velocity.

- **Q**: Should every component have an individual axe-core scan, or should
  axe-core run once per page in E2E tests? Per-component is more thorough;
  per-page is faster.

**A:** **Per-page in E2E tests** for the critical 10–15 flows. Additionally, add axe-core scans to component tests for complex, custom-built components (not trivial wrappers). This catches page-level issues (missing landmarks, heading hierarchy) and component-level issues (missing ARIA attributes) without scanning every tiny component.

- **Q**: Should the project block PRs that introduce accessibility violations?
  This ensures compliance but may slow velocity if existing violations exist.

**A:** **Soft warning initially**, upgrading to hard block once existing violations are resolved (within the first 2 months). Start by logging violations in CI without blocking. Once the baseline is clean, enable blocking for new violations with severity "critical" and "serious". "Minor" and "moderate" violations remain warnings.

---

## 8. Graph Visualization Testing

- **Q**: The knowledge graph uses a canvas-based visualization library.
  Canvas content cannot be tested with DOM assertions. What is the testing
  strategy?
  - Option A: Test the data model and interaction handlers only (unit tests)
  - Option B: Screenshot comparison of canvas output (visual regression)
  - Option C: Mock the canvas API and assert draw calls
  - Option D: Use the library's testing utilities (if available)

**A:** The graph tree view is DOM-based (React + @tanstack/virtual), so the Canvas testing concern no longer applies. Unit-test the data model, BFS layout algorithm, row merging logic, interaction handlers (card click, expand, breadcrumb navigation), and state management around the tree. Use Playwright screenshot comparison in E2E for visual correctness of the rendered tree layout. Standard @testing-library/react queries work for all tree view components since they are regular DOM elements.

- **Q**: How should graph layout algorithms be tested? Verify exact node
  positions (brittle, algorithm-dependent) or only verify constraints
  (no overlapping nodes, edges connect correct nodes)?

**A:** **Verify constraints**, not exact positions. Assert: correct number of nodes rendered, edges connect the right source/target pairs, no overlapping node bounding boxes for small graphs, selected node has the correct ID. Exact pixel positions are algorithm-dependent and change with library updates.

- **Q**: Should drag-and-drop graph interactions be tested in E2E only, or
  also in unit tests with synthetic events?

**A:** **E2E only for drag-and-drop.** Canvas drag interactions don't produce DOM events that synthetic events can simulate meaningfully. Test the drag handlers in unit tests (call the handler with mock coordinates), but verify the actual drag-and-drop UX in Playwright E2E tests using `page.mouse.move()` and `page.mouse.down()/up()`.

---

## 9. Generative UI Testing

- **Q**: How should iframe-sandboxed generative UIs be tested? E2E tests
  can interact with iframes, but unit tests cannot easily. Should gen-UI
  tests be E2E-only?

**A:** The **iframe host wrapper** is tested in unit tests (verify sandbox attributes, communication via `postMessage`, loading states, error handling). The **iframe content** (generated UI) is tested in E2E with Playwright, which can navigate into iframes via `page.frameLocator()`. So: unit tests for the host, E2E tests for the full gen-UI rendering.

- **Q**: Should the gen-UI host wrapper be tested independently of the
  iframe content? If so, mock the iframe and test only the host communication.

**A:** Yes. Unit-test the host wrapper with a mocked iframe. Verify: correct `src` attribute, sandbox policy attributes, `postMessage` sends correct data, `message` event handler processes responses correctly. The host wrapper is project-controlled code; the iframe content is generated and tested separately.

- **Q**: Should generated UI code be tested as part of the main test suite,
  or does it have its own test infrastructure? Generated code may not
  conform to project testing standards.

**A:** Generated UI code is **not** part of the main test suite. It runs in a sandboxed iframe and has its own lifecycle. The main test suite verifies that the gen-UI system works (host wrapper tests, E2E iframe interaction tests). Testing the quality of the generated code itself is the agent's responsibility and is validated through agent output structure tests, not frontend tests.

---

## 10. Performance Testing

- **Q**: Should the project measure frontend performance metrics (First
  Contentful Paint, Largest Contentful Paint, Time to Interactive) in
  automated tests, or only in manual performance audits?

**A:** **Manual performance audits only.** The app is a desktop-first professional tool, not a public website. FCP/LCP/TTI are less critical here than functional correctness and responsiveness during use. Run Lighthouse manually before major releases. Automate only if performance regressions become a recurring problem.

- **Q**: Should the project test component render performance? For example,
  "rendering 1000 spec list items should take < 100ms." If so, what are
  the benchmarks?

**A:** Add **targeted render benchmarks** for the two heaviest components: spec list (target: 500 items rendered in < 200ms) and graph visualization (target: 200 nodes initialized in < 500ms). These are not CI-blocking — run them as manual benchmarks and track results. Use `performance.now()` in test code to measure.

- **Q**: Should the graph visualization have performance tests? Large graphs
  (500+ nodes) may cause rendering issues.

**A:** Yes, but as **manual benchmarks**, not CI tests. Create a test fixture with 500 nodes and 1000 edges. Measure: initial render time, pan/zoom responsiveness, node selection latency. Track these numbers manually across releases. If a regression is detected, investigate before release. This avoids flaky CI timing tests while still catching performance issues.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
|------|----------|----------|-----------|
| — | — | — | — |
