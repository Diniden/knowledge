# 03-SERVER / 04 — AGENT ORCHESTRATION: Open Questions

> **Purpose**: Unresolved questions about the agent orchestration system
> including Claude Code integration, session management, request routing,
> MCP tool delegation, context management, and resource constraints.
> Answers may change tasks in the plan.

---

## 1. Claude Code Integration

### 1.1 Communication Protocol

- **Q**: How exactly does the server communicate with Claude Code? Via CLI
  stdin/stdout, an HTTP API, or the Claude Code SDK? The plan assumes
  stdin/stdout but Claude Code may have a more structured API.

**A:** Via the `claude` CLI in headless mode using `--print` for single-turn prompts and `--output-format stream-json` for structured streaming output. The server spawns `claude` as a subprocess via `Bun.spawn()`, passing the prompt as a CLI argument or via stdin. Claude Code outputs JSON-structured events to stdout (text chunks, tool calls, tool results, completion). The server parses these events line-by-line from the stdout stream. This is the documented, supported integration path.

- **Q**: Does Claude Code support a "headless" or "server" mode where it
  runs without a terminal UI, or does it always expect an interactive terminal?

**A:** Yes. The `--print` flag runs Claude Code without the interactive terminal UI. Combined with `--output-format stream-json`, it operates fully headless: prompt in via CLI args or stdin, structured JSON events out via stdout, no terminal rendering. This is the intended mode for programmatic integration.

- **Q**: What is Claude Code's output format? Is it plain text, JSON-structured
  events, or a streaming protocol? The parsing strategy depends entirely on this.

**A:** With `--output-format stream-json`, Claude Code emits newline-delimited JSON (NDJSON). Each line is a JSON object with a `type` field: `assistant`, `tool_use`, `tool_result`, `result`, `error`, etc. Text content arrives as `assistant` events with `content` containing text chunks. The server parses each line as JSON and dispatches based on the `type` field. Use a streaming line parser on stdout.

- **Q**: Can Claude Code be configured to use specific MCP servers
  programmatically (via arguments or config file), or does it always read from
  its own configuration?

**A:** Both. Claude Code reads MCP server configuration from its settings file (`~/.claude/settings.json` or project-level `.claude/settings.json`). The server creates a project-level `.claude/settings.json` in each project directory specifying the MCP servers (stdio transport) to use. MCP servers can also be specified via the `--mcp-config` CLI flag. Use the project-level config file approach — it persists across sessions and is version-controllable.

### 1.2 Process Lifecycle

- **Q**: Should Claude Code processes be long-lived (one per user session,
  stays running between messages) or short-lived (spawn per request, terminate
  after response)? Long-lived preserves conversation state natively but
  consumes resources continuously.

**A:** Short-lived with session resume. Spawn a new `claude` process per user message using `--resume <sessionId>` to continue the conversation. Claude Code persists conversation state to disk between invocations, so context is preserved without holding a process in memory. The process exits after completing the response. This uses resources only during active work and scales better (no idle processes).

- **Q**: How does Claude Code handle conversation history? Does it maintain
  context internally across multiple stdin inputs, or does the server need to
  resend full history with each prompt?

**A:** Claude Code maintains conversation history internally on disk when using the `--resume` flag. The server does NOT need to resend history. Each `--resume <sessionId>` call loads the previous conversation from Claude Code's internal storage (~/.claude/projects/ directory). The server separately persists dialog history in PostgreSQL as a reference log, but does not pass it back to Claude Code.

- **Q**: What happens when a Claude Code process is killed mid-operation?
  Does it leave partial changes (files written, git commits made), or are
  operations atomic?

**A:** Claude Code does NOT guarantee atomicity. If killed mid-operation, partial changes may exist: files partially written, some specs created but not others, no git commit for the changes. The server must handle this: on process crash, check the working tree for uncommitted changes (`git status`). If dirty state exists, either commit with a `[partial]` marker or reset to the last clean state. The user is notified of the incomplete operation and can choose to keep or discard partial changes.

- **Q**: Can multiple Claude Code instances run concurrently on the same
  machine without interference? Are there shared resources or locks?

**A:** Yes, multiple instances run concurrently. Each instance operates in its own working directory (project path) with its own session ID. Claude Code does not use machine-level locks. However, two instances writing to the same project directory can cause file conflicts — the server's per-project write queue prevents this by serializing agent operations per project.

### 1.3 Resource Requirements

- **Q**: How much memory does a typical Claude Code process consume? This
  determines the max concurrent sessions the server can support.

**A:** A Claude Code process (Node.js under the hood) consumes ~50-100MB of memory during active operation. With a 10-process concurrency limit, peak memory for agent processes is ~1GB. The server itself (NestJS + Bun) uses ~100-200MB. Total server memory requirement: 2-4GB recommended for comfortable headroom. The processes are short-lived, so memory is returned quickly after each message completes.

- **Q**: Does Claude Code make its own network calls to the Claude API, or
  does the server need to proxy API calls? If Claude Code calls the API
  directly, the server needs to provide the API key.

**A:** Claude Code makes its own network calls to the Anthropic API. The server provides the API key via the `ANTHROPIC_API_KEY` environment variable which Claude Code reads automatically. No proxying needed. The server manages the API key securely (never logged, never exposed via API). Rate limiting against the Anthropic API is handled by the concurrency semaphore (10 concurrent processes cap).

- **Q**: Is there a way to limit Claude Code's resource consumption (CPU,
  memory, disk I/O) via cgroup, ulimit, or similar mechanisms?

**A:** Claude Code processes can be resource-limited via `ulimit` settings when spawning: `ulimit -v 512000` (512MB virtual memory), `ulimit -t 600` (10 min CPU time). On Linux, cgroups v2 provide more granular control. For the initial release, rely on the 5-minute operation timeout and 10-process concurrency limit as the primary resource constraints. Add `ulimit` or cgroup enforcement if monitoring shows resource abuse.

---

## 2. Session Management

### 2.1 Session Persistence

- **Q**: Should agent sessions survive server restarts? If so, the session
  state and conversation history need to be persisted to a database. If not,
  all sessions are terminated on restart.

**A:** Sessions survive server restarts. Session metadata (session ID, user ID, project ID, status, created timestamp) is stored in PostgreSQL. Conversation history is stored in PostgreSQL. Claude Code's internal session state persists on disk. On server restart, sessions are marked as `interrupted`. Users can resume an interrupted session — the server spawns a new Claude Code process with `--resume` and the session continues. No active in-flight operations survive a restart; they fail and notify the user.

- **Q**: Should users be able to "resume" a previous conversation? This
  requires loading history into a new Claude Code process, which may not
  produce identical behavior to the original session.

**A:** Yes. Users can resume any previous session that hasn't been deleted. The server spawns Claude Code with `--resume <sessionId>`. Claude Code reloads its own conversation state. The behavior may not be byte-identical to continuing the original process, but it's semantically equivalent. The user sees a "Resuming session..." indicator. Sessions older than the configured retention period are not resumable (history may be pruned).

- **Q**: How should session state be stored? In-memory only (fast, lost on
  restart), in PostgreSQL (persistent, slower), or in Redis (fast, persistent)?

**A:** PostgreSQL for session metadata and conversation history (persistent, queryable, consistent with the rest of the data model). In-memory for active session runtime state (process reference, WebSocket connections, current operation status). On restart, in-memory state is lost but PostgreSQL state survives. No Redis needed — PostgreSQL handles the persistence, and runtime state is reconstructed from the database on resume.

### 2.2 Session Limits

- **Q**: What should the per-user concurrent session limit be? 3 sessions
  seems reasonable, but users working on multiple documents simultaneously
  might need more.

**A:** 3 concurrent active sessions per user. A session is "active" when a Claude Code process is running. Idle sessions (no in-flight operation) don't count against the limit. Users can have unlimited idle sessions. This means a user can have multiple open conversation threads but only 3 actively processing at once.

- **Q**: What should the system-wide concurrent session limit be? This depends
  on server hardware and Claude API rate limits. How do we determine the
  right number?

**A:** 10 concurrent active sessions system-wide (configurable via `MAX_CONCURRENT_AGENTS=10`). This is the concurrency semaphore for Claude Code processes. Start with 10, monitor Anthropic API rate limit responses and server memory, and adjust. If the Anthropic API returns 429 (rate limited), reduce the limit. If server memory is comfortable and no API rate limiting, increase it.

- **Q**: Should idle sessions be automatically terminated? If so, what's the
  right idle timeout — 15 minutes, 30 minutes, 1 hour?

**A:** Idle sessions are not terminated (they have no running process and consume no resources). The session record in PostgreSQL persists until the retention period expires. There is no "idle timeout" because short-lived processes mean there's nothing to terminate when idle. If the user stops sending messages, the last Claude Code process has already exited. The session is simply "paused" and resumable.

- **Q**: Should there be different session limits for different user roles?
  (e.g., admins get more sessions than regular users)

**A:** No, same limits for all roles. 3 concurrent active sessions per user regardless of role. The system-wide limit (10) is the real constraint. Differentiating by role adds configuration complexity for marginal benefit. If an admin needs more capacity, increase the system-wide limit.

### 2.3 Session Scope

- **Q**: Can a single session be used across multiple documents within the
  same project, or should each document get its own session?

**A:** A session is scoped to a project, not a document. The user can discuss any document or spec within the project during a single session. The agent can navigate between documents, create specs in different documents, and manage edges across the project. This is more natural for the user — they don't want to context-switch sessions when moving between documents.

- **Q**: Should there be a "global" agent session (not tied to a specific
  document/spec) for general questions about the project?

**A:** Every session is already project-scoped (not document-scoped), so all sessions are "global" within their project. The user can ask general questions about the project, discuss specific specs, or work across documents — all in the same session. There's no need for a separate "global" session type.

- **Q**: When the user navigates to a different document mid-conversation,
  should the session context update automatically, or should the user
  explicitly request a context switch?

**A:** The frontend sends a context event via WebSocket (`context:navigate { documentId, specId }`) when the user navigates. The server includes this context in the next message sent to Claude Code (as a system-level note: "User is now viewing document X, spec Y"). The agent adapts naturally — it can reference the current document/spec without the user explicitly saying "switch to document X." This is seamless and non-disruptive.

---

## 3. Request Routing & Intent Classification

### 3.1 Classification Approach

- **Q**: Should intent classification happen server-side (before sending to
  Claude Code) or should Claude Code handle routing internally via its system
  prompt? Server-side classification adds latency but gives more control.

**A:** Claude Code handles routing internally via its system prompt. The system prompt defines the available agent roles (KG agent, dialog agent, plan gen agent, etc.) and instructs Claude to route requests to the appropriate MCP tool set. Server-side classification would duplicate Claude's natural language understanding at lower quality. The orchestrator agent IS Claude Code — it classifies intent, selects tools, and executes. The server provides the tools via MCP; Claude decides which to use.

- **Q**: Is a keyword-based classifier sufficient for the initial release, or
  should the first version use LLM-based classification? Keyword matching is
  fast and predictable but may misclassify ambiguous requests.

**A:** Neither as a separate step. Claude Code IS the classifier. The system prompt instructs it on how to handle different request types. No pre-classification step is needed. Claude naturally understands "create a spec about authentication" vs. "show me related specs" and selects the appropriate MCP tools. Adding a pre-classifier is redundant and adds latency.

- **Q**: How should multi-intent requests be handled? (e.g., "Create a spec
  about authentication AND show me related specs in the graph") Should they
  be split into separate operations or handled as a single complex operation?

**A:** Handled as a single complex operation by Claude Code. Claude naturally decomposes multi-intent requests into sequential tool calls. For "Create a spec about authentication AND show me related specs," Claude will: (1) call the spec creation MCP tool, (2) call the graph query MCP tool, (3) synthesize both results in its response. No splitting needed — this is what LLMs are good at.

### 3.2 Routing Flexibility

- **Q**: Should simple graph queries (e.g., "show me all specs tagged 'auth'")
  bypass the agent entirely and go directly to the graph service? This would
  be faster but means the user doesn't get an agent-enhanced response.

**A:** No bypass. All user messages go through the agent. For simple queries, the agent responds quickly by calling the graph query MCP tool and returning the results with minimal commentary. The agent adds value even for simple queries: it can format results nicely, suggest related actions, and maintain conversation context. The latency difference (API call overhead) is 2-5 seconds — acceptable for the improved UX.

- **Q**: Should the routing be configurable per project? Some projects might
  want stricter confirmation for mutations while others prefer more autonomous
  agent behavior.

**A:** Yes, via project-level settings stored in the knowledge graph repo (`.botnet/config.json`). Settings include: `confirmMutations: boolean` (default: true — agent asks before creating/editing specs), `agentVerbosity: "concise"|"detailed"` (default: "concise"). These settings are included in the Claude Code system prompt. Keep the configuration surface small — 2-3 settings max.

- **Q**: Should the user be able to override the classified intent? (e.g.,
  "I know you think this is a query, but I actually want you to create a spec")

**A:** Not as a separate mechanism. The user simply rephrases or explicitly states their intent in the conversation. "No, I want you to create a spec about that, not just show me related ones." Claude Code handles this naturally as conversation context. No formal "override" UI is needed.

---

## 4. MCP Tool Delegation

### 4.1 Tool Design

- **Q**: How granular should MCP tools be? Should there be one `graph_mutate`
  tool or separate `create_node`, `create_edge`, `update_node`, `delete_edge`
  tools? Granular tools are more explicit but Claude may need more guidance
  on tool selection.

**A:** Granular tools. Separate tools for each operation: `create_spec`, `update_spec`, `delete_spec`, `create_edge`, `update_edge`, `delete_edge`, `query_graph`, `get_spec`, `list_specs`, `search_specs`, `get_graph_neighbors`, `create_document`, `commit_changes`. Each tool has a clear input schema and description. Claude performs better with well-defined, single-purpose tools than with multi-modal tools that require mode parameters.

- **Q**: Should MCP tools perform validation themselves or trust the calling
  agent? If tools validate, they're safer but slower. If agents validate,
  tools are simpler but less reliable.

**A:** Tools always validate. Never trust the calling agent for data integrity. Each MCP tool validates its input (schema validation, referential integrity for edges, permission checks for spec access). Invalid inputs return clear error messages that Claude can use to self-correct. Validation at the tool level is the last line of defense and prevents corrupted knowledge graphs regardless of what the agent sends.

- **Q**: Should MCP tool calls be synchronous (agent waits for result) or
  support async patterns (agent can do other work while tool executes)?

**A:** Synchronous. MCP tools over stdio are request-response: the agent sends a tool call, the MCP server processes it, returns the result, and the agent continues. Claude Code's tool-calling flow is inherently synchronous (call tool, get result, decide next step). Async patterns add complexity without benefit since the agent needs the result before deciding what to do next.

### 4.2 Sub-Agent Architecture

- **Q**: Should sub-agents be separate Claude Code processes, or should they
  be separate prompts sent to the same process? Separate processes provide
  better isolation but are more expensive.

**A:** Sub-agents are implemented as MCP tool calls within the same Claude Code process, not as separate processes. The "KG agent" is the set of KG-related MCP tools; the "plan gen agent" is the plan generation MCP tool, etc. Agent "types" from the PRD map to MCP tool groupings, not separate LLM instances. The orchestrator (Claude Code) decides which tools to call, effectively "delegating" to sub-agents by calling their tool sets. This is simpler, cheaper, and faster than spawning separate processes.

- **Q**: How many levels of sub-agent delegation should be allowed? Should
  sub-agents be able to spawn their own sub-agents, or is one level of
  delegation the maximum?

**A:** One level. The orchestrator (Claude Code) calls MCP tools directly. MCP tools do not spawn additional Claude Code processes. If a tool needs complex logic (e.g., plan generation requires analyzing multiple specs), that logic runs in the MCP server's code (TypeScript), not in a nested LLM call. This keeps costs predictable and avoids recursive LLM invocations. If a truly complex task requires multi-step LLM reasoning, the orchestrator handles it through multiple sequential tool calls.

- **Q**: How should sub-agent failures affect the parent agent? Should the
  orchestrator retry with a different sub-agent, ask the user for help, or
  fail the entire operation?

**A:** The MCP tool returns an error result to Claude Code, which decides the next step. Claude naturally handles tool errors: it may retry with corrected parameters, try an alternative approach, or inform the user that the operation failed and why. The server does not implement retry logic at the MCP layer — that's the orchestrator's job. If a tool fails 3 times in a row (Claude keeps retrying), the system prompt instructs Claude to stop and inform the user.

### 4.3 Tool Security

- **Q**: Should MCP tools have their own authentication (tool-level API keys)
  or inherit the user's session? Separate auth is more secure but complex.

**A:** Inherit the user's session. When the server spawns Claude Code, it configures the MCP servers with the user's session context (user ID, project ID, permission set). The MCP tools receive this context with every call and use it for permission checks. No separate tool-level auth — the tools operate under the authenticated user's identity. This is simpler and aligns with the "agent inherits user permissions" principle.

- **Q**: Should there be a "dry run" mode where agents can preview tool
  results without actually executing mutations? This would help with the
  "confirm before mutation" workflow.

**A:** Yes. MCP mutation tools (`create_spec`, `update_spec`, `delete_spec`, etc.) accept a `dryRun: boolean` parameter. When true, the tool validates the input, computes what would change, and returns a preview without writing to disk or committing. The agent uses this in the "confirm before mutation" flow: dry-run first, present the preview to the user, then execute if confirmed. This is a clean separation of preview and execution.

- **Q**: Should tool calls be rate-limited independently of API rate limits?
  A single agent request might make many tool calls; should there be a cap?

**A:** Yes. Cap at 50 tool calls per agent message (single user prompt → agent response cycle). This prevents runaway loops where Claude keeps calling tools without converging. The MCP server tracks call count per session message and returns an error after 50 calls: "Tool call limit reached. Please break your request into smaller steps." This limit is configurable via `MAX_TOOL_CALLS_PER_MESSAGE=50`.

---

## 5. Context Management

### 5.1 Context Strategy

- **Q**: What is the effective context window size for Claude Code? This
  determines how much project context can be included.

**A:** Claude Code uses Claude's full context window (200K tokens for Claude 3.5 Sonnet/Opus). However, practical effective context is smaller due to quality degradation in the middle ("lost in the middle" problem). Target keeping the active context under 50K tokens: ~10K for system prompt + tool definitions, ~20K for conversation history, ~20K for project context (spec content, graph structure). This leaves headroom for tool call inputs/outputs.

- **Q**: Should the server pre-compute a "project summary" that's always
  included in context, or assemble context dynamically per request? Pre-computed
  is faster but may become stale.

**A:** Pre-computed project summary that updates on mutations. Store a `project-summary.md` in the project's `.botnet/` directory, auto-generated on spec create/update/delete. It contains: project name, document list with spec counts, graph stats (node/edge counts), recent activity summary. Include this in every Claude Code system prompt. Regeneration is cheap (reads the in-memory index) and happens as a side effect of mutations.

- **Q**: How should the server handle context for large knowledge graphs
  (thousands of nodes)? Include a subgraph? Use RAG retrieval to select
  relevant nodes? Include only the immediate neighborhood of the active spec?

**A:** Tiered context inclusion: (1) Always include: project summary, active document's spec titles and statuses, current spec's full content. (2) Include if relevant: immediate neighbors (1-hop edges) of the current spec with titles and summaries. (3) Fetch on demand: the agent uses MCP tools (`query_graph`, `get_spec`) to retrieve additional specs as needed. Do NOT try to include the entire graph. Let the agent explore via tools, which is both more efficient and more accurate than pre-loading a massive context.

- **Q**: Should conversation history be summarized to save context space, or
  included verbatim? Summarization loses detail but allows longer conversations.

**A:** Claude Code manages its own conversation history internally, including summarization when the context gets long. The server does not need to manage this — `--resume` handles it. For the server's PostgreSQL copy of the history (the reference log), store messages verbatim. If Claude Code's internal context management proves insufficient, implement server-side summarization as an optimization later.

### 5.2 Context Updates

- **Q**: When the user navigates to a new spec while the agent is processing,
  should the context update be queued until processing completes, or interrupt
  the current operation?

**A:** Queue the context update. The navigation event is sent to the server and held until the current agent operation completes. When the next user message is sent (after the current response), the queued context is included. Do not interrupt an active Claude Code process — mid-operation interruption can leave partial changes. The UI should show "Agent is working..." and queue the navigation.

- **Q**: Should graph changes made by the agent during a session automatically
  update the session's context, or should the agent explicitly refresh context
  when needed?

**A:** Automatically updated. When the agent calls a mutation MCP tool (create/update/delete spec), the tool returns the updated data. Claude Code naturally incorporates tool results into its context. The server also updates the in-memory graph index on mutation, so subsequent MCP query tools return fresh data. No explicit refresh needed — the MCP tools always query the current state.

---

## 6. Error Handling & Recovery

### 6.1 Failure Modes

- **Q**: What should happen when the Claude API returns a 500 error? Retry
  immediately, wait and retry, or notify the user and abort?

**A:** Retry with exponential backoff: attempt 1 immediately, attempt 2 after 2 seconds, attempt 3 after 5 seconds. If all 3 attempts fail, notify the user via WebSocket: "The AI service is temporarily unavailable. Please try again in a moment." Log the failures at `error` level. Do not queue the message for later — the user can retry when ready.

- **Q**: What should happen when an agent produces invalid output (malformed
  JSON, invalid spec content)? Re-prompt the agent, parse what's possible,
  or reject the entire response?

**A:** The MCP tool validates the output and returns an error. Claude Code sees the validation error and self-corrects (rephrases the tool call with valid data). This is the natural Claude tool-calling flow — tool errors are learning signals. If Claude fails to produce valid output after 3 attempts (tool returns error 3 times), the agent informs the user: "I'm having trouble with this operation. Could you rephrase your request?"

- **Q**: Should there be a "circuit breaker" that disables agent functionality
  if the Claude API is consistently failing? This prevents queuing up
  requests that will all fail.

**A:** Yes. Implement a simple circuit breaker: if 5 consecutive Claude API calls fail (across all sessions) within a 2-minute window, trip the circuit breaker. While tripped, new agent messages return immediately with: "AI agent is temporarily unavailable due to service issues. Trying again in [X] seconds." The circuit breaker resets after 30 seconds and allows one test request through (half-open state). If the test succeeds, resume normal operation.

### 6.2 Data Integrity

- **Q**: If an agent is in the middle of a multi-step operation (e.g., create
  3 specs and 5 edges) and fails partway through, should the completed steps
  be rolled back, kept as-is, or kept but flagged as incomplete?

**A:** Kept but flagged as incomplete. Each MCP tool call that succeeds writes and commits its changes immediately. If the process dies after creating 2 of 3 specs, those 2 specs exist in the repository with their own commits. The user is notified of the incomplete operation with a summary of what was completed and what wasn't. Git history preserves every step. This is safer than rollback (which could fail) and more transparent than silent partial state.

- **Q**: Should agent mutations go through a "staging" area (like git staging)
  before being committed to the knowledge graph? This allows the user to
  review all changes before they're finalized.

**A:** No separate staging area. The "confirm before mutation" flow (dry-run → user approval → execute) serves this purpose. When `confirmMutations` is enabled in project settings, the agent presents proposed changes and waits for user confirmation before executing. This is simpler than a staging area and uses the existing conversation flow. Changes are committed to git immediately on execution, giving full version history for rollback if needed.

- **Q**: How should the system handle the case where an agent modifies a spec
  that another user is currently editing? Notify both users? Block the agent?
  Create a conflict?

**A:** Notify both users via WebSocket. The server's per-project write queue serializes writes, so there's no actual file-level conflict. When the agent commits a change to a spec that another user has open in their editor: (1) the editing user receives a `spec:updated` WebSocket event with the changes, (2) the editing user's frontend shows a notification: "This spec was modified by [agent/user]. Reload to see changes." The editing user can then merge their local edits with the server state. Git handles the version history.

---

## 7. Cost & Resource Management

### 7.1 Cost Controls

- **Q**: Should there be hard spending limits that immediately stop agent
  operations, or soft limits that warn but allow continuation?

**A:** Soft limits that warn, with a hard ceiling. Soft limit: configurable per-project monthly budget (default: off). When 80% of the budget is consumed, show a warning banner. Hard limit: system-wide monthly spend cap (`MAX_MONTHLY_SPEND_USD`). When the hard limit is hit, all agent operations are blocked until the next billing cycle or an admin raises the limit. Track spend by counting input/output tokens per API call and multiplying by the published per-token price.

- **Q**: How should cost be attributed in a multi-user project? Per-user
  (whoever initiated the request), per-project (shared pool), or per-organization?

**A:** Per-project. All agent API costs within a project are attributed to the project's budget. Individual user usage is tracked for reporting (`agent_usage` table: `userId`, `projectId`, `tokensIn`, `tokensOut`, `estimatedCostUsd`, `timestamp`) but the budget is shared at the project level. This simplifies billing and aligns with the collaborative nature of the tool.

- **Q**: Should the system display estimated cost before executing expensive
  operations (like full graph crawl or plan generation)?

**A:** No pre-estimation. Token costs are unpredictable before execution (depends on agent reasoning, tool calls, retries). Instead, show running cost after completion: each agent response includes `meta.usage: { tokensIn, tokensOut, estimatedCostUsd }` in the WebSocket event. The UI displays cumulative session cost. This is more accurate and less disruptive than speculative estimates.

### 7.2 Performance Optimization

- **Q**: Should the server cache Claude Code responses for identical or
  similar requests? This reduces API costs but may return stale information.

**A:** No caching of LLM responses. Knowledge graph state changes between requests, so "identical" prompts may require different responses. Caching LLM output is unreliable and can serve stale/incorrect information. The cost savings aren't worth the correctness risk. Focus cost optimization on efficient context assembly (smaller prompts = fewer input tokens = lower cost).

- **Q**: Should there be a "fast path" for simple questions that uses a
  smaller/cheaper model instead of Claude Code? (e.g., Claude Haiku for
  "what is this spec about?" queries)

**A:** Not for the initial release. Routing between models adds complexity and the cost difference is small for short queries. Claude Code uses a single model for all interactions, which keeps behavior predictable. If cost analysis later shows that a significant portion of requests are simple questions, add a model-routing layer as an optimization. For now, optimize context size instead.

- **Q**: Should the server pre-warm Claude Code processes in anticipation
  of user requests? This reduces latency but wastes resources if the user
  doesn't make requests.

**A:** No pre-warming. Claude Code startup (~1-2 seconds) is negligible compared to API response time (~3-15 seconds). Pre-warming wastes resources for speculative gains and adds process management complexity. The first message has a 1-2 second overhead; subsequent messages in the same session use `--resume` which is equally fast.

---

## 8. User Experience

### 8.1 Interaction Patterns

- **Q**: Should the agent always ask for confirmation before making changes,
  or should some operations be auto-approved? The "confirm before mutation"
  behavior is configurable, but what should the default be?

**A:** Default: confirm before mutations. The agent presents proposed changes (using dry-run) and asks "Should I proceed?" before executing. Auto-approved operations: read-only queries, graph traversals, search. The `confirmMutations` project setting can be set to `false` for users who prefer autonomous agent behavior. Even with confirmation off, destructive operations (delete spec, delete edge) always confirm.

- **Q**: Should the agent show its "thinking" process to the user (like
  Claude's thinking mode), or only show the final result?

**A:** Show a condensed thinking process. Stream tool call names and brief descriptions as the agent works: "Searching for related specs...", "Creating spec 'Authentication Requirements'...", "Adding dependency edge...". Do NOT show raw thinking/reasoning text (too verbose and confusing). The user sees: (1) brief progress indicators for each tool call, (2) the final response with results. This builds trust and gives visibility without overwhelming.

- **Q**: How should the agent handle ambiguous requests? Should it ask one
  clarifying question at a time, or present multiple options for the user
  to choose from?

**A:** Present 2-3 options for the user to choose from. "I can interpret your request in a few ways: (A) Create a new spec about authentication, (B) Find existing specs related to authentication, (C) Update the current spec with authentication details. Which would you prefer?" This is faster than sequential clarifying questions and gives the user control. The system prompt instructs Claude to ask at most one round of clarification before proceeding with the most likely interpretation.

### 8.2 Agent Personality

- **Q**: Should the agent's personality/tone be configurable per project?
  (e.g., formal for enterprise knowledge, casual for personal projects)

**A:** No. Use a single, consistent tone: professional but approachable. Clear, direct, and helpful. Not overly casual, not stiffly formal. Configurable personality adds prompt engineering complexity for minimal value. The agent's tone should be appropriate for technical knowledge management regardless of the project context.

- **Q**: Should the agent remember user preferences across sessions? (e.g.,
  "this user prefers concise responses" or "this user always wants edges
  explained")

**A:** Not in the initial release. User preferences would require a per-user profile system that feeds into the system prompt. Defer to phase 2. For now, each session starts with the same system prompt. If implemented later, store preferences in a `user_preferences` JSON column on the user table and inject them into the system prompt.

---

## 9. Monitoring & Observability

### 9.1 Metrics

- **Q**: What are the key metrics for monitoring agent health? Response
  latency, error rate, session count, queue depth — are there others?

**A:** Key metrics: (1) `agent_response_latency_seconds` — histogram by operation type, (2) `agent_error_rate` — counter by error type (API error, tool error, timeout), (3) `agent_active_sessions` — gauge, (4) `agent_queue_depth` — gauge (waiting for semaphore), (5) `agent_tokens_used` — counter by direction (input/output), (6) `agent_tool_calls_total` — counter by tool name, (7) `agent_circuit_breaker_state` — gauge (0=closed, 1=open, 0.5=half-open). Expose via Prometheus `/metrics` endpoint.

- **Q**: Should the system track agent "quality" metrics (e.g., how often
  users reject agent proposals, how often agents need multiple attempts)?

**A:** Yes. Track: `agent_proposals_accepted` vs `agent_proposals_rejected` (user confirms or rejects dry-run), `agent_tool_retries` (tool called again after error), `agent_clarification_requests` (agent asked for clarification instead of acting). Store these in the `agent_usage` table alongside cost data. Review monthly to identify prompt improvements. Do not build a real-time dashboard for this — aggregate reporting is sufficient.

- **Q**: Should there be an admin dashboard for real-time agent monitoring,
  or is log-based monitoring sufficient for the initial release?

**A:** Log-based monitoring with Prometheus metrics for the initial release. Use Grafana dashboards connected to Prometheus for visualizing agent metrics. No custom admin dashboard — Grafana provides all the visualization needed. An admin API endpoint `GET /admin/agents/status` returns current system state (active sessions, queue depth, circuit breaker state) for quick checks.

### 9.2 Debugging

- **Q**: Should admin users be able to view another user's agent session
  transcript for debugging/support purposes?

**A:** Yes. System admins can access any session's transcript via `GET /admin/sessions/:id/messages`. This is essential for debugging agent issues and supporting users. Log admin access to the audit trail. Non-admin users can only see their own sessions.

- **Q**: Should the system support "replay" — re-running an agent session
  with the same inputs to reproduce issues?

**A:** Not for the initial release. Replay requires storing complete tool call results and API responses, and even then, LLM non-determinism means the replay won't be identical. For debugging, the session transcript (user messages, agent responses, tool calls and results) plus server logs provide sufficient context to understand what happened. Defer replay to phase 2 if needed.

- **Q**: Should agent sessions record enough data for full reproducibility
  (including exact Claude API responses, tool call results, timing)?

**A:** Record: user messages (verbatim), agent responses (verbatim), tool call inputs and outputs (full JSON), timestamps for each event, token counts per API call, error details. Do NOT record raw Claude API request/response bodies (these are large and contain the full context window). The recorded data is sufficient for debugging without excessive storage cost. Store in PostgreSQL in a `session_events` table with JSONB payloads.
