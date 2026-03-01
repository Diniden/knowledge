# 06-AGENT-SYSTEM / 01 — ARCHITECTURE: Open Questions

> **Purpose**: Unresolved questions about the agent system architecture
> including agent types, orchestration, lifecycle management, context
> assembly, memory, inter-agent communication, and resource constraints.
> Answers may change tasks in the plan.

---

## 1. Agent Type Design

### 1.1 Agent Type Boundaries
- **Q**: Should the orchestrator itself be a Claude Code instance (meta-agent
  pattern using an LLM to classify intent), or a deterministic rules-based
  router? LLM classification is more flexible but adds latency and cost;
  rules-based is faster but less adaptive.

**A:** The orchestrator is a Claude Code instance running in headless mode (`claude --print --output-format stream-json`). It classifies intent via LLM because the variety of user messages is too broad for a rules-based router to handle reliably. To control latency, the orchestrator uses a short system prompt focused exclusively on classification (no heavy context) and is capped at a single short response. Expected classification latency is 1–2 seconds, which is acceptable since the result is streamed back as a "thinking…" indicator on the client. Sub-agents are MCP tool groupings routed by the orchestrator — not separate processes — so once intent is classified, routing is a deterministic dispatch to the correct tool set within the same Claude Code session.

- **Q**: Should the Knowledge Graph Agent and Dialog Agent be merged into a
  single "conversational KG agent" that can both answer questions and modify
  the graph? This reduces delegation overhead but creates a larger, more
  complex agent.

**A:** Keep them separate. The KG Agent has write-capable MCP tools (`create_spec`, `update_spec`, `create_edge`, etc.) and a system prompt tuned for graph mutations with confirm-before-mutation defaults. The Dialog Agent has read-only KG tools plus RAG search tools and a conversational system prompt. Merging them would require the agent to constantly self-moderate write access, which is unreliable. Separation also means the Dialog Agent can never accidentally mutate the graph. The orchestrator handles delegation overhead — since sub-agents are just tool groupings, switching is a prompt reconfiguration, not a process spawn.

- **Q**: Should the Graph Crawler Agent be a persistent background process
  (always running, monitoring for changes) or an on-demand agent (spawned
  per trigger event)? Persistent is more responsive but consumes resources;
  on-demand is cheaper but has startup latency.

**A:** On-demand, triggered by events. The Graph Crawler is spawned as a Claude Code subprocess when specific events fire: spec created, spec updated, edge created/deleted, or on a scheduled cron (e.g., nightly integrity scan). It is not a persistent process. Startup latency (2–3 seconds) is acceptable because graph crawling is not user-facing — results go to the inquiry queue, not to a waiting user. This avoids wasting one of the 10 concurrent Claude Code process slots on idle background work.

- **Q**: Are there additional agent types needed? For example: a
  "Summarization Agent" specialized in creating summaries across multiple
  specs, or a "Migration Agent" for schema migrations?

**A:** No additional agent types at launch. The existing six types (orchestrator, KG agent, dialog agent, gen UI agent, plan gen agent, graph crawler) cover the required capabilities. Summarization is handled by the Dialog Agent using RAG context. Schema migrations are out of scope — the knowledge graph is file-based, and structural changes are handled by the Graph Crawler detecting issues and filing inquiries. If a clear gap emerges post-launch, a new agent type can be added as a new MCP tool grouping without architectural changes.

- **Q**: Should agents be versioned (e.g., KG Agent v1, v2) to allow
  rolling out improved agent behavior without breaking existing sessions?

**A:** No explicit agent versioning. Agent behavior is determined by system prompts, skills files, and CLAUDE.md — all of which are files in the project repo. Behavior changes are deployed by updating these files. Active sessions continue with the prompts they started with (prompt is assembled at session start and doesn't change mid-session). New sessions pick up the latest files. This gives us implicit versioning via git history of the prompt/skill files without adding a version management layer.

### 1.2 Agent Capabilities
- **Q**: Should all agents have read access to the entire knowledge graph,
  or should graph access be scoped per-request (only the relevant subgraph)?
  Full access enables richer context but may include irrelevant or restricted
  content.

**A:** Scoped per-request. Each agent session is sandboxed to a project directory, and MCP tool calls enforce project-level isolation. Within a project, the agent can read any spec via MCP tools, but the context assembled into the prompt contains only the relevant subgraph (determined by RAG similarity + graph traversal from referenced specs). The agent can fetch additional specs on demand via MCP tool calls if it needs broader context, but it starts with a focused subset. There is no cross-project access.

- **Q**: Should the Generative UI Agent be allowed to install npm packages
  dynamically, or must it work with a pre-approved package whitelist?
  Dynamic installation is more flexible but poses security risks.

**A:** Pre-approved whitelist only. The Gen UI Agent generates React mini-projects in `client/gen/{user}/{generated-ui}/` using iframe+ESM loading. A curated whitelist of allowed packages (React, Recharts, Tailwind, etc.) is maintained in the project config. The agent cannot run `npm install` — packages are resolved from a pre-built shared `node_modules` or CDN imports. This eliminates supply-chain attacks and keeps sandbox sizes small. The whitelist is extensible by project admins.

- **Q**: Should agents be able to call external APIs (weather, databases,
  third-party services), or are they strictly limited to internal MCP tools?
  External access dramatically expands capability but complicates security.

**A:** Strictly limited to the 7 internal MCP servers. Agents have no network access beyond what Claude Code needs for the Anthropic API. All data the agent needs comes through MCP tools (KG, RAG, File System, Git, etc.). If integration with external services is needed in the future, it would be exposed as a new MCP server with explicit access controls, not as raw network access from the agent.

---

## 2. Orchestration

### 2.1 Intent Classification
- **Q**: What is the acceptable latency for intent classification? If using
  Claude Code for classification, this adds 1-3 seconds per request. Would
  a faster, smaller model (or fine-tuned classifier) be appropriate?

**A:** Target latency is under 2 seconds. The orchestrator uses Claude Code in `--print` mode with a minimal system prompt (classification-only, ~300 tokens) and a constrained output format (JSON with `intent` and `agent_type` fields). This keeps classification fast. A smaller model or fine-tuned classifier is not needed at launch — the volume doesn't justify the maintenance cost. If classification latency becomes a bottleneck at scale, a distilled classifier model can be substituted later without architectural changes.

- **Q**: How should multi-intent requests be decomposed? Should the
  orchestrator identify all intents upfront (single classification call), or
  discover subsequent intents as each sub-task completes?

**A:** Single classification call identifies the primary intent and up to 2 secondary intents. The orchestrator returns a ranked list: `[{agent: "kg", intent: "create_spec"}, {agent: "dialog", intent: "explain_context"}]`. Intents are executed sequentially — the primary completes first, then secondaries are executed if still relevant. This avoids the complexity of parallel intent execution while still handling compound requests like "create a spec for auth and explain how it relates to the existing session spec."

- **Q**: Should the orchestrator maintain a "routing history" to improve
  classification over time (e.g., "this user usually means X when they
  say Y")? This is personalization at the routing level.

**A:** No. Routing history adds complexity with marginal benefit. The orchestrator classifies each request independently using the current conversation context (which already captures the user's working state). If a user's intent is ambiguous, the orchestrator routes to the Dialog Agent to ask a clarifying question. Per-user routing personalization is a future optimization, not a launch requirement.

- **Q**: What happens when the orchestrator is uncertain between two agent
  types? Should it pick the more likely one, ask the user, or run both
  in parallel and present the better result?

**A:** If confidence is above 70%, pick the more likely one. If below 70%, route to the Dialog Agent to ask a clarifying question (e.g., "Did you want me to create a new spec or search for an existing one?"). Never run both in parallel — it doubles cost and wastes a Claude Code process slot. The Dialog Agent clarification adds one round-trip but ensures the right agent handles the request.

### 2.2 Routing Logic
- **Q**: Should the orchestrator support "agent chaining" — automatically
  routing the output of one agent to another? For example: KG Agent creates
  a spec → Graph Crawler automatically analyzes implications.

**A:** Yes, but only for predefined chains, not arbitrary chaining. Two supported chains at launch: (1) KG Agent mutation → Graph Crawler analysis (async, non-blocking — the user gets the KG Agent result immediately, Graph Crawler runs in the background and files inquiries if issues are found), and (2) Plan Generation → Plan Review notification. Chains are defined in server config, not decided by the orchestrator at runtime. This keeps behavior predictable.

- **Q**: Should the orchestrator be able to override the user's implied
  intent? For example, if the user says "create a spec" but the orchestrator
  detects that a very similar spec already exists, should it route to the
  Dialog Agent first to inform the user?

**A:** Yes. The orchestrator performs a lightweight duplicate check (via RAG `search_similar` MCP tool call) before routing to the KG Agent for creation. If a high-similarity match is found (score > 0.85), the request is rerouted to the Dialog Agent, which presents the existing spec and asks "Did you mean to update this existing spec, or create a new one?" This follows the confirm-before-mutation principle and prevents duplicate specs.

- **Q**: How should the orchestrator handle agent-initiated requests (not
  from the user)? For example, Graph Crawler discovers an issue and wants
  to notify the user — does this go through the orchestrator?

**A:** Agent-initiated notifications do not go through the orchestrator. They go directly to the inquiry queue. The Graph Crawler files an inquiry (via `create_inquiry` MCP tool), which appears in the user's inquiry queue in the UI. The user can then act on inquiries at their convenience. The orchestrator only handles user-initiated requests from the WebSocket session. This separation keeps the orchestrator simple and prevents background agents from injecting into active conversations.

---

## 3. Agent Lifecycle

### 3.1 Session Management
- **Q**: Should agent sessions be tied to a conversation (one session per
  chat conversation) or per-request (new session for each user message)?
  Per-conversation enables richer context but uses more memory.

**A:** Per-conversation. A session is created when the user opens a chat and persists until the conversation ends. The session ID is returned by the API and used for WebSocket streaming. Claude Code's `--resume` flag is used to maintain continuity across messages within the same conversation. This gives the agent full conversation history for context without re-sending it each time. Sessions are lightweight — the conversation state is managed by Claude Code's built-in session handling.

- **Q**: How long should an idle agent session be kept alive? If the user
  stops chatting for 10 minutes, should the session be preserved (for
  seamless resume) or terminated (to free resources)?

**A:** Idle sessions are terminated after 15 minutes. The session metadata (conversation history, session ID) is persisted to the database before termination. When the user returns, `--resume` restores the session from persisted state. The Claude Code process itself is killed after 15 minutes idle — this frees the process slot. Resume latency is 2–3 seconds (cold start), which is acceptable for a user who has been idle for 15+ minutes.

- **Q**: Should sessions be transferable between server instances (for
  load balancing or failover)? This requires session state to be externalized
  (in Redis or PostgreSQL) rather than in-memory.

**A:** Yes. Session state (conversation history, session metadata) is stored in PostgreSQL. The Claude Code process is ephemeral and can be respawned on any server instance using `--resume` with the persisted session ID. This enables horizontal scaling and failover. Redis is not needed — PostgreSQL handles the session persistence, and session lookup is infrequent (only on resume, not per-message).

- **Q**: Should the system support "session forking" — creating a new
  session from an existing one's state? This could support "try a different
  approach" scenarios.

**A:** Not at launch. Session forking is a nice-to-have but adds significant complexity (duplicating conversation history, managing divergent session states). Users can achieve a similar effect by starting a new conversation and referencing the same specs. This can be revisited if user research shows strong demand.

### 3.2 Process Lifecycle
- **Q**: Should Claude Code processes be long-lived (kept warm for the
  duration of a conversation) or short-lived (fresh process per request)?
  Long-lived reduces startup latency but uses more memory; short-lived is
  cleaner but slower.

**A:** Medium-lived. A Claude Code process is spawned on the first message of a conversation and kept warm for up to 15 minutes of idle time. Subsequent messages in the same conversation reuse the process via `--resume`. After 15 minutes idle, the process is killed. This balances latency (no cold start for active conversations) with resource efficiency (idle processes don't consume slots). The 10-process concurrency cap applies to active processes only.

- **Q**: Is there a meaningful difference between a "warm" Claude Code
  process (pre-spawned, awaiting input) and a "cold" one (spawned on
  demand)? Does Claude Code support warm pools?

**A:** Claude Code does not natively support warm pools — it expects a prompt at invocation time. The `--resume` flag provides the closest equivalent: a previously started session can be resumed with a new message without re-sending the full conversation history. "Warm" in our context means a resumed session (fast, ~1 second) vs. "cold" meaning a new session (2–3 seconds for process spawn + MCP server initialization). Pre-spawning idle processes is not supported and not needed.

- **Q**: Should there be a process restart strategy for Claude Code
  instances that become unresponsive (zombie detection and automatic
  restart)?

**A:** Yes. The server monitors each Claude Code subprocess with a heartbeat check: if no stdout/stderr output is received for 60 seconds during an active operation, the process is considered unresponsive. The server kills the process (SIGTERM, then SIGKILL after 5 seconds), logs the failure, increments the circuit breaker counter (5 consecutive failures triggers the circuit breaker), and returns an error to the user with an option to retry. The retry spawns a fresh process with `--resume` to recover the session.

---

## 4. Context Assembly

### 4.1 Context Relevance
- **Q**: How should context relevance be determined? Should the system use
  RAG similarity scores, graph distance from referenced specs, recency of
  access, or a combination? What weights should each signal carry?

**A:** A weighted combination: RAG similarity (40%), graph distance (35%), recency (25%). RAG similarity captures semantic relevance. Graph distance (hop count from directly referenced specs) captures structural relevance — closer specs in the graph are more likely to be relevant. Recency captures conversational relevance — specs accessed recently in this session are likely still relevant. These weights are configurable in server config and can be tuned based on observed agent performance.

- **Q**: Should context assembly be agent-driven (the agent requests what
  it needs via MCP calls) or system-driven (the server pre-assembles context
  before the agent starts)? Agent-driven is more flexible but adds latency
  per MCP call.

**A:** Hybrid. The server pre-assembles a baseline context (directly referenced specs + top RAG results + recent conversation specs) into the initial prompt and CLAUDE.md. The agent can then fetch additional context on demand via MCP tool calls (e.g., `get_spec`, `search_similar`, `traverse_graph`). This gives the agent a strong starting context without MCP call latency, while still allowing it to pull in more context when the baseline is insufficient. The 50 MCP tool calls per message cap prevents runaway fetching.

- **Q**: Should the context include "negative examples" — specs the agent
  should NOT modify or reference? This could prevent the agent from
  overstepping its scope.

**A:** No explicit negative examples. Instead, scope is controlled by the MCP tool set: agents only have tools for their designated operations. The KG Agent's confirm-before-mutation behavior prevents accidental modifications. If a spec is truly off-limits (e.g., locked by another user), the MCP tool returns an error when the agent attempts to modify it. Adding negative examples to the context would consume tokens and paradoxically draw the agent's attention to the excluded specs.

- **Q**: How should context handle permission boundaries? If a user has
  "summary" access to a spec, should the agent see the full content (to
  reason about it) or only the summary (to respect access control)?

**A:** The agent sees only what the user is authorized to see. If the user has summary-only access, the MCP tool returns only the summary. The agent reasons over the summary and can note "full content not available" if needed. This respects access control at the MCP tool level — the server enforces permissions before returning data, not the agent. The agent never receives data the user shouldn't see.

### 4.2 Token Budget
- **Q**: What is the target Claude model for each agent type? Different
  models have different context windows (e.g., 200K vs. 100K tokens). This
  directly affects context budget allocation.

**A:** All agent types use the same model (Claude Sonnet, 200K context window) at launch. Sonnet provides the best cost/performance balance for tool-heavy workflows. The token budget is allocated per agent type: system prompt (~500 tokens), CLAUDE.md (~2K tokens), skills (~1K tokens), conversation history (~50K tokens), assembled context (~30K tokens), output buffer (~10K tokens), and remaining for tool call results. The Gen UI Agent and Plan Gen Agent get larger output buffers (~30K tokens) at the expense of conversation history allocation.

- **Q**: Should the system support dynamic model selection — using a smaller
  model for simple requests and a larger model for complex ones? This
  optimizes cost but adds complexity.

**A:** Not at launch. All agents use Sonnet. Dynamic model selection (e.g., Haiku for simple Dialog queries, Opus for complex Plan Generation) is a future optimization. The orchestrator already classifies intent, so it could also classify complexity and select a model — but this adds a second decision point and makes debugging harder. Start with one model, measure cost, and optimize later if needed.

- **Q**: How should the system handle requests that fundamentally require
  more context than the token budget allows (e.g., "summarize all 500 specs
  in the project")? Refuse, chunk, or use a different strategy?

**A:** Chunk with progressive summarization. The agent uses the RAG MCP server to search and retrieve specs in batches, summarizes each batch, then synthesizes the batch summaries into a final summary. This is handled by the agent's reasoning loop — it makes multiple MCP tool calls to `search_specs` with pagination, accumulating summaries. The 50 MCP tool calls per message cap and 5-minute operation timeout naturally bound this. If the request truly exceeds these limits, the agent explains the scope limitation and offers to summarize a subset (e.g., by tag or subgraph).

---

## 5. Agent Memory

### 5.1 Conversation History
- **Q**: Should conversation history be shared across agent types within a
  conversation? If the user talks to the Dialog Agent and then the KG Agent,
  should the KG Agent see the full dialog history?

**A:** Yes. Conversation history is shared across all agent types within a conversation session. Since sub-agents are MCP tool groupings (not separate processes), the orchestrating Claude Code instance maintains a single conversation thread. When the orchestrator routes to a different agent type, it reconfigures the available MCP tools but retains the full conversation history. This ensures the KG Agent knows what was discussed with the Dialog Agent and can act on it without the user repeating themselves.

- **Q**: How should "conversation reset" work? Should the user be able to
  clear conversation history while keeping the same session, or must they
  start a new session?

**A:** Start a new session. A "New Conversation" button in the UI creates a fresh session ID and spawns a new Claude Code process. The old session's history remains persisted in the database and can be viewed in a conversation history panel. In-session history clearing is not supported — it would create a confusing state where the session ID exists but has no history, breaking `--resume` semantics.

- **Q**: Should conversation history be searchable? "What did the agent say
  about authentication 3 conversations ago?"

**A:** Yes, but as a server-side feature, not an agent feature. Conversation histories are persisted in PostgreSQL and indexed for full-text search. The UI provides a "Search past conversations" feature. The agent itself does not search past conversations — it operates within the current session. If the user asks "what did we discuss before," the UI can surface relevant past conversations for the user to reference or resume.

- **Q**: Should there be a maximum conversation length (in messages or
  tokens) after which the system forces a new session?

**A:** Yes. Maximum 100 messages per conversation or when conversation history exceeds 80% of the context window budget (~40K tokens). When the limit is approached, the system compresses older messages (keeping the most recent 20 messages in full and summarizing earlier ones). If compression is insufficient, the system prompts the user: "This conversation is getting long. Would you like to continue in a new session? Your context will carry over via spec references." The `--resume` flag handles the underlying continuity.

### 5.2 Working Memory
- **Q**: Should working memory persist across sessions? If a user resumes
  work the next day, should the agent remember what specs were being
  discussed?

**A:** Partially. When a session ends, the server generates a brief session summary (~200 tokens) capturing: which specs were discussed, what actions were taken, and any unresolved intents. This summary is stored in the database and injected into the CLAUDE.md of the user's next session as a "Recent Activity" section. The agent doesn't have full recall of the previous session but has enough context to say "Last time you were working on the authentication spec" and pick up naturally.

- **Q**: Should working memory include "inferred facts" — things the agent
  has concluded but that aren't explicitly in any spec? For example, "the
  user seems to be designing an authentication system."

**A:** No. Working memory contains only factual references: spec IDs accessed, actions taken, explicit user statements. Inferred facts risk drift (the agent's inference may be wrong and then persist across sessions). The agent can re-infer context from the specs and conversation history in the current session. If a user wants to record an inference, they can create a spec for it — making it explicit in the knowledge graph.

- **Q**: Should working memory be visible to the user? A "what the agent
  knows about this conversation" view could build trust and allow correction.

**A:** Yes. The session summary (described above) is visible in the UI as a "Session Context" panel. It shows: referenced specs (linked), recent actions (created, updated, searched), and the current working context. Users can dismiss items from the context if they're no longer relevant. This builds transparency without exposing raw internal state.

---

## 6. Inter-Agent Communication

### 6.1 Delegation Model
- **Q**: Should delegation be synchronous (parent waits for child) or
  asynchronous (parent continues, child results arrive later)? Synchronous
  is simpler but blocks; asynchronous enables parallelism but complicates
  result assembly.

**A:** Synchronous. Since sub-agents are MCP tool groupings within the same Claude Code process (not separate processes), delegation is simply the orchestrator switching which tool set is active and making tool calls. The orchestrator waits for the tool call results before continuing. There is no separate child process to run asynchronously. The only async path is the background Graph Crawler chain (KG mutation → async Graph Crawler spawn), which doesn't return results to the user's session.

- **Q**: Should sub-agents be able to delegate further (recursive
  delegation), or only the orchestrator can delegate? Recursive enables
  complex workflows but risks runaway cost.

**A:** No recursive delegation. Only the orchestrator routes to agent types. An agent type (e.g., KG Agent) executes its task using its MCP tools and returns results to the orchestrator. If the task requires multiple agent types, the orchestrator handles the sequencing. This keeps the delegation tree flat (depth 1) and cost predictable. The 50 MCP tool calls per message cap is sufficient for any single agent's task.

- **Q**: What is the maximum delegation depth? 2 levels (orchestrator →
  agent → sub-agent)? 3 levels? Deeper chains increase latency and cost
  proportionally.

**A:** Depth 1. Orchestrator → agent type (MCP tool grouping). No further nesting. See above.

- **Q**: Should there be a "delegation budget" — a maximum number of
  delegations per user request? This prevents accidental cost explosions
  from complex multi-agent workflows.

**A:** The orchestrator can route to at most 3 agent types per user message (primary + up to 2 secondary intents). Combined with the 50 MCP tool calls per message cap and the 5-minute operation timeout, this effectively bounds cost per request. A separate delegation budget counter is not needed — the existing caps are sufficient.

### 6.2 Event-Based Communication
- **Q**: Should agent events (spec created, edge created) trigger other
  agents automatically, or should all agent activation go through the
  orchestrator? Automatic triggers are faster but harder to control;
  orchestrator-mediated is safer but adds latency.

**A:** Automatic triggers for predefined chains only (KG mutation → Graph Crawler, Plan Generation → review notification). These are configured at the server level, not decided by agents at runtime. All other agent activation goes through the orchestrator. This gives us the responsiveness of automatic triggers for known workflows without the risk of arbitrary cascading agent activations.

- **Q**: Should the event bus support "event sourcing" — storing all events
  for replay and audit? This is powerful for debugging but adds storage
  overhead.

**A:** Yes. All agent events (tool calls, mutations, routing decisions) are logged to an append-only event table in PostgreSQL. Events include: timestamp, session ID, user ID, event type, payload, and agent type. This provides a full audit trail for debugging and security review. Storage cost is low (events are small JSON records). Events are retained for 90 days, then archived or purged based on project retention settings.

- **Q**: Should events be delivered with exactly-once, at-least-once, or
  at-most-once semantics? Exactly-once is hardest to implement but prevents
  duplicate processing.

**A:** At-least-once with idempotency. Event handlers (e.g., Graph Crawler triggered by a spec mutation) are designed to be idempotent — processing the same event twice produces the same result. This is straightforward because the Graph Crawler reads current graph state rather than applying deltas. At-least-once delivery is simple to implement (retry on failure) and the idempotency guarantee prevents duplicate side effects.

---

## 7. Error Handling

- **Q**: When an agent fails mid-operation (e.g., created a spec but failed
  to create the edge), should the system auto-rollback the partial changes
  or leave them in place and flag for manual cleanup?

**A:** Leave in place and flag. Auto-rollback is fragile (the rollback itself can fail) and may delete work the user wants to keep. Instead, the system: (1) logs the partial failure, (2) creates an inquiry in the user's inquiry queue describing what succeeded and what failed, and (3) returns an error message to the user explaining the partial state. The user (or a subsequent agent invocation) can then decide whether to complete the operation or clean up. The confirm-before-mutation pattern reduces the likelihood of this scenario.

- **Q**: Should agent errors be surfaced differently based on whether the
  user caused the error (bad input) vs. the system failed (process crash)?
  Different error presentations may be appropriate.

**A:** Yes. Two error categories: (1) **User errors** (invalid spec title, duplicate name, missing required field) are returned as conversational messages from the Dialog Agent: "That spec title already exists. Would you like to use a different name?" (2) **System errors** (process crash, timeout, MCP server failure) are returned as system-level error cards in the UI with a retry button and an error code for support. The server distinguishes these by error source — MCP tool validation errors are user errors; process/infrastructure failures are system errors.

- **Q**: Should the system attempt to recover lost context if a Claude Code
  process crashes? For example, by summarizing the last known conversation
  state and starting a new process.

**A:** Yes. On process crash, the server: (1) logs the crash with full context, (2) spawns a new Claude Code process, (3) uses `--resume` with the persisted session ID to restore conversation history. If `--resume` fails (session state corrupted), the server generates a recovery summary from the persisted conversation log and starts a new session with that summary in the CLAUDE.md. The user sees: "Your session was interrupted. I've recovered your conversation context — here's where we left off: [summary]."

- **Q**: How should "soft errors" (agent produced output but it doesn't
  match expected format) be handled? Parse what's possible, retry, or
  reject entirely?

**A:** Parse what's possible with fallback. The output parser attempts lenient extraction: if the agent returned text with embedded JSON blocks, extract the JSON. If the agent returned a conversational response instead of structured output, treat it as a Dialog response and surface it to the user. Only retry if the output is completely unparseable (garbled, truncated). Maximum 1 retry per soft error. If the retry also fails, surface the raw text to the user with a note: "The response format was unexpected. Here's what the agent said:" — always prioritize showing the user something over showing nothing.

---

## 8. Concurrency & Resource Limits

### 8.1 Concurrency Model
- **Q**: Should the system support parallel agent execution within a single
  user request? For example, running KG Agent and Dialog Agent simultaneously
  for a multi-intent request.

**A:** No. Multi-intent requests are executed sequentially (primary intent first, then secondaries). Since sub-agents are MCP tool groupings within a single Claude Code process, true parallelism would require spawning multiple processes per request — consuming process slots and complicating result assembly. Sequential execution with a 5-minute timeout is sufficient. The user sees streaming output from each agent in sequence.

- **Q**: How should the system handle "write contention" — two agents trying
  to modify the same spec simultaneously? This could happen if Graph Crawler
  is running while the user edits a spec.

**A:** Optimistic locking at the MCP tool level. Each spec has a `version` field (monotonically increasing integer). MCP mutation tools (`update_spec`, `delete_spec`) require the current version in the request. If the version doesn't match (another write happened), the tool returns a conflict error. The agent (or Graph Crawler) can then re-read the spec and retry. For the Graph Crawler specifically, it only files inquiries (read + write to inquiry queue), so spec write contention is rare.

- **Q**: Should background agents (Graph Crawler) be automatically
  suspended when the system is under high load, or should they always run?

**A:** Automatically deprioritized. When active Claude Code processes are at 8+ out of 10 (80% capacity), background Graph Crawler spawns are queued and delayed until capacity drops below 6 (60%). User-initiated requests always take priority. The Graph Crawler queue is processed FIFO when capacity is available. If the queue grows beyond 50 items, older items are coalesced (multiple events for the same spec become one crawl).

### 8.2 Resource Limits
- **Q**: What are reasonable per-user daily token limits? This depends on
  pricing and expected usage patterns. Should there be different tiers
  (free, pro, enterprise)?

**A:** Three tiers: **Free** — 50K input + 20K output tokens/day (~20 simple queries). **Pro** — 500K input + 200K output tokens/day (~100 queries including plan generation). **Enterprise** — configurable per-organization limits. These are starting points; actual limits will be tuned based on observed usage patterns and cost data. Per-project cost tracking (already in the PRD) provides the data for tuning.

- **Q**: Should token limits be enforced at the agent level (per session)
  or at the user level (across all sessions)? User-level prevents gaming
  by splitting requests across many sessions.

**A:** User-level, tracked per day (UTC midnight reset). A user's total token consumption across all sessions, all projects, and all agent types counts toward their daily limit. Token usage is tracked in real-time via the cost tracking system and checked before each Claude Code invocation. This prevents gaming via session splitting.

- **Q**: How should the system handle users who hit their limits mid-
  conversation? Abruptly cut off, allow the current turn to finish, or
  degrade to a "summary-only" mode?

**A:** Allow the current turn to finish (honor the in-flight request), then block subsequent requests with a clear message: "You've reached your daily usage limit. Your limit resets at midnight UTC. Upgrade to Pro for higher limits." The in-progress request is allowed to complete to avoid leaving the knowledge graph in a partial state. No "degraded mode" — it's cleaner to have a hard boundary.

- **Q**: Should there be separate cost budgets for different agent types?
  Plan Generation is expensive; should it have its own budget distinct from
  Dialog queries?

**A:** No separate budgets per agent type. A single daily token budget per user is simpler to understand and manage. However, the UI shows a cost breakdown by agent type so users can see where their tokens are going. If Plan Generation dominates, users can see that and plan accordingly. Separate budgets create confusion ("I have budget left but can't generate a plan because my plan budget is depleted").

---

## 9. Security

- **Q**: Should agent sessions be auditable? Should there be a full audit
  trail of every tool call an agent makes, for security review?

**A:** Yes. Every MCP tool call is logged to the event table: timestamp, session ID, user ID, tool name, input parameters (with sensitive fields redacted), output summary, and execution duration. This audit trail is queryable by project admins and system operators. Logs are retained for 90 days. This is essential for debugging, security review, and compliance.

- **Q**: How should the system prevent prompt injection attacks via spec
  content? A malicious spec could contain instructions that alter agent
  behavior when read as context.

**A:** Defense in depth: (1) Spec content is wrapped in clear delimiters when injected into prompts (`<spec_content id="sp_xxx">...</spec_content>`) to help the model distinguish data from instructions. (2) System prompts include explicit instructions to treat spec content as data, not as instructions. (3) MCP tools validate all mutation requests against expected schemas — even if the agent is tricked into calling a tool with malicious arguments, the tool validates inputs. (4) Confirm-before-mutation requires user approval for destructive operations, providing a human checkpoint.

- **Q**: Should agents operate under the user's permissions, or have their
  own service-level permissions? If agents have elevated permissions, how
  is this controlled?

**A:** Agents operate under the user's permissions. Every MCP tool call includes the user's auth context, and the MCP server enforces the user's permission level. Agents have no elevated permissions. If an agent tries to perform an operation the user can't do, the MCP tool returns a permission error, and the agent reports it to the user. This is the simplest and most secure model — no privilege escalation, no confused deputy.

- **Q**: Should agent MCP tool calls be validated against the user's
  permissions before execution? For example, if the user can't delete
  specs, the agent shouldn't be able to either (even though it has the tool).

**A:** Yes. As stated above, every MCP tool call passes through the server's permission layer with the user's auth context. The MCP server checks permissions before executing any operation. The agent having a tool in its tool list does not grant permission to use it — the tool execution itself is gated. This means agents have a superset of tools available (for flexibility) but only the user's permissions determine what actually executes.

---

## 10. Performance

- **Q**: What is the target end-to-end latency for a simple agent response
  (e.g., "What is spec X about?")? This helps determine whether the
  orchestrator classification step is acceptable or needs optimization.

**A:** Target: first token in under 3 seconds, full response in under 8 seconds. Breakdown: orchestrator classification (1–2s) + agent prompt assembly (~0.5s) + Claude Code first token (~1s) + streaming response (variable). For a simple spec lookup, the agent makes 1 MCP tool call (`get_spec`, ~200ms) and then generates a natural language response. The classification step is acceptable within this budget.

- **Q**: Should there be a "fast path" that bypasses the orchestrator for
  obvious requests (e.g., if the user is in the spec editor and says "update
  this spec," route directly to KG Agent)?

**A:** Yes. The server implements fast-path rules for unambiguous contexts: (1) User is in spec editor + message contains "update/edit/change" → KG Agent directly. (2) User is in plan view + message contains "execute/run" → Plan Gen Agent directly. (3) Message starts with "/" (slash commands like `/search`, `/create`) → route to the appropriate agent. Fast paths skip the orchestrator classification entirely, saving 1–2 seconds. All other messages go through the orchestrator.

- **Q**: Should the system precompute context for likely follow-up requests?
  For example, after creating a spec, preload edge suggestion context for
  the next turn.

**A:** Yes, lightweight precomputation only. After a spec creation, the server asynchronously preloads: (1) potential related specs (via RAG `search_similar`), and (2) the spec's immediate graph neighborhood. These are cached in the session context and available instantly if the user asks about edges or related specs. The precomputation is fire-and-forget — if it doesn't complete before the next message, the agent fetches on demand. This optimizes the common workflow without blocking anything.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
|------|----------|----------|-----------|
| — | — | — | — |
