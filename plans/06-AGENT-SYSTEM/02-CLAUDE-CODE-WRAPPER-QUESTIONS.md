# 06-AGENT-SYSTEM / 02 — CLAUDE CODE WRAPPER: Open Questions

> **Purpose**: Unresolved questions about the Claude Code CLI integration
> layer including process management, sandboxing, prompt construction,
> output handling, cost tracking, rate limiting, and CLAUDE.md generation.
> Answers may change tasks in the plan.

---

## 1. CLI Integration

### 1.1 Binary & Version

- **Q**: Should the wrapper support multiple Claude Code binary versions
  simultaneously (e.g., v1 for stable agents, v2-beta for experimental)?
  This adds complexity but enables safe version testing.

**A:** No. A single Claude Code binary version is used across all agents. The binary is pinned in the project's dependency manifest and updated via a controlled upgrade process (test in staging, then deploy to production). Running multiple binary versions simultaneously introduces subtle behavioral differences that are extremely hard to debug. If a new version needs testing, it's tested in a staging environment, not side-by-side in production.

- **Q**: What is the expected Claude Code release cadence? Should the
  wrapper automatically check for updates, or is manual upgrade preferred?

**A:** Manual upgrade. The server operator explicitly upgrades the Claude Code binary as part of a deployment. No auto-update — auto-updating a core runtime dependency in production is risky. The wrapper logs the current Claude Code version at startup for diagnostics. A version check endpoint can notify operators when a new version is available, but the upgrade is always a deliberate action.

- **Q**: Should the wrapper support alternative AI runtimes besides Claude
  Code (e.g., a local LLM runner for development/testing)? This would
  require abstracting the CLI interface.

**A:** No. The wrapper is purpose-built for Claude Code. Abstracting the CLI interface to support alternative runtimes adds a layer of indirection that isn't justified — Claude Code's specific features (`--resume`, `--output-format stream-json`, MCP tool integration, CLAUDE.md auto-loading) are deeply integrated into the wrapper's design. For local development testing, developers use Claude Code with their own Anthropic API keys. A mock mode (see Testing section) handles cases where API access isn't available.

- **Q**: Does Claude Code support a programmatic API (library mode) in
  addition to CLI mode? If so, should the wrapper use the API instead of
  spawning subprocesses? API mode would be more efficient.

**A:** Claude Code's primary interface is the CLI. The wrapper uses CLI subprocess spawning (`claude --print --output-format stream-json`) because this is the documented and supported integration path. If Anthropic releases a Node.js SDK for Claude Code with library mode, we can migrate — but the subprocess model works well, provides natural process isolation, and is consistent with the PRD's architecture. Don't over-engineer for a hypothetical API.

### 1.2 Invocation Model

- **Q**: Should the wrapper use `--print` mode (single prompt → single
  response) or interactive mode (multi-turn within one process)? Print
  mode is simpler; interactive mode could be more efficient for
  multi-turn conversations within a single agent session.

**A:** `--print` mode with `--resume` for multi-turn. Each user message is a separate `--print` invocation with `--resume <session-id>` to maintain conversation continuity. This gives us per-message process isolation (clean process per turn) while preserving conversation context (via `--resume`). Interactive mode would require managing stdin/stdout pipes to a long-running process, which is fragile. `--print` + `--resume` is the best of both worlds.

- **Q**: Does Claude Code support passing MCP server configurations via
  CLI flags, or must they be configured in a `.mcp.json` file? This
  affects whether MCP servers can be dynamically assigned per invocation.

**A:** MCP servers are configured via `.mcp.json` in the sandbox directory. The wrapper generates this file as part of sandbox setup before each invocation. Since each agent type needs different MCP tool groupings, the wrapper writes a per-session `.mcp.json` that includes only the MCP servers relevant to the current agent type. This is dynamic per invocation — the file is generated, not static. The `.mcp.json` lists each MCP server with its stdio command, and Claude Code discovers tools from the configured servers at startup.

- **Q**: Should the prompt be passed via CLI argument (`--prompt "..."`),
  stdin pipe, or a temporary file? Large prompts may exceed CLI argument
  length limits.

**A:** Stdin pipe. The wrapper pipes the prompt to Claude Code's stdin. This avoids CLI argument length limits (which vary by OS but are typically 128K–2MB) and avoids writing sensitive prompt content to temporary files on disk. The stdin pipe handles arbitrary prompt sizes, and the wrapper controls the pipe lifecycle. This is the cleanest approach for programmatic invocation.

---

## 2. Process Management

### 2.1 Process Lifecycle

- **Q**: What is the typical cold-start time for a Claude Code process?
  If it's > 3 seconds, the warm process pool becomes more important. Has
  this been benchmarked?

**A:** Expected cold-start time is 2–3 seconds: ~0.5s for process spawn, ~1s for MCP server initialization (stdio handshake with each configured MCP server), ~0.5–1s for CLAUDE.md loading and prompt processing. This is acceptable for the first message in a conversation. Subsequent messages use `--resume`, which skips MCP server re-initialization and is faster (~1s). Benchmarking should be done in staging to validate these estimates before launch.

- **Q**: Should long-running agents (Plan Generation, Graph Crawler) run
  as a single long process, or be broken into multiple short process
  invocations? Long processes risk timeout; short processes lose context.

**A:** Single process with the 5-minute timeout. Plan Generation and Graph Crawler are the most complex agent tasks, but they can complete within 5 minutes if the scope is bounded (max 100 specs per plan, max 500 specs per crawl). The 5-minute timeout is a hard kill — if the process hasn't completed, it's terminated and the partial result is returned. For very large plans, the Plan Gen agent breaks the work into phases internally (graph traversal → plan structure → file generation), streaming progress to the client via `stream-json` output. Breaking into multiple process invocations would lose the agent's reasoning context.

- **Q**: Should the server use a single-threaded or multi-threaded model
  for managing Claude Code processes? Node.js is single-threaded, but
  child process management uses the event loop effectively. Are there
  scaling concerns?

**A:** Node.js single-threaded event loop is sufficient. Claude Code processes are child processes managed via `child_process.spawn()`, which is non-blocking and event-driven. The server's main thread handles WebSocket connections, process lifecycle events, and MCP server I/O — all I/O-bound work that Node.js excels at. With a 10-process concurrency cap, the overhead of managing child processes is negligible. Worker threads are not needed. If scaling beyond a single server instance is required, horizontal scaling (multiple server instances behind a load balancer) is the path, not multi-threading.

- **Q**: Should there be a hard limit on the number of concurrent Claude
  Code processes per server instance, or should this scale based on
  available memory/CPU? Hard limits are simpler; dynamic limits optimize
  resource usage.

**A:** Hard limit of 10 concurrent Claude Code processes per server instance, as specified in the PRD. This is enforced at the process pool level. The limit is a server config value that can be adjusted per deployment (e.g., a beefy server might support 15, a constrained one might be capped at 5). Dynamic scaling based on memory/CPU is over-engineering for launch — the hard limit is predictable and easy to reason about. Each Claude Code process typically uses ~100–200MB of memory, so 10 processes ≈ 1–2GB.

### 2.2 Process Pool

- **Q**: Is a warm process pool technically feasible with Claude Code?
  Does the CLI support being spawned in a "waiting" state, or must it
  receive the prompt at invocation time?

**A:** Not feasible. Claude Code requires a prompt at invocation time — it cannot be spawned in a "waiting" state. The `--resume` flag provides the closest equivalent to warm pools: a previously completed session can be resumed with a new prompt without replaying the full conversation. There is no pre-spawn capability. Cold-start latency (2–3s) is managed by user expectations (first message in a conversation is slower) and fast-path routing (skipping orchestrator for obvious intents).

- **Q**: If warm pools aren't feasible, is there a way to reduce cold-start
  latency? Pre-loading MCP server connections? Caching model weights?

**A:** Two mitigations: (1) **Pre-generate sandbox directories**: The wrapper pre-creates sandbox directories with `.mcp.json`, `CLAUDE.md`, and skills files already in place, so the process starts immediately without file I/O delays. (2) **Fast-path routing**: For unambiguous requests (slash commands, in-context edits), skip the orchestrator entirely, saving 1–2 seconds. Model weight caching is handled by Anthropic's infrastructure (not our concern). MCP server connections cannot be pre-established since they're per-process stdio pipes.

- **Q**: Should pooled processes be dedicated per agent type (one pool per
  type) or shared across types (single pool, configured at invocation)?

**A:** N/A — no warm pool. Each Claude Code invocation is configured at spawn time with the appropriate `.mcp.json` (determining which MCP servers/tools are available) and `CLAUDE.md` (determining agent behavior). The 10-process cap is a shared pool across all agent types, allocated on a first-come-first-served basis with priority given to user-initiated requests over background tasks.

---

## 3. Sandboxing

### 3.1 Directory Isolation

- **Q**: Does Claude Code respect `--working-directory` as a hard sandbox
  boundary, or can the agent still access files outside it? If not a hard
  boundary, additional OS-level sandboxing (chroot, containers) may be
  needed.

**A:** Claude Code uses the working directory as its file system root, but it is not a hard OS-level sandbox — the process could theoretically access parent directories. For our purposes, this is acceptable because: (1) MCP tools are the primary interface to the knowledge graph, not direct file access. (2) The sandbox directory contains only project-scoped files (CLAUDE.md, skills, `.mcp.json`, and any working files). (3) The MCP servers enforce access control at the API level. OS-level sandboxing (containers) is a future hardening step for production deployments, not a launch requirement.

- **Q**: Should the sandbox use symlinks (fast, real-time data) or copies
  (isolated, safe) for the knowledge graph? Symlinks risk the agent
  modifying the KG directly; copies risk staleness.

**A:** Neither. The knowledge graph is not exposed as files in the sandbox. Agents interact with the KG exclusively through MCP tools (`get_spec`, `create_spec`, `search_specs`, etc.). The sandbox directory contains only: `.mcp.json`, `CLAUDE.md`, skills files, and any working files the agent creates (e.g., generated UI projects). This eliminates the symlink-vs-copy question entirely. MCP tools ensure all KG access goes through the server's validation and permission layers.

- **Q**: Should each agent session get its own sandbox directory, or
  should sandbox directories be reused across sessions in the same
  project? Reuse is more efficient; isolation is safer.

**A:** Per-session sandbox directories. Each session gets a fresh directory under a temp path (e.g., `/tmp/botnet/sessions/{session-id}/`). The directory is created at session start and cleaned up 15 minutes after session termination. Per-session isolation prevents cross-contamination (one session's working files leaking into another) and makes cleanup deterministic. The overhead of creating a directory with 3–4 small files is negligible (<10ms).

- **Q**: Should the sandbox include a virtual filesystem layer to intercept
  and log all file operations? This would provide audit capabilities but
  adds performance overhead.

**A:** No. The audit trail is captured at the MCP tool call level (every tool call is logged with inputs and outputs). File operations within the sandbox are not audited — they're ephemeral working files. Adding a virtual filesystem layer (e.g., FUSE) would add latency, complexity, and a Linux-only dependency. MCP-level auditing is sufficient.

### 3.2 Security

- **Q**: Should the Claude Code process run as a separate OS user with
  restricted permissions? This provides OS-level isolation but complicates
  process management.

**A:** Not at launch. Claude Code processes run as the same OS user as the server. The sandbox directory, MCP-level access control, and network restrictions provide sufficient isolation for initial deployment. Running as a separate OS user requires managing user creation, file permissions, and process spawning with privilege separation — significant complexity. This is a hardening step for production environments handling untrusted user content, implemented after the core system is stable.

- **Q**: What happens if Claude Code generates a file that contains
  malicious content (e.g., a script that accesses the server's environment)?
  Should generated files be scanned before serving to users?

**A:** Generated UI files are served in iframes with strict sandboxing (`sandbox="allow-scripts"` without `allow-same-origin`), which prevents access to the parent page's cookies, storage, or server environment. The iframe+ESM loading model described in the PRD naturally isolates generated code. Additionally, the Gen UI MCP server runs a static analysis pass (checking for `fetch()` calls to non-whitelisted domains, `eval()`, `document.cookie` access) before marking a generated UI as ready. Files that fail static analysis are flagged and not served.

- **Q**: Should the sandbox have network access restrictions? Claude Code
  needs to call the Anthropic API, but should it be able to make other
  network requests?

**A:** In production, network access should be restricted to: (1) Anthropic API endpoints (for Claude Code's LLM calls), and (2) localhost stdio pipes (for MCP server communication). All other outbound network access should be blocked. This is enforced via firewall rules or network policies at the infrastructure level (e.g., Kubernetes NetworkPolicy, iptables rules). At development time, unrestricted network access is acceptable. This prevents agents from exfiltrating data or accessing internal services.

---

## 4. Prompt Construction

### 4.1 Template Design

- **Q**: Should prompt templates be stored as TypeScript files (type-safe,
  compiled) or as external files (Handlebars, Markdown, editable without
  rebuild)? TypeScript is safer; external files enable faster iteration.

**A:** TypeScript files using tagged template literals. Templates are functions that accept typed context objects and return strings. This provides: (1) type safety for context variables, (2) compile-time validation, (3) easy unit testing, and (4) co-location with the code that uses them. The templates are simple string concatenation — no template engine dependency needed. Rapid iteration is handled by the development cycle (save → rebuild → test), which is fast with Bun's bundler.

- **Q**: How should prompt templates handle versioning? If a template
  change improves agent behavior for new sessions, should it also apply
  to ongoing conversations (potentially changing behavior mid-conversation)?

**A:** Templates are loaded at session start and fixed for the session's lifetime. A session that starts with template v5 uses v5 for all subsequent messages in that conversation (even if the server deploys v6 mid-conversation). This prevents behavioral shifts mid-conversation that could confuse the user. New sessions pick up the latest templates. This is naturally handled by the `--resume` flag — the session retains its original system prompt.

- **Q**: Should there be a prompt testing framework — a way to evaluate
  template changes against a test set of user requests before deploying?

**A:** Yes. A prompt evaluation suite with: (1) A set of ~50 test inputs covering each agent type and common edge cases. (2) Expected output criteria (not exact match, but structural: "response contains spec ID," "response includes confirmation prompt," etc.). (3) Run as part of CI before merging prompt changes. This is not a full LLM evaluation framework — it's a lightweight check that template changes don't break basic functionality. Uses Claude Code in `--print` mode with deterministic seeds if available.

- **Q**: How detailed should system prompts be? Very detailed prompts
  produce more consistent behavior but consume more tokens (reducing
  context budget). What's the right balance?

**A:** Target 300–500 tokens per system prompt. System prompts define the agent's role, core behavior rules, output format requirements, and 2–3 critical constraints. Detailed operational procedures (e.g., how to create a well-structured spec) go in skills files, not the system prompt. MCP tool descriptions are provided by Claude Code's tool discovery, not duplicated in the prompt. This keeps the system prompt concise while offloading detail to skills files that are loaded on demand.

### 4.2 Context Assembly

- **Q**: Should the prompt include full spec content or just spec summaries
  plus IDs (with the agent fetching full content via MCP tools if needed)?
  Full content is faster but uses more tokens; IDs + fetch is leaner but
  adds latency per tool call.

**A:** Summaries + IDs in the initial context, with full content fetched on demand. The CLAUDE.md includes a "Relevant Specs" section listing spec IDs, titles, and summaries (~100 tokens per spec). The agent decides which specs need full content and fetches them via `get_spec` MCP tool calls. This is the best tradeoff: the agent has enough context to reason about which specs are relevant, and only pays the token/latency cost for specs it actually needs in full. For the KG Agent working on a specific spec, the target spec's full content is included directly.

- **Q**: How should the system handle prompt construction for conversations
  that have been going for many turns? At some point, the conversation
  history alone may exceed the token budget.

**A:** Progressive compression. Conversation history is managed in three tiers: (1) **Recent** (last 20 messages): full content. (2) **Mid-range** (messages 21–50): compressed to key points (user intent + agent action + outcome, ~50 tokens per exchange). (3) **Old** (messages 50+): dropped entirely, with a note "Earlier conversation history has been summarized." Claude Code's `--resume` handles the underlying session state; the wrapper manages what's included in the prompt's conversation context. The 100-message session cap prevents unbounded growth.

- **Q**: Should the prompt include information about what tools are
  available (tool descriptions) or rely on Claude Code's built-in tool
  discovery? Explicit tool descriptions ensure the agent knows what's
  available but use tokens.

**A:** Rely on Claude Code's built-in tool discovery. Claude Code automatically discovers available tools from configured MCP servers and presents them to the model. Duplicating tool descriptions in the system prompt wastes tokens. The system prompt may mention tool categories ("You have access to knowledge graph tools for creating and searching specs") to guide tool selection strategy, but not enumerate individual tools. The `.mcp.json` configuration determines which tools are available — the prompt doesn't need to.

---

## 5. Output Parsing

### 5.1 Output Format

- **Q**: Which Claude Code output format should be the primary format:
  `json`, `stream-json`, or `text`? JSON is easiest to parse; stream-json
  provides real-time feedback; text is a fallback.

**A:** `stream-json` as the primary format, as specified in the PRD (`--output-format stream-json`). This provides real-time streaming of agent output to the client via WebSocket, while each line is a parseable JSON object (enabling tool call interception, progress indicators, and structured metadata extraction). The wrapper parses each JSON line as it arrives, extracts the relevant fields (text content, tool calls, errors), and forwards them to the WebSocket. `text` is the fallback if stream-json parsing fails for a particular line.

- **Q**: How should the parser handle cases where Claude Code produces
  output that mixes formats (e.g., text with embedded JSON blocks)? This
  can happen when the agent doesn't perfectly follow output instructions.

**A:** The `stream-json` format handles this natively — each event is a distinct JSON line with a `type` field (`text`, `tool_use`, `tool_result`, `error`, etc.). Mixed content is expected and handled by the parser's type-based dispatch. If a malformed JSON line is encountered, the parser logs a warning, treats the raw line as text content, and continues processing subsequent lines. The stream is resilient to individual malformed lines.

- **Q**: Should the output parser attempt to "fix" malformed JSON (e.g.,
  missing closing braces, trailing commas), or reject it strictly? Lenient
  parsing recovers more results but may misinterpret intent.

**A:** Lenient for `stream-json` line parsing (skip malformed lines, log warning, continue). Strict for structured tool call results (if a tool call result doesn't parse as valid JSON, the tool call is treated as failed and the error is surfaced). This balances resilience (a single bad line doesn't kill the stream) with correctness (tool call results must be valid to be acted upon).

- **Q**: How should multi-modal output (text + tool results + error
  messages) be ordered and presented to the user? Should tool results
  be inlined in the text or presented separately?

**A:** Chronological order as received from the stream. Text is streamed directly to the user. Tool calls are shown as collapsible "action cards" in the chat UI (e.g., "Searched for related specs → found 3 results" with an expand option to see details). Error messages are shown as inline error indicators. The frontend renders each stream event in order, so the user sees the agent's reasoning flow naturally: text → tool call → tool result → more text. This matches the ChatGPT/Claude.ai UX pattern that users expect.

### 5.2 Tool Call Handling

- **Q**: When Claude Code makes multiple MCP tool calls in sequence,
  should the wrapper intercept each call individually (for monitoring)
  or let them execute transparently? Interception enables monitoring
  but may affect timing.

**A:** The wrapper intercepts passively — it reads each `tool_use` and `tool_result` event from the `stream-json` output for logging and monitoring, but does not inject itself into the execution path. Claude Code manages the MCP tool call lifecycle directly (it sends the call to the MCP server via stdio and receives the result). The wrapper observes the stream events, logs them to the audit trail, updates the tool call counter (toward the 50-call cap), and forwards the events to the WebSocket. No timing impact because interception is read-only on the output stream.

- **Q**: Should the wrapper implement "tool call approval" — requiring
  user confirmation before executing destructive MCP tool calls (e.g.,
  `delete_spec`)? This is safer but adds friction.

**A:** Yes. This is the confirm-before-mutation default from the PRD. The wrapper detects mutation tool calls (`create_spec`, `update_spec`, `delete_spec`, `create_edge`, `delete_edge`) in the `stream-json` output. For destructive operations (delete, bulk update), the wrapper pauses the stream, sends a confirmation prompt to the client via WebSocket, and waits for user approval before allowing execution to continue. Non-destructive reads and searches execute without confirmation. Users can toggle "auto-approve" mode in settings for trusted workflows.

- **Q**: How should the wrapper handle tool calls that the agent shouldn't
  have access to? (e.g., Dialog Agent trying to call `create_spec`).
  Block silently, return an error to the agent, or log and alert?

**A:** Return an error to the agent. The MCP server configuration (`.mcp.json`) for each agent type only includes the allowed MCP servers. If a tool call arrives for a tool that isn't in the agent's configured set, the MCP server won't be available and Claude Code will receive a tool-not-found error natively. This is enforced at the configuration level, not the wrapper level. The wrapper logs the attempt as a warning for monitoring (could indicate a prompt issue causing the agent to attempt unauthorized tools).

---

## 6. Streaming

- **Q**: What is the expected client-side rendering approach for streamed
  text? Token-by-token (like ChatGPT), sentence-by-sentence, or
  paragraph-by-paragraph? This affects chunking strategy.

**A:** Token-by-token, matching the ChatGPT/Claude.ai experience users expect. The `stream-json` format emits text tokens individually, and the WebSocket forwards each token to the client. The frontend appends tokens to the message bubble as they arrive. For tool call events, the frontend renders an action card when the `tool_use` event arrives and updates it with results when the `tool_result` event arrives. No batching or buffering on the server side.

- **Q**: Should the streaming include "thinking" indicators (agent is
  processing, calling tools, waiting for results) between text chunks?
  This improves UX but adds complexity.

**A:** Yes. The wrapper injects synthetic status events into the WebSocket stream: `{"type": "status", "message": "Searching knowledge graph..."}` when a tool call is detected, and `{"type": "status", "message": "Processing results..."}` when the tool result arrives and the agent is generating the next text chunk. These are lightweight UI hints — the frontend renders them as animated status indicators between message chunks. The wrapper derives these from the `stream-json` event types automatically.

- **Q**: How should streaming handle long tool call execution times? If
  the agent calls a tool that takes 10 seconds, should the stream show
  a "searching..." indicator, or pause silently?

**A:** Show a status indicator. When a `tool_use` event is detected, the wrapper sends a status event to the WebSocket: `{"type": "status", "tool": "search_similar", "state": "executing"}`. The frontend renders this as an animated indicator (e.g., a pulsing dot with "Searching for similar specs..."). If the tool call exceeds 30 seconds, the wrapper sends an updated status: `{"type": "status", "state": "still_working"}`. Silent pauses are unacceptable — the user needs feedback that the system is still working.

- **Q**: Should the server support "replay" of completed streams? If a
  user refreshes the page during streaming, can they see the already-
  streamed content?

**A:** Yes. Completed messages are persisted in the database as full text (not as stream events). When a user refreshes, the frontend loads the conversation history from the REST API (not WebSocket), which returns fully-rendered messages. If a stream is in-progress during refresh, the WebSocket reconnects and the server replays the buffer of events already emitted for the current message, then continues streaming live. The server maintains a per-session event buffer for the current in-progress message (cleared when the message completes).

---

## 7. Cost & Rate Limiting

### 7.1 Cost Model

- **Q**: What is the expected per-request cost range for each agent type?
  This determines reasonable daily/monthly budgets. Has the cost model
  been estimated based on expected token usage?

**A:** Estimated per-request costs (based on Claude Sonnet pricing): **Dialog Agent**: ~$0.01–0.03 (short context, short response). **KG Agent**: ~$0.03–0.08 (medium context, mutation + confirmation). **Gen UI Agent**: ~$0.10–0.30 (large output for code generation). **Plan Gen Agent**: ~$0.20–0.50 (large context, large output, multiple plan files). **Graph Crawler**: ~$0.05–0.15 (medium context, analysis). These are estimates — actual costs will be tracked by the per-project cost tracking system and refined after launch.

- **Q**: Should cost tracking be real-time (updated per-token during
  streaming) or post-hoc (calculated after session completion)? Real-time
  enables live budget enforcement but adds overhead.

**A:** Real-time tracking with per-message granularity. The `stream-json` output includes token usage metadata at message completion. The wrapper reads this metadata and updates the user's token counter immediately after each message completes. Budget enforcement is checked before each new Claude Code invocation (pre-check), not per-token during streaming. This gives near-real-time budget enforcement without the overhead of counting every token during streaming.

- **Q**: Should there be different pricing tiers for users? (e.g., free
  tier with 10 requests/day, pro tier with 100 requests/day). This is
  more of a product decision but affects the cost tracking implementation.

**A:** Yes, three tiers as described in the Architecture answers: Free (50K input + 20K output tokens/day), Pro (500K input + 200K output tokens/day), Enterprise (configurable). The cost tracking system stores the user's tier and their current daily usage. Tier limits are checked before each invocation. The implementation supports adding/changing tiers via server config without code changes.

- **Q**: How should the system handle cost overruns? If a user is at 95%
  of their daily budget and starts a Plan Generation session (expensive),
  should it be blocked, warned, or allowed to complete?

**A:** Warn and allow. When the user is at 80% of their daily budget, the UI shows a warning: "You've used 80% of your daily token budget." At 95%, the warning becomes more prominent. The request is still allowed to proceed — blocking a user at 95% when they need Plan Generation would be frustrating. The in-progress request completes even if it pushes the user over 100%. The next request after exceeding the budget is blocked with a "limit reached" message. This allows graceful completion of the current task.

### 7.2 Rate Limiting

- **Q**: Should rate limiting be per-user, per-API-key, or per-server?
  Per-user is fairest; per-API-key protects the key; per-server prevents
  overload.

**A:** Both per-user and per-server. Per-user rate limiting prevents a single user from monopolizing resources: max 5 concurrent requests, max 30 requests/minute. Per-server rate limiting prevents overload: max 10 concurrent Claude Code processes (the PRD cap), max 50 requests/minute across all users. The Anthropic API key rate limits are handled by Claude Code itself and are a third layer. Per-user limits are enforced first, then per-server limits.

- **Q**: Should there be different rate limits for different agent types?
  Dialog (fast, cheap) might allow more requests per minute than Plan
  Generation (slow, expensive).

**A:** Yes. Per-user limits by agent type: **Dialog/KG**: 20 requests/minute (fast, lightweight). **Gen UI**: 5 requests/minute (heavier, generates code). **Plan Generation**: 2 requests/minute (expensive, long-running). **Graph Crawler**: 10 requests/minute (background, non-interactive). These are enforced at the wrapper's request queue. The different limits reflect the cost and resource consumption differences between agent types.

- **Q**: How should rate limits interact with the queue? If a user hits
  the rate limit, should their request be queued (delayed execution) or
  rejected (must retry later)?

**A:** Rejected with a retry-after header. Rate-limited requests receive a 429 response with `Retry-After: <seconds>` indicating when the user can retry. Queuing adds complexity (managing queue depth, fairness, timeout), and most rate limit hits are momentary bursts. The client UI handles 429 gracefully by showing "Rate limited — retrying in N seconds" and automatically retrying. For the per-server limit (all process slots full), the request is queued for up to 30 seconds; if no slot opens, it's rejected with 503.

---

## 8. Health & Monitoring

- **Q**: How should the system handle Claude Code binary updates? If the
  binary is updated while sessions are active, should running processes
  continue with the old version, or be restarted?

**A:** Running processes continue with the old binary until their session ends naturally. New sessions use the new binary. Binary updates are deployed via rolling restart: the server is updated, but existing Claude Code child processes are not killed. When those sessions eventually terminate (idle timeout or conversation end), the next session uses the new binary. This provides zero-downtime updates with no behavioral disruption to active users.

- **Q**: Should health checks use a dedicated Claude Code process, or
  piggyback on regular agent requests? Dedicated processes add load;
  piggybacking is less reliable.

**A:** A lightweight health check that does not spawn a Claude Code process. The health check verifies: (1) Claude Code binary exists and is executable (`claude --version`), (2) MCP servers respond to a ping, (3) Process pool has capacity (active processes < max), (4) Database is accessible. A full Claude Code integration test (actually sending a prompt) runs on a scheduled basis (every 5 minutes) using a minimal prompt, not on every health check. This keeps the health endpoint fast (<500ms) and cheap.

- **Q**: What metrics are most important for monitoring the Claude Code
  wrapper? What should be on a real-time dashboard vs. available on demand?

**A:** **Real-time dashboard**: Active Claude Code processes (gauge), request queue depth, p50/p95/p99 latency per agent type, error rate (5xx), WebSocket connection count, daily token consumption (aggregate and per-user). **On-demand**: Per-session cost breakdown, tool call frequency by tool name, output parse success rate, circuit breaker status, process restart count, session duration distribution. Metrics are emitted as structured logs and consumed by the monitoring stack (Prometheus/Grafana or equivalent).

- **Q**: Should the system track and report "quality metrics" (e.g.,
  output parse success rate, user satisfaction signals) in addition to
  operational metrics (latency, throughput, error rate)?

**A:** Yes, but lightweight at launch. Track: (1) **Output parse success rate** — percentage of stream-json lines that parse successfully (target >99.5%). (2) **Tool call success rate** — percentage of MCP tool calls that return non-error results (target >95%). (3) **Session completion rate** — percentage of sessions that end without errors (target >90%). User satisfaction signals (thumbs up/down on messages) are a frontend feature that feeds back to the metrics system. Full quality evaluation (comparing agent output to expected output) is a post-launch effort.

---

## 9. CLAUDE.md & Configuration

- **Q**: How large should the CLAUDE.md file be? If it's very detailed
  (project structure, all spec titles, full tool descriptions), it consumes
  significant tokens. What's the right level of detail?

**A:** Target 1,500–2,500 tokens. Contents: project name and description (~100 tokens), agent role and behavior summary (~200 tokens), relevant spec summaries with IDs (~500–1000 tokens, max 15 specs), active skills file references (~200 tokens), recent session summary for resumed sessions (~200 tokens), project conventions (~200 tokens). Spec summaries are the variable component — more referenced specs means a larger CLAUDE.md. The 15-spec cap keeps it bounded.

- **Q**: Should CLAUDE.md include dynamic content that changes per-request
  (e.g., "the user just created spec X"), or only semi-static project
  context? Dynamic content is more relevant but harder to cache.

**A:** Semi-static, regenerated per session (not per message). The CLAUDE.md is generated when a session starts and updated only when: (1) the agent type changes within a session (rare), or (2) the session is resumed after idle timeout. Per-message dynamic content ("you just created spec X") is in the conversation history, not the CLAUDE.md. This keeps CLAUDE.md cacheable across messages within a session while being current enough for the session's context.

- **Q**: Should the CLAUDE.md be user-editable? If a project has specific
  conventions that the auto-generated CLAUDE.md doesn't capture, can the
  user add custom sections?

**A:** Yes. Project admins can define custom CLAUDE.md sections in the project settings. These are stored as a `claude_md_custom` field in the project config and appended to the auto-generated CLAUDE.md. Examples: "Always use kebab-case for spec titles," "This project follows domain-driven design," "Specs in the 'security' tag are sensitive — confirm before modifying." Custom sections are limited to 500 tokens to prevent abuse. This is similar to how CLAUDE.md works in local Claude Code usage — project-specific conventions.

- **Q**: Does Claude Code read CLAUDE.md from the working directory
  automatically, or does it need to be explicitly referenced? This
  affects whether we need a CLI flag or just file placement.

**A:** Claude Code automatically reads `CLAUDE.md` from the working directory (and parent directories). The wrapper places the generated `CLAUDE.md` in the sandbox root directory, and Claude Code discovers it automatically at startup. No CLI flag is needed. This is confirmed behavior — Claude Code searches for `CLAUDE.md` in the CWD and ancestors, similar to `.gitignore` discovery. The wrapper simply needs to ensure the file is in place before spawning the process.

---

## 10. Testing & Development

- **Q**: How should the Claude Code wrapper be tested in CI/CD? Running
  actual Claude Code processes in CI is expensive and slow. Should there
  be a mock Claude Code binary for testing?

**A:** Yes, a mock Claude Code binary. The mock is a simple script that: (1) reads the prompt from stdin, (2) returns pre-defined `stream-json` responses based on the prompt content (pattern matching on keywords), (3) simulates MCP tool calls with canned responses. The mock is fast (<100ms per invocation) and free (no API calls). The wrapper's unit tests use the mock to verify: process spawning, output parsing, cost tracking, rate limiting, error handling. Integration tests with real Claude Code run in a staging environment on a weekly schedule, not per-commit.

- **Q**: Should there be a "dry run" mode where the wrapper logs the
  prompt and configuration without actually spawning a process? Useful
  for debugging prompt construction.

**A:** Yes. The wrapper supports a `DRY_RUN=true` environment variable (or `--dry-run` server flag). In dry run mode, the wrapper: (1) assembles the full prompt (system prompt + CLAUDE.md + context + user message), (2) logs it to a file (`dry-run-{session-id}.json`), (3) returns a mock response without spawning Claude Code. This is invaluable for debugging prompt assembly, verifying context inclusion, and checking that the right MCP servers are configured. Dry run mode is developer-only, not exposed to users.

- **Q**: Should developers be able to run the wrapper locally with their
  own Anthropic API keys, or must they use a shared development key?

**A:** Own API keys. Each developer sets `ANTHROPIC_API_KEY` in their local `.env` file. The wrapper reads the API key from the environment, and Claude Code uses it automatically. No shared development key — shared keys create contention and make cost attribution impossible. Each developer's API usage is billed to their personal Anthropic account. For developers without API access, the mock mode provides full wrapper functionality without API calls.

- **Q**: How should prompt template changes be tested? Unit tests for
  template rendering, integration tests with Claude Code, or manual
  evaluation?

**A:** All three, in a testing pyramid. (1) **Unit tests** (per commit): Verify template functions produce correctly structured output given typed inputs. Assert token count is within budget. Assert required sections are present. (2) **Integration tests** (weekly in staging): Run the prompt evaluation suite (~50 test cases) against real Claude Code and check structural output criteria. (3) **Manual evaluation** (per significant change): A developer reviews agent behavior for 5–10 representative queries after major prompt changes. The evaluation suite catches regressions; manual review catches quality degradation.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
| ---- | -------- | -------- | --------- |
| —    | —        | —        | —         |
