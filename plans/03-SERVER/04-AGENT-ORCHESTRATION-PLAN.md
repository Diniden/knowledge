# 03-SERVER / 04 — AGENT ORCHESTRATION PLAN

> **Purpose**: Define the complete agent orchestration system including Claude
> Code wrapper design, agent session lifecycle, request routing and intent
> classification, sub-agent delegation via MCP tools, context management,
> concurrent session handling, output parsing, error handling, timeout and
> retry strategies, queue management, and cost tracking.
>
> **Phase**: 3 (Agent Integration)
> **Dependencies**: `03-SERVER/01-ARCHITECTURE-PLAN.md`, `06-AGENT-SYSTEM/01-ARCHITECTURE-PLAN.md`
> **Estimated tasks**: 160+

---

## Table of Contents

1. [Claude Code Wrapper](#1-claude-code-wrapper)
2. [Agent Session Lifecycle](#2-agent-session-lifecycle)
3. [Request Routing & Intent Classification](#3-request-routing--intent-classification)
4. [Sub-Agent Delegation via MCP](#4-sub-agent-delegation-via-mcp)
5. [Agent Context Management](#5-agent-context-management)
6. [Concurrent Session Handling](#6-concurrent-session-handling)
7. [Agent Output Parsing](#7-agent-output-parsing)
8. [Error Handling for Agents](#8-error-handling-for-agents)
9. [Timeout & Retry Strategies](#9-timeout--retry-strategies)
10. [Agent Queue Management](#10-agent-queue-management)
11. [Cost Tracking & Usage Monitoring](#11-cost-tracking--usage-monitoring)
12. [Agent Configuration & Skills](#12-agent-configuration--skills)

---

## 1. Claude Code Wrapper

### 1.1 Process Spawning

- [ ] **SV-ORCH-001**: Create `ClaudeCodeWrapperService` as NestJS injectable
  - Inject `ConfigService` for Claude Code path and configuration
  - Inject `LoggerService` for operation logging
  - Implement `Disposable` pattern for cleanup on module destroy
- [ ] **SV-ORCH-002**: Implement `spawn(options: SpawnOptions): Promise<AgentProcess>`
  - Spawn Claude Code as a child process using Bun's `spawn()` or `child_process.spawn()`
  - Set working directory to the project's knowledge graph root
  - Pass environment variables: `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`, project context
  - Set `stdio: ['pipe', 'pipe', 'pipe']` for stdin/stdout/stderr communication
  - Track spawned process PID
  - Return `AgentProcess` handle with communication methods
- [ ] **SV-ORCH-003**: Define `SpawnOptions` interface
  - `projectPath`: string — working directory for the agent
  - `env`: Record<string, string> — environment variables
  - `timeout`: number — max process lifetime in ms
  - `memoryLimit`: number — max memory in MB (optional)
  - `mcpConfig`: MpcServerConfig[] — MCP servers to make available
  - `systemPrompt`: string — initial system instructions
- [ ] **SV-ORCH-004**: Define `AgentProcess` interface
  - `pid`: number — process ID
  - `sessionId`: string — associated session ID
  - `status`: ProcessStatus enum
  - `send(input: string): Promise<void>` — write to stdin
  - `onOutput(callback: (chunk: string) => void): void` — subscribe to stdout
  - `onError(callback: (error: string) => void): void` — subscribe to stderr
  - `kill(signal?: string): Promise<void>` — terminate process
  - `isAlive(): boolean` — check if process is running

### 1.2 Process Communication Protocol

- [ ] **SV-ORCH-005**: Implement stdin message protocol
  - Format messages as JSON-delimited lines to Claude Code stdin
  - Include message type: `prompt`, `context_update`, `cancel`
  - Include session metadata with each message
  - Handle backpressure (stdin buffer full)
- [ ] **SV-ORCH-006**: Implement stdout parsing protocol
  - Read Claude Code stdout as a stream
  - Parse streaming output chunks
  - Detect message boundaries (tool use markers, response completion)
  - Buffer partial messages until complete
  - Forward complete messages to session handler
- [ ] **SV-ORCH-007**: Implement stderr monitoring
  - Capture all stderr output
  - Parse for error patterns (API errors, runtime errors, OOM)
  - Classify error severity: warning, error, fatal
  - Forward errors to session error handler
  - Log all stderr at `warn` level minimum
- [ ] **SV-ORCH-008**: Implement streaming output forwarding
  - Forward Claude Code output chunks to WebSocket in real-time
  - Buffer small chunks for efficient transmission (batch within 100ms)
  - Detect and forward "thinking" indicators
  - Detect and forward "tool use" events
  - Detect and forward final response text

### 1.3 MCP Server Configuration

- [ ] **SV-ORCH-009**: Configure MCP servers for Claude Code instances
  - Define available MCP servers per project configuration
  - Knowledge Graph MCP server — graph read/write operations
  - RAG MCP server — semantic search tools
  - Spec CRUD MCP server — spec create/update/delete
  - GenUI MCP server — generative UI creation tools
  - Plan MCP server — plan generation tools
- [ ] **SV-ORCH-010**: Implement dynamic MCP server resolution
  - Resolve MCP server paths at agent spawn time
  - Pass MCP config to Claude Code via command-line args or config file
  - Validate MCP servers are available before spawning
  - Log available MCP tools per session
- [ ] **SV-ORCH-011**: Implement MCP server health checking
  - Verify each MCP server is responsive before agent spawn
  - Retry unreachable servers (3 attempts with 1s backoff)
  - Degrade gracefully if non-critical MCP servers are unavailable
  - Report MCP server status in agent session metadata

### 1.4 System Prompt Construction

- [ ] **SV-ORCH-012**: Build system prompt dynamically per session
  - Include base agent instructions (role, capabilities, constraints)
  - Include project context (project name, description, structure)
  - Include user context (username, role, permissions)
  - Include available MCP tools summary
  - Include current graph state summary (node count, recent changes)
  - Include conversation history context window
- [ ] **SV-ORCH-013**: Implement prompt template management
  - Store prompt templates as configurable files
  - Support variable interpolation in templates: `{{project.name}}`, `{{user.role}}`
  - Version prompt templates for A/B testing and improvement
  - Log which template version was used per session
- [ ] **SV-ORCH-014**: Implement prompt size management
  - Calculate token count for system prompt (approximate)
  - Truncate context if system prompt exceeds limits
  - Prioritize recent context over older context
  - Log effective prompt size per session

#### Design Decisions

> **Q**: How exactly does the server communicate with Claude Code? Via CLI stdin/stdout, an HTTP API, or the Claude Code SDK?
> **A**: Via the `claude` CLI in headless mode using `--print` for single-turn prompts and `--output-format stream-json` for structured streaming output. The server spawns `claude` as a subprocess via `Bun.spawn()`, passing the prompt as a CLI argument or via stdin. Claude Code outputs JSON-structured events to stdout (text chunks, tool calls, tool results, completion). The server parses these events line-by-line from the stdout stream. This is the documented, supported integration path.

> **Q**: Does Claude Code support a "headless" or "server" mode where it runs without a terminal UI, or does it always expect an interactive terminal?
> **A**: Yes. The `--print` flag runs Claude Code without the interactive terminal UI. Combined with `--output-format stream-json`, it operates fully headless: prompt in via CLI args or stdin, structured JSON events out via stdout, no terminal rendering. This is the intended mode for programmatic integration.

> **Q**: What is Claude Code's output format? Is it plain text, JSON-structured events, or a streaming protocol?
> **A**: With `--output-format stream-json`, Claude Code emits newline-delimited JSON (NDJSON). Each line is a JSON object with a `type` field: `assistant`, `tool_use`, `tool_result`, `result`, `error`, etc. Text content arrives as `assistant` events with `content` containing text chunks. The server parses each line as JSON and dispatches based on the `type` field. Use a streaming line parser on stdout.

> **Q**: Can Claude Code be configured to use specific MCP servers programmatically (via arguments or config file), or does it always read from its own configuration?
> **A**: Both. Claude Code reads MCP server configuration from its settings file (`~/.claude/settings.json` or project-level `.claude/settings.json`). The server creates a project-level `.claude/settings.json` in each project directory specifying the MCP servers (stdio transport) to use. MCP servers can also be specified via the `--mcp-config` CLI flag. Use the project-level config file approach — it persists across sessions and is version-controllable.

> **Q**: Should Claude Code processes be long-lived (one per user session, stays running between messages) or short-lived (spawn per request, terminate after response)?
> **A**: Short-lived with session resume. Spawn a new `claude` process per user message using `--resume <sessionId>` to continue the conversation. Claude Code persists conversation state to disk between invocations, so context is preserved without holding a process in memory. The process exits after completing the response. This uses resources only during active work and scales better (no idle processes).

> **Q**: How does Claude Code handle conversation history? Does it maintain context internally across multiple stdin inputs, or does the server need to resend full history with each prompt?
> **A**: Claude Code maintains conversation history internally on disk when using the `--resume` flag. The server does NOT need to resend history. Each `--resume <sessionId>` call loads the previous conversation from Claude Code's internal storage (~/.claude/projects/ directory). The server separately persists dialog history in PostgreSQL as a reference log, but does not pass it back to Claude Code.

> **Q**: What happens when a Claude Code process is killed mid-operation? Does it leave partial changes (files written, git commits made), or are operations atomic?
> **A**: Claude Code does NOT guarantee atomicity. If killed mid-operation, partial changes may exist: files partially written, some specs created but not others, no git commit for the changes. The server must handle this: on process crash, check the working tree for uncommitted changes (`git status`). If dirty state exists, either commit with a `[partial]` marker or reset to the last clean state. The user is notified of the incomplete operation and can choose to keep or discard partial changes.

> **Q**: Can multiple Claude Code instances run concurrently on the same machine without interference? Are there shared resources or locks?
> **A**: Yes, multiple instances run concurrently. Each instance operates in its own working directory (project path) with its own session ID. Claude Code does not use machine-level locks. However, two instances writing to the same project directory can cause file conflicts — the server's per-project write queue prevents this by serializing agent operations per project.

> **Q**: How much memory does a typical Claude Code process consume?
> **A**: A Claude Code process (Node.js under the hood) consumes ~50-100MB of memory during active operation. With a 10-process concurrency limit, peak memory for agent processes is ~1GB. The server itself (NestJS + Bun) uses ~100-200MB. Total server memory requirement: 2-4GB recommended for comfortable headroom. The processes are short-lived, so memory is returned quickly after each message completes.

> **Q**: Does Claude Code make its own network calls to the Claude API, or does the server need to proxy API calls?
> **A**: Claude Code makes its own network calls to the Anthropic API. The server provides the API key via the `ANTHROPIC_API_KEY` environment variable which Claude Code reads automatically. No proxying needed. The server manages the API key securely (never logged, never exposed via API). Rate limiting against the Anthropic API is handled by the concurrency semaphore (10 concurrent processes cap).

> **Q**: Is there a way to limit Claude Code's resource consumption (CPU, memory, disk I/O) via cgroup, ulimit, or similar mechanisms?
> **A**: Claude Code processes can be resource-limited via `ulimit` settings when spawning: `ulimit -v 512000` (512MB virtual memory), `ulimit -t 600` (10 min CPU time). On Linux, cgroups v2 provide more granular control. For the initial release, rely on the 5-minute operation timeout and 10-process concurrency limit as the primary resource constraints. Add `ulimit` or cgroup enforcement if monitoring shows resource abuse.

---

## 2. Agent Session Lifecycle

### 2.1 Session States

- [ ] **SV-ORCH-015**: Define `AgentSessionStatus` enum
  - `INITIALIZING` — session created, process spawning
  - `ACTIVE` — process running, ready for input
  - `PROCESSING` — agent is processing a user message
  - `WAITING_APPROVAL` — agent proposed an action, awaiting user approval
  - `PAUSED` — session paused by user (process alive but idle)
  - `ERROR` — session encountered a recoverable error
  - `TERMINATING` — graceful shutdown in progress
  - `TERMINATED` — session ended, process dead
- [ ] **SV-ORCH-016**: Define valid state transitions
  ```
  INITIALIZING → ACTIVE (process ready)
  INITIALIZING → ERROR (spawn failed)
  ACTIVE → PROCESSING (user sends message)
  PROCESSING → ACTIVE (response complete)
  PROCESSING → WAITING_APPROVAL (action proposed)
  PROCESSING → ERROR (processing failed)
  WAITING_APPROVAL → PROCESSING (user approves/rejects)
  WAITING_APPROVAL → ACTIVE (action cancelled)
  ACTIVE → PAUSED (user pauses)
  PAUSED → ACTIVE (user resumes)
  ANY → TERMINATING (termination requested)
  TERMINATING → TERMINATED (process exited)
  ERROR → ACTIVE (error recovered)
  ERROR → TERMINATED (unrecoverable)
  ```
- [ ] **SV-ORCH-017**: Implement state machine for session transitions
  - Validate transitions before applying
  - Reject invalid transitions with descriptive error
  - Emit events on state changes
  - Log all state transitions with timestamps

### 2.2 Session Creation

- [ ] **SV-ORCH-018**: Implement `createSession()` in `AgentSessionService`
  - Validate user has capacity for a new session
  - Generate session ID (UUID v4)
  - Create session record in memory (or database for persistence)
  - Set initial state: `INITIALIZING`
  - Spawn Claude Code process via `ClaudeCodeWrapperService`
  - Transition to `ACTIVE` on successful spawn
  - Transition to `ERROR` on spawn failure
  - Emit `agent.session.started` event
  - Return session metadata to caller
- [ ] **SV-ORCH-019**: Implement session metadata storage
  - `sessionId`: UUID
  - `userId`: UUID (session owner)
  - `projectId`: UUID
  - `status`: AgentSessionStatus
  - `processPid`: number (null if not spawned)
  - `context`: object (what user is working on)
  - `createdAt`: timestamp
  - `lastActivityAt`: timestamp
  - `messageCount`: number
  - `errorCount`: number
  - `tokensUsed`: number (approximate)
- [ ] **SV-ORCH-020**: Store session metadata for persistence
  - In-memory Map for active sessions (fast lookup)
  - Database table for session history and audit
  - Sync in-memory state to database periodically (every 30s)
  - Persist final state on session termination

### 2.3 Session Termination

- [ ] **SV-ORCH-021**: Implement `terminateSession()` in `AgentSessionService`
  - Transition to `TERMINATING` state
  - Send graceful shutdown signal to Claude Code process
  - Wait for process to exit (timeout: 10 seconds)
  - Force kill if process doesn't exit within timeout
  - Clean up temporary files created by agent
  - Update session metadata with final state
  - Emit `agent.session.ended` event
  - Notify user via WebSocket
- [ ] **SV-ORCH-022**: Implement automatic session cleanup
  - Terminate sessions idle for configurable duration (default: 30 minutes)
  - Terminate sessions exceeding max lifetime (default: 4 hours)
  - Run cleanup check every 5 minutes
  - Log terminated sessions with reason
- [ ] **SV-ORCH-023**: Implement session persistence for resume (optional)
  - Save conversation history to database on termination
  - Allow new session to load previous conversation context
  - Not a true resume (new process, but with history)

#### Design Decisions

> **Q**: Should agent sessions survive server restarts?
> **A**: Sessions survive server restarts. Session metadata (session ID, user ID, project ID, status, created timestamp) is stored in PostgreSQL. Conversation history is stored in PostgreSQL. Claude Code's internal session state persists on disk. On server restart, sessions are marked as `interrupted`. Users can resume an interrupted session — the server spawns a new Claude Code process with `--resume` and the session continues. No active in-flight operations survive a restart; they fail and notify the user.

> **Q**: Should users be able to "resume" a previous conversation?
> **A**: Yes. Users can resume any previous session that hasn't been deleted. The server spawns Claude Code with `--resume <sessionId>`. Claude Code reloads its own conversation state. The behavior may not be byte-identical to continuing the original process, but it's semantically equivalent. The user sees a "Resuming session..." indicator. Sessions older than the configured retention period are not resumable (history may be pruned).

> **Q**: How should session state be stored? In-memory only, in PostgreSQL, or in Redis?
> **A**: PostgreSQL for session metadata and conversation history (persistent, queryable, consistent with the rest of the data model). In-memory for active session runtime state (process reference, WebSocket connections, current operation status). On restart, in-memory state is lost but PostgreSQL state survives. No Redis needed — PostgreSQL handles the persistence, and runtime state is reconstructed from the database on resume.

> **Q**: What should the per-user concurrent session limit be?
> **A**: 3 concurrent active sessions per user. A session is "active" when a Claude Code process is running. Idle sessions (no in-flight operation) don't count against the limit. Users can have unlimited idle sessions. This means a user can have multiple open conversation threads but only 3 actively processing at once.

> **Q**: What should the system-wide concurrent session limit be?
> **A**: 10 concurrent active sessions system-wide (configurable via `MAX_CONCURRENT_AGENTS=10`). This is the concurrency semaphore for Claude Code processes. Start with 10, monitor Anthropic API rate limit responses and server memory, and adjust.

> **Q**: Should idle sessions be automatically terminated?
> **A**: Idle sessions are not terminated (they have no running process and consume no resources). The session record in PostgreSQL persists until the retention period expires. There is no "idle timeout" because short-lived processes mean there's nothing to terminate when idle. If the user stops sending messages, the last Claude Code process has already exited. The session is simply "paused" and resumable.

> **Q**: Should there be different session limits for different user roles?
> **A**: No, same limits for all roles. 3 concurrent active sessions per user regardless of role. The system-wide limit (10) is the real constraint. Differentiating by role adds configuration complexity for marginal benefit.

> **Q**: Can a single session be used across multiple documents within the same project, or should each document get its own session?
> **A**: A session is scoped to a project, not a document. The user can discuss any document or spec within the project during a single session. The agent can navigate between documents, create specs in different documents, and manage edges across the project.

> **Q**: Should there be a "global" agent session not tied to a specific document/spec?
> **A**: Every session is already project-scoped (not document-scoped), so all sessions are "global" within their project. There's no need for a separate "global" session type.

> **Q**: When the user navigates to a different document mid-conversation, should the session context update automatically?
> **A**: The frontend sends a context event via WebSocket (`context:navigate { documentId, specId }`) when the user navigates. The server includes this context in the next message sent to Claude Code (as a system-level note: "User is now viewing document X, spec Y"). The agent adapts naturally — it can reference the current document/spec without the user explicitly saying "switch to document X."

---

## 3. Request Routing & Intent Classification

### 3.1 Intent Classification

- [ ] **SV-ORCH-024**: Define agent request intent types
  - `KNOWLEDGE_MUTATION` — user wants to create/update/delete specs or edges
  - `DIALOG` — user is asking a question or having a conversation
  - `GENERATIVE_UI` — user wants the agent to generate a UI component
  - `GRAPH_QUERY` — user wants to query/traverse the knowledge graph
  - `PLAN_GENERATION` — user wants to generate an execution plan
  - `GRAPH_CRAWL` — agent needs to crawl graph for context before acting
  - `CLARIFICATION` — agent needs to ask the user a clarifying question
  - `MULTI_STEP` — request requires multiple sequential operations
- [ ] **SV-ORCH-025**: Implement intent classifier
  - Initial implementation: keyword-based classification rules
  - Detect mutation keywords: "create", "add", "update", "change", "delete", "remove"
  - Detect query keywords: "find", "search", "show", "list", "what is", "how"
  - Detect UI keywords: "generate UI", "build a", "create interface", "show me"
  - Detect plan keywords: "generate plan", "create execution", "build steps"
  - Fallback: send to Claude Code for LLM-based classification
- [ ] **SV-ORCH-026**: Implement LLM-based intent classification (phase 3b)
  - Use a lightweight prompt to classify user intent
  - Include recent conversation context for better classification
  - Return confidence score with classification
  - If confidence < threshold, ask user to clarify
  - Cache classification results for identical messages

### 3.2 Request Router

- [ ] **SV-ORCH-027**: Implement `AgentRouter` service
  - Receive classified user request
  - Route to appropriate handler based on intent type
  - Knowledge mutations → agent with graph + spec MCP tools
  - Dialog questions → agent with RAG + graph query tools
  - Generative UI → agent with gen-UI MCP tools
  - Graph queries → direct graph service call (no agent needed for simple queries)
  - Plan generation → agent with plan generation MCP tools
- [ ] **SV-ORCH-028**: Implement routing decision logging
  - Log: user message summary, classified intent, confidence, chosen route
  - Track routing accuracy (for future improvement)
  - Log time spent in classification
- [ ] **SV-ORCH-029**: Implement routing fallback strategy
  - If classification is uncertain, send full message to main Claude Code agent
  - Let the agent decide how to handle the request
  - Agent has access to all MCP tools as fallback
  - Log when fallback is used (indicates classifier needs improvement)

### 3.3 Multi-Step Request Handling

- [ ] **SV-ORCH-030**: Implement multi-step request decomposition
  - Detect requests that require multiple operations
  - Decompose into ordered steps (e.g., "search graph, then create spec, then add edges")
  - Execute steps sequentially, passing results between steps
  - Report progress to user via WebSocket between steps
- [ ] **SV-ORCH-031**: Implement step dependency tracking
  - Build step dependency graph
  - Execute independent steps in parallel where possible
  - Wait for dependencies before starting dependent steps
  - Roll back completed steps if a later step fails (optional)
- [ ] **SV-ORCH-032**: Implement multi-step progress reporting
  - Report: total steps, current step, step description, estimated time
  - Update WebSocket with each step transition
  - Allow user to cancel remaining steps
  - Show completed step results as they finish

#### Design Decisions

> **Q**: Should intent classification happen server-side (before sending to Claude Code) or should Claude Code handle routing internally via its system prompt?
> **A**: Claude Code handles routing internally via its system prompt. The system prompt defines the available agent roles (KG agent, dialog agent, plan gen agent, etc.) and instructs Claude to route requests to the appropriate MCP tool set. Server-side classification would duplicate Claude's natural language understanding at lower quality. The orchestrator agent IS Claude Code — it classifies intent, selects tools, and executes. The server provides the tools via MCP; Claude decides which to use.

> **Q**: Is a keyword-based classifier sufficient for the initial release, or should the first version use LLM-based classification?
> **A**: Neither as a separate step. Claude Code IS the classifier. The system prompt instructs it on how to handle different request types. No pre-classification step is needed. Claude naturally understands "create a spec about authentication" vs. "show me related specs" and selects the appropriate MCP tools. Adding a pre-classifier is redundant and adds latency.

> **Q**: How should multi-intent requests be handled?
> **A**: Handled as a single complex operation by Claude Code. Claude naturally decomposes multi-intent requests into sequential tool calls. For "Create a spec about authentication AND show me related specs," Claude will: (1) call the spec creation MCP tool, (2) call the graph query MCP tool, (3) synthesize both results in its response. No splitting needed — this is what LLMs are good at.

> **Q**: Should simple graph queries bypass the agent entirely and go directly to the graph service?
> **A**: No bypass. All user messages go through the agent. For simple queries, the agent responds quickly by calling the graph query MCP tool and returning the results with minimal commentary. The agent adds value even for simple queries: it can format results nicely, suggest related actions, and maintain conversation context. The latency difference (API call overhead) is 2-5 seconds — acceptable for the improved UX.

> **Q**: Should the routing be configurable per project?
> **A**: Yes, via project-level settings stored in the knowledge graph repo (`.botnet/config.json`). Settings include: `confirmMutations: boolean` (default: true), `agentVerbosity: "concise"|"detailed"` (default: "concise"). These settings are included in the Claude Code system prompt. Keep the configuration surface small — 2-3 settings max.

> **Q**: Should the user be able to override the classified intent?
> **A**: Not as a separate mechanism. The user simply rephrases or explicitly states their intent in the conversation. Claude Code handles this naturally as conversation context. No formal "override" UI is needed.

---

## 4. Sub-Agent Delegation via MCP

### 4.1 MCP Tool Integration

- [ ] **SV-ORCH-033**: Define MCP tool categories available to agents
  - **Knowledge Graph Tools**: read_node, write_node, read_edge, create_edge, delete_edge, traverse, search
  - **Spec Tools**: read_spec, create_spec, update_spec, delete_spec, list_specs
  - **RAG Tools**: semantic_search, get_similar_specs, embed_spec
  - **GenUI Tools**: create_gen_ui, list_gen_ui, get_gen_ui_status
  - **Plan Tools**: generate_plan, get_plan_status, list_plans
  - **Git Tools**: commit_changes, get_diff, get_history
  - **Dialog Tools**: send_message, ask_clarification, propose_action
- [ ] **SV-ORCH-034**: Implement MCP tool call interception
  - Monitor Claude Code's MCP tool calls via stdout parsing
  - Log each tool call: tool name, arguments, result, duration
  - Apply permission checks before allowing tool execution
  - Reject tool calls that exceed user's permissions
  - Rate limit tool calls per session
- [ ] **SV-ORCH-035**: Implement MCP tool result formatting
  - Format tool call results consistently for Claude Code consumption
  - Include success/failure status
  - Include relevant error messages on failure
  - Truncate large results to stay within context limits
  - Track cumulative context size per session

### 4.2 Sub-Agent Delegation

- [ ] **SV-ORCH-036**: Implement sub-agent spawning for specialized tasks
  - Main orchestrator agent delegates to specialized sub-agents
  - Each sub-agent has a restricted set of MCP tools
  - Sub-agents are short-lived (task-specific, not session-persistent)
  - Sub-agent results fed back to orchestrator
- [ ] **SV-ORCH-037**: Define sub-agent types
  - **Knowledge Graph Agent**: graph traversal, edge analysis, node analysis
  - **Spec Writer Agent**: spec content generation and refinement
  - **RAG Query Agent**: semantic search and context retrieval
  - **GenUI Agent**: UI code generation within sandbox
  - **Plan Agent**: plan structure generation from graph
- [ ] **SV-ORCH-038**: Implement sub-agent result merging
  - Collect results from multiple sub-agents
  - Merge into coherent response for user
  - Resolve conflicts between sub-agent outputs
  - Present unified view via orchestrator agent
- [ ] **SV-ORCH-039**: Implement sub-agent isolation
  - Each sub-agent sees only relevant context
  - Sub-agents cannot access other sub-agents' state
  - Sub-agents cannot modify outside their scope
  - Enforce resource limits per sub-agent

### 4.3 Tool Permission Enforcement

- [ ] **SV-ORCH-040**: Implement per-user tool access control
  - Check user's project role before allowing tool execution
  - `viewer` role: read-only tools only
  - `member` role: read + write tools
  - `admin`/`owner` role: all tools including admin tools
  - Log permission denials
- [ ] **SV-ORCH-041**: Implement per-spec tool access control
  - Before spec read/write via MCP, check spec-level permission
  - Full access: allow read and write
  - Summary access: allow summary read only
  - Reject with informative error (tool returns "permission denied" not crash)
- [ ] **SV-ORCH-042**: Implement tool call auditing
  - Log every MCP tool call with full context
  - Store: sessionId, userId, toolName, args (sanitized), result (summary), timestamp
  - Enable audit trail for all agent-performed mutations
  - Query audit by session, user, tool, or time range

#### Design Decisions

> **Q**: How granular should MCP tools be? Should there be one `graph_mutate` tool or separate tools per operation?
> **A**: Granular tools. Separate tools for each operation: `create_spec`, `update_spec`, `delete_spec`, `create_edge`, `update_edge`, `delete_edge`, `query_graph`, `get_spec`, `list_specs`, `search_specs`, `get_graph_neighbors`, `create_document`, `commit_changes`. Each tool has a clear input schema and description. Claude performs better with well-defined, single-purpose tools than with multi-modal tools that require mode parameters.

> **Q**: Should MCP tools perform validation themselves or trust the calling agent?
> **A**: Tools always validate. Never trust the calling agent for data integrity. Each MCP tool validates its input (schema validation, referential integrity for edges, permission checks for spec access). Invalid inputs return clear error messages that Claude can use to self-correct. Validation at the tool level is the last line of defense and prevents corrupted knowledge graphs regardless of what the agent sends.

> **Q**: Should MCP tool calls be synchronous or support async patterns?
> **A**: Synchronous. MCP tools over stdio are request-response: the agent sends a tool call, the MCP server processes it, returns the result, and the agent continues. Claude Code's tool-calling flow is inherently synchronous (call tool, get result, decide next step). Async patterns add complexity without benefit since the agent needs the result before deciding what to do next.

> **Q**: Should sub-agents be separate Claude Code processes, or separate prompts sent to the same process?
> **A**: Sub-agents are implemented as MCP tool calls within the same Claude Code process, not as separate processes. The "KG agent" is the set of KG-related MCP tools; the "plan gen agent" is the plan generation MCP tool, etc. Agent "types" from the PRD map to MCP tool groupings, not separate LLM instances. The orchestrator (Claude Code) decides which tools to call, effectively "delegating" to sub-agents by calling their tool sets. This is simpler, cheaper, and faster than spawning separate processes.

> **Q**: How many levels of sub-agent delegation should be allowed?
> **A**: One level. The orchestrator (Claude Code) calls MCP tools directly. MCP tools do not spawn additional Claude Code processes. If a tool needs complex logic (e.g., plan generation requires analyzing multiple specs), that logic runs in the MCP server's code (TypeScript), not in a nested LLM call. This keeps costs predictable and avoids recursive LLM invocations.

> **Q**: How should sub-agent failures affect the parent agent?
> **A**: The MCP tool returns an error result to Claude Code, which decides the next step. Claude naturally handles tool errors: it may retry with corrected parameters, try an alternative approach, or inform the user that the operation failed and why. The server does not implement retry logic at the MCP layer — that's the orchestrator's job. If a tool fails 3 times in a row, the system prompt instructs Claude to stop and inform the user.

> **Q**: Should MCP tools have their own authentication or inherit the user's session?
> **A**: Inherit the user's session. When the server spawns Claude Code, it configures the MCP servers with the user's session context (user ID, project ID, permission set). The MCP tools receive this context with every call and use it for permission checks. No separate tool-level auth — the tools operate under the authenticated user's identity.

> **Q**: Should there be a "dry run" mode where agents can preview tool results without actually executing mutations?
> **A**: Yes. MCP mutation tools (`create_spec`, `update_spec`, `delete_spec`, etc.) accept a `dryRun: boolean` parameter. When true, the tool validates the input, computes what would change, and returns a preview without writing to disk or committing. The agent uses this in the "confirm before mutation" flow: dry-run first, present the preview to the user, then execute if confirmed.

> **Q**: Should tool calls be rate-limited independently of API rate limits?
> **A**: Yes. Cap at 50 tool calls per agent message (single user prompt → agent response cycle). This prevents runaway loops where Claude keeps calling tools without converging. The MCP server tracks call count per session message and returns an error after 50 calls: "Tool call limit reached. Please break your request into smaller steps." This limit is configurable via `MAX_TOOL_CALLS_PER_MESSAGE=50`.

---

## 5. Agent Context Management

### 5.1 Context Assembly

- [ ] **SV-ORCH-043**: Define context types sent to agent
  - **Project Context**: project name, description, structure, settings
  - **Document Context**: active document title, spec list, ordering
  - **Spec Context**: active spec content, metadata, version info
  - **Graph Context**: nodes visible in graph viewport, connected edges
  - **Conversation Context**: recent message history (last N messages)
  - **User Context**: username, role, permissions summary
  - **System Context**: available tools, current time, server state
- [ ] **SV-ORCH-044**: Implement context assembly pipeline
  - Gather context from multiple services (specs, graph, user, project)
  - Assemble into structured context object
  - Estimate token count of assembled context
  - Trim context if exceeding budget (prioritize recent and relevant)
  - Log assembled context size per request
- [ ] **SV-ORCH-045**: Implement context prioritization
  - Priority 1: current user message (never trimmed)
  - Priority 2: active spec/document content
  - Priority 3: recent conversation history (last 10 messages)
  - Priority 4: visible graph context
  - Priority 5: project description and settings
  - Trim from lowest priority first

### 5.2 Context Updates

- [ ] **SV-ORCH-046**: Implement real-time context updates during session
  - When user navigates to a different spec: update spec context
  - When user switches document: update document context
  - When graph viewport changes: update graph context
  - Send context update to agent process
  - Do not interrupt active agent processing for context updates
- [ ] **SV-ORCH-047**: Implement context diff optimization
  - Send only changed context fields (not full context on every update)
  - Track last-sent context per session
  - Calculate diff and send incremental update
  - Reduce bandwidth and processing overhead
- [ ] **SV-ORCH-048**: Implement context persistence per session
  - Store assembled context snapshots for debugging
  - Allow replaying context for issue reproduction
  - Expire snapshots after session termination + configurable retention

### 5.3 Conversation History Management

- [ ] **SV-ORCH-049**: Implement conversation history storage
  - Store all messages in session: user messages, agent responses, tool calls, tool results
  - Each message: role, content, timestamp, token count (estimated)
  - Index by session ID for fast retrieval
  - Paginate for large conversations
- [ ] **SV-ORCH-050**: Implement conversation context window management
  - Define max conversation context size (in tokens)
  - Sliding window: include most recent N messages
  - Summarize older messages (use Claude to generate summary)
  - Include summary + recent messages in context
  - Track window position and size per session
- [ ] **SV-ORCH-051**: Implement conversation history cleanup
  - Keep full history in database for audit
  - Clean in-memory history when session terminates
  - Compress old conversation records periodically
  - Retention policy: configurable (default: 90 days)

#### Design Decisions

> **Q**: What is the effective context window size for Claude Code?
> **A**: Claude Code uses Claude's full context window (200K tokens for Claude 3.5 Sonnet/Opus). However, practical effective context is smaller due to quality degradation in the middle ("lost in the middle" problem). Target keeping the active context under 50K tokens: ~10K for system prompt + tool definitions, ~20K for conversation history, ~20K for project context (spec content, graph structure). This leaves headroom for tool call inputs/outputs.

> **Q**: Should the server pre-compute a "project summary" that's always included in context, or assemble context dynamically per request?
> **A**: Pre-computed project summary that updates on mutations. Store a `project-summary.md` in the project's `.botnet/` directory, auto-generated on spec create/update/delete. It contains: project name, document list with spec counts, graph stats (node/edge counts), recent activity summary. Include this in every Claude Code system prompt. Regeneration is cheap (reads the in-memory index) and happens as a side effect of mutations.

> **Q**: How should the server handle context for large knowledge graphs (thousands of nodes)?
> **A**: Tiered context inclusion: (1) Always include: project summary, active document's spec titles and statuses, current spec's full content. (2) Include if relevant: immediate neighbors (1-hop edges) of the current spec with titles and summaries. (3) Fetch on demand: the agent uses MCP tools (`query_graph`, `get_spec`) to retrieve additional specs as needed. Do NOT try to include the entire graph. Let the agent explore via tools.

> **Q**: Should conversation history be summarized to save context space, or included verbatim?
> **A**: Claude Code manages its own conversation history internally, including summarization when the context gets long. The server does not need to manage this — `--resume` handles it. For the server's PostgreSQL copy of the history (the reference log), store messages verbatim.

> **Q**: When the user navigates to a new spec while the agent is processing, should the context update be queued or interrupt the current operation?
> **A**: Queue the context update. The navigation event is sent to the server and held until the current agent operation completes. When the next user message is sent (after the current response), the queued context is included. Do not interrupt an active Claude Code process — mid-operation interruption can leave partial changes.

> **Q**: Should graph changes made by the agent during a session automatically update the session's context?
> **A**: Automatically updated. When the agent calls a mutation MCP tool (create/update/delete spec), the tool returns the updated data. Claude Code naturally incorporates tool results into its context. The server also updates the in-memory graph index on mutation, so subsequent MCP query tools return fresh data. No explicit refresh needed — the MCP tools always query the current state.

---

## 6. Concurrent Session Handling

### 6.1 Session Limits

- [ ] **SV-ORCH-052**: Enforce per-user concurrent session limit
  - Default: 3 concurrent active sessions per user
  - Configurable via environment variable
  - Reject new session creation when limit reached
  - Return 503 with clear message: "Active session limit reached"
  - Include count of active sessions in error response
- [ ] **SV-ORCH-053**: Enforce system-wide concurrent session limit
  - Default: 20 total concurrent sessions (all users)
  - Based on available system resources
  - Queue new sessions when at capacity (see Queue Management section)
  - Return 503 with estimated wait time when queued
- [ ] **SV-ORCH-054**: Implement session priority system
  - Admin users get higher priority for session creation
  - Sessions for active conversations get higher keepalive priority
  - Idle sessions can be terminated to make room for new requests
  - Priority determines queue position when system is at capacity

### 6.2 Resource Isolation

- [ ] **SV-ORCH-055**: Implement per-session resource tracking
  - Track CPU time used per session (if available from OS)
  - Track memory usage per Claude Code process
  - Track file I/O per session (reads/writes to knowledge graph)
  - Track API calls per session (MCP tool invocations)
- [ ] **SV-ORCH-056**: Implement resource quotas per session
  - Max memory per process: configurable (default: 512MB)
  - Max execution time per request: configurable (default: 120s)
  - Max MCP tool calls per request: configurable (default: 50)
  - Max output tokens per response: configurable (default: 4000)
  - Terminate session gracefully if quota exceeded
- [ ] **SV-ORCH-057**: Implement process isolation
  - Each Claude Code process runs in its own working directory
  - Processes cannot access other users' project directories
  - Environment variables are session-specific
  - File system access restricted to project scope

### 6.3 Concurrent Mutation Handling

- [ ] **SV-ORCH-058**: Implement optimistic locking for spec mutations
  - When agent reads a spec, record the version/hash
  - When agent writes a spec, verify version hasn't changed
  - If version changed: re-read, re-process, retry
  - Max retry count: 3 (then notify user of conflict)
- [ ] **SV-ORCH-059**: Implement mutation queue for same-spec conflicts
  - If two sessions try to modify the same spec simultaneously
  - Queue the second mutation
  - Process after first mutation completes
  - Notify second user of the delay
- [ ] **SV-ORCH-060**: Implement graph consistency during concurrent operations
  - Lock graph edges during edge creation/deletion (brief lock)
  - Prevent duplicate edges from concurrent operations
  - Validate graph consistency after concurrent mutations
  - Log conflicts and resolutions

---

## 7. Agent Output Parsing

### 7.1 Output Format Detection

- [ ] **SV-ORCH-061**: Implement output type detection from Claude Code response
  - Detect: plain text response (dialog)
  - Detect: tool use request (MCP tool invocation)
  - Detect: structured data (JSON spec proposals, edge proposals)
  - Detect: action request (needs user approval)
  - Detect: error/failure message
  - Detect: thinking/reasoning content
- [ ] **SV-ORCH-062**: Implement streaming output parser
  - Parse Claude Code output as it streams (not wait for completion)
  - Identify output boundaries (start/end of tool use, response text, etc.)
  - Forward parsed chunks to appropriate handlers
  - Handle malformed output gracefully (log warning, attempt recovery)
- [ ] **SV-ORCH-063**: Implement output sanitization
  - Remove any raw API keys or secrets from output
  - Remove internal process information
  - Remove file system paths that shouldn't be exposed to client
  - Validate output doesn't contain harmful content

### 7.2 Structured Output Extraction

- [ ] **SV-ORCH-064**: Parse spec creation proposals from agent output
  - Extract: title, content, suggested document, tags, metadata
  - Validate extracted data against spec schema
  - Package as `ProposedSpec` object
  - Include confidence/certainty indicator
- [ ] **SV-ORCH-065**: Parse edge creation proposals from agent output
  - Extract: source node, target node, edge type, metadata
  - Validate nodes exist in graph
  - Validate edge type is valid
  - Package as `ProposedEdge` object
- [ ] **SV-ORCH-066**: Parse agent actions from output
  - Categorize: spec_create, spec_update, spec_delete, edge_create, edge_delete, graph_query, gen_ui_trigger
  - Attach action metadata (what, where, why)
  - Package as `AgentAction` for WebSocket delivery
  - Track action status: proposed, approved, executed, rejected
- [ ] **SV-ORCH-067**: Parse graph links from agent dialog messages
  - Detect references to specs (by ID, by title, by keyword)
  - Convert to clickable links in the message content
  - Resolve ambiguous references (multiple specs match)
  - Include graph links in message metadata for frontend rendering

### 7.3 Output Formatting for WebSocket Delivery

- [ ] **SV-ORCH-068**: Format agent output for WebSocket delivery
  - Wrap output in standardized WebSocket event format
  - Include: sessionId, messageId, type, content, metadata, timestamp
  - Support streaming: send partial outputs as `agent.message.chunk` events
  - Send `agent.message.complete` when full response is ready
- [ ] **SV-ORCH-069**: Implement output batching for efficiency
  - Batch rapid output chunks (within 100ms window)
  - Send as single WebSocket message to reduce overhead
  - Maintain ordering guarantees
  - Flush on response completion

---

## 8. Error Handling for Agents

### 8.1 Error Classification

- [ ] **SV-ORCH-070**: Define agent error categories
  - `SPAWN_FAILURE` — Claude Code process failed to start
  - `API_ERROR` — Claude API returned an error (rate limit, auth, etc.)
  - `TOOL_ERROR` — MCP tool invocation failed
  - `TIMEOUT` — operation exceeded time limit
  - `PROCESS_CRASH` — Claude Code process exited unexpectedly
  - `CONTEXT_ERROR` — context assembly failed (missing data)
  - `PERMISSION_ERROR` — agent tried to access restricted resource
  - `OUTPUT_PARSE_ERROR` — agent output couldn't be parsed
  - `RESOURCE_EXHAUSTED` — memory, CPU, or token limit exceeded
  - `NETWORK_ERROR` — network issue communicating with Claude API

### 8.2 Error Recovery

- [ ] **SV-ORCH-071**: Implement automatic recovery for transient errors
  - API rate limit → wait and retry (with Retry-After header)
  - Network timeout → retry with backoff (1s, 2s, 4s)
  - Tool error → log and continue (tool returns error to agent)
  - Process crash → attempt restart with same context
  - Max retries: 3 per error category per request
- [ ] **SV-ORCH-072**: Implement graceful degradation
  - If graph MCP server is down → use cached graph data
  - If RAG service is down → skip semantic search, use keyword
  - If gen-UI tools are down → notify user, suggest alternative
  - Report degraded state to user via WebSocket
- [ ] **SV-ORCH-073**: Implement error escalation
  - First occurrence: retry silently
  - Second occurrence: retry with warning to user
  - Third occurrence: notify user of persistent error
  - Persistent error: terminate session, log for admin review
- [ ] **SV-ORCH-074**: Implement error context preservation
  - On error: save full context (input, state, partial output)
  - Store error context for debugging and reproduction
  - Include in error report sent to admin
  - Allow manual retry with saved context

### 8.3 User Notification on Error

- [ ] **SV-ORCH-075**: Implement user-facing error messages
  - Translate internal errors to user-friendly messages
  - `API_ERROR` → "The AI service is temporarily unavailable. Retrying..."
  - `TIMEOUT` → "The operation is taking longer than expected. Please wait..."
  - `PROCESS_CRASH` → "The agent encountered an issue. Starting a new session..."
  - `RESOURCE_EXHAUSTED` → "You've reached the usage limit. Try again later."
  - Never expose internal error details to users
- [ ] **SV-ORCH-076**: Send error events via WebSocket
  - Event type: `agent.error`
  - Include: error category, user message, recovery action, estimated wait time
  - Include: whether the error is recoverable
  - Include: suggested user actions (retry, restart session, etc.)

#### Design Decisions

> **Q**: What should happen when the Claude API returns a 500 error?
> **A**: Retry with exponential backoff: attempt 1 immediately, attempt 2 after 2 seconds, attempt 3 after 5 seconds. If all 3 attempts fail, notify the user via WebSocket: "The AI service is temporarily unavailable. Please try again in a moment." Log the failures at `error` level. Do not queue the message for later — the user can retry when ready.

> **Q**: What should happen when an agent produces invalid output (malformed JSON, invalid spec content)?
> **A**: The MCP tool validates the output and returns an error. Claude Code sees the validation error and self-corrects (rephrases the tool call with valid data). This is the natural Claude tool-calling flow — tool errors are learning signals. If Claude fails to produce valid output after 3 attempts, the agent informs the user: "I'm having trouble with this operation. Could you rephrase your request?"

> **Q**: Should there be a "circuit breaker" that disables agent functionality if the Claude API is consistently failing?
> **A**: Yes. Implement a simple circuit breaker: if 5 consecutive Claude API calls fail (across all sessions) within a 2-minute window, trip the circuit breaker. While tripped, new agent messages return immediately with: "AI agent is temporarily unavailable due to service issues." The circuit breaker resets after 30 seconds and allows one test request through (half-open state).

> **Q**: If an agent is in the middle of a multi-step operation and fails partway through, should the completed steps be rolled back, kept as-is, or kept but flagged as incomplete?
> **A**: Kept but flagged as incomplete. Each MCP tool call that succeeds writes and commits its changes immediately. If the process dies after creating 2 of 3 specs, those 2 specs exist in the repository with their own commits. The user is notified of the incomplete operation with a summary of what was completed and what wasn't. Git history preserves every step. This is safer than rollback (which could fail) and more transparent than silent partial state.

> **Q**: Should agent mutations go through a "staging" area before being committed to the knowledge graph?
> **A**: No separate staging area. The "confirm before mutation" flow (dry-run → user approval → execute) serves this purpose. When `confirmMutations` is enabled in project settings, the agent presents proposed changes and waits for user confirmation before executing. Changes are committed to git immediately on execution, giving full version history for rollback if needed.

> **Q**: How should the system handle the case where an agent modifies a spec that another user is currently editing?
> **A**: Notify both users via WebSocket. The server's per-project write queue serializes writes, so there's no actual file-level conflict. When the agent commits a change to a spec that another user has open: (1) the editing user receives a `spec:updated` WebSocket event with the changes, (2) the editing user's frontend shows a notification: "This spec was modified by [agent/user]. Reload to see changes." Git handles the version history.

---

## 9. Timeout & Retry Strategies

### 9.1 Timeout Configuration

- [ ] **SV-ORCH-077**: Define timeout levels
  - Process spawn timeout: 30 seconds (Claude Code startup)
  - Single request processing timeout: 120 seconds (default)
  - Tool call timeout: 30 seconds per tool invocation
  - Graph traversal timeout: 60 seconds (deep traversals)
  - GenUI generation timeout: 300 seconds (code generation is slow)
  - Plan generation timeout: 600 seconds (complex operations)
  - Session idle timeout: 30 minutes (no user activity)
  - Session max lifetime: 4 hours
- [ ] **SV-ORCH-078**: Implement per-operation timeout enforcement
  - Start timer when operation begins
  - Monitor elapsed time
  - On timeout: send cancel signal to Claude Code
  - Wait brief period for graceful cancel (5s)
  - Force terminate if cancel not acknowledged
  - Report timeout to user
- [ ] **SV-ORCH-079**: Implement configurable timeout overrides
  - Allow per-request timeout override (within bounds)
  - Admin can adjust system-wide timeouts via config
  - Log when timeouts are hit (track frequency for tuning)

### 9.2 Retry Strategies

- [ ] **SV-ORCH-080**: Implement exponential backoff retry
  - Base delay: 1 second
  - Multiplier: 2x per retry
  - Max delay: 30 seconds
  - Max retries: 3 (configurable per error type)
  - Add jitter (±20%) to prevent thundering herd
- [ ] **SV-ORCH-081**: Implement retry budget
  - Track total retries per session
  - Session retry budget: 10 retries total
  - Stop retrying when budget exhausted
  - Report to user when retry budget is low
- [ ] **SV-ORCH-082**: Implement retry eligibility rules
  - Retry eligible: API rate limit, network timeout, process crash
  - Retry ineligible: auth failure, permission denied, invalid input, user cancel
  - Retry ineligible: non-transient errors (bad API key, missing resource)
  - Log retry decisions with reasoning

---

## 10. Agent Queue Management

### 10.1 Request Queue

- [ ] **SV-ORCH-083**: Implement agent request queue
  - Queue user messages when agent is busy (processing previous request)
  - FIFO ordering within a session
  - Max queue depth per session: 5 messages
  - Reject messages when queue is full (429 with message)
- [ ] **SV-ORCH-084**: Implement session creation queue
  - Queue session creation requests when at capacity
  - Priority queue: admin > owner > member > viewer
  - Max queue depth: 20 pending sessions
  - Estimated wait time calculation
  - Notify user of position in queue via WebSocket
- [ ] **SV-ORCH-085**: Implement queue timeout
  - Maximum time in queue: 5 minutes (session creation)
  - Maximum time in queue: 30 seconds (message processing)
  - Remove timed-out items from queue
  - Notify user of queue timeout

### 10.2 Rate Limiting for Claude API

- [ ] **SV-ORCH-086**: Implement Claude API rate limiter
  - Track API calls per minute across all sessions
  - Respect Claude API's published rate limits
  - Implement token bucket algorithm for smooth rate limiting
  - Queue requests when approaching limit
  - Prioritize in-progress conversations over new ones
- [ ] **SV-ORCH-087**: Implement per-user API rate limiting
  - Track API usage per user
  - Daily token budget per user (configurable)
  - Warn at 80% budget consumption
  - Block at 100% budget (can be overridden by admin)
  - Reset budget daily at midnight UTC
- [ ] **SV-ORCH-088**: Implement backpressure signaling
  - When queue is building up, slow down accepting new requests
  - Return `503 Service Unavailable` with `Retry-After` header
  - Broadcast capacity status via WebSocket to connected clients
  - Dashboard metric: queue depth over time

### 10.3 Queue Monitoring

- [ ] **SV-ORCH-089**: Implement queue metrics
  - Track: queue depth, wait time (p50, p95, p99), throughput
  - Track: rejection count, timeout count, success count
  - Expose via health endpoint and metrics endpoint
  - Alert on: queue depth > threshold, wait time > threshold
- [ ] **SV-ORCH-090**: Implement queue visualization (admin)
  - Admin endpoint: `GET /api/v1/admin/agent/queue`
  - Show: all queued requests, estimated wait times, queue positions
  - Show: active sessions with resource usage
  - Allow admin to: reprioritize, cancel, or force-process queued items

---

## 11. Cost Tracking & Usage Monitoring

### 11.1 Token Usage Tracking

- [ ] **SV-ORCH-091**: Track input tokens per agent request
  - Count tokens in: system prompt, user message, context
  - Use approximate tokenizer (tiktoken compatible)
  - Store per-request token count
  - Aggregate per-session, per-user, per-project
- [ ] **SV-ORCH-092**: Track output tokens per agent response
  - Count tokens in: agent response, tool call results
  - Store per-response token count
  - Aggregate similarly to input tokens
- [ ] **SV-ORCH-093**: Track tool usage per session
  - Count MCP tool invocations per session
  - Track which tools are most used
  - Track tool success/failure rates
  - Track average tool response time

### 11.2 Cost Calculation

- [ ] **SV-ORCH-094**: Implement cost estimation per request
  - Map token count to API cost (input and output pricing)
  - Store pricing configuration (editable by admin)
  - Calculate cost per request, session, user, project
  - Include tool execution cost if applicable
- [ ] **SV-ORCH-095**: Implement usage budgets
  - Per-user daily token budget (default: configurable)
  - Per-project monthly token budget (optional)
  - System-wide monthly budget (hard cap)
  - Alert at configurable thresholds (50%, 80%, 100%)
- [ ] **SV-ORCH-096**: Implement cost reporting
  - API endpoint: `GET /api/v1/admin/usage/report`
  - Breakdowns: by user, by project, by time period
  - Export: CSV format for billing integration
  - Dashboard: top users, top projects, cost trends

### 11.3 Usage Analytics

- [ ] **SV-ORCH-097**: Track agent interaction patterns
  - Average messages per session
  - Average session duration
  - Most common intent types
  - Most common tools used
  - Error rates by category
- [ ] **SV-ORCH-098**: Implement usage logging
  - Log: each agent request with metadata
  - Store: token counts, costs, duration, tool calls
  - Queryable by: user, project, date range, intent type
  - Retention: configurable (default: 12 months)

#### Design Decisions

> **Q**: Should there be hard spending limits that immediately stop agent operations, or soft limits that warn but allow continuation?
> **A**: Soft limits that warn, with a hard ceiling. Soft limit: configurable per-project monthly budget (default: off). When 80% of the budget is consumed, show a warning banner. Hard limit: system-wide monthly spend cap (`MAX_MONTHLY_SPEND_USD`). When the hard limit is hit, all agent operations are blocked until the next billing cycle or an admin raises the limit.

> **Q**: How should cost be attributed in a multi-user project?
> **A**: Per-project. All agent API costs within a project are attributed to the project's budget. Individual user usage is tracked for reporting (`agent_usage` table: `userId`, `projectId`, `tokensIn`, `tokensOut`, `estimatedCostUsd`, `timestamp`) but the budget is shared at the project level.

> **Q**: Should the system display estimated cost before executing expensive operations?
> **A**: No pre-estimation. Token costs are unpredictable before execution (depends on agent reasoning, tool calls, retries). Instead, show running cost after completion: each agent response includes `meta.usage: { tokensIn, tokensOut, estimatedCostUsd }` in the WebSocket event. The UI displays cumulative session cost.

> **Q**: Should the server cache Claude Code responses for identical or similar requests?
> **A**: No caching of LLM responses. Knowledge graph state changes between requests, so "identical" prompts may require different responses. Caching LLM output is unreliable and can serve stale/incorrect information. Focus cost optimization on efficient context assembly (smaller prompts = fewer input tokens = lower cost).

> **Q**: Should there be a "fast path" for simple questions that uses a smaller/cheaper model?
> **A**: Not for the initial release. Routing between models adds complexity and the cost difference is small for short queries. Claude Code uses a single model for all interactions, which keeps behavior predictable. If cost analysis later shows that a significant portion of requests are simple questions, add a model-routing layer as an optimization.

> **Q**: Should the server pre-warm Claude Code processes in anticipation of user requests?
> **A**: No pre-warming. Claude Code startup (~1-2 seconds) is negligible compared to API response time (~3-15 seconds). Pre-warming wastes resources for speculative gains and adds process management complexity.

> **Q**: What are the key metrics for monitoring agent health?
> **A**: Key metrics: (1) `agent_response_latency_seconds` — histogram by operation type, (2) `agent_error_rate` — counter by error type, (3) `agent_active_sessions` — gauge, (4) `agent_queue_depth` — gauge, (5) `agent_tokens_used` — counter by direction, (6) `agent_tool_calls_total` — counter by tool name, (7) `agent_circuit_breaker_state` — gauge. Expose via Prometheus `/metrics` endpoint.

> **Q**: Should the system track agent "quality" metrics?
> **A**: Yes. Track: `agent_proposals_accepted` vs `agent_proposals_rejected`, `agent_tool_retries`, `agent_clarification_requests`. Store these in the `agent_usage` table alongside cost data. Review monthly to identify prompt improvements. Do not build a real-time dashboard for this — aggregate reporting is sufficient.

> **Q**: Should there be an admin dashboard for real-time agent monitoring?
> **A**: Log-based monitoring with Prometheus metrics for the initial release. Use Grafana dashboards connected to Prometheus for visualizing agent metrics. No custom admin dashboard — Grafana provides all the visualization needed. An admin API endpoint `GET /admin/agents/status` returns current system state.

> **Q**: Should admin users be able to view another user's agent session transcript for debugging?
> **A**: Yes. System admins can access any session's transcript via `GET /admin/sessions/:id/messages`. This is essential for debugging agent issues and supporting users. Log admin access to the audit trail. Non-admin users can only see their own sessions.

> **Q**: Should the system support "replay" — re-running an agent session with the same inputs to reproduce issues?
> **A**: Not for the initial release. Replay requires storing complete tool call results and API responses, and LLM non-determinism means the replay won't be identical. The session transcript plus server logs provide sufficient context to understand what happened.

> **Q**: Should agent sessions record enough data for full reproducibility?
> **A**: Record: user messages (verbatim), agent responses (verbatim), tool call inputs and outputs (full JSON), timestamps for each event, token counts per API call, error details. Do NOT record raw Claude API request/response bodies (these are large). Store in PostgreSQL in a `session_events` table with JSONB payloads.

---

## 12. Agent Configuration & Skills

### 12.1 Agent Skill Definitions

- [ ] **SV-ORCH-099**: Implement agent skill configuration system
  - Skills define what capabilities an agent has
  - Each skill maps to a set of MCP tools and prompt instructions
  - Skills configurable per project
  - Default skills: knowledge_author, graph_navigator, plan_generator, ui_creator
- [ ] **SV-ORCH-100**: Implement skill loading at session creation
  - Read project's skill configuration
  - Load skill definitions (prompt fragments, tool lists)
  - Include skill instructions in system prompt
  - Restrict MCP tools to those required by active skills
- [ ] **SV-ORCH-101**: Implement skill selection based on intent
  - Map intent types to required skills
  - Load only relevant skills for the classified intent
  - Reduce context size by not loading unused skills
  - Allow dynamic skill loading if intent changes mid-conversation

### 12.2 Agent Behavior Configuration

- [ ] **SV-ORCH-102**: Implement configurable agent behavior settings
  - `confirmBeforeMutation`: boolean (ask user before changing graph)
  - `autoCreateEdges`: boolean (auto-create edges on spec creation)
  - `maxSpecsPerResponse`: number (limit bulk creation)
  - `verbosity`: 'concise' | 'detailed' | 'verbose'
  - `language`: string (response language preference)
- [ ] **SV-ORCH-103**: Store behavior configuration per project
  - Default configuration for new projects
  - User can override per-project
  - Admin can set organization-wide defaults
  - Configuration applied at session creation

#### Design Decisions

> **Q**: Should the agent always ask for confirmation before making changes, or should some operations be auto-approved?
> **A**: Default: confirm before mutations. The agent presents proposed changes (using dry-run) and asks "Should I proceed?" before executing. Auto-approved operations: read-only queries, graph traversals, search. The `confirmMutations` project setting can be set to `false` for users who prefer autonomous agent behavior. Even with confirmation off, destructive operations (delete spec, delete edge) always confirm.

> **Q**: Should the agent show its "thinking" process to the user, or only show the final result?
> **A**: Show a condensed thinking process. Stream tool call names and brief descriptions as the agent works: "Searching for related specs...", "Creating spec 'Authentication Requirements'...", "Adding dependency edge...". Do NOT show raw thinking/reasoning text (too verbose and confusing). The user sees: (1) brief progress indicators for each tool call, (2) the final response with results.

> **Q**: How should the agent handle ambiguous requests?
> **A**: Present 2-3 options for the user to choose from. "I can interpret your request in a few ways: (A) Create a new spec about authentication, (B) Find existing specs related to authentication, (C) Update the current spec with authentication details. Which would you prefer?" The system prompt instructs Claude to ask at most one round of clarification before proceeding with the most likely interpretation.

> **Q**: Should the agent's personality/tone be configurable per project?
> **A**: No. Use a single, consistent tone: professional but approachable. Clear, direct, and helpful. Not overly casual, not stiffly formal. Configurable personality adds prompt engineering complexity for minimal value.

> **Q**: Should the agent remember user preferences across sessions?
> **A**: Not in the initial release. User preferences would require a per-user profile system that feeds into the system prompt. Defer to phase 2. For now, each session starts with the same system prompt. If implemented later, store preferences in a `user_preferences` JSON column on the user table and inject them into the system prompt.

---

## Summary

| Section                                    | Task Range        | Count   |
| ------------------------------------------ | ----------------- | ------- |
| 1. Claude Code Wrapper                     | SV-ORCH-001 – 014 | 14      |
| 2. Agent Session Lifecycle                 | SV-ORCH-015 – 023 | 9       |
| 3. Request Routing & Intent Classification | SV-ORCH-024 – 032 | 9       |
| 4. Sub-Agent Delegation via MCP            | SV-ORCH-033 – 042 | 10      |
| 5. Agent Context Management                | SV-ORCH-043 – 051 | 9       |
| 6. Concurrent Session Handling             | SV-ORCH-052 – 060 | 9       |
| 7. Agent Output Parsing                    | SV-ORCH-061 – 069 | 9       |
| 8. Error Handling for Agents               | SV-ORCH-070 – 076 | 7       |
| 9. Timeout & Retry Strategies              | SV-ORCH-077 – 082 | 6       |
| 10. Agent Queue Management                 | SV-ORCH-083 – 090 | 8       |
| 11. Cost Tracking & Usage Monitoring       | SV-ORCH-091 – 098 | 8       |
| 12. Agent Configuration & Skills           | SV-ORCH-099 – 103 | 5       |
| **TOTAL**                                  |                   | **103** |
