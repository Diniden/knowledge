# 08-TESTING / 04 — AGENT TESTING PLAN

> **Purpose**: Define the complete agent system testing strategy including Claude
> Code wrapper testing (mocked subprocess), MCP server testing (each tool
> individually), agent routing/classification testing, output parsing testing,
> prompt template testing, agent session lifecycle testing, plan generation
> testing, RAG integration testing, knowledge graph operation testing through
> agents, end-to-end agent workflow testing, error and recovery testing, and
> performance/timeout testing.
>
> **Phase**: 3 (Agent Integration) + 4 (Advanced Features)
> **Dependencies**: `06-AGENT-SYSTEM/01-ARCHITECTURE-PLAN.md`, `08-TESTING/01-STRATEGY-PLAN.md`
> **Estimated tasks**: 140+

---

## Table of Contents

1. [Agent Test Infrastructure](#1-agent-test-infrastructure)
2. [Claude Code Wrapper Testing](#2-claude-code-wrapper-testing)
3. [MCP Server Testing](#3-mcp-server-testing)
4. [Agent Routing & Classification Testing](#4-agent-routing--classification-testing)
5. [Agent Output Parsing Testing](#5-agent-output-parsing-testing)
6. [Prompt Template Testing](#6-prompt-template-testing)
7. [Agent Session Lifecycle Testing](#7-agent-session-lifecycle-testing)
8. [Plan Generation Testing](#8-plan-generation-testing)
9. [RAG Integration Testing](#9-rag-integration-testing)
10. [Knowledge Graph Operation Testing via Agents](#10-knowledge-graph-operation-testing-via-agents)
11. [End-to-End Agent Workflow Testing](#11-end-to-end-agent-workflow-testing)
12. [Agent Error & Recovery Testing](#12-agent-error--recovery-testing)
13. [Performance & Timeout Testing](#13-performance--timeout-testing)

---

## 1. Agent Test Infrastructure

### 1.1 Mock Agent Runtime

- [ ] **TS-AG-001**: Create mock Claude Code subprocess
  - `MockClaudeProcess` class that simulates subprocess behavior
  - Accepts predefined responses for given prompts
  - Supports streaming output (emit chunks over time)
  - Supports tool call simulation (return tool_use blocks)
  - Tracks all inputs for assertions
- [ ] **TS-AG-002**: Create mock response builder
  - `AgentResponseBuilder.text(content)` — creates text response
  - `AgentResponseBuilder.toolCall(name, args)` — creates tool call response
  - `AgentResponseBuilder.streaming(chunks)` — creates streaming response
  - `AgentResponseBuilder.error(type, message)` — creates error response
  - `AgentResponseBuilder.sequence([...])` — creates multi-turn response
- [ ] **TS-AG-003**: Create mock tool execution environment
  - `MockToolExecutor` that captures tool calls and returns mock results
  - Register mock handlers per tool: `executor.register('read_spec', handler)`
  - Default handler returns empty/success for unregistered tools
  - Track all tool calls for assertions: `executor.getCalls('read_spec')`
- [ ] **TS-AG-004**: Create agent test harness
  - `AgentTestHarness` class wrapping the agent orchestration service
  - Pre-configured with mock Claude process and mock tools
  - Methods: `sendMessage(content)`, `waitForResponse()`, `getMessages()`
  - Supports multi-turn conversations within a test
- [ ] **TS-AG-005**: Create agent conversation simulator
  - Simulates multi-turn conversations with predefined scripts
  - Script format: `[{ role: 'user', content }, { role: 'assistant', content }]`
  - Verifies agent responses match expected patterns
  - Supports assertions on intermediate state (tool calls, context changes)

### 1.2 Test Fixtures for Agent

- [ ] **TS-AG-006**: Create agent prompt fixtures
  - Sample knowledge authoring prompts with expected classifications
  - Sample plan generation prompts with expected output structures
  - Sample graph exploration prompts with expected tool calls
  - Sample general chat prompts
- [ ] **TS-AG-007**: Create agent response fixtures
  - Sample text responses (short, long, with markdown)
  - Sample tool call responses (single tool, multiple tools, chained tools)
  - Sample streaming responses (various chunk sizes)
  - Sample error responses (timeout, token limit, invalid tool)
- [ ] **TS-AG-008**: Create agent context fixtures
  - Sample project context (name, description, settings)
  - Sample spec context (content, metadata, tags)
  - Sample graph context (neighborhood nodes and edges)
  - Sample RAG results (relevant spec summaries with scores)

#### Design Decisions

> **Q**: Should the mock Claude Code subprocess simulate realistic latency, or return instantly?
> **A**: **Return instantly by default.** The mock subprocess emits all chunks with zero delay in unit tests. For integration tests that verify timeout or streaming behavior, provide a `withLatency(ms)` option that introduces per-chunk delays.

> **Q**: Should the mock support dynamic responses (based on prompt content) or only static predefined responses?
> **A**: **Static predefined responses for unit tests; dynamic responses for integration tests.** Unit tests select from a catalog of canned scenarios (`SIMPLE_TEXT`, `TOOL_CALL`, `ERROR`, `MULTI_TURN`). Integration tests can register a response function: `mockAgent.onPrompt((prompt) => { ... })`. Keep dynamic mocks simple — pattern matching on keywords.

> **Q**: Should the mock Claude Code simulate tool call behavior (return `tool_use` blocks that the orchestrator executes), or should tool calls be pre-resolved in the mock?
> **A**: **Simulate tool calls.** The mock returns `tool_use` blocks that the orchestrator processes through its real tool dispatch logic. The tools themselves are mocked (returning canned results), but the orchestrator's parsing, dispatching, and result-feeding logic runs for real.

---

## 2. Claude Code Wrapper Testing

### 2.1 Process Management

- [ ] **TS-AG-009**: Test subprocess spawning
  - Spawns Claude Code process with correct command and arguments
  - Passes environment variables (API keys, configuration)
  - Sets working directory to project path
  - Handles spawn failure (command not found, permission denied)
- [ ] **TS-AG-010**: Test subprocess stdin/stdout communication
  - Sends prompt via stdin
  - Receives response via stdout
  - Handles large responses (> 1MB)
  - Handles multi-line responses
  - Properly encodes/decodes UTF-8
- [ ] **TS-AG-011**: Test subprocess stderr handling
  - Captures stderr output
  - Distinguishes between warning logs and error output
  - Does not treat warning logs as failures
  - Captures actual error output for error reporting
- [ ] **TS-AG-012**: Test subprocess lifecycle
  - Process starts on session creation
  - Process is killed on session end
  - Process is killed on timeout
  - Handles zombie processes (process that doesn't respond to SIGTERM)
  - Cleanup on unexpected parent process exit

### 2.2 Streaming Response Handling

- [ ] **TS-AG-013**: Test streaming output parsing
  - Parses streaming chunks from stdout
  - Emits chunks in real-time to listeners
  - Assembles complete response from chunks
  - Handles chunk boundaries mid-token (partial UTF-8)
- [ ] **TS-AG-014**: Test stream interruption handling
  - Stream stopped mid-response (process killed)
  - Partial response preserved and stored
  - Client notified of interruption
  - Session marked appropriately (not 'completed')
- [ ] **TS-AG-015**: Test stream backpressure
  - Client consumes slowly → buffer grows
  - Buffer has max size limit
  - Excess chunks dropped with warning (or back-pressure applied)

### 2.3 Configuration & Sandboxing

- [ ] **TS-AG-016**: Test Claude Code configuration
  - Correct model is specified
  - Max tokens is set
  - Temperature is set per agent type
  - System prompt is included
  - Tool configuration is passed
- [ ] **TS-AG-017**: Test sandboxing constraints
  - Process cannot access files outside project directory
  - Process cannot access network (if sandboxed)
  - Process resource limits (memory, CPU time)
  - Process user/group restrictions (if applicable)

#### Design Decisions

> **Q**: Should tests mock at the subprocess level (replace `spawn()` to return a fake process) or at the wrapper service level (replace `ClaudeCodeWrapper` with a mock service)?
> **A**: **Both, at different test levels.** Unit tests of the orchestrator mock the `ClaudeCodeWrapper` service via NestJS DI replacement. Unit tests of `ClaudeCodeWrapper` itself mock at the subprocess level — intercept `Bun.spawn()` to return a fake process with controllable stdout/stderr streams.

> **Q**: If mocking at the subprocess level, how should streaming be simulated?
> **A**: Create a `MockSubprocess` class that wraps a `ReadableStream`. Write chunks to it synchronously (no delays) for unit tests. The mock provides `emitChunk(data)` and `close()` methods. For latency-sensitive tests, use `emitChunkWithDelay(data, ms)` backed by fake timers.

> **Q**: Should there be both levels of mocking available — subprocess-level for integration tests and service-level for unit tests?
> **A**: **Yes.** Service-level mocks for unit tests (fast, isolated). Subprocess-level mocks for wrapper tests and integration tests (realistic, verifies stream handling). Both mock utilities live in `test/mocks/agent/` and are well-documented with JSDoc examples.

---

## 3. MCP Server Testing

### 3.1 Knowledge Graph MCP Tools

- [ ] **TS-AG-018**: Test `read_spec` tool
  - Returns spec content when spec exists
  - Returns summary when user has summary-only access
  - Returns error when spec does not exist
  - Validates required parameters (spec_id)
  - Respects permission boundaries
- [ ] **TS-AG-019**: Test `write_spec` tool
  - Creates new spec with provided content
  - Updates existing spec content
  - Creates git commit for the change
  - Returns created/updated spec ID
  - Validates content structure
- [ ] **TS-AG-020**: Test `delete_spec` tool
  - Deletes spec and its files
  - Removes associated edges
  - Creates git commit
  - Returns confirmation
  - Validates spec exists before deletion
- [ ] **TS-AG-021**: Test `list_specs` tool
  - Returns all specs in project
  - Supports filtering by tag, status, type
  - Returns summary for specs with restricted access
  - Handles empty project (no specs)
- [ ] **TS-AG-022**: Test `create_edge` tool
  - Creates edge between two specs
  - Validates source and target exist
  - Validates edge type is valid
  - Prevents duplicate edges
  - Creates git commit
- [ ] **TS-AG-023**: Test `delete_edge` tool
  - Deletes specified edge
  - Creates git commit
  - Returns confirmation
  - Validates edge exists
- [ ] **TS-AG-024**: Test `get_neighbors` tool
  - Returns connected specs for given node
  - Supports depth parameter (1-hop, 2-hop, etc.)
  - Returns edge types with each neighbor
  - Respects permission levels
- [ ] **TS-AG-025**: Test `search_graph` tool
  - Searches specs by keyword in title and content
  - Returns matching specs with relevance score
  - Respects permission levels (returns summaries for restricted)
  - Handles empty search results

### 3.2 RAG MCP Tools

- [ ] **TS-AG-026**: Test `search_knowledge` tool (RAG search)
  - Accepts natural language query
  - Returns relevant spec chunks with similarity scores
  - Respects permission levels (summary-only for restricted specs)
  - Supports result count limit
  - Handles no results gracefully
- [ ] **TS-AG-027**: Test `get_context` tool (contextual retrieval)
  - Accepts spec ID and retrieves related context
  - Includes spec content, neighbors, and RAG results
  - Assembles context within token limit
  - Prioritizes most relevant content

### 3.3 Plan Generation MCP Tools

- [ ] **TS-AG-028**: Test `generate_plan` tool
  - Accepts plan parameters (goal, scope, constraints)
  - Returns structured plan with steps
  - Plan references relevant specs by ID
  - Validates plan structure matches expected schema
- [ ] **TS-AG-029**: Test `execute_plan_step` tool
  - Accepts plan step and executes it
  - Returns step result (success/failure/partial)
  - Creates audit log entry
  - Handles step dependencies (prior step must complete)
- [ ] **TS-AG-030**: Test `get_plan_status` tool
  - Returns current plan execution status
  - Shows completed, in-progress, and pending steps
  - Returns result data for completed steps

### 3.4 Generative UI MCP Tools

- [ ] **TS-AG-031**: Test `create_gen_ui` tool
  - Creates generative UI project files
  - Registers in generated_ui_registry table
  - Returns UI path and ID
  - Validates spec_ids exist
- [ ] **TS-AG-032**: Test `update_gen_ui` tool
  - Updates existing gen-UI code files
  - Updates registry entry
  - Triggers rebuild if applicable
- [ ] **TS-AG-033**: Test `list_gen_uis` tool
  - Lists all gen-UIs for project
  - Includes build status
  - Supports filtering by status, type

### 3.5 MCP Protocol Compliance

- [ ] **TS-AG-034**: Test MCP tool descriptor format
  - Each tool has name, description, inputSchema
  - inputSchema is valid JSON Schema
  - Required parameters are marked as required
  - Optional parameters have defaults documented
- [ ] **TS-AG-035**: Test MCP request/response protocol
  - Requests follow MCP message format
  - Responses follow MCP result format
  - Error responses follow MCP error format
  - Tool call IDs are tracked correctly
- [ ] **TS-AG-036**: Test MCP tool error handling
  - Invalid parameters → descriptive error response
  - Tool execution failure → error response with details
  - Permission denied → appropriate error code
  - Server error → generic error with logged details

#### Design Decisions

> **Q**: Should MCP tools be tested in isolation (mock the knowledge graph file system, mock the database) or against real backends?
> **A**: **Both.** Each MCP tool gets unit tests with mocked backends that verify tool logic, parameter validation, and error handling. Critical tools (spec CRUD, graph edge management) also get integration tests against a real temp file system and test PostgreSQL database.

> **Q**: Should each MCP tool have both a unit test and an integration test, or is one sufficient?
> **A**: **Unit tests for all tools; integration tests for tools that write data.** Read-only tools (search, list, graph traversal) are adequately covered by unit tests. Write tools (create spec, update spec, create edge, delete) need integration tests.

> **Q**: Should MCP protocol compliance be tested separately from tool logic?
> **A**: **Yes.** Create a shared test helper `assertValidMcpResponse(response)` that validates the response structure against the MCP protocol spec. Additionally, add one dedicated protocol compliance test file that tests MCP lifecycle (initialize, list tools, call tool, shutdown).

> **Q**: Should MCP tool tests create their own knowledge graph test data, or use shared fixtures?
> **A**: **Own data per test file.** Each tool test file creates its own knowledge graph structure in a temp directory during `beforeAll`. Provide factory helpers (`createTestKnowledgeGraph({ specs: 5, edges: 10 })`) to reduce boilerplate.

> **Q**: Should tool tests verify git commits created by write operations?
> **A**: **Yes, for integration tests of write tools.** Initialize a git repo in the temp directory. After a write tool executes, verify: a commit was created, the commit message follows the expected format, the committed files are correct.

> **Q**: How should permission boundaries be tested in tools?
> **A**: Create test scenarios with two users: one with full access, one with restricted access. Verify that the restricted user receives appropriate permission errors. Test at least: read-only user can't write, user A can't modify user B's specs, project-level permissions are enforced.

---

## 4. Agent Routing & Classification Testing

### 4.1 Request Classification

- [ ] **TS-AG-037**: Test classification of knowledge authoring requests
  - "Create a spec about authentication" → knowledge_authoring
  - "Update the login spec to include OAuth" → knowledge_authoring
  - "Add a new requirement for password strength" → knowledge_authoring
  - "What are the specs related to auth?" → graph_exploration
- [ ] **TS-AG-038**: Test classification of graph exploration requests
  - "Show me all specs connected to user management" → graph_exploration
  - "What depends on the auth spec?" → graph_exploration
  - "Find orphan specs" → graph_exploration
  - "What is the path between spec A and spec B?" → graph_exploration
- [ ] **TS-AG-039**: Test classification of plan generation requests
  - "Generate a plan to implement the auth module" → plan_generation
  - "Create an execution plan for the frontend" → plan_generation
  - "What steps are needed to build the API?" → plan_generation
- [ ] **TS-AG-040**: Test classification of RAG query requests
  - "What does the project say about database design?" → rag_query
  - "Find information about error handling" → rag_query
  - "Summarize what we know about security" → rag_query
- [ ] **TS-AG-041**: Test classification of general chat requests
  - "Hello" → general_chat
  - "What is a knowledge graph?" → general_chat
  - "Help me understand how to use this tool" → general_chat
- [ ] **TS-AG-042**: Test classification of ambiguous requests
  - Ambiguous requests are handled by asking for clarification
  - Or routed to the most likely agent with fallback
  - Classification confidence score is tracked

### 4.2 Agent Routing

- [ ] **TS-AG-043**: Test routing to correct agent type
  - Classification result maps to correct agent configuration
  - Agent receives appropriate system prompt for its type
  - Agent receives appropriate tool set for its type
  - Routing metadata is logged for debugging
- [ ] **TS-AG-044**: Test multi-agent delegation
  - Complex request that requires multiple agent types
  - Parent agent delegates sub-tasks to specialized agents
  - Results are merged and presented to user
  - Parent session tracks child session IDs
- [ ] **TS-AG-045**: Test routing fallback
  - When primary agent fails, fallback agent is used
  - Fallback uses general-purpose configuration
  - User is informed of fallback (or not, depending on UX decision)

#### Design Decisions

> **Q**: How should classification accuracy be measured? Against a labeled test set of prompts?
> **A**: **Labeled test set maintained in `test/fixtures/classification-prompts.json`.** Each entry has a prompt string and an expected classification. Start with 50–100 labeled prompts. Target accuracy: **90%+ exact match**. Run classification tests in CI with every PR that touches the classification logic.

> **Q**: Should classification tests use exact matching or allow ranked results (expected type in top-N)?
> **A**: **Exact match for the primary classification.** The classifier should return a single best classification, and tests assert it matches exactly. If the classifier returns confidence scores, add a secondary assertion: the correct type should be in the top 2 with confidence > 0.3.

> **Q**: How should ambiguous prompts be handled in tests?
> **A**: **Mark ambiguous prompts in the test set with `acceptable: [type1, type2]`.** If the classifier returns either acceptable type, the test passes. Limit ambiguous prompts to < 10% of the test set. Do not add an "ambiguous" classification type.

> **Q**: Should the classification test set grow with the project as new agent types are added?
> **A**: **Yes.** When a new agent type is added, add at least 10 labeled prompts to the test set. Any PR that adds a new agent type must include corresponding classification test prompts.

> **Q**: Should classification performance be tracked over time (accuracy per release)?
> **A**: **Yes, track in CI output.** The classification test job logs accuracy as a percentage in the CI summary. If accuracy drops below 90% (or below the previous run by > 5 points), the test fails.

---

## 5. Agent Output Parsing Testing

### 5.1 Text Response Parsing

- [ ] **TS-AG-046**: Test plain text response parsing
  - Strips control characters
  - Preserves markdown formatting
  - Handles very long responses (truncation or chunking)
  - Handles empty response (agent produced no content)
- [ ] **TS-AG-047**: Test structured data extraction from text
  - Extracts spec references (`[[spec-id]]` syntax)
  - Extracts code blocks with language tags
  - Extracts suggested actions (create spec, add edge, etc.)
  - Handles responses with no structured data (pure text)

### 5.2 Tool Call Parsing

- [ ] **TS-AG-048**: Test single tool call parsing
  - Parses tool name from response
  - Parses tool arguments (JSON)
  - Validates arguments against tool schema
  - Handles missing required arguments → error
  - Handles extra unknown arguments → ignore with warning
- [ ] **TS-AG-049**: Test multiple tool calls in single response
  - Parses array of tool calls
  - Executes tool calls in order (or parallel if independent)
  - Handles partial failure (one tool succeeds, another fails)
  - Aggregates results for context feeding back to agent
- [ ] **TS-AG-050**: Test chained tool calls (tool result triggers another call)
  - Agent receives tool result and issues another tool call
  - Chain continues until agent produces final text response
  - Maximum chain depth limit is enforced
  - Each chain step is logged for debugging
- [ ] **TS-AG-051**: Test tool call with invalid tool name
  - Agent references a tool that doesn't exist
  - Error returned to agent with list of available tools
  - Agent retries with correct tool name (if capable)
  - Logs unknown tool call for monitoring

### 5.3 Spec Modification Parsing

- [ ] **TS-AG-052**: Test parsing agent-proposed spec creation
  - Extracts proposed spec title, content, tags
  - Validates proposed spec against spec schema
  - Presents to user for approval (if approval flow exists)
  - Creates spec on approval
- [ ] **TS-AG-053**: Test parsing agent-proposed spec update
  - Extracts spec ID and proposed changes
  - Shows diff between current and proposed content
  - Applies changes on approval
  - Handles invalid spec ID gracefully
- [ ] **TS-AG-054**: Test parsing agent-proposed edge creation
  - Extracts source spec, target spec, edge type
  - Validates both specs exist
  - Creates edge on approval
  - Handles invalid spec references

---

## 6. Prompt Template Testing

### 6.1 Prompt Structure Validation

- [ ] **TS-AG-055**: Test system prompt templates
  - Each agent type has a system prompt template
  - System prompt includes: role definition, available tools, output format
  - System prompt is valid text (no template variable placeholders remaining)
  - System prompt fits within token limits
- [ ] **TS-AG-056**: Test prompt variable interpolation
  - Project name injected into prompt
  - User name injected into prompt
  - Available tool list injected into prompt
  - Current context (spec, graph) injected into prompt
  - No unresolved `{{variable}}` placeholders in final prompt
- [ ] **TS-AG-057**: Test prompt context window management
  - Total prompt (system + context + history + user message) fits within model limit
  - Oldest messages are truncated when history exceeds limit
  - System prompt is never truncated
  - Most recent messages are always included
  - Truncation boundary respects message boundaries (doesn't cut mid-message)

### 6.2 Prompt Quality Assertions

- [ ] **TS-AG-058**: Test prompt includes relevant context
  - Knowledge authoring prompt includes current spec content
  - Graph exploration prompt includes graph neighborhood
  - Plan generation prompt includes relevant specs and constraints
  - RAG query prompt includes retrieved documents
- [ ] **TS-AG-059**: Test prompt does not leak sensitive data
  - Other users' private spec content not included
  - Password hashes never included
  - API keys never included in prompt
  - Encryption tokens never included
- [ ] **TS-AG-060**: Test prompt tool descriptions
  - Each tool's description in the prompt matches its actual behavior
  - Tool parameter descriptions are accurate
  - Tool examples (if included) are valid
  - Deprecated tools are not included in prompts

#### Design Decisions

> **Q**: How should prompts be tested for quality? Manual review, automated checks, or by testing agent output quality?
> **A**: **Automated structural checks + manual review.** Unit tests verify: prompts contain required sections, prompts don't exceed the context window limit, placeholder variables are all resolved, and prompts include the correct tool definitions. Manual review happens during PR review of prompt changes.

> **Q**: Should there be a prompt linting tool that checks for common issues?
> **A**: **Yes, as a unit test utility, not a standalone tool.** Create `assertValidPrompt(prompt, { maxTokens, requiredSections, noPlaceholders })` and call it in prompt builder tests. Checks: no unresolved placeholders (`/\{\{.*?\}\}/`), length under context window limit, contains system role section, contains user message section.

> **Q**: Should prompts be version-controlled separately from code?
> **A**: **No, keep prompts in code.** Prompts are TypeScript template strings in the agent module, version-controlled with the rest of the codebase. They reference code constants and must stay in sync. Non-developer review happens through PR review.

> **Q**: Should there be tests for prompt injection attacks?
> **A**: **Yes, basic prompt injection tests.** Create a test set of 10–15 known injection patterns. Verify the agent's response doesn't comply with the injection. Test at the prompt construction level (verify user input is properly sandboxed) and at the output validation level.

> **Q**: Should the system sanitize user messages before including them in the prompt?
> **A**: **Minimal sanitization.** Strip control characters and null bytes. Do not strip markdown or `[INST]` tags — they have legitimate uses. Instead, rely on proper prompt structure: clearly delimit user input with markers (e.g., `<user_message>...</user_message>`) that the model respects.

> **Q**: Should there be tests verifying that the agent cannot be tricked into executing unauthorized operations?
> **A**: **Yes.** Test that destructive operations are either refused or gated behind confirmation. Verify at the tool permission level: the MCP tools enforce authorization regardless of what the agent requests. The tools are the security boundary, not the agent's willingness.

---

## 7. Agent Session Lifecycle Testing

### 7.1 Session Creation

- [ ] **TS-AG-061**: Test session creation flow
  - User sends first message → session created automatically
  - Session associated with correct user and project
  - Session type determined by request classification
  - Context assembled and stored in context_json
  - WebSocket notification sent: session started
- [ ] **TS-AG-062**: Test session context initialization
  - Project info loaded into context
  - Current spec loaded (if user is editing a spec)
  - Graph neighborhood loaded (if relevant)
  - RAG results pre-fetched for initial context
  - Context fits within token limits

### 7.2 Session Continuity

- [ ] **TS-AG-063**: Test multi-turn conversation
  - Messages alternate: user → assistant → user → assistant
  - Conversation history maintained across turns
  - Context updates between turns (spec changes, graph changes)
  - Token usage accumulates across turns
- [ ] **TS-AG-064**: Test context updates mid-session
  - User edits spec during session → context updated
  - User navigates to different spec → context switches
  - Graph changes (new edges) reflected in subsequent turns
  - Context change does not corrupt conversation history
- [ ] **TS-AG-065**: Test session persistence
  - Session survives server restart (in-flight session recovered)
  - Session history loadable from database
  - Session context reconstructible from stored state
  - Interrupted session resumable

### 7.3 Session Termination

- [ ] **TS-AG-066**: Test explicit session end
  - User ends session → status set to 'completed'
  - Final token usage calculated and stored
  - Claude Code subprocess terminated
  - Audit log entry created
  - WebSocket notification sent: session ended
- [ ] **TS-AG-067**: Test implicit session end (timeout)
  - No messages for configured duration → session auto-ended
  - Status set to 'timed_out'
  - Resources cleaned up
  - User notified via WebSocket
- [ ] **TS-AG-068**: Test session end with pending operation
  - Agent is mid-response when session ended
  - Partial response saved
  - Subprocess terminated gracefully (SIGTERM, then SIGKILL)
  - No data corruption

---

## 8. Plan Generation Testing

### 8.1 Plan Output Validation

- [ ] **TS-AG-069**: Test plan output structure
  - Plan has title, description, and ordered steps
  - Each step has ID, description, dependencies, estimated effort
  - Steps reference spec IDs from the knowledge graph
  - Plan is valid JSON matching the plan schema
- [ ] **TS-AG-070**: Test plan step dependency validation
  - Dependencies reference other steps within the same plan
  - No circular dependencies
  - Dependency order is topologically valid
  - Steps without dependencies can run in parallel
- [ ] **TS-AG-071**: Test plan scope validation
  - Plan covers the requested scope (specified specs/features)
  - Plan does not include out-of-scope work
  - Plan references existing specs (not hallucinated)
  - Plan handles missing specs gracefully (suggests creation)

### 8.2 Delta Detection

- [ ] **TS-AG-072**: Test delta detection between graph versions
  - Detects new specs added since last plan
  - Detects modified specs since last plan
  - Detects deleted specs since last plan
  - Detects new edges (relationship changes)
  - Detects permission changes
- [ ] **TS-AG-073**: Test plan update based on deltas
  - New specs trigger plan additions
  - Modified specs trigger plan revisions
  - Deleted specs trigger plan removals
  - Delta-based update produces valid plan

### 8.3 Plan Execution Tracking

- [ ] **TS-AG-074**: Test plan execution record creation
  - Execution record created with plan reference
  - Status transitions: pending → running → completed/failed
  - Result stored in result_json
  - Agent session linked to execution
- [ ] **TS-AG-075**: Test plan step execution tracking
  - Each step's start/completion is recorded
  - Step failures don't block independent steps
  - Step results feed into subsequent dependent steps
  - Execution can be paused and resumed

#### Design Decisions

> **Q**: How should plan quality be assessed in tests?
> **A**: **Test structural validity in CI; assess usefulness manually.** CI tests verify: plan output is valid JSON, each step has required fields, dependency graph is acyclic, step types are valid enum values. Usefulness is assessed during nightly test triage and PR review of prompt changes.

> **Q**: Should plan generation tests use a reference knowledge graph with known expected plan output?
> **A**: **Yes, with structural golden tests only.** Verify the generated plan has: expected number of phases (within a range), covers all referenced spec areas, includes expected step types. Do not assert on exact step descriptions or ordering.

> **Q**: Should plan generation tests verify that generated code compiles and passes basic checks?
> **A**: **Yes, for mocked tests.** Verify: generated TypeScript code parses without syntax errors (use `ts.createSourceFile`), generated file paths don't escape the project directory. For real API tests (nightly), compilation checks are best-effort.

> **Q**: Should plan execution be tested end-to-end?
> **A**: **Yes, for a single canonical scenario with mocked tools.** Generate a plan for a small reference knowledge graph, execute each step using mocked tools, verify the expected artifacts are produced.

> **Q**: How should plan execution failures be tested?
> **A**: **Inject failures via the mock tool layer.** Configure a specific tool to return an error at a specific step. Verify: the execution engine logs the failure, retries if configured, skips or blocks dependents, reports the failure in the plan execution summary.

---

## 9. RAG Integration Testing

### 9.1 Embedding Pipeline Testing

- [ ] **TS-AG-076**: Test spec embedding generation
  - Spec content is chunked appropriately
  - Each chunk generates an embedding vector
  - Embedding dimensions match expected model output
  - Empty content handles gracefully
  - Very long content is chunked before embedding
- [ ] **TS-AG-077**: Test embedding storage and retrieval
  - Embeddings stored with spec ID and chunk reference
  - Embeddings retrievable by spec ID
  - Embeddings updated when spec content changes
  - Embeddings deleted when spec is deleted

### 9.2 RAG Query Testing

- [ ] **TS-AG-078**: Test semantic search accuracy
  - Query for "authentication" returns auth-related specs
  - Query for "database schema" returns DB-related specs
  - Similarity scores are reasonable (relevant > irrelevant)
  - Results are ordered by relevance
- [ ] **TS-AG-079**: Test RAG with permission filtering
  - User with full access gets full spec content in results
  - User with summary access gets summary_text in results
  - Specs user cannot access are excluded from results
- [ ] **TS-AG-080**: Test RAG context assembly
  - RAG results formatted for agent consumption
  - Results include spec ID, title, relevant chunk, score
  - Total context fits within token budget
  - Most relevant chunks prioritized when budget is tight

### 9.3 RAG Quality Testing

- [ ] **TS-AG-081**: Test RAG with diverse query types
  - Keyword queries return relevant results
  - Natural language questions return relevant results
  - Technical term queries return relevant results
  - Vague queries return reasonable results (or no results)
- [ ] **TS-AG-082**: Test RAG with empty/small knowledge base
  - Empty knowledge base returns no results (not error)
  - Single spec returns that spec when relevant
  - Small graph (< 10 specs) still provides useful results

#### Design Decisions

> **Q**: Should RAG tests use real embeddings (requires model/API call) or pre-computed embeddings?
> **A**: **Pre-computed embeddings for CI; real embeddings for nightly.** Store pre-computed embedding vectors as JSON fixtures. CI tests use these to test retrieval logic without API calls. The nightly job generates fresh embeddings and compares results.

> **Q**: How should pre-computed embeddings be generated and stored?
> **A**: Store as **JSON fixture files** in `test/fixtures/embeddings/`. Each file contains `{ text, embedding }` pairs. Regenerate when: the embedding model changes, the test corpus changes, or quarterly. Add a script `test/scripts/regenerate-embeddings.ts`.

> **Q**: Should RAG accuracy be measured with quantitative metrics (MRR, recall@k) or qualitative assessment?
> **A**: **Quantitative metrics in CI.** Measure **recall@5** and **MRR** against the labeled test set. Target: recall@5 > 80%, MRR > 0.5. Qualitative assessment supplements during nightly review.

> **Q**: What constitutes "good" RAG results? Is there a benchmark set of queries with expected results?
> **A**: Create a benchmark set of **30–50 queries** in `test/fixtures/rag-benchmark.json`. Each entry: `{ query, relevant_spec_ids }`. "Good" means the most relevant spec appears in the top 3 results for at least 80% of queries.

> **Q**: Should RAG quality be tracked over time?
> **A**: **Track in CI output, not a dashboard.** The RAG test job logs recall@5 and MRR in the CI summary. If quality degrades (recall@5 drops below 75%), the test fails.

> **Q**: How should RAG be tested with a very small knowledge base (< 10 specs)?
> **A**: **Test with a small corpus (10–20 specs) and adjust expectations.** With few documents, recall@5 should be near 100%. Add a separate benchmark with a larger corpus (100+ specs) for more realistic quality assessment. Small corpus is the CI default; large corpus runs nightly.

---

## 10. Knowledge Graph Operation Testing via Agents

### 10.1 Agent-Driven Spec Operations

- [ ] **TS-AG-083**: Test agent creating a spec through tool calls
  - Agent issues write_spec tool call
  - Tool creates spec files and git commit
  - New spec appears in graph
  - Indexes updated
  - User sees creation confirmation in chat
- [ ] **TS-AG-084**: Test agent updating a spec through tool calls
  - Agent issues write_spec with existing spec ID
  - Tool updates spec content and creates git commit
  - Spec version history shows agent as author
  - Diff between old and new version is correct
- [ ] **TS-AG-085**: Test agent creating an edge through tool calls
  - Agent issues create_edge tool call
  - Tool validates specs and creates edge
  - Graph visualization updates (if connected via WebSocket)
  - Edge index updated

### 10.2 Agent-Driven Graph Exploration

- [ ] **TS-AG-086**: Test agent traversing graph
  - Agent calls get_neighbors to explore graph
  - Follows edges to discover related specs
  - Assembles understanding from multiple specs
  - Provides coherent summary of graph region
- [ ] **TS-AG-087**: Test agent finding paths in graph
  - Agent finds connection between two specs
  - Returns path description (A → edge → B → edge → C)
  - Handles disconnected specs (no path exists)
- [ ] **TS-AG-088**: Test agent identifying graph issues
  - Detects orphan specs (no edges)
  - Detects missing edges (implied but not explicit relationships)
  - Creates inquiry queue items for user review
  - Provides suggestions for graph improvement

### 10.3 Agent-Driven Implication Crawl

- [ ] **TS-AG-089**: Test agent crawling graph for implications
  - Spec change triggers crawl of connected specs
  - Agent identifies specs that may be affected
  - Agent proposes updates to affected specs
  - Crawl respects depth limit (does not traverse entire graph)
- [ ] **TS-AG-090**: Test implication detection accuracy
  - Direct dependency detected → strong implication
  - Transitive dependency detected → weaker implication
  - Unrelated specs not flagged
  - Contradictions detected and reported

---

## 11. End-to-End Agent Workflow Testing

### 11.1 Knowledge Authoring Workflow

- [ ] **TS-AG-091**: Test: User asks agent to create a spec
  - User: "Create a spec about user authentication"
  - Agent: reads existing graph → proposes spec content → calls write_spec
  - Result: new spec exists in graph with content
  - Verify: git commit created, index updated, graph shows new node
- [ ] **TS-AG-092**: Test: User asks agent to update a spec
  - User: "Add OAuth support to the auth spec"
  - Agent: reads current spec → generates updated content → calls write_spec
  - Result: spec updated with OAuth details
  - Verify: git commit, version history, diff is correct
- [ ] **TS-AG-093**: Test: User asks agent to relate specs
  - User: "The auth spec depends on the user management spec"
  - Agent: verifies both specs exist → calls create_edge with 'depends-on'
  - Result: edge created in graph
  - Verify: edge file exists, graph index updated

### 11.2 Graph Exploration Workflow

- [ ] **TS-AG-094**: Test: User asks about graph structure
  - User: "What are the most connected specs?"
  - Agent: calls list_specs → calls get_neighbors for each → ranks by connection count
  - Result: agent responds with ranked list
  - Verify: ranking is correct based on actual graph
- [ ] **TS-AG-095**: Test: User asks about dependencies
  - User: "What needs to be done before we can build the auth module?"
  - Agent: finds auth spec → traverses 'depends-on' edges recursively
  - Result: agent responds with dependency tree
  - Verify: all dependencies listed, no missing nodes

### 11.3 Plan Generation Workflow

- [ ] **TS-AG-096**: Test: User requests plan generation
  - User: "Generate a plan to implement user registration"
  - Agent: gathers relevant specs → analyzes dependencies → creates plan
  - Result: structured plan with ordered steps
  - Verify: plan stored in database, execution record created
- [ ] **TS-AG-097**: Test: User requests plan update after spec changes
  - Modify specs after plan generation
  - User: "Update the plan with the latest changes"
  - Agent: detects deltas → revises plan steps
  - Verify: plan updated, delta changes reflected

### 11.4 Multi-Tool Workflow

- [ ] **TS-AG-098**: Test: Agent uses multiple tools in single response
  - User asks complex question requiring RAG + graph + spec read
  - Agent: calls search_knowledge → calls get_neighbors → calls read_spec
  - Agent assembles comprehensive response
  - Verify: all tool calls executed, results coherent
- [ ] **TS-AG-099**: Test: Agent self-corrects after tool error
  - Agent calls tool with wrong parameters → receives error
  - Agent retries with corrected parameters
  - Operation succeeds on retry
  - Verify: retry logged, final result correct

#### Design Decisions

> **Q**: Should E2E agent tests use a mocked Claude Code or the real Claude API?
> **A**: **Hybrid.** CI runs E2E agent tests with mocked Claude Code (deterministic, fast, free). A **nightly job** runs a small subset (5–10 critical flows) against the real Claude API. Never gate PR merges on real API tests.

> **Q**: Should E2E agent tests be part of the CI pipeline (every PR) or run on a schedule?
> **A**: **Mocked E2E agent tests run on every PR** (fast and deterministic). **Real API E2E tests run nightly** with a test API key and budget cap.

> **Q**: Should E2E agent tests verify the quality of agent responses or only the structure?
> **A**: **Structure only for CI; quality for nightly.** CI verifies: response is well-formed, correct tools called, correct parameters passed. Nightly real-API tests can include quality checks using fuzzy matching (contains keywords).

> **Q**: Agent responses are non-deterministic. How should tests handle this?
> **A**: **Assert on structure and key properties, not content.** Verify: response type matches, tool calls are correct, response has non-zero length, response contains expected entity references. For mocked tests, exact matching is fine since the mock returns deterministic output.

> **Q**: Should there be "golden response" tests that compare agent output to reference responses?
> **A**: **No golden response tests.** They are too brittle for LLM output. Use structural assertions and manual quality review during nightly test triage instead.

> **Q**: Should randomness in test data be seeded for reproducibility?
> **A**: **Yes, all test data uses deterministic factories.** Factories produce sequential, predictable data. The test knowledge graph structure is the same on every run. For stochastic testing, use a seeded PRNG and log the seed.

---

## 12. Agent Error & Recovery Testing

### 12.1 Agent Process Errors

- [ ] **TS-AG-100**: Test Claude Code process crash
  - Subprocess exits with non-zero code
  - Session marked as 'failed'
  - Error message stored in session
  - User notified via WebSocket
  - Retry option presented to user
- [ ] **TS-AG-101**: Test Claude Code process hang
  - Subprocess produces no output for extended period
  - Timeout triggered after configured duration
  - Process forcefully killed (SIGKILL after SIGTERM timeout)
  - Session marked as 'timed_out'
  - Partial response saved if any output was received
- [ ] **TS-AG-102**: Test Claude Code API error
  - API returns rate limit error (429)
  - Agent retries with exponential backoff
  - After max retries, session marked as 'failed'
  - User informed of API issue

### 12.2 Tool Execution Errors

- [ ] **TS-AG-103**: Test tool throws exception
  - MCP tool handler throws unexpected error
  - Error caught and formatted as tool error response
  - Error returned to agent for handling
  - Agent either retries or informs user
  - Tool error logged for monitoring
- [ ] **TS-AG-104**: Test tool returns invalid data
  - Tool returns data that doesn't match expected schema
  - Data validated before returning to agent
  - Validation failure treated as tool error
  - Agent handles gracefully
- [ ] **TS-AG-105**: Test tool timeout
  - Tool execution exceeds timeout (e.g., slow git operation)
  - Timeout detected and tool call cancelled
  - Timeout error returned to agent
  - No resource leaks (connections closed, temp files cleaned)
- [ ] **TS-AG-106**: Test concurrent tool failures
  - Multiple tools called in parallel
  - One or more fail while others succeed
  - Partial results handled correctly
  - Agent receives both successes and failures

### 12.3 Context & State Errors

- [ ] **TS-AG-107**: Test session with corrupted context
  - context_json in database is malformed
  - Session starts with empty/default context
  - Error logged but session not failed
  - Agent can still function with reduced context
- [ ] **TS-AG-108**: Test session references deleted spec
  - Spec referenced in context was deleted between turns
  - Agent gracefully handles missing spec
  - Informs user that referenced spec no longer exists
  - Session continues without the deleted spec's context
- [ ] **TS-AG-109**: Test session with revoked permissions
  - User's permission to a spec revoked mid-session
  - Agent can no longer read spec content
  - Agent falls back to summary access
  - User informed of reduced access

### 12.4 Recovery Mechanisms

- [ ] **TS-AG-110**: Test session retry
  - Failed session can be retried
  - New subprocess spawned
  - Previous conversation history loaded
  - Context rebuilt from stored state
  - Resume from last successful point
- [ ] **TS-AG-111**: Test graceful degradation
  - RAG service unavailable → agent works without RAG
  - Graph service unavailable → agent works with limited context
  - Notification service unavailable → agent continues without notifications
  - Each degradation is logged and user informed

---

## 13. Performance & Timeout Testing

### 13.1 Response Time Tests

- [ ] **TS-AG-112**: Test agent response time for simple queries
  - "What is spec X about?" → response in < 5 seconds
  - Simple text response, no tool calls
  - Measure time from message send to first chunk
- [ ] **TS-AG-113**: Test agent response time for tool-heavy queries
  - Graph traversal with 3+ tool calls → response in < 15 seconds
  - Measure total time including all tool executions
  - Identify bottleneck tool calls
- [ ] **TS-AG-114**: Test agent response time for plan generation
  - Small plan (5-10 steps) → response in < 30 seconds
  - Large plan (50+ steps) → response in < 2 minutes
  - Measure per-step generation time

### 13.2 Timeout Configuration Tests

- [ ] **TS-AG-115**: Test session timeout enforcement
  - Session with no activity for configured idle timeout → auto-close
  - Session active for longer than max duration → auto-close
  - Timeout configurable per agent type
  - Timeouts fire correctly (not early, not late)
- [ ] **TS-AG-116**: Test tool call timeout enforcement
  - Individual tool call timeout (e.g., 30 seconds per tool)
  - Total tool chain timeout (e.g., 2 minutes for all tools)
  - Timed-out tool returns error response to agent
- [ ] **TS-AG-117**: Test streaming timeout
  - If no new chunks received for N seconds, consider stream stalled
  - Stalled stream triggers stream interruption handling
  - Configurable stall detection duration

### 13.3 Resource Usage Tests

- [ ] **TS-AG-118**: Test token usage tracking
  - Token count per message is tracked
  - Cumulative session token count is accurate
  - Token limit per session enforced (if configured)
  - Near-limit warning sent to user
- [ ] **TS-AG-119**: Test memory usage during long sessions
  - 50-turn conversation doesn't leak memory
  - Context truncation keeps memory bounded
  - Old messages eligible for garbage collection
- [ ] **TS-AG-120**: Test concurrent session handling
  - Multiple sessions active simultaneously
  - Each session has isolated subprocess
  - Sessions don't interfere with each other
  - System handles max concurrent sessions limit

### 13.4 Stress Testing

- [ ] **TS-AG-121**: Test rapid message sending
  - User sends multiple messages before agent responds
  - Messages queued and processed in order
  - No messages lost or duplicated
  - Agent receives full message history
- [ ] **TS-AG-122**: Test large message handling
  - User sends very long message (10K+ characters)
  - Agent processes without truncation issues
  - Response handles long context
- [ ] **TS-AG-123**: Test many tool calls in single session
  - Agent makes 20+ tool calls in one response cycle
  - All tools execute correctly
  - Results aggregated without data loss
  - Response time remains reasonable

#### Design Decisions

> **Q**: What are acceptable response times for different agent operations? Should these measure time to first token or complete response?
> **A**: Measure **time to first token** (TTFT). Baselines (TTFT): simple chat < 2 seconds, tool-heavy response < 5 seconds, plan generation < 10 seconds. Total completion: simple chat < 10s, tool-heavy < 30s, plan generation < 2 minutes. These apply to real API tests (nightly). Track baselines manually.

> **Q**: Should performance tests measure throughput (agents per second) in addition to latency?
> **A**: **Not initially.** The system is a professional tool for small teams. Add throughput testing if the user base exceeds 50 concurrent users. Focus on single-session latency first.

> **Q**: Should there be per-user limits on agent usage?
> **A**: **Yes, implement and test limits.** Enforce: max 3 concurrent agent sessions per user, configurable daily token budget per user. Test: creating a 4th session returns 429, exceeding the token budget returns a budget-exhausted error.

> **Q**: Should there be limits on the size of agent responses?
> **A**: **Yes.** Set a maximum response token limit (e.g., 16K tokens). If exceeded, truncate and append a "response truncated" notice. Test: mock agent returns response exceeding the limit → verify truncation occurs.

> **Q**: What happens when the system reaches maximum concurrent agent sessions?
> **A**: **Queue with a short timeout.** When max concurrent sessions (system-wide cap, e.g., 20) is reached, new requests enter a queue. If not dequeued within 30 seconds, return 503 with a retry-after header. Test: fill all slots, submit one more, verify it queues, then verify it either dequeues or times out.

---

## Additional Design Decisions

> **Q**: Should tests verify that agent operations produce correct telemetry (metrics, traces, logs)?
> **A**: **Yes, for critical telemetry.** Verify: each agent session emits start and end metrics with duration, tool calls are logged with tool name and latency, errors are logged with error type and context. Use a mock telemetry collector. Assert on presence of key fields, not log message formatting.

> **Q**: Should there be tests for the agent health check endpoint?
> **A**: **Yes.** Test: health check returns 200 when Claude Code subprocess can be spawned, returns 503 when subprocess fails to start (mock `spawn` to throw), includes response time metric. This is a simple integration test in `agent-health.integration.test.ts`.

> **Q**: Should tests verify that agent errors trigger correct alerts?
> **A**: **Test the alerting logic, not the alert delivery.** Verify: the failure rate tracker correctly counts failures within a time window, crossing the threshold triggers the alert callback, the alert payload contains required fields. Mock the alert delivery mechanism.

---

## Summary

### Task Count by Section

| Section                                   | Tasks                            |
| ----------------------------------------- | -------------------------------- |
| 1. Agent Test Infrastructure              | 8 (TS-AG-001 through TS-AG-008)  |
| 2. Claude Code Wrapper Testing            | 9 (TS-AG-009 through TS-AG-017)  |
| 3. MCP Server Testing                     | 19 (TS-AG-018 through TS-AG-036) |
| 4. Agent Routing & Classification Testing | 9 (TS-AG-037 through TS-AG-045)  |
| 5. Agent Output Parsing Testing           | 9 (TS-AG-046 through TS-AG-054)  |
| 6. Prompt Template Testing                | 6 (TS-AG-055 through TS-AG-060)  |
| 7. Agent Session Lifecycle Testing        | 8 (TS-AG-061 through TS-AG-068)  |
| 8. Plan Generation Testing                | 7 (TS-AG-069 through TS-AG-075)  |
| 9. RAG Integration Testing                | 7 (TS-AG-076 through TS-AG-082)  |
| 10. Knowledge Graph Operations via Agents | 8 (TS-AG-083 through TS-AG-090)  |
| 11. End-to-End Agent Workflow Testing     | 9 (TS-AG-091 through TS-AG-099)  |
| 12. Agent Error & Recovery Testing        | 12 (TS-AG-100 through TS-AG-111) |
| 13. Performance & Timeout Testing         | 12 (TS-AG-112 through TS-AG-123) |
| **TOTAL**                                 | **123**                          |

### Dependencies (What This Plan Enables)

Completion of this plan provides:

- Confidence that agent orchestration correctly routes and processes requests
- Verified MCP tool implementations for all knowledge graph operations
- Validated prompt construction and output parsing
- Error recovery and graceful degradation testing
- Performance baselines for agent response times

### Definition of Done

This plan is complete when:

- [ ] Claude Code wrapper has tests for all lifecycle events (spawn, stream, close)
- [ ] Every MCP tool has tests for success, error, and permission scenarios
- [ ] Agent routing classifies all request types correctly
- [ ] Output parsing handles all response formats (text, tool calls, streaming)
- [ ] Prompt templates produce valid, well-formed prompts without leaking data
- [ ] Agent session lifecycle is tested from creation through termination
- [ ] Plan generation produces valid, structured plans
- [ ] RAG integration returns relevant results with correct permission filtering
- [ ] End-to-end workflows complete successfully with mocked Claude Code
- [ ] Error recovery handles crashes, timeouts, and tool failures gracefully
- [ ] Performance tests establish response time baselines
- [ ] Agent test coverage meets target (85%+ line coverage)
