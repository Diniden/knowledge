# 06-AGENT-SYSTEM / 02 — CLAUDE CODE WRAPPER PLAN

> **Purpose**: Define the complete Claude Code CLI integration layer. Claude
> Code is used as a **terminal application agent** — the server wraps the
> `claude` CLI executable, injecting prompts via stdin and parsing responses
> from stdout. The `execa` library is used to manage the complex stdio
> piping, process lifecycle, and signal handling required for robust terminal
> app wrapping. This plan covers process spawning and lifecycle management,
> working directory sandboxing, prompt construction and templating, output
> parsing, streaming output relay, environment configuration, cost and token
> tracking, rate limiting, error handling, health monitoring, version
> management, and CLAUDE.md generation.
>
> **IMPORTANT**: This system does NOT use Claude's model API directly. Instead,
> it wraps the **Claude Code terminal application** (`claude` CLI) as the agent
> runtime. The `execa` library handles the complex stdio communication needed
> to send prompts to and receive responses from the Claude Code process.
>
> **Phase**: 3 (Agent Integration)
> **Dependencies**: `06-AGENT-SYSTEM/01-ARCHITECTURE-PLAN.md`
> **Estimated tasks**: 125+
>
> **SANDBOXING NOTE**: This plan covers the **APPLICATION-RUNTIME** Claude Code
> wrapper — the server-side process that spawns Claude Code to serve end users.
> This is SEPARATE from DEVELOPMENT-TIME AI configuration
> (`13-AI-DEV-CONFIGURATION/PLAN.md`) which configures Claude Code for
> developers building this project.

---

## Table of Contents

1. [Claude Code CLI Integration](#1-claude-code-cli-integration)
2. [Process Management](#2-process-management)
3. [Working Directory Sandboxing](#3-working-directory-sandboxing)
4. [Prompt Construction & Templating](#4-prompt-construction--templating)
5. [Output Parsing](#5-output-parsing)
6. [Streaming Output Handling](#6-streaming-output-handling)
7. [Environment Variable Configuration](#7-environment-variable-configuration)
8. [Cost Tracking & Token Usage](#8-cost-tracking--token-usage)
9. [Rate Limiting & Queuing](#9-rate-limiting--queuing)
10. [Error Handling](#10-error-handling)
11. [Health Checks & Monitoring](#11-health-checks--monitoring)
12. [Version Management](#12-version-management)
13. [CLAUDE.md File Generation](#13-claudemd-file-generation)

---

## 1. Claude Code CLI Integration

### 1.1 CLI Discovery & Initialization

- [ ] **AG-CC-001**: Implement Claude Code binary discovery
  - Search standard installation paths for the `claude` CLI binary
  - Support configurable binary path via environment variable `CLAUDE_CODE_BINARY_PATH`
  - Verify binary exists and is executable at server startup
  - Fail fast with descriptive error if binary not found
- [ ] **AG-CC-002**: Implement Claude Code version detection
  - Run `claude --version` to detect installed version
  - Parse version string and store for compatibility checks
  - Log version at server startup
  - Warn if version is below minimum supported version
- [ ] **AG-CC-003**: Define minimum supported Claude Code version
  - Document which Claude Code features the wrapper depends on
  - Define minimum version constant in configuration
  - Block agent system startup if version is incompatible
- [ ] **AG-CC-004**: Implement Claude Code capability detection
  - Query Claude Code for supported flags and options
  - Detect available output formats (JSON, streaming, text)
  - Detect MCP server support capabilities
  - Store capability set for use during process spawning

#### Design Decisions

> **Q**: Should the wrapper support multiple Claude Code binary versions simultaneously?
> **A**: No. A single binary version is pinned in the dependency manifest and updated via controlled upgrade (staging → production). Side-by-side versions introduce subtle behavioral differences that are hard to debug.

> **Q**: Should the wrapper automatically check for Claude Code updates?
> **A**: Manual upgrade only. The server operator explicitly upgrades as part of deployment. The wrapper logs the current version at startup and can notify when new versions are available, but never auto-updates.

> **Q**: Should the wrapper support alternative AI runtimes besides Claude Code?
> **A**: No. The wrapper is purpose-built for the Claude Code terminal application's specific features (`--resume`, `stream-json`, MCP integration, CLAUDE.md auto-loading). We are wrapping the terminal app itself — NOT using Claude's model API. For local testing without API access, a mock mode is provided instead.

> **Q**: Should the wrapper use Claude Code's programmatic API (library mode) instead of CLI subprocess spawning?
> **A**: CLI subprocess spawning via **`execa`** is the integration approach. The `execa` library (from `sindresorhus/execa`) is used because it provides robust stdio management, proper signal handling, graceful process cleanup, and streaming support that raw `child_process.spawn()` lacks. `execa` handles the complex terminal interaction needed to inject prompts into the Claude Code terminal app and parse its output. The subprocess model provides natural process isolation. If Anthropic releases a library mode SDK, migration can be considered.

> **Q**: Why use `execa` instead of raw `child_process.spawn()`?
> **A**: The Claude Code CLI is a complex terminal application, not a simple command. Managing its stdio requires: proper pipe management for stdin injection, streaming stdout parsing for NDJSON, stderr capture without blocking, graceful signal propagation (SIGTERM → SIGKILL), promise-based lifecycle management, and proper cleanup on unexpected exits. `execa` provides all of these out of the box with a clean API, while raw `child_process.spawn()` would require significant boilerplate and is prone to edge cases (hung pipes, zombie processes, unhandled signals).

### 1.2 CLI Invocation Interface

- [ ] **AG-CC-005**: Define the `ClaudeCodeInvocation` interface
  ```typescript
  interface ClaudeCodeInvocation {
    prompt: string;
    systemPrompt?: string;
    workingDirectory: string;
    mcpServers: McpServerConfig[];
    outputFormat: 'json' | 'stream-json' | 'text';
    maxTokens?: number;
    timeout: number;
    environmentVars: Record<string, string>;
    allowedTools?: string[];
    claudeMdPath?: string;
  }
  ```
- [ ] **AG-CC-006**: Implement `ClaudeCodeService.invoke()` method
  - Accept `ClaudeCodeInvocation` configuration
  - Construct CLI arguments from configuration
  - Spawn child process
  - Return `ClaudeCodeProcess` handle for monitoring
- [ ] **AG-CC-007**: Define `ClaudeCodeProcess` handle interface
  ```typescript
  interface ClaudeCodeProcess {
    pid: number;
    sessionId: string;
    invocation: ClaudeCodeInvocation;
    startedAt: Date;
    status: ProcessStatus;
    onOutput: (callback: (chunk: OutputChunk) => void) => void;
    onComplete: (callback: (result: ClaudeCodeResult) => void) => void;
    onError: (callback: (error: ProcessError) => void) => void;
    kill: (signal?: NodeJS.Signals) => void;
    getStats: () => ProcessStats;
  }
  type ProcessStatus =
    | 'starting'
    | 'running'
    | 'completed'
    | 'failed'
    | 'killed'
    | 'timed-out';
  ```
- [ ] **AG-CC-008**: Implement CLI argument construction
  - Map `ClaudeCodeInvocation` fields to CLI flags
  - `--print` flag for non-interactive mode
  - `--output-format json` or `--output-format stream-json`
  - `--max-tokens N` for output limit
  - `--system-prompt "..."` for system prompt injection
  - `--mcp-server` flags for each MCP server
  - `--allowedTools` for tool restrictions
  - Escape and quote all arguments properly for shell safety

#### Design Decisions

> **Q**: Should the wrapper use `--print` mode or interactive mode for conversations?
> **A**: `--print` mode with `--resume` for multi-turn. Each message is a separate `--print` invocation with `--resume <session-id>`, giving per-message process isolation while preserving conversation context. The `execa` library manages the stdio for each invocation — spawning the Claude Code terminal app, writing the prompt to stdin, and streaming the response from stdout. Interactive mode (long-running stdin/stdout session) is fragile and not recommended.

> **Q**: How are MCP server configurations passed to Claude Code — CLI flags or config file?
> **A**: Via `.mcp.json` generated in the sandbox directory before each invocation. The wrapper writes a per-session `.mcp.json` with only the MCP servers relevant to the current agent type. This is dynamic per invocation, not static.

> **Q**: Should the prompt be passed via CLI argument, stdin pipe, or temporary file?
> **A**: Stdin pipe via `execa`. This avoids CLI argument length limits, avoids writing sensitive content to disk, and handles arbitrary prompt sizes cleanly. `execa` manages the pipe lifecycle — writing the prompt, closing stdin, and streaming stdout for the response. The library handles edge cases like backpressure and broken pipes that would require manual handling with raw `child_process`.

### 1.3 Module Structure

- [ ] **AG-CC-009**: Create `server/src/claude-code/` directory structure
  ```
  server/src/claude-code/
  ├── claude-code.module.ts          # NestJS module
  ├── claude-code.service.ts         # Main service (invoke, manage)
  ├── process/
  │   ├── process-spawner.ts         # Process creation via execa (stdio management)
  │   ├── process-monitor.ts         # Health, resource tracking
  │   └── process-pool.ts            # Warm process pool (optional)
  ├── prompt/
  │   ├── prompt-builder.ts          # Construct prompts from templates
  │   ├── prompt-templates/          # Template files per agent type
  │   │   ├── orchestrator.ts
  │   │   ├── knowledge-graph.ts
  │   │   ├── dialog.ts
  │   │   ├── generative-ui.ts
  │   │   ├── plan-generation.ts
  │   │   └── graph-crawler.ts
  │   └── prompt-validator.ts        # Validate constructed prompts
  ├── output/
  │   ├── output-parser.ts           # Parse Claude Code responses
  │   ├── stream-handler.ts          # Handle streaming output
  │   └── tool-call-extractor.ts     # Extract MCP tool calls from output
  ├── sandbox/
  │   ├── sandbox-manager.ts         # Create/manage sandboxed dirs
  │   └── claude-md-generator.ts     # Generate CLAUDE.md per project
  ├── tracking/
  │   ├── token-tracker.ts           # Token usage tracking
  │   ├── cost-calculator.ts         # Cost computation
  │   └── rate-limiter.ts            # Rate limiting logic
  ├── health/
  │   └── health-checker.ts          # Claude Code availability checks
  └── interfaces/
      └── claude-code.interfaces.ts  # All TypeScript interfaces
  ```
- [ ] **AG-CC-010**: Create `ClaudeCodeModule` NestJS module
  - Register `ClaudeCodeService` as provider
  - Import configuration module for environment settings
  - Register health indicator for NestJS health checks
  - Export service for use by agent system module

---

## 2. Process Management

### 2.1 Process Spawning

- [ ] **AG-CC-011**: Implement `ProcessSpawner.spawn()` method
  - Use `execa` library for subprocess creation (handles complex stdio management)
  - Configure stdin as pipe for prompt injection, stdout/stderr as pipe for output capture
  - Set `cwd` to the sandboxed working directory
  - Set environment variables from invocation config
  - `execa` automatically ties process to server lifecycle (no orphan processes)
  - Return process handle with promise-based lifecycle, PID, and stream handles
  - `execa` provides proper cleanup on unexpected exits and signal propagation
- [ ] **AG-CC-012**: Implement process argument sanitization
  - Escape shell metacharacters in all arguments
  - Validate file paths don't contain path traversal (`..`)
  - Validate environment variable names and values
  - Reject arguments exceeding maximum length
- [ ] **AG-CC-013**: Implement process spawn error handling
  - Handle `ENOENT` (binary not found)
  - Handle `EACCES` (permission denied)
  - Handle `EMFILE` (too many open files)
  - Handle `ENOMEM` (out of memory)
  - Map each to descriptive `AgentError` with recovery suggestion
- [ ] **AG-CC-014**: Implement process stdin writing
  - Use `execa`'s stdin pipe to inject prompts into the Claude Code terminal app
  - Support multi-part prompts (system prompt + user prompt)
  - Close stdin after writing to signal end of input
  - `execa` handles write errors (broken pipe if process exits early) gracefully

#### Design Decisions

> **Q**: What is the expected cold-start time for a Claude Code process?
> **A**: Estimated 2–3 seconds: ~0.5s process spawn, ~1s MCP server initialization, ~0.5–1s CLAUDE.md loading. Subsequent messages use `--resume` which skips MCP re-initialization (~1s). Benchmarking in staging should validate these estimates.

> **Q**: Should long-running agents run as a single process or multiple short invocations?
> **A**: Single process with a 5-minute hard timeout. Complex agents (Plan Generation, Graph Crawler) can complete within 5 minutes if scope is bounded. Breaking into multiple invocations loses reasoning context. Partial results are returned if timeout is reached.

> **Q**: Should the server use a single-threaded or multi-threaded model for process management?
> **A**: Node.js single-threaded event loop is sufficient. Child processes via `child_process.spawn()` are non-blocking and event-driven. With a 10-process concurrency cap, overhead is negligible. Horizontal scaling (multiple server instances) is the path for growth, not multi-threading.

### 2.2 Process Monitoring

- [ ] **AG-CC-015**: Implement `ProcessMonitor` service
  - Track all active Claude Code processes in a registry
  - Monitor each process for: running status, CPU usage, memory usage, runtime duration
  - Poll process stats every 5 seconds
  - Emit events on status changes
- [ ] **AG-CC-016**: Implement process stdout/stderr capture
  - Buffer stdout chunks for parsing
  - Capture stderr for error diagnostics
  - Set maximum buffer size (10MB) to prevent memory exhaustion
  - On buffer overflow: log warning, truncate oldest content
- [ ] **AG-CC-017**: Implement process exit handling
  - Listen for `exit` event on child process
  - Capture exit code and signal
  - Exit code 0: normal completion
  - Exit code non-zero: process error (log stderr, map to `AgentError`)
  - Signal-based termination: log the signal (SIGTERM, SIGKILL)
- [ ] **AG-CC-018**: Implement zombie process detection
  - Detect processes that haven't produced output for > 60 seconds
  - Detect processes exceeding their timeout
  - Send SIGTERM to zombie processes
  - If still running after 10 seconds: SIGKILL
  - Log zombie events for debugging

#### Design Decisions

> **Q**: Should concurrent process limits be hard or dynamic based on available resources?
> **A**: Hard limit of 10 concurrent processes per server instance (PRD spec), configurable per deployment. Dynamic scaling based on memory/CPU is over-engineering for launch. Each process uses ~100–200MB, so 10 processes ≈ 1–2GB.

### 2.3 Process Termination

- [ ] **AG-CC-019**: Implement graceful termination sequence
  1. Send SIGTERM to process
  2. Wait up to 5 seconds for graceful shutdown
  3. If still running: send SIGKILL
  4. Verify process is dead (check PID)
  5. Clean up associated resources (file handles, buffers)
- [ ] **AG-CC-020**: Implement batch termination for server shutdown
  - Enumerate all active Claude Code processes
  - Send SIGTERM to all concurrently
  - Wait for all to exit (with 10-second global timeout)
  - SIGKILL any remaining
  - Report termination results
- [ ] **AG-CC-021**: Implement orphan process cleanup
  - On server startup: detect orphan Claude Code processes from previous server instance
  - Identify by environment variable marker set during spawn
  - Terminate orphans to free resources
  - Log orphan cleanup events

### 2.4 Process Pool (Optional Optimization)

- [ ] **AG-CC-022**: Implement warm process pool
  - Pre-spawn N Claude Code processes (configurable, default 2)
  - Keep processes idle, waiting for input
  - When an invocation arrives: assign from pool, write prompt to stdin
  - Replenish pool after process completes
  - Pool reduces cold-start latency from ~2-5 seconds to ~100ms
- [ ] **AG-CC-023**: Implement pool sizing strategy
  - Minimum pool size: 0 (disabled)
  - Maximum pool size: 5 (to cap resource usage)
  - Dynamic sizing based on request rate (scale up during peaks)
  - Idle timeout: terminate pool processes after 5 minutes of no use
- [ ] **AG-CC-024**: Implement pool health management
  - Periodic health check on pooled processes
  - Replace processes that have been idle too long
  - Replace processes that report errors on health check
  - Track pool utilization metrics

#### Design Decisions

> **Q**: Is a warm process pool technically feasible with Claude Code?
> **A**: No. Claude Code requires a prompt at invocation time and cannot be pre-spawned in a waiting state. The `--resume` flag provides the closest equivalent for subsequent messages without replaying the full conversation.

> **Q**: How can cold-start latency be reduced without a warm pool?
> **A**: Two mitigations: (1) pre-generate sandbox directories with `.mcp.json`, `CLAUDE.md`, and skills files already in place, and (2) fast-path routing that skips the orchestrator for unambiguous requests, saving 1–2 seconds.

> **Q**: Should the process cap be per agent type or shared across all types?
> **A**: Shared 10-process cap across all agent types, allocated first-come-first-served with priority given to user-initiated requests over background tasks. Each invocation is configured at spawn time with appropriate `.mcp.json` and `CLAUDE.md`.

---

## 3. Working Directory Sandboxing

### 3.1 Sandbox Directory Management

- [ ] **AG-CC-025**: Define sandbox directory structure
  ```
  {server-data-root}/agent-sandboxes/
  ├── {project-id}/
  │   ├── knowledge-graph/   # Symlink or copy of project's KG data
  │   ├── gen-ui/            # Generative UI working directory
  │   │   └── {session-id}/  # Per-session UI project space
  │   ├── plans/             # Plan generation output directory
  │   │   └── {session-id}/  # Per-session plan output
  │   └── temp/              # Temporary files per session
  │       └── {session-id}/
  ```
- [ ] **AG-CC-026**: Implement `SandboxManager.createSandbox()` method
  - Accept project ID and session ID
  - Create the directory structure above
  - Set filesystem permissions (read/write for Claude Code user)
  - Return the sandbox root path
- [ ] **AG-CC-027**: Implement sandbox directory isolation
  - Each Claude Code process runs in its own sandbox
  - Process cannot access files outside its sandbox directory
  - Use `--working-directory` CLI flag to confine the process
  - Verify isolation at startup with test writes
- [ ] **AG-CC-028**: Implement sandbox cleanup after session completion
  - On session completion: remove temporary files
  - For gen-UI sessions: keep generated project files (user may need them)
  - For plan sessions: keep generated plan files
  - Schedule cleanup of old sandbox directories (> 24 hours, configurable)

#### Design Decisions

> **Q**: Does `--working-directory` enforce a hard sandbox boundary?
> **A**: Not a hard OS-level sandbox — the process could theoretically access parent directories. This is acceptable because MCP tools are the primary KG interface, the sandbox contains only project-scoped files, and MCP servers enforce access control at the API level. OS-level sandboxing (containers) is a future hardening step.

> **Q**: Should sandbox directories be per-session or reused across sessions?
> **A**: Per-session. Each session gets a fresh directory under `/tmp/botnet/sessions/{session-id}/`, created at start and cleaned up 15 minutes after termination. This prevents cross-contamination and makes cleanup deterministic.

### 3.2 Knowledge Graph Access in Sandbox

- [ ] **AG-CC-029**: Implement read-only knowledge graph mounting
  - Create read-only view of project's knowledge graph in sandbox
  - Option A: symlink to actual KG directory (fast, real-time data)
  - Option B: copy relevant subset (isolated, potentially stale)
  - Recommended: symlink for read-only agents, copy for write agents
- [ ] **AG-CC-030**: Implement write-through for knowledge graph changes
  - Knowledge Graph Agent needs write access
  - Writes go through MCP tool calls (not direct file writes)
  - MCP server validates and applies writes to the actual KG directory
  - Sandbox KG view reflects changes immediately (via symlink)
- [ ] **AG-CC-031**: Implement sandbox scope per agent type
      | Agent Type | Sandbox Contents |
      |---|---|
      | Orchestrator | Minimal (no KG access, no file writes) |
      | Knowledge Graph | KG directory (read via symlink), temp directory |
      | Dialog | KG directory (read-only symlink), temp directory |
      | Generative UI | Gen-UI project directory (read/write), KG read-only |
      | Plan Generation | Plans directory (read/write), KG read-only |
      | Graph Crawler | KG directory (read-only symlink), temp directory |

#### Design Decisions

> **Q**: Should the sandbox use symlinks or copies for knowledge graph access?
> **A**: Neither. Agents interact with the KG exclusively through MCP tools (`get_spec`, `create_spec`, `search_specs`, etc.). The sandbox contains only `.mcp.json`, `CLAUDE.md`, skills files, and working files. This eliminates the symlink-vs-copy question entirely.

### 3.3 File System Security

- [ ] **AG-CC-032**: Implement path traversal prevention
  - Validate all file paths are within the sandbox root
  - Reject paths containing `..` or absolute paths outside sandbox
  - Use `path.resolve()` and verify result starts with sandbox root
  - Log and alert on path traversal attempts
- [ ] **AG-CC-033**: Implement file size limits within sandbox
  - Maximum single file size: 10MB
  - Maximum total sandbox size: 100MB per session
  - Monitor sandbox size during execution
  - Kill process if sandbox size exceeds limit
- [ ] **AG-CC-034**: Implement file type restrictions
  - Whitelist allowed file extensions per agent type
  - Gen-UI: `.ts`, `.tsx`, `.js`, `.jsx`, `.css`, `.scss`, `.html`, `.json`, `.md`
  - Plan: `.md`, `.json`, `.yaml`
  - Block executable files (`.sh`, `.exe`, `.bat`)
  - Block sensitive files (`.env`, `.key`, `.pem`)
- [ ] **AG-CC-035**: Implement sandbox activity logging
  - Log all file create/write/delete operations within sandbox
  - Log all MCP tool calls made from the sandbox
  - Include session ID, agent type, and timestamp
  - Retain logs for audit trail (30 days)

#### Design Decisions

> **Q**: Should a virtual filesystem layer intercept and log all file operations?
> **A**: No. Audit is captured at the MCP tool call level (every call logged with inputs/outputs). File operations within the sandbox are ephemeral working files. A virtual filesystem (e.g., FUSE) would add latency, complexity, and a Linux-only dependency.

> **Q**: Should Claude Code processes run as a separate OS user?
> **A**: Not at launch. Processes run as the same OS user as the server. Sandbox directory isolation, MCP-level access control, and network restrictions provide sufficient isolation. Separate OS user is a hardening step for production environments handling untrusted content.

> **Q**: How are generated files with potentially malicious content handled?
> **A**: Generated UI files are served in iframes with strict sandboxing (`sandbox="allow-scripts"` without `allow-same-origin`). The Gen UI MCP server also runs a static analysis pass checking for `fetch()` to non-whitelisted domains, `eval()`, and `document.cookie` access before serving.

> **Q**: Should sandbox processes have network access restrictions?
> **A**: In production, network access is restricted to Anthropic API endpoints and localhost stdio pipes (for MCP). All other outbound access is blocked via firewall rules or network policies. Unrestricted access is acceptable during development.

> **Q**: How are unauthorized tool calls handled (e.g., Dialog Agent calling `create_spec`)?
> **A**: Each agent type's `.mcp.json` only includes allowed MCP servers. If an unauthorized tool call is attempted, Claude Code receives a tool-not-found error natively. The wrapper logs the attempt as a warning for monitoring.

---

## 4. Prompt Construction & Templating

### 4.1 Prompt Builder

- [ ] **AG-CC-036**: Implement `PromptBuilder` service
  - Accept agent type, context, and user message
  - Load the appropriate template for the agent type
  - Inject context variables into template placeholders
  - Validate constructed prompt (non-empty, within token limits)
  - Return the complete prompt string
- [ ] **AG-CC-037**: Define prompt template format
  - Templates use mustache-style `{{variable}}` placeholders
  - Support conditional sections: `{{#if hasRagResults}}...{{/if}}`
  - Support iteration: `{{#each specs}}...{{/each}}`
  - Templates stored as TypeScript template literal functions for type safety
- [ ] **AG-CC-038**: Implement prompt template registry
  - Register templates by agent type
  - Support template versioning (multiple versions per agent type)
  - Hot-reload templates during development (file watcher)
  - Freeze templates in production (load once at startup)

#### Design Decisions

> **Q**: Should prompt templates be TypeScript files or external template files (Handlebars, Markdown)?
> **A**: TypeScript files using tagged template literals. Templates are functions accepting typed context objects and returning strings, providing type safety, compile-time validation, and easy unit testing. No template engine dependency needed.

> **Q**: How should template versioning work across ongoing conversations?
> **A**: Templates are loaded at session start and fixed for the session's lifetime. New sessions pick up the latest templates. This prevents behavioral shifts mid-conversation. Claude Code's `--resume` naturally retains the original system prompt.

> **Q**: Should there be a prompt testing framework for evaluating template changes?
> **A**: Yes. A suite of ~50 test inputs covering each agent type with structural output criteria (not exact match). Run as part of CI before merging prompt changes. Uses Claude Code in `--print` mode with deterministic seeds if available.

> **Q**: How should prompt template changes be tested end-to-end?
> **A**: Testing pyramid: (1) unit tests per commit verifying structure and token budget, (2) integration tests weekly in staging against real Claude Code with ~50 test cases, (3) manual review for 5–10 representative queries after major changes. The evaluation suite catches regressions; manual review catches quality degradation.

### 4.2 System Prompt Templates

- [ ] **AG-CC-039**: Create orchestrator system prompt template
  - Role definition: intent classifier and router
  - Available intent categories with descriptions and examples
  - Output format: JSON with `intent`, `confidence`, `reasoning`
  - Instructions for handling ambiguous requests
  - Instructions for multi-intent decomposition
- [ ] **AG-CC-040**: Create Knowledge Graph Agent system prompt template
  - Role definition: knowledge graph specialist
  - Available MCP tools with usage examples
  - Spec schema awareness (field names, constraints, valid states)
  - Edge taxonomy and when to use each type
  - Guidelines for suggesting vs. creating edges
  - Output format for CRUD operations
- [ ] **AG-CC-041**: Create Dialog Agent system prompt template
  - Role definition: helpful knowledge assistant
  - Instructions for RAG-grounded responses
  - Spec reference format (`[[sp_xxx|Title]]`)
  - Tone and style guidelines
  - When to ask for clarification vs. attempt an answer
  - Source citation requirements
- [ ] **AG-CC-042**: Create Generative UI Agent system prompt template
  - Role definition: UI generation specialist
  - ESM project structure requirements
  - Available frameworks and libraries (React, etc.)
  - Sandboxing constraints (no external API calls)
  - Code quality requirements (responsive, accessible)
  - File naming conventions
- [ ] **AG-CC-043**: Create Plan Generation Agent system prompt template
  - Role definition: plan generation specialist
  - Plan output format specification
  - Graph traversal strategy for plan context
  - Delta vs. full build mode instructions
  - Plan file structure and naming conventions
  - How to reference source specs in plans
- [ ] **AG-CC-044**: Create Graph Crawler Agent system prompt template
  - Role definition: graph analysis specialist
  - Traversal strategies and depth limits
  - Issue taxonomy (contradiction, orphan, stale, quality)
  - Inquiry creation format and severity guidelines
  - When to flag vs. when to ignore minor issues

#### Design Decisions

> **Q**: How detailed should system prompts be given the token/context budget tradeoff?
> **A**: Target 300–500 tokens. System prompts define role, core behavior rules, output format, and 2–3 critical constraints. Detailed operational procedures go in skills files, not the system prompt. MCP tool descriptions come from Claude Code's tool discovery.

### 4.3 Prompt Composition

- [ ] **AG-CC-045**: Implement system prompt + context + user message assembly
  - Order: system prompt → context block → conversation history → user message
  - Insert section headers for clarity (`--- CONTEXT ---`, `--- CONVERSATION ---`)
  - Validate total prompt fits within model context window
  - Return assembled prompt with token count
- [ ] **AG-CC-046**: Implement context block formatting
  - Format graph snapshots as structured text (not raw JSON)
  - Format RAG results with source spec titles and relevance scores
  - Format conversation history as role-tagged messages
  - Include clear section breaks between context types
- [ ] **AG-CC-047**: Implement prompt compression for long contexts
  - When prompt exceeds token budget: apply compression strategy
  - Summarize conversation history (keep last 3 turns verbatim, summarize rest)
  - Reduce RAG results (fewer results, shorter chunks)
  - Reduce graph snapshot (fewer hops, summaries only)
  - Re-validate prompt fits after compression
- [ ] **AG-CC-048**: Implement prompt validation
  - Verify prompt is non-empty
  - Verify system prompt matches expected agent type template
  - Verify context sections are properly formatted
  - Verify total tokens within budget
  - Log prompt metrics (section sizes, compression applied)

#### Design Decisions

> **Q**: Should prompts include full spec content or summaries with IDs?
> **A**: Summaries + IDs in initial context (~100 tokens per spec). The agent fetches full content via `get_spec` MCP tool calls on demand. For the KG Agent working on a specific spec, the target spec's full content is included directly.

> **Q**: How should prompt construction handle conversations exceeding the token budget?
> **A**: Progressive compression in three tiers: recent (last 20 messages, full content), mid-range (messages 21–50, compressed to ~50 tokens per exchange), old (messages 50+, dropped with a summary note). The 100-message session cap prevents unbounded growth.

> **Q**: Should prompts include tool descriptions or rely on Claude Code's built-in discovery?
> **A**: Rely on built-in tool discovery. Claude Code discovers tools from configured MCP servers automatically. The system prompt may mention tool categories to guide strategy, but doesn't enumerate individual tools. The `.mcp.json` determines availability.

---

## 5. Output Parsing

### 5.1 JSON Output Parsing

- [ ] **AG-CC-049**: Implement Claude Code JSON output parser
  - Parse JSON response from `--output-format json` mode
  - Handle Claude Code response envelope (metadata + content)
  - Extract: text content, tool call results, cost information
  - Validate JSON structure against expected schema
- [ ] **AG-CC-050**: Implement `ClaudeCodeResult` extraction
  ```typescript
  interface ClaudeCodeResult {
    content: string;
    toolCalls: ToolCallResult[];
    tokensUsed: { prompt: number; completion: number; total: number };
    model: string;
    stopReason: 'end_turn' | 'max_tokens' | 'tool_use';
    cost: { inputCost: number; outputCost: number; totalCost: number };
    duration: number;
  }
  ```
- [ ] **AG-CC-051**: Implement tool call result extraction
  - Parse MCP tool call records from Claude Code output
  - Extract: tool name, server name, input arguments, output result
  - Track tool call sequence (order of calls matters for agent behavior)
  - Map tool call results to typed interfaces
- [ ] **AG-CC-052**: Implement structured data extraction from text output
  - Some agents embed structured data in their text response
  - Extract JSON blocks from markdown code fences
  - Extract spec metadata from formatted text
  - Parse agent-specific output conventions (e.g., `[ACTION: create_spec]`)

#### Design Decisions

> **Q**: Which Claude Code output format should be primary: json, stream-json, or text?
> **A**: `stream-json` as primary. This provides real-time streaming via WebSocket while each line is parseable JSON for tool call interception, progress indicators, and metadata extraction. `text` is the fallback if stream-json parsing fails for a line.

> **Q**: How should the parser handle output that mixes formats?
> **A**: The `stream-json` format handles this natively — each event is a distinct JSON line with a `type` field. Mixed content is expected and handled by type-based dispatch. Malformed lines are logged as warnings, treated as text content, and processing continues.

> **Q**: Should the parser attempt to fix malformed JSON or reject strictly?
> **A**: Lenient for `stream-json` line parsing (skip malformed lines, log warning, continue). Strict for tool call results (invalid JSON means the tool call is treated as failed). This balances resilience with correctness.

### 5.2 Output Validation

- [ ] **AG-CC-053**: Implement per-agent-type output validation
  - Orchestrator: validate intent classification JSON
  - Knowledge Graph: validate CRUD operation results
  - Dialog: validate response has text content and citations
  - Generative UI: validate file creation results
  - Plan Generation: validate plan file structure
  - Graph Crawler: validate inquiry creation results
- [ ] **AG-CC-054**: Implement output sanitization
  - Strip internal tool call metadata from user-facing content
  - Remove system prompt echoes (if Claude Code leaks them)
  - Sanitize HTML/script content from agent text output
  - Validate spec references format (`[[sp_xxx]]`)
- [ ] **AG-CC-055**: Implement output fallback parsing
  - If JSON parsing fails: attempt to extract useful content from raw text
  - If structured data extraction fails: return raw text as dialog response
  - Log parsing failures with full raw output for debugging
  - Track parsing failure rate per agent type

#### Design Decisions

> **Q**: How should multi-modal output (text + tool results + errors) be ordered and presented?
> **A**: Chronological order as received from the stream. Text streams directly; tool calls render as collapsible "action cards" (e.g., "Searched for related specs → found 3 results"); errors show as inline indicators. This matches the ChatGPT/Claude.ai UX pattern.

### 5.3 Agent-Specific Output Processing

- [ ] **AG-CC-056**: Implement Knowledge Graph Agent output processing
  - Extract created/updated spec IDs from tool call results
  - Extract created edge information
  - Build a changeset summary (what was created/modified/deleted)
  - Trigger index rebuilds for affected entities
- [ ] **AG-CC-057**: Implement Generative UI Agent output processing
  - Verify generated files exist in sandbox
  - Trigger build process for the UI project
  - Capture build errors and relay to agent for correction
  - Extract preview URL for iframe loading
- [ ] **AG-CC-058**: Implement Plan Generation Agent output processing
  - Verify plan files were written correctly
  - Validate plan structure against expected format
  - Build plan metadata (spec references, execution order)
  - Store plan in plan registry

#### Design Decisions

> **Q**: Should the wrapper intercept each MCP tool call individually for monitoring?
> **A**: Passive interception only — the wrapper reads `tool_use` and `tool_result` events from the stream-json output for logging and monitoring but doesn't inject into the execution path. Claude Code manages MCP calls directly. No timing impact since interception is read-only.

> **Q**: Should destructive MCP tool calls require user confirmation before executing?
> **A**: Yes (confirm-before-mutation default from PRD). The wrapper detects mutation calls (`create_spec`, `delete_spec`, etc.) in the stream, pauses for destructive operations, sends a confirmation prompt via WebSocket, and waits for approval. Users can toggle "auto-approve" for trusted workflows.

> **Q**: How are tool calls that an agent shouldn't have access to handled?
> **A**: The `.mcp.json` per agent type only includes allowed MCP servers. Unauthorized tool calls receive a tool-not-found error natively from Claude Code. The wrapper logs such attempts as warnings for monitoring, indicating a potential prompt issue.

---

## 6. Streaming Output Handling

### 6.1 Stream Capture

- [ ] **AG-CC-059**: Implement `StreamHandler` for `stream-json` output format
  - Read from Claude Code process stdout as a stream
  - Parse newline-delimited JSON chunks
  - Each chunk: `{ type: "text" | "tool_use" | "tool_result", content: ... }`
  - Buffer partial chunks (JSON may span multiple read calls)
- [ ] **AG-CC-060**: Implement stream chunk classification
  - Text chunks: agent's natural language response (relay to client)
  - Tool use chunks: agent is calling an MCP tool (show status to client)
  - Tool result chunks: MCP tool returned a result (may show to client)
  - Error chunks: processing error (handle gracefully)
- [ ] **AG-CC-061**: Implement stream backpressure handling
  - If client can't consume chunks fast enough: buffer in memory
  - Maximum stream buffer: 1MB
  - If buffer fills: pause reading from process (backpressure to Claude Code)
  - Resume when client drains buffer
- [ ] **AG-CC-062**: Implement stream timeout detection
  - If no chunks received for > 30 seconds: consider the stream stalled
  - Send heartbeat to client to keep WebSocket alive
  - After 60 seconds of silence: kill process as timed-out

### 6.2 Stream Relay to Client

- [ ] **AG-CC-063**: Implement WebSocket stream relay
  - For each text chunk: emit `agent:stream:chunk` WebSocket event
  - Include session ID, agent type, and chunk sequence number
  - On stream completion: emit `agent:stream:complete` event
  - On stream error: emit `agent:stream:error` event
- [ ] **AG-CC-064**: Implement stream chunk formatting for client
  - Text chunks: send as-is (incremental text for display)
  - Tool use chunks: format as status message ("Searching knowledge graph...")
  - Tool result chunks: format as actionable data (spec created, edge added)
  - Maintain tool call status: pending → executing → completed
- [ ] **AG-CC-065**: Implement stream metadata injection
  - Inject token count updates periodically (every 10 chunks)
  - Inject duration updates (elapsed time)
  - Inject agent type identifier in each chunk
  - Client uses metadata to update progress indicators

#### Design Decisions

> **Q**: What is the expected client-side rendering approach for streamed text?
> **A**: Token-by-token, matching the ChatGPT/Claude.ai experience. The WebSocket forwards each token from `stream-json` directly. Tool call events render as action cards. No batching or buffering on the server side.

> **Q**: Should streaming include "thinking" indicators between text chunks?
> **A**: Yes. The wrapper injects synthetic status events (e.g., `{"type": "status", "message": "Searching knowledge graph..."}`) when tool calls are detected. The frontend renders these as animated indicators between message chunks.

> **Q**: How should streaming handle long tool call execution times?
> **A**: Show a status indicator. When `tool_use` is detected, a status event is sent to the WebSocket. If the tool call exceeds 30 seconds, an updated "still_working" status is sent. Silent pauses are unacceptable — users need continuous feedback.

### 6.3 Stream Aggregation

- [ ] **AG-CC-066**: Implement full response aggregation from stream
  - Accumulate all text chunks into complete response
  - Collect all tool call results in order
  - Build final `ClaudeCodeResult` from aggregated data
  - Store aggregated result in session record
- [ ] **AG-CC-067**: Implement stream recovery on interruption
  - If WebSocket disconnects during streaming: continue processing
  - Buffer remaining chunks in server
  - On client reconnect: send buffered chunks
  - Provide `agent:stream:resume` endpoint for catch-up

#### Design Decisions

> **Q**: Should the server support replay of completed streams on page refresh?
> **A**: Yes. Completed messages are persisted as full text in the database. On refresh, conversation history loads from REST API. For in-progress streams, the WebSocket reconnects and replays the buffered events already emitted, then continues live. The buffer is cleared when the message completes.

---

## 7. Environment Variable Configuration

### 7.1 Claude Code Environment

- [ ] **AG-CC-068**: Define environment variables passed to Claude Code processes
      | Variable | Purpose | Example |
      |---|---|---|
      | `ANTHROPIC_API_KEY` | API authentication | `sk-ant-...` |
      | `CLAUDE_CODE_SESSION_ID` | Session tracking | `sess_abc123` |
      | `CLAUDE_CODE_AGENT_TYPE` | Agent type identifier | `knowledge-graph` |
      | `CLAUDE_CODE_PROJECT_ID` | Project context | `proj_xyz789` |
      | `CLAUDE_CODE_USER_ID` | User context | `user_def456` |
      | `CLAUDE_CODE_SANDBOX_ROOT` | Sandbox directory | `/data/sandboxes/proj_xyz/` |
      | `CLAUDE_CODE_MAX_TOKENS` | Output token limit | `10000` |
      | `CLAUDE_CODE_TIMEOUT_MS` | Execution timeout | `120000` |
- [ ] **AG-CC-069**: Implement environment variable injection
  - Merge base environment (from server config) with per-invocation overrides
  - Never pass server-internal variables (database URLs, internal secrets)
  - Strip any pre-existing environment variables that could leak information
  - Validate all variable values before passing to process
- [ ] **AG-CC-070**: Implement API key management for Claude Code
  - Load Anthropic API key from server secrets (not hardcoded)
  - Support API key rotation without server restart
  - Support multiple API keys for load distribution
  - Track which API key is used per session (for billing/rate limiting)

#### Design Decisions

> **Q**: Should developers use their own Anthropic API keys or a shared development key?
> **A**: Own API keys. Each developer sets `ANTHROPIC_API_KEY` in their local `.env`. No shared key — shared keys create contention and prevent cost attribution. For developers without API access, mock mode provides full wrapper functionality.

### 7.2 Server-Side Configuration

- [ ] **AG-CC-071**: Define server-side Claude Code configuration schema
  ```typescript
  interface ClaudeCodeConfig {
    binaryPath: string;
    minVersion: string;
    defaultModel: string;
    defaultMaxTokens: number;
    defaultTimeout: number;
    maxConcurrentProcesses: number;
    processPoolSize: number;
    sandboxRootPath: string;
    sandboxMaxSizeMb: number;
    streamBufferMaxBytes: number;
    healthCheckIntervalMs: number;
    costPerInputToken: number;
    costPerOutputToken: number;
  }
  ```
- [ ] **AG-CC-072**: Implement configuration loading from NestJS ConfigModule
  - Load from environment variables with `CLAUDE_` prefix
  - Validate all required configuration present at startup
  - Apply defaults for optional configuration
  - Log effective configuration at startup (mask sensitive values)
- [ ] **AG-CC-073**: Implement per-agent-type configuration overrides
  - Allow each agent type to override default model, timeout, max tokens
  - Overrides defined in agent type registry
  - Merge order: default config → agent type override → per-request override

#### Design Decisions

> **Q**: Should the wrapper support a "dry run" mode for debugging prompt construction?
> **A**: Yes. A `DRY_RUN=true` environment variable (or `--dry-run` flag) causes the wrapper to assemble the full prompt, log it to a file, and return a mock response without spawning Claude Code. Invaluable for debugging prompt assembly and verifying MCP configuration. Developer-only, not exposed to users.

---

## 8. Cost Tracking & Token Usage

### 8.1 Token Counting

- [ ] **AG-CC-074**: Implement prompt token counting before invocation
  - Count tokens in constructed prompt using tiktoken
  - Compare against model context window
  - Reject if prompt exceeds context window (after output buffer)
  - Log prompt token count per invocation
- [ ] **AG-CC-075**: Implement output token tracking from Claude Code response
  - Extract token counts from Claude Code response metadata
  - Track prompt tokens, completion tokens, and total
  - Store in session record
  - Emit token usage event for real-time monitoring
- [ ] **AG-CC-076**: Implement token usage aggregation
  - Aggregate per-session token usage
  - Aggregate per-user daily/weekly/monthly usage
  - Aggregate per-project usage
  - Aggregate per-agent-type usage
  - Store aggregates in database for reporting

#### Design Decisions

> **Q**: Should cost tracking be real-time or post-hoc?
> **A**: Real-time with per-message granularity. Token usage metadata is read from `stream-json` output at message completion and the user's counter is updated immediately. Budget enforcement is pre-checked before each invocation, not per-token during streaming.

### 8.2 Cost Calculation

- [ ] **AG-CC-077**: Implement cost calculation from token usage
  - Apply per-model pricing: input tokens _ input rate + output tokens _ output rate
  - Support different pricing per model (if agents use different models)
  - Store pricing table in configuration (updateable without code changes)
  - Calculate per-session cost immediately after completion
- [ ] **AG-CC-078**: Implement cost allocation to projects and users
  - Each session's cost attributed to the user who initiated it
  - Sub-agent costs attributed to the parent session's user
  - Project-level cost is sum of all sessions in that project
  - Store cost attribution in session record
- [ ] **AG-CC-079**: Implement cost reporting API
  - `GET /api/v1/costs/user/:userId` — user's cost summary
  - `GET /api/v1/costs/project/:projectId` — project cost summary
  - `GET /api/v1/costs/agent-type/:type` — per-agent-type cost breakdown
  - Support date range filtering
  - Support CSV export for accounting

#### Design Decisions

> **Q**: What is the expected per-request cost range for each agent type?
> **A**: Estimated per Claude Sonnet pricing: Dialog ~$0.01–0.03, KG ~$0.03–0.08, Gen UI ~$0.10–0.30, Plan Gen ~$0.20–0.50, Graph Crawler ~$0.05–0.15. Actual costs will be tracked and refined after launch.

### 8.3 Budget Enforcement

- [ ] **AG-CC-080**: Implement per-user budget limits
  - Define daily and monthly budget limits per user (configurable)
  - Check budget before spawning Claude Code process
  - If budget exceeded: reject with friendly message and retry time
  - Allow in-progress sessions to complete (don't kill mid-stream)
- [ ] **AG-CC-081**: Implement per-project budget limits
  - Define monthly budget limits per project
  - Aggregate all users' costs within the project
  - Alert project admins at 80% of budget
  - Optionally hard-block at 100% (configurable)
- [ ] **AG-CC-082**: Implement budget alert notifications
  - WebSocket notification to user when approaching personal limit
  - Email/notification to project admin when project approaches limit
  - Include current usage, limit, and projected usage

#### Design Decisions

> **Q**: Should there be different pricing tiers for users?
> **A**: Yes, three tiers: Free (50K input + 20K output tokens/day), Pro (500K input + 200K output tokens/day), Enterprise (configurable). Tier limits checked before each invocation. Tiers configurable via server config without code changes.

> **Q**: How should cost overruns be handled?
> **A**: Warn and allow. Warnings appear at 80% and 95% of daily budget. The in-progress request always completes even if it pushes the user over 100%. The next request after exceeding the budget is blocked. This allows graceful completion of the current task.

---

## 9. Rate Limiting & Queuing

### 9.1 Rate Limiting

- [ ] **AG-CC-083**: Implement per-user request rate limiting
  - Maximum requests per minute per user: 10 (configurable)
  - Maximum requests per hour per user: 100 (configurable)
  - Use sliding window algorithm for smooth limiting
  - Return 429 with `Retry-After` header when rate limited
- [ ] **AG-CC-084**: Implement per-project request rate limiting
  - Maximum requests per minute per project: 30 (configurable)
  - Aggregate all users within the project
  - Higher limit than per-user to accommodate multiple active users
- [ ] **AG-CC-085**: Implement global rate limiting
  - Maximum total requests per minute across all users: 100 (configurable)
  - Protects Anthropic API key rate limits
  - Protects server resource limits
  - Priority-based: interactive requests bypass when under moderate load

#### Design Decisions

> **Q**: Should rate limiting be per-user, per-API-key, or per-server?
> **A**: Both per-user and per-server. Per-user: max 5 concurrent, 30 requests/minute. Per-server: max 10 concurrent Claude Code processes, 50 requests/minute total. Anthropic API key limits are a third layer handled by Claude Code itself. Per-user limits are enforced first.

> **Q**: Should different agent types have different rate limits?
> **A**: Yes. Per-user by agent type: Dialog/KG 20 req/min, Gen UI 5 req/min, Plan Generation 2 req/min, Graph Crawler 10 req/min. The different limits reflect cost and resource consumption differences.

### 9.2 Request Queuing

- [ ] **AG-CC-086**: Implement agent request queue
  - FIFO queue with priority levels (high, normal, low)
  - Interactive user requests: high priority
  - Sub-agent delegations: normal priority
  - Background crawls: low priority
  - Queue capacity: 50 requests (reject beyond this)
- [ ] **AG-CC-087**: Implement queue processing
  - Dequeue when a Claude Code process slot is available
  - Respect concurrency limits during dequeue
  - Timeout queued requests after 60 seconds (configurable)
  - Notify user of queue position via WebSocket
- [ ] **AG-CC-088**: Implement queue metrics
  - Track queue depth over time
  - Track average wait time
  - Track timeout/rejection rate
  - Expose metrics for monitoring dashboard

#### Design Decisions

> **Q**: Should rate-limited requests be queued or rejected?
> **A**: Rejected with a `Retry-After` header (429 response). The client UI handles 429 by showing "Rate limited — retrying in N seconds" and auto-retrying. For per-server limits (all slots full), requests are queued for up to 30 seconds; if no slot opens, they're rejected with 503.

---

## 10. Error Handling

### 10.1 Process Errors

- [ ] **AG-CC-089**: Handle Claude Code process crash
  - Detect non-zero exit code
  - Capture stderr content for diagnostics
  - Map exit codes to error types
  - Attempt retry for transient failures (once)
  - Report to user with friendly error message
- [ ] **AG-CC-090**: Handle Claude Code process timeout
  - Detect timeout (process exceeds configured max duration)
  - Kill process with SIGTERM → SIGKILL sequence
  - Save partial output if available
  - Report to user: "Agent took too long. Try a simpler request or try again."
- [ ] **AG-CC-091**: Handle Claude Code process OOM (out of memory)
  - Detect SIGKILL from system OOM killer
  - Log memory usage at time of kill
  - Reduce context size and retry once
  - If retry also OOMs: report to user with suggestion to simplify

### 10.2 API Errors

- [ ] **AG-CC-092**: Handle Anthropic API rate limit errors
  - Detect 429 response from Claude Code
  - Extract `Retry-After` timing
  - Queue the request for retry after the specified delay
  - Notify user of temporary delay via WebSocket
- [ ] **AG-CC-093**: Handle Anthropic API authentication errors
  - Detect 401/403 responses
  - Log API key issue (do not log the key itself)
  - Try alternate API key if available
  - If all keys exhausted: disable agent system, alert admins
- [ ] **AG-CC-094**: Handle Anthropic API server errors (5xx)
  - Retry up to 3 times with exponential backoff (1s, 2s, 4s)
  - Log each retry attempt
  - If all retries fail: report to user as temporary service issue

### 10.3 Output Errors

- [ ] **AG-CC-095**: Handle malformed Claude Code output
  - Invalid JSON: attempt to extract useful text content
  - Truncated output (max tokens hit): present partial result, inform user
  - Empty output: retry once, then report error
  - Log all malformed outputs for pattern analysis
- [ ] **AG-CC-096**: Handle unexpected tool call failures
  - MCP tool returned error: include error in agent context, let agent handle it
  - MCP server unreachable: retry tool call once, then fail the agent session
  - Tool call timeout: cancel tool call, inform agent of timeout
- [ ] **AG-CC-097**: Implement error recovery pipeline
  1. Detect error type
  2. Check if retryable
  3. If retryable: retry with appropriate backoff
  4. If not retryable: build user-facing error message
  5. Store error details in session record
  6. Emit error event for monitoring
  7. Apply circuit breaker logic if repeated failures

---

## 11. Health Checks & Monitoring

### 11.1 Claude Code Health

- [ ] **AG-CC-098**: Implement Claude Code availability check
  - Periodically run `claude --version` (every 60 seconds)
  - Verify process completes within 5 seconds
  - If fails: mark Claude Code as unhealthy
  - If healthy after being unhealthy: log recovery
- [ ] **AG-CC-099**: Implement Claude Code functional health check
  - Periodically send a minimal test prompt (every 5 minutes)
  - Verify response is received within 30 seconds
  - Verify response is parseable
  - Track response latency trend
- [ ] **AG-CC-100**: Implement API key validity check
  - Verify at least one API key is valid and not rate-limited
  - Check key validity on server startup
  - Periodic recheck (every 15 minutes)
  - Alert if all keys are invalid or expired

#### Design Decisions

> **Q**: Should health checks use a dedicated Claude Code process?
> **A**: No. A lightweight health check verifies: binary exists (`claude --version`), MCP servers respond to ping, process pool has capacity, and database is accessible. A full integration test (actual prompt) runs every 5 minutes on a schedule, not on every health check. This keeps the endpoint fast (<500ms) and cheap.

> **Q**: Should the system track quality metrics beyond operational metrics?
> **A**: Yes, lightweight at launch: output parse success rate (target >99.5%), tool call success rate (target >95%), session completion rate (target >90%). User satisfaction signals (thumbs up/down) are a frontend feature feeding back to metrics. Full quality evaluation is post-launch.

### 11.2 Process Health Metrics

- [ ] **AG-CC-101**: Track active process metrics
  - Number of active Claude Code processes
  - Total memory used by all processes
  - Average process duration (rolling 5-minute window)
  - Process creation rate (per minute)
  - Process failure rate (per minute)
- [ ] **AG-CC-102**: Track queue metrics
  - Current queue depth (by priority level)
  - Average wait time in queue
  - Queue rejection rate
  - Queue timeout rate
- [ ] **AG-CC-103**: Implement metrics export
  - Expose metrics via Prometheus-compatible endpoint
  - Or: write metrics to structured log for log-based monitoring
  - Include all process, queue, and cost metrics
  - Update metrics every 10 seconds

#### Design Decisions

> **Q**: What metrics are most important for monitoring the Claude Code wrapper?
> **A**: Real-time dashboard: active processes, queue depth, p50/p95/p99 latency per agent type, error rate, WebSocket connections, daily token consumption. On-demand: per-session cost, tool call frequency, parse success rate, circuit breaker status, session duration distribution. Metrics emitted as structured logs for Prometheus/Grafana.

### 11.3 Alerting

- [ ] **AG-CC-104**: Define alert thresholds
      | Metric | Warning | Critical |
      |---|---|---|
      | Process failure rate | > 10% over 5 min | > 30% over 5 min |
      | Active processes | > 80% of max | > 95% of max |
      | Queue depth | > 20 | > 40 |
      | Average latency | > 30s | > 60s |
      | API key health | 1 key unhealthy | All keys unhealthy |
- [ ] **AG-CC-105**: Implement alert emission
  - Log alerts at appropriate level (WARN, ERROR)
  - Emit alert events for external monitoring systems
  - Include alert context (current value, threshold, duration)

---

## 12. Version Management

### 12.1 Claude Code Version Tracking

- [ ] **AG-CC-106**: Implement version compatibility matrix
      | Feature | Min Claude Code Version |
      |---|---|
      | Basic `--print` mode | 1.0.0 |
      | `--output-format json` | 1.1.0 |
      | `--output-format stream-json` | 1.2.0 |
      | MCP server support | 1.0.0 |
      | `--system-prompt` flag | 1.0.0 |
      | `--max-tokens` flag | 1.0.0 |
      | `--allowedTools` flag | 1.3.0 |
- [ ] **AG-CC-107**: Implement feature flag based on detected version
  - If installed version supports streaming: enable streaming mode
  - If installed version supports tool restrictions: enable tool filtering
  - Degrade gracefully for older versions (use text output instead of JSON)
- [ ] **AG-CC-108**: Implement version upgrade notification
  - Compare installed version against latest known version
  - Warn admin if more than 2 minor versions behind
  - Include upgrade instructions in log message

#### Design Decisions

> **Q**: How should Claude Code binary updates be handled while sessions are active?
> **A**: Running processes continue with the old binary until their session ends naturally. New sessions use the new binary. Updates are deployed via rolling restart — existing child processes are not killed, providing zero-downtime updates with no behavioral disruption.

### 12.2 Wrapper Version Management

- [ ] **AG-CC-109**: Define wrapper version constant
  - Semantic versioning for the wrapper itself
  - Log at startup alongside Claude Code version
  - Include in health check response
- [ ] **AG-CC-110**: Implement backward-compatible changes policy
  - New features in wrapper: additive only (don't break existing behavior)
  - Prompt template changes: versioned (old templates retained)
  - Configuration schema changes: backward compatible with defaults

---

## 13. CLAUDE.md File Generation

### 13.1 CLAUDE.md Template System

- [ ] **AG-CC-111**: Define CLAUDE.md file structure

  ```markdown
  # Project Context

  ## Project Name

  {{projectName}}

  ## Project Description

  {{projectDescription}}

  ## Agent Role

  {{agentRole}}

  ## Available Tools

  {{#each mcpTools}}

  - {{name}}: {{description}}
    {{/each}}

  ## Knowledge Graph Context

  - Total specs: {{specCount}}
  - Total edges: {{edgeCount}}
  - Key topics: {{topicSummary}}

  ## Constraints

  {{constraints}}

  ## Output Format

  {{outputFormat}}
  ```

- [ ] **AG-CC-112**: Implement `ClaudeMdGenerator.generate()` method
  - Accept project info, agent type, and context
  - Load template for the agent type
  - Inject project-specific data
  - Write CLAUDE.md to sandbox directory
  - Return file path for CLI `--claudemd` flag
- [ ] **AG-CC-113**: Create per-agent-type CLAUDE.md templates
  - Orchestrator: focus on intent classification rules and examples
  - Knowledge Graph: focus on schema awareness and CRUD conventions
  - Dialog: focus on tone, citation requirements, RAG usage
  - Generative UI: focus on project structure, coding standards, sandboxing rules
  - Plan Generation: focus on plan format, traversal strategy, delta detection
  - Graph Crawler: focus on issue taxonomy, traversal depth, inquiry format

#### Design Decisions

> **Q**: How large should the CLAUDE.md file be?
> **A**: Target 1,500–2,500 tokens. Contents: project name/description (~100), agent role (~200), relevant spec summaries with IDs (~500–1000, max 15 specs), skills references (~200), recent session summary (~200), project conventions (~200). The 15-spec cap keeps size bounded.

> **Q**: Does Claude Code read CLAUDE.md automatically or need explicit reference?
> **A**: Claude Code automatically reads `CLAUDE.md` from the working directory and parent directories, similar to `.gitignore` discovery. The wrapper places the generated file in the sandbox root before spawning the process. No CLI flag is needed.

### 13.2 Dynamic CLAUDE.md Content

- [ ] **AG-CC-114**: Implement project-specific CLAUDE.md sections
  - Include project's current spec count and key topics
  - Include recently modified specs (last 7 days)
  - Include open inquiries relevant to the agent type
  - Include project-specific conventions (naming, tagging standards)
- [ ] **AG-CC-115**: Implement user-specific CLAUDE.md sections
  - Include user's recent activity in the project
  - Include user's permission level
  - Include user's communication preferences (if set)
- [ ] **AG-CC-116**: Implement CLAUDE.md caching
  - Cache generated CLAUDE.md per (project, agent type, user) tuple
  - Invalidate cache on: project config change, spec count change, daily refresh
  - Cache TTL: 1 hour (configurable)
  - Serve from cache to reduce generation overhead

#### Design Decisions

> **Q**: Should CLAUDE.md include dynamic per-request content or semi-static project context?
> **A**: Semi-static, regenerated per session (not per message). Updated only when agent type changes within a session or session resumes after idle timeout. Per-message dynamic content goes in conversation history, keeping CLAUDE.md cacheable within a session.

> **Q**: Should CLAUDE.md be user-editable for project-specific conventions?
> **A**: Yes. Project admins can define custom sections (stored as `claude_md_custom` in project config), limited to 500 tokens, appended to the auto-generated CLAUDE.md. Examples: naming conventions, design patterns, sensitivity flags for specific spec tags.

### 13.3 Skills File Management

- [ ] **AG-CC-117**: Implement skills file placement in sandbox
  - Copy relevant skill files from `06-AGENT-SYSTEM/04-SKILLS-CONFIG` into sandbox
  - Place in sandbox at path discoverable by Claude Code
  - Reference skill files from CLAUDE.md
- [ ] **AG-CC-118**: Implement skill file selection per agent type
  - Each agent type has a list of relevant skill files
  - Orchestrator: routing skill, intent classification skill
  - Knowledge Graph: spec CRUD skill, edge management skill
  - Dialog: RAG search skill, citation skill
  - Generative UI: React generation skill, build verification skill
  - Plan Generation: graph traversal skill, plan formatting skill
  - Graph Crawler: analysis skill, inquiry creation skill
- [ ] **AG-CC-119**: Implement skill file versioning
  - Skill files are versioned alongside the wrapper
  - Store skill file content hash in session record
  - Detect skill file changes and invalidate CLAUDE.md cache

---

## Additional Design Decisions

> **Q**: How should the Claude Code wrapper be tested in CI/CD without expensive real API calls?
> **A**: A mock Claude Code binary — a simple script that reads prompts from stdin and returns pre-defined `stream-json` responses via keyword pattern matching. The mock is fast (<100ms) and free. Wrapper unit tests use the mock; integration tests with real Claude Code run weekly in staging.

---

## Summary

### Task Count by Section

| Section                               | Tasks                            |
| ------------------------------------- | -------------------------------- |
| 1. Claude Code CLI Integration        | 10 (AG-CC-001 through AG-CC-010) |
| 2. Process Management                 | 14 (AG-CC-011 through AG-CC-024) |
| 3. Working Directory Sandboxing       | 11 (AG-CC-025 through AG-CC-035) |
| 4. Prompt Construction & Templating   | 13 (AG-CC-036 through AG-CC-048) |
| 5. Output Parsing                     | 10 (AG-CC-049 through AG-CC-058) |
| 6. Streaming Output Handling          | 9 (AG-CC-059 through AG-CC-067)  |
| 7. Environment Variable Configuration | 6 (AG-CC-068 through AG-CC-073)  |
| 8. Cost Tracking & Token Usage        | 9 (AG-CC-074 through AG-CC-082)  |
| 9. Rate Limiting & Queuing            | 6 (AG-CC-083 through AG-CC-088)  |
| 10. Error Handling                    | 9 (AG-CC-089 through AG-CC-097)  |
| 11. Health Checks & Monitoring        | 8 (AG-CC-098 through AG-CC-105)  |
| 12. Version Management                | 5 (AG-CC-106 through AG-CC-110)  |
| 13. CLAUDE.md File Generation         | 9 (AG-CC-111 through AG-CC-119)  |
| **TOTAL**                             | **119**                          |

### Dependencies (What This Plan Enables)

Completion of this plan unblocks:

- `06-AGENT-SYSTEM/03-MCP-SERVERS-PLAN.md` — needs process spawning, MCP server integration, tool call extraction
- `06-AGENT-SYSTEM/04-SKILLS-CONFIG-PLAN.md` — needs CLAUDE.md generation, prompt templating, skill file placement
- `06-AGENT-SYSTEM/05-PLAN-GENERATION-PLAN.md` — needs sandbox management, file system access, streaming output
- `03-SERVER/04-AGENT-ORCHESTRATION-PLAN.md` — needs ClaudeCodeService for agent execution
- `08-TESTING/04-AGENT-TESTING-PLAN.md` — needs mock-able ClaudeCodeService interface

### Definition of Done

This plan is complete when:

- [ ] Claude Code binary is auto-discovered and version-checked at startup
- [ ] Process spawning works with full I/O capture (stdin, stdout, stderr)
- [ ] Sandbox directories are created and isolated per session
- [ ] Prompt templates exist for all 6 agent types and produce valid prompts
- [ ] Output parsing handles JSON, streaming, and text formats
- [ ] Streaming output relays to client via WebSocket in real-time
- [ ] Token usage and cost are tracked per session and per user
- [ ] Rate limiting prevents resource exhaustion
- [ ] All error types (process, API, output) are handled with user-friendly messages
- [ ] Health checks detect Claude Code availability issues
- [ ] CLAUDE.md is dynamically generated per project/agent/user context
