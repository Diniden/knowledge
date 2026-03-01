# 08-TESTING / 04 — AGENT TESTING: Open Questions

> **Purpose**: Unresolved questions about testing the agent system including mock
> strategies for Claude Code, MCP tool testing approaches, agent classification
> accuracy measurement, prompt validation methods, and end-to-end workflow
> testing boundaries. Answers may change tasks in the plan.

---

## 1. Claude Code Mock Strategy

### 1.1 Mock Fidelity
- **Q**: Should the mock Claude Code subprocess simulate realistic latency
  (e.g., 1-3 seconds for a response, chunk-by-chunk streaming), or return
  instantly? Realistic latency tests timeout logic but makes tests slow.

**A:** **Return instantly by default.** The mock subprocess emits all chunks with zero delay in unit tests. For integration tests that specifically verify timeout or streaming behavior, provide a `withLatency(ms)` option on the mock that introduces per-chunk delays. This keeps the default test path fast while allowing targeted latency testing when needed.

- **Q**: Should the mock support dynamic responses (e.g., based on the prompt
  content) or only static predefined responses? Dynamic mocks are more
  realistic but more complex to maintain.

**A:** **Static predefined responses for unit tests; dynamic responses for integration tests.** Unit tests select from a catalog of canned scenarios (`SIMPLE_TEXT`, `TOOL_CALL`, `ERROR`, `MULTI_TURN`). Integration tests can register a response function: `mockAgent.onPrompt((prompt) => { if (prompt.includes('create spec')) return TOOL_CALL_RESPONSE; })`. Keep dynamic mocks simple — pattern matching on keywords, not full prompt understanding.

- **Q**: Should the mock Claude Code simulate tool call behavior (return
  tool_use blocks that the orchestrator then executes), or should tool calls
  be pre-resolved in the mock? Simulating tool calls tests the full
  orchestration flow.

**A:** **Simulate tool calls.** The mock returns `tool_use` blocks that the orchestrator processes through its real tool dispatch logic. The tools themselves are mocked (returning canned results), but the orchestrator's parsing, dispatching, and result-feeding logic runs for real. This tests the most bug-prone part of the agent system: the orchestration loop between agent and tools.

### 1.2 Mock Subprocess vs Mock Interface
- **Q**: Should tests mock at the subprocess level (replace `spawn()` to
  return a fake process with controllable stdin/stdout) or at the wrapper
  service level (replace `ClaudeCodeWrapper` with a mock service)? Subprocess
  mocking is lower-level and more realistic; service mocking is simpler.

**A:** **Both, at different test levels.** Unit tests of the orchestrator/router mock the `ClaudeCodeWrapper` service via NestJS DI replacement — fast, simple, focused on orchestration logic. Unit tests of `ClaudeCodeWrapper` itself mock at the subprocess level — intercept `Bun.spawn()` to return a fake process with controllable stdout/stderr streams. This tests the wrapper's stream parsing, error handling, and process lifecycle. Integration tests of the full agent pipeline use subprocess-level mocking.

- **Q**: If mocking at the subprocess level, how should streaming be
  simulated? Write to a mock stdout stream with delays? This requires careful
  timing management in tests.

**A:** Create a `MockSubprocess` class that wraps a `ReadableStream`. Write chunks to it synchronously (no delays) for unit tests. The mock provides `emitChunk(data)` and `close()` methods. For latency-sensitive tests, use `emitChunkWithDelay(data, ms)` backed by fake timers. No real timing — all delays are simulated via `advanceTimersByTime()`.

- **Q**: Should there be both levels of mocking available — subprocess-level
  for integration tests and service-level for unit tests?

**A:** **Yes.** This is exactly the layered strategy. Service-level mocks for unit tests (fast, isolated). Subprocess-level mocks for wrapper tests and integration tests (realistic, verifies stream handling). Both mock utilities live in `test/mocks/agent/` and are well-documented with JSDoc examples.

---

## 2. MCP Tool Testing

### 2.1 Tool Isolation vs Integration
- **Q**: Should MCP tools be tested in isolation (mock the knowledge graph
  file system, mock the database) or against real backends (temp file system,
  test database)? Isolation is faster; integration catches more bugs.

**A:** **Both.** Each MCP tool gets unit tests with mocked backends (mock file system, mock database) that verify tool logic, parameter validation, and error handling. Critical tools (spec CRUD, graph edge management) also get integration tests against a real temp file system and test PostgreSQL database. The integration tests catch issues like file path handling, permission errors, and SQL edge cases that mocks miss.

- **Q**: Should each MCP tool have both a unit test (mocked dependencies) and
  an integration test (real file system + database), or is one sufficient?

**A:** **Unit tests for all tools; integration tests for tools that write data.** Read-only tools (search, list, graph traversal) are adequately covered by unit tests. Write tools (create spec, update spec, create edge, delete) need integration tests to verify that file system and database state are correctly modified. This keeps the integration test count manageable.

- **Q**: Should MCP protocol compliance be tested separately from tool logic?
  (i.e., test that the tool follows MCP format, independent of what the tool
  actually does.)

**A:** **Yes.** Create a shared test helper `assertValidMcpResponse(response)` that validates the response structure against the MCP protocol spec (correct JSON-RPC format, proper error codes, valid content blocks). Call this helper in every tool test. Additionally, add one dedicated protocol compliance test file that tests MCP lifecycle (initialize, list tools, call tool, shutdown) against the real MCP server process.

### 2.2 Tool Test Data
- **Q**: Should MCP tool tests create their own knowledge graph test data
  (spec files, edge files), or use shared fixtures? Own data ensures
  isolation; shared fixtures prevent duplication.

**A:** **Own data per test file.** Each tool test file creates its own knowledge graph structure (spec files, edge files, folders) in a temp directory during `beforeAll`. This ensures full isolation — no test depends on another test's data. Provide factory helpers (`createTestKnowledgeGraph({ specs: 5, edges: 10 })`) to reduce boilerplate. Shared fixtures are fragile and create hidden dependencies.

- **Q**: Should tool tests verify git commits created by write operations?
  This tests the full side effect but requires a test git repository.

**A:** **Yes, for integration tests of write tools.** Initialize a git repo in the temp directory. After a write tool executes (create spec, update spec), verify: a commit was created, the commit message follows the expected format, the committed files are correct. This is critical because the Knowledge Graph uses git as its version control layer — git commits are not an implementation detail, they're a core feature.

- **Q**: How should permission boundaries be tested in tools? Should tests
  simulate different users with different permission levels accessing the
  same tool?

**A:** **Yes.** Create test scenarios with two users: one with full access, one with restricted access. Verify that the restricted user receives appropriate permission errors when calling tools on resources they don't own. Test at least: read-only user can't write, user A can't modify user B's specs, project-level permissions are enforced. Inject the user context into the tool call via the MCP session.

---

## 3. Agent Classification Testing

### 3.1 Classification Accuracy
- **Q**: How should classification accuracy be measured? Against a labeled
  test set of prompts? If so, who creates the labeled set and what is the
  target accuracy?

**A:** **Labeled test set maintained in `test/fixtures/classification-prompts.json`.** Each entry has a prompt string and an expected classification. Start with 50–100 labeled prompts covering all agent types. The development team creates and maintains the set. Target accuracy: **90%+ exact match** on the test set. Run classification tests in CI with every PR that touches the classification logic.

- **Q**: Should classification tests use exact matching (expected type ==
  actual type) or allow ranked results (expected type in top-N results)?
  Ranked matching is more forgiving but may mask issues.

**A:** **Exact match for the primary classification.** The classifier should return a single best classification, and tests assert it matches the expected type exactly. If the classifier returns confidence scores, add a secondary assertion: the correct type should be in the top 2 with confidence > 0.3. But the primary metric is exact match — that's what the routing logic uses.

- **Q**: How should ambiguous prompts be handled in tests? Is "this could be
  graph_exploration or rag_query" a valid test case? Should there be an
  "ambiguous" classification that triggers clarification?

**A:** **Mark ambiguous prompts in the test set with `acceptable: [type1, type2]`.** If the classifier returns either acceptable type, the test passes. Limit ambiguous prompts to < 10% of the test set. Do not add an "ambiguous" classification type — it adds complexity to the routing layer. If the classifier is unsure, it should pick its best guess; the agent can ask for clarification in its response.

### 3.2 Classification Evolution
- **Q**: As the project evolves, new agent types may be added. Should the
  classification test set be treated as a living document that grows with
  the project?

**A:** **Yes.** When a new agent type is added, add at least 10 labeled prompts for it to the test set. The test set file is version-controlled and reviewed in PRs. Any PR that adds a new agent type must include corresponding classification test prompts. The test set should grow proportionally with the system's capabilities.

- **Q**: Should classification performance be tracked over time (accuracy
  per release)? This helps detect regression in classification logic.

**A:** **Yes, track in CI output.** The classification test job logs accuracy as a percentage in the CI summary. If accuracy drops below 90% (or below the previous run by > 5 points), the test fails. Historical tracking is done by reviewing CI logs — no separate dashboard needed at this scale.

---

## 4. Prompt Engineering Testing

### 4.1 Prompt Validation Approach
- **Q**: How should prompts be tested for quality? Manual review, automated
  checks (length, structure, required sections), or by testing agent output
  quality? Output testing is ideal but depends on the real model.

**A:** **Automated structural checks + manual review.** Write unit tests that verify: prompts contain required sections (system context, user message, tool descriptions), prompts don't exceed the context window limit, placeholder variables are all resolved (no `{{variable}}` in final prompt), and prompts include the correct tool definitions for the agent type. Manual review happens during PR review of prompt changes. Output quality testing requires the real model and is covered by the periodic real-API E2E tests.

- **Q**: Should there be a prompt linting tool that checks for common issues?
  (Missing context, overly long, conflicting instructions, placeholder
  variables remaining.)

**A:** **Yes, as a unit test utility, not a standalone tool.** Create `assertValidPrompt(prompt, { maxTokens, requiredSections, noPlaceholders })` and call it in prompt builder tests. Checks: no unresolved placeholders (`/\{\{.*?\}\}/`), length under context window limit, contains system role section, contains user message section. This runs in CI as part of the unit test suite.

- **Q**: Should prompts be version-controlled separately from code? This
  allows non-developers to review and iterate on prompts.

**A:** **No, keep prompts in code.** Prompts are TypeScript template strings in the agent module, version-controlled with the rest of the codebase. They reference code constants (tool names, type definitions) and must stay in sync with the code. Separating them introduces sync risk. Non-developer review happens through PR review — prompts are readable in diff views.

### 4.2 Prompt Security
- **Q**: Should there be tests for prompt injection attacks? (e.g., user
  message contains "Ignore your previous instructions...") If so, how
  sophisticated should the attack simulation be?

**A:** **Yes, basic prompt injection tests.** Create a test set of 10–15 known injection patterns: "ignore previous instructions", "you are now a different AI", system message injection via user input, markdown/XML tag injection attempting to rewrite system context. Verify the agent's response doesn't comply with the injection (doesn't reveal system prompt, doesn't change behavior). Test at the prompt construction level (verify user input is properly sandboxed) and at the output validation level (verify responses pass safety checks).

- **Q**: Should the system sanitize user messages before including them in
  the prompt? If so, what sanitization rules apply? (Remove markdown that
  looks like system instructions? Remove `[INST]` tags?)

**A:** **Minimal sanitization.** Strip control characters and null bytes. Do not strip markdown or `[INST]` tags — they have legitimate uses in user messages. Instead, rely on proper prompt structure: clearly delimit user input with markers (e.g., `<user_message>...</user_message>`) that the model respects. Test that the delimiters are present and that user input cannot break out of them (e.g., closing the delimiter tag early).

- **Q**: Should there be tests verifying that the agent cannot be tricked
  into executing unauthorized operations? (e.g., user asks to delete all
  specs — agent should refuse or require confirmation.)

**A:** **Yes.** Test that destructive operations (delete all specs, modify other users' data, access admin endpoints) are either refused or gated behind confirmation. Verify at the tool permission level: the MCP tools enforce authorization regardless of what the agent requests. Test: agent sends a `delete_all_specs` tool call → tool returns permission error → agent relays the refusal. The tools are the security boundary, not the agent's willingness.

---

## 5. End-to-End Agent Testing

### 5.1 E2E Scope
- **Q**: Should end-to-end agent tests use a mocked Claude Code (faster,
  deterministic) or the real Claude API (realistic, non-deterministic,
  expensive)? A hybrid approach (mostly mocked, periodic real API tests)
  may be ideal.

**A:** **Hybrid.** CI runs E2E agent tests with mocked Claude Code (deterministic, fast, free). A **nightly job** runs a small subset (5–10 critical flows) against the real Claude API to detect API changes, model behavior shifts, or integration issues. The nightly job is allowed to fail without blocking — failures create issues for investigation. Never gate PR merges on real API tests.

- **Q**: Should E2E agent tests be part of the CI pipeline (run on every PR)
  or run separately on a schedule (nightly/weekly)? Real API tests are too
  slow and expensive for every PR.

**A:** **Mocked E2E agent tests run on every PR** (they're fast and deterministic). **Real API E2E tests run nightly.** The PR pipeline uses the `MockClaudeCode` subprocess; the nightly job uses the real API with a test API key and budget cap. This gives fast PR feedback while catching real integration issues on a daily cadence.

- **Q**: Should E2E agent tests verify the quality of agent responses (is
  the response helpful and accurate) or only the structure (is the response
  well-formed, did the right tools get called)?

**A:** **Structure only for CI; quality for nightly.** CI tests verify: response is well-formed, correct tools were called, correct parameters were passed, response completed without errors. Nightly real-API tests can include quality checks: response contains expected keywords, response addresses the user's question, tool results are incorporated into the final answer. Quality assertions use fuzzy matching (contains keywords) rather than exact string comparison.

### 5.2 Test Determinism
- **Q**: Agent responses are inherently non-deterministic (even with
  temperature=0, responses can vary). How should tests handle this? Assert
  on structure rather than content? Use regular expressions? Allow fuzzy
  matching?

**A:** **Assert on structure and key properties, not content.** Verify: response type matches expected, tool calls are correct, response has non-zero length, response contains expected entity references (spec names, IDs) when tools return them. Use regular expressions for pattern matching (e.g., "response mentions the created spec ID"). Never assert on exact prose. For mocked tests, the mock returns deterministic output, so exact matching is fine there.

- **Q**: Should there be "golden response" tests that compare agent output
  to expected reference responses? These are brittle but catch major
  regressions. Acceptable similarity threshold?

**A:** **No golden response tests.** They are too brittle for LLM output and create constant maintenance overhead. Instead, use structural assertions (described above) and manual quality review during nightly test triage. If a regression is suspected, compare nightly test outputs manually. Golden tests are only viable for the mocked agent path, where they're just asserting the mock returns what it was configured to return (circular and low-value).

- **Q**: Should randomness in test data (different spec content, different
  graph structures) be seeded for reproducibility?

**A:** **Yes, all test data uses deterministic factories.** Factories produce sequential, predictable data (no randomness). The test knowledge graph structure is the same on every run. This makes failures reproducible. If stochastic testing is desired (e.g., fuzzing prompts), use a seeded PRNG and log the seed so failures can be reproduced from CI output.

---

## 6. RAG Testing

### 6.1 RAG Test Infrastructure
- **Q**: Should RAG tests use real embeddings (requires model/API call) or
  pre-computed embeddings (deterministic, no API dependency)? Real embeddings
  test the full pipeline; pre-computed are faster and cheaper.

**A:** **Pre-computed embeddings for CI; real embeddings for nightly.** Store pre-computed embedding vectors as JSON fixtures for the test corpus. CI tests use these fixtures to test retrieval logic (vector similarity, ranking, filtering) without API calls. The nightly job generates fresh embeddings and compares retrieval results to the expected set. This gives fast, deterministic CI with periodic real-pipeline validation.

- **Q**: If using pre-computed embeddings, how should they be generated and
  stored? As fixtures? How often should they be refreshed?

**A:** Store as **JSON fixture files** in `test/fixtures/embeddings/`. Each file contains `{ text: string, embedding: number[] }` pairs for the test corpus. Regenerate fixtures when: the embedding model changes, the test corpus changes, or quarterly as a hygiene measure. Add a script `test/scripts/regenerate-embeddings.ts` that calls the real embedding API and writes the fixtures.

- **Q**: Should RAG accuracy be measured with quantitative metrics (MRR,
  recall@k, precision@k) or qualitative assessment (manual review of
  results)?

**A:** **Quantitative metrics in CI.** Measure **recall@5** (does the correct document appear in the top 5 results?) and **MRR** (mean reciprocal rank) against the labeled test set. Target: recall@5 > 80%, MRR > 0.5. The labeled test set has queries paired with expected relevant documents. These metrics run in CI with pre-computed embeddings. Qualitative assessment supplements this during nightly review.

### 6.2 RAG Quality Benchmarks
- **Q**: What constitutes "good" RAG results for this project? Is there a
  benchmark set of queries with expected results?

**A:** Create a benchmark set of **30–50 queries** with expected relevant specs, stored in `test/fixtures/rag-benchmark.json`. Each entry: `{ query: "how does auth work?", relevant_spec_ids: ["spec-auth-001", "spec-auth-002"] }`. "Good" means: the most relevant spec appears in the top 3 results for at least 80% of queries. The benchmark set grows with the project as new feature areas are added.

- **Q**: Should RAG quality be tracked over time (dashboard with accuracy
  metrics per version)?

**A:** **Track in CI output, not a dashboard.** The RAG test job logs recall@5 and MRR in the CI summary. Historical comparison is done by reviewing past CI runs. If quality degrades (recall@5 drops below 75%), the test fails. A dashboard is overkill until the RAG system is mature and serving real users.

- **Q**: How should RAG be tested with a very small knowledge base (< 10
  specs)? Semantic search may not work well with very few documents.

**A:** **Test with a small corpus (10–20 specs) and adjust expectations.** With few documents, recall@5 should be near 100% (there aren't many documents to confuse the search). The small-corpus tests verify basic functionality: a query about auth returns the auth spec, not the unrelated UI spec. Add a separate benchmark with a larger corpus (100+ specs) for more realistic retrieval quality assessment. The small corpus is the CI default; the large corpus runs nightly.

---

## 7. Performance Testing

### 7.1 Performance Baselines
- **Q**: What are acceptable response times for different agent operations?
  - Simple chat response: < 3 seconds? < 5 seconds?
  - Tool-heavy response: < 10 seconds? < 20 seconds?
  - Plan generation: < 30 seconds? < 2 minutes?
  Should these be measured from user message to first chunk (time to first
  token) or to complete response?

**A:** Measure **time to first token** (TTFT) — this is what the user perceives. Baselines (TTFT): simple chat < 2 seconds, tool-heavy response < 5 seconds, plan generation < 10 seconds. Total completion time: simple chat < 10s, tool-heavy < 30s, plan generation < 2 minutes. These baselines apply to real API tests (nightly). Mocked tests have near-zero latency and don't test performance. Track baselines manually; they're targets, not CI-enforced assertions.

- **Q**: Should performance tests measure throughput (agents per second) in
  addition to latency? This is relevant if many users have concurrent
  sessions.

**A:** **Not initially.** The system is a professional tool for small teams, not a high-traffic consumer product. Concurrent agent session handling is important but can be load-tested manually before launch. Add throughput testing if the user base exceeds 50 concurrent users. Focus on single-session latency first.

### 7.2 Resource Limits
- **Q**: Should there be per-user limits on agent usage? (e.g., max 10
  active sessions, max 100K tokens per day.) If so, should these be tested?

**A:** **Yes, implement and test limits.** Enforce: max 3 concurrent agent sessions per user, configurable daily token budget per user. Test: creating a 4th session returns a 429 error, exceeding the token budget returns a budget-exhausted error. These are unit tests on the session manager and token tracker — fast and deterministic.

- **Q**: Should there be limits on the size of agent responses? Very large
  responses (generating an entire codebase) could be problematic.

**A:** **Yes.** Set a maximum response token limit (e.g., 16K tokens per response). If the agent exceeds this, truncate and append a "response truncated" notice. Test: mock agent returns a response exceeding the limit → verify truncation occurs and the client receives a truncation indicator. This protects against runaway responses consuming excessive resources.

- **Q**: What happens when the system reaches maximum concurrent agent
  sessions? Queue new requests? Reject? Should this be tested?

**A:** **Queue with a short timeout.** When max concurrent sessions (system-wide cap, e.g., 20) is reached, new requests enter a queue. If not dequeued within 30 seconds, return a 503 (service unavailable) with a retry-after header. Test: fill all session slots with mocked agents, submit one more request, verify it queues, then verify it either dequeues when a slot opens or times out and returns 503.

---

## 8. Plan Generation Testing

### 8.1 Plan Quality
- **Q**: How should plan quality be assessed in tests? Structural validity
  (well-formed JSON, valid dependencies) is testable; usefulness and
  completeness require human judgment.

**A:** **Test structural validity in CI; assess usefulness manually.** CI tests verify: plan output is valid JSON, each step has required fields (id, description, dependencies, type), dependency graph is acyclic, step types are valid enum values, estimated effort fields are present. Usefulness is assessed during nightly test triage and PR review of prompt changes.

- **Q**: Should plan generation tests use a reference knowledge graph with
  known expected plan output? This creates a "golden test" that can detect
  regressions.

**A:** **Yes, with structural golden tests only.** Create a reference knowledge graph fixture. Verify the generated plan has: the expected number of phases (within a range), covers all referenced spec areas, includes the expected step types. Do not assert on exact step descriptions or ordering (too brittle with LLM output). The golden test detects if plan generation is fundamentally broken, not if the plan is worded differently.

- **Q**: Should plan generation tests verify that generated code (if any)
  compiles and passes basic checks?

**A:** **Yes, for mocked tests.** The mock agent returns deterministic code snippets. Verify: generated TypeScript code parses without syntax errors (use `ts.createSourceFile` for fast parsing), generated file paths don't escape the project directory. For real API tests (nightly), compilation checks are best-effort — log failures but don't fail the test, since the real model may produce code that requires project context to compile.

### 8.2 Plan Execution Testing
- **Q**: Should plan execution be tested end-to-end (actually run the
  generated plan steps and verify outcomes)? This is the most thorough but
  also the most complex and time-consuming test.

**A:** **Yes, for a single canonical scenario with mocked tools.** Create one end-to-end plan execution test: generate a plan for a small reference knowledge graph, execute each step using mocked tools, verify the expected artifacts are produced (specs created, edges established, files written). This is an integration test that validates the plan execution engine works. Use a mocked agent so the plan is deterministic.

- **Q**: How should plan execution failures be tested? Simulate failures at
  specific steps and verify recovery behavior.

**A:** **Inject failures via the mock tool layer.** Configure a specific tool to return an error at a specific step. Verify: the execution engine logs the failure, retries if configured, skips the step and continues with dependents (or blocks dependents), reports the failure in the plan execution summary. Test at least: tool timeout, tool error response, and tool returning invalid output.

---

## 9. Agent Monitoring & Observability Testing

- **Q**: Should tests verify that agent operations produce correct telemetry
  (metrics, traces, logs)? This ensures monitoring works correctly but adds
  test complexity.

**A:** **Yes, for critical telemetry.** Verify: each agent session emits a start and end metric with duration, tool calls are logged with tool name and latency, errors are logged with error type and context. Use a mock telemetry collector that captures emitted events. Don't assert on log message formatting — assert on the presence of key fields (session_id, user_id, operation, duration).

- **Q**: Should there be tests for the agent health check endpoint? (e.g.,
  verify that it detects when Claude Code is unavailable.)

**A:** **Yes.** Test: health check returns 200 when Claude Code subprocess can be spawned, health check returns 503 when subprocess fails to start (mock `spawn` to throw), health check includes response time metric. This is a simple integration test in `agent-health.integration.test.ts`. Run it in CI — it's fast and catches configuration issues.

- **Q**: Should tests verify that agent errors trigger correct alerts?
  (e.g., high failure rate triggers escalation.)

**A:** **Test the alerting logic, not the alert delivery.** Verify: the failure rate tracker correctly counts failures within a time window, crossing the threshold triggers the alert callback, the alert payload contains the required fields (failure rate, time window, sample errors). Mock the alert delivery mechanism (email, Slack webhook). Don't test that Slack actually receives the message — that's Slack's problem.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
|------|----------|----------|-----------|
| — | — | — | — |
