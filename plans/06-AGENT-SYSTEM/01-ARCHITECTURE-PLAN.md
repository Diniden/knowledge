# 06-AGENT-SYSTEM / 01 — ARCHITECTURE PLAN

> **Purpose**: Define the complete agent system architecture including agent
> types and their responsibilities, the orchestrator routing layer, agent
> lifecycle management, context assembly per agent type, inter-agent
> communication, memory management, error handling, concurrency control,
> and resource allocation.
>
> **Phase**: 3 (Agent Integration)
> **Dependencies**: `03-SERVER/01-ARCHITECTURE-PLAN.md`, `03-SERVER/06-WEBSOCKET-PLAN.md`
> **Estimated tasks**: 135+
>
> **SANDBOXING NOTE**: This plan covers the **APPLICATION-RUNTIME** agent
> system — the agents that serve end users of the running application.
> This is SEPARATE from DEVELOPMENT-TIME AI configuration
> (`13-AI-DEV-CONFIGURATION/PLAN.md`) which configures Claude Code and Cursor
> for developers building this project. Runtime configs: `server/agents/`,
> `server/mcp-servers/`. Dev configs: `.claude/`, `.cursor/rules/`, root `CLAUDE.md`.

---

## Table of Contents

1. [Agent Type Taxonomy](#1-agent-type-taxonomy)
2. [Orchestrator Agent](#2-orchestrator-agent)
3. [Knowledge Graph Agent](#3-knowledge-graph-agent)
4. [Dialog Agent](#4-dialog-agent)
5. [Generative UI Agent](#5-generative-ui-agent)
6. [Plan Generation Agent](#6-plan-generation-agent)
7. [Graph Crawler Agent](#7-graph-crawler-agent)
8. [Agent Lifecycle Management](#8-agent-lifecycle-management)
9. [Context Assembly](#9-context-assembly)
10. [Agent Memory & Conversation History](#10-agent-memory--conversation-history)
11. [Inter-Agent Communication](#11-inter-agent-communication)
12. [Error Handling & Recovery](#12-error-handling--recovery)
13. [Concurrency Management](#13-concurrency-management)
14. [Resource Allocation & Limits](#14-resource-allocation--limits)

---

## 1. Agent Type Taxonomy

### 1.1 Agent Registry

- [ ] **AG-ARCH-001**: Define the `AgentType` enum for all agent types
  ```typescript
  type AgentType =
    | 'orchestrator'
    | 'knowledge-graph'
    | 'dialog'
    | 'generative-ui'
    | 'plan-generation'
    | 'graph-crawler';
  ```
- [ ] **AG-ARCH-002**: Create `AgentTypeConfig` interface describing each agent type's capabilities
  ```typescript
  interface AgentTypeConfig {
    type: AgentType;
    description: string;
    mcpServers: string[];        // MCP servers this agent can access
    maxConcurrent: number;       // max simultaneous instances
    defaultTimeout: number;      // ms before kill
    sandboxPath: string;         // template for working directory
    systemPromptTemplate: string;// path to system prompt template
    outputFormat: 'text' | 'json' | 'streaming';
    canDelegateToTypes: AgentType[]; // which sub-agents it can spawn
  }
  ```
- [ ] **AG-ARCH-003**: Create agent type registry module in `server/src/agent-system/registry/`
  - Store all `AgentTypeConfig` entries
  - Provide `getAgentConfig(type: AgentType)` lookup
  - Validate agent types at startup (all referenced MCP servers exist)
- [ ] **AG-ARCH-004**: Define agent type hierarchy
  - Orchestrator is the top-level entry point (user requests always go here first)
  - All other agent types are sub-agents, spawned by the orchestrator or by each other
  - No circular delegation chains allowed (enforced at config level)
- [ ] **AG-ARCH-005**: Define agent capability matrix
  | Agent Type | Read Graph | Write Graph | RAG Search | Generate UI | Generate Plans | File Access |
  |---|---|---|---|---|---|---|
  | Orchestrator | Yes | No | Yes (light) | No | No | No |
  | Knowledge Graph | Yes | Yes | Yes | No | No | No |
  | Dialog | Yes | No | Yes | No | No | No |
  | Generative UI | Yes | No | Yes | Yes | No | Yes (sandboxed) |
  | Plan Generation | Yes | No | Yes | No | Yes | Yes (sandboxed) |
  | Graph Crawler | Yes | Yes (inquiries) | Yes | No | No | No |

### 1.2 Agent Module Structure

- [ ] **AG-ARCH-006**: Create `server/src/agent-system/` directory structure
  ```
  server/src/agent-system/
  ├── agent-system.module.ts           # NestJS module
  ├── registry/
  │   ├── agent-type.registry.ts       # Agent type configs
  │   └── agent-type.config.ts         # Configuration interfaces
  ├── orchestrator/
  │   ├── orchestrator.service.ts       # Intent classification & routing
  │   └── intent-classifier.ts          # Intent detection logic
  ├── agents/
  │   ├── knowledge-graph.agent.ts      # KG agent implementation
  │   ├── dialog.agent.ts               # Dialog agent implementation
  │   ├── generative-ui.agent.ts        # Gen-UI agent implementation
  │   ├── plan-generation.agent.ts      # Plan gen agent implementation
  │   └── graph-crawler.agent.ts        # Graph crawler implementation
  ├── lifecycle/
  │   ├── agent-session.service.ts      # Session creation and tracking
  │   ├── agent-session.entity.ts       # Session database entity
  │   └── session-cleanup.service.ts    # Expired session cleanup
  ├── context/
  │   ├── context-assembler.service.ts  # Build agent context per type
  │   └── context-window.manager.ts     # Token budget management
  ├── memory/
  │   ├── conversation-history.service.ts
  │   └── working-memory.service.ts
  ├── communication/
  │   └── agent-bus.service.ts          # Inter-agent message passing
  ├── errors/
  │   └── agent-error.types.ts          # Agent-specific error hierarchy
  └── interfaces/
      ├── agent.interface.ts            # Base agent interface
      ├── agent-request.interface.ts    # Request/response types
      └── agent-output.interface.ts     # Output format types
  ```
- [ ] **AG-ARCH-007**: Create `AgentSystemModule` NestJS module
  - Import required modules: ClaudeCodeModule, McpModule, KnowledgeGraphModule
  - Register all agent services as providers
  - Export `OrchestratorService` for use by API controllers
  - Register lifecycle hooks for cleanup on shutdown
- [ ] **AG-ARCH-008**: Define base `Agent` interface that all agent types implement
  ```typescript
  interface Agent {
    type: AgentType;
    execute(request: AgentRequest): Promise<AgentOutput>;
    getRequiredMcpServers(): string[];
    buildSystemPrompt(context: AgentContext): string;
    parseOutput(raw: string): AgentOutput;
    validate(request: AgentRequest): ValidationResult;
  }
  ```
- [ ] **AG-ARCH-009**: Define `AgentRequest` interface
  ```typescript
  interface AgentRequest {
    sessionId: string;
    userId: string;
    projectId: string;
    userMessage: string;
    conversationHistory: ConversationMessage[];
    context: AgentContext;
    parentAgentId?: string;  // if this is a sub-agent call
    delegationChain: string[]; // prevent circular delegation
    metadata: Record<string, unknown>;
  }
  ```
- [ ] **AG-ARCH-010**: Define `AgentOutput` interface
  ```typescript
  interface AgentOutput {
    type: AgentOutputType;
    content: string;
    structuredData?: Record<string, unknown>;
    toolCalls?: ToolCallResult[];
    delegations?: DelegationResult[];
    tokensUsed: TokenUsage;
    durationMs: number;
    error?: AgentError;
  }
  type AgentOutputType = 'text' | 'structured' | 'streaming' | 'delegation';
  ```

---

## 2. Orchestrator Agent

### 2.1 Intent Classification

- [ ] **AG-ARCH-011**: Define the intent taxonomy for user requests
  | Intent | Description | Target Agent |
  |---|---|---|
  | `spec-crud` | Create, update, delete, or read specs | Knowledge Graph Agent |
  | `edge-management` | Create, modify, delete edges between specs | Knowledge Graph Agent |
  | `graph-query` | Query graph structure, find paths, subgraphs | Knowledge Graph Agent |
  | `conversational` | General questions, clarifications, discussions | Dialog Agent |
  | `ui-generation` | Request a custom UI/visualization | Generative UI Agent |
  | `plan-generation` | Generate execution plans from the graph | Plan Generation Agent |
  | `graph-analysis` | Crawl graph for implications, contradictions | Graph Crawler Agent |
  | `multi-intent` | Request spans multiple agent types | Orchestrator (sequential/parallel) |
  | `clarification-needed` | Ambiguous request needing more info | Dialog Agent (with clarification prompt) |
- [ ] **AG-ARCH-012**: Implement intent classification logic
  - Use Claude Code itself to classify intent (meta-agent pattern)
  - System prompt includes the intent taxonomy with examples
  - Input: user message + recent conversation context
  - Output: `{ intent: string, confidence: number, reasoning: string }`
  - If confidence < 0.7, classify as `clarification-needed`
- [ ] **AG-ARCH-013**: Create few-shot examples for intent classification
  - At least 5 examples per intent category
  - Include edge cases (requests that could be multiple intents)
  - Include negation examples ("Don't create a spec, just tell me about X")
- [ ] **AG-ARCH-014**: Implement multi-intent detection
  - Detect when a user request spans multiple agent types
  - Example: "Create a spec for auth and then show me how it connects to the API spec"
  - Decompose into ordered sub-intents: [spec-crud, graph-query]
  - Execute sequentially, passing prior results as context to subsequent agents
- [ ] **AG-ARCH-015**: Implement intent classification caching
  - Cache recent classifications to avoid redundant LLM calls for follow-up messages
  - Cache key: normalized user message + conversation context hash
  - Cache TTL: per-conversation (cleared when conversation context shifts significantly)

### 2.2 Request Routing

- [ ] **AG-ARCH-016**: Implement `OrchestratorService.route()` method
  - Accept classified intent and original request
  - Look up target agent type from intent
  - Assemble agent-specific context using `ContextAssembler`
  - Delegate to the appropriate agent's `execute()` method
  - Aggregate results for multi-intent requests
- [ ] **AG-ARCH-017**: Implement routing decision logging
  - Log every routing decision: intent, confidence, target agent, reasoning
  - Store in agent session audit trail
  - Useful for debugging misrouted requests
- [ ] **AG-ARCH-018**: Implement routing fallback logic
  - If target agent fails, fall back to Dialog Agent with error context
  - If intent classification fails entirely, default to Dialog Agent
  - If sub-agent exceeds timeout, orchestrator cancels and reports to user
- [ ] **AG-ARCH-019**: Implement routing priority rules
  - Safety checks before routing (e.g., does user have permission for this operation?)
  - Rate limit checks per user per agent type
  - Project-level agent availability checks (some projects may disable certain agent types)

### 2.3 Response Aggregation

- [ ] **AG-ARCH-020**: Implement multi-agent response merging
  - For multi-intent requests: combine outputs from sequential agent calls
  - Maintain coherent narrative across delegated responses
  - Include delegation metadata (which agent produced which part)
- [ ] **AG-ARCH-021**: Implement response post-processing
  - Validate output format against expected schema
  - Sanitize any user-facing text content
  - Attach cost/token metadata
  - Convert internal references to user-facing format
- [ ] **AG-ARCH-022**: Implement streaming response coordination
  - When a sub-agent streams output, relay chunks to client via WebSocket
  - Include agent type labels in stream chunks so frontend knows the source
  - Handle interleaved streams from parallel sub-agents

---

## 3. Knowledge Graph Agent

### 3.1 Agent Configuration

- [ ] **AG-ARCH-023**: Define Knowledge Graph Agent capabilities
  - MCP servers: Knowledge Graph MCP, RAG MCP
  - Can create, update, and delete specs
  - Can create, update, and delete edges
  - Can query graph structure (traversal, subgraphs, paths)
  - Can read spec content and metadata
  - Can create inquiries for issues found during operations
- [ ] **AG-ARCH-024**: Define Knowledge Graph Agent system prompt
  - Role: "You are a knowledge graph specialist. You manage specs (nodes), edges (relationships), and documents."
  - Include spec schema awareness (fields, constraints, status lifecycle)
  - Include edge taxonomy and directionality rules
  - Include examples of creating specs from user descriptions
  - Include guidelines for when to suggest edges vs. create them
- [ ] **AG-ARCH-025**: Define Knowledge Graph Agent output expectations
  - Spec CRUD: return the created/updated entity plus a natural language summary
  - Edge operations: return edge details plus a rationale for the relationship
  - Graph queries: return structured results (subgraph JSON) plus narrative explanation

### 3.2 Spec Operations

- [ ] **AG-ARCH-026**: Implement spec creation flow
  - Parse user's description into spec fields (title, content, tags)
  - Call `create_spec` MCP tool with structured data
  - Optionally generate initial edges to existing related specs (use RAG to find them)
  - Return created spec with suggested follow-up actions
- [ ] **AG-ARCH-027**: Implement spec update flow
  - Identify which spec to update (by ID, title search, or context)
  - Determine which fields to modify
  - Call `update_spec` MCP tool with partial update
  - Trigger embedding regeneration if content changed
- [ ] **AG-ARCH-028**: Implement spec search and retrieval flow
  - Use RAG MCP to find semantically similar specs
  - Use Knowledge Graph MCP for exact lookups by ID or title
  - Combine results with relevance ranking
  - Present specs with their graph context (immediate neighbors)

### 3.3 Edge Operations

- [ ] **AG-ARCH-029**: Implement edge suggestion logic
  - When a spec is created or updated, analyze for potential edges
  - Use RAG to find related specs
  - Use graph traversal to find structural relationships
  - Suggest edges with confidence scores and rationale
  - Respect the fixed edge taxonomy
- [ ] **AG-ARCH-030**: Implement edge creation flow
  - Validate source and target specs exist
  - Validate edge type is appropriate for the relationship
  - Set confidence score (agent-suggested vs. user-confirmed)
  - Call `create_edge` MCP tool
  - Return edge with rationale explanation
- [ ] **AG-ARCH-031**: Implement edge conflict detection
  - Check for contradictions: new edge contradicts existing edges
  - Check for redundancy: new edge duplicates an existing relationship
  - Flag conflicts as inquiries for human review

---

## 4. Dialog Agent

### 4.1 Agent Configuration

- [ ] **AG-ARCH-032**: Define Dialog Agent capabilities
  - MCP servers: Knowledge Graph MCP (read-only), RAG MCP
  - Can search and read specs but NOT create or modify them
  - Can answer questions about the knowledge graph
  - Can explain relationships between specs
  - Can ask clarifying questions
- [ ] **AG-ARCH-033**: Define Dialog Agent system prompt
  - Role: "You are a helpful knowledge assistant. You answer questions about the project's knowledge base."
  - Include instruction to use RAG search for factual answers
  - Include instruction to reference specific specs by title and ID
  - Include guidelines for when to ask for clarification
  - Include tone guidance (concise, helpful, reference-rich)
- [ ] **AG-ARCH-034**: Define Dialog Agent response format
  - Natural language responses with embedded spec references `[[sp_xxxx|Title]]`
  - Include "Sources" section listing referenced specs
  - Include confidence indicator for answers based on RAG retrieval quality
  - Suggest follow-up questions or actions

### 4.2 Conversational Patterns

- [ ] **AG-ARCH-035**: Implement RAG-augmented question answering
  - Receive user question
  - Search RAG for relevant specs (top-K retrieval)
  - Inject retrieved spec content into agent context
  - Generate answer grounded in retrieved content
  - Cite sources explicitly
- [ ] **AG-ARCH-036**: Implement clarification request flow
  - Detect ambiguous user requests (from orchestrator or own analysis)
  - Generate targeted clarifying questions
  - Present multiple-choice options where possible
  - Maintain clarification state across conversation turns
- [ ] **AG-ARCH-037**: Implement knowledge gap detection
  - When RAG retrieval returns low-relevance results, inform user
  - Suggest creating a new spec for the topic
  - Offer to delegate to Knowledge Graph Agent for spec creation
- [ ] **AG-ARCH-038**: Implement spec summarization
  - Summarize individual specs or groups of specs on request
  - Respect permission levels (use summary field for restricted specs)
  - Support summarization of graph neighborhoods

---

## 5. Generative UI Agent

### 5.1 Agent Configuration

- [ ] **AG-ARCH-039**: Define Generative UI Agent capabilities
  - MCP servers: Generative UI MCP, Knowledge Graph MCP (read-only), RAG MCP
  - Can create ESM React projects in sandboxed directories
  - Can read spec content for data visualization
  - Has file system access within `client/gen/{user}/{project}/`
  - Cannot modify specs or edges (read-only graph access)
- [ ] **AG-ARCH-040**: Define Generative UI Agent system prompt
  - Role: "You are a UI generation specialist. You create React components and small applications."
  - Include ESM project structure requirements
  - Include available UI frameworks and libraries
  - Include sandboxing constraints (no external API calls, limited packages)
  - Include best practices for generated UI (responsive, accessible)
- [ ] **AG-ARCH-041**: Define Generative UI Agent output format
  - Primary output: file writes to project directory (via MCP tools)
  - Secondary output: natural language description of what was created
  - Include build status (whether project compiled successfully)
  - Include preview URL for the generated UI

### 5.2 UI Generation Flow

- [ ] **AG-ARCH-042**: Implement UI project creation flow
  - Receive user's UI request description
  - Determine if an existing project can be reused or extended (call `find_existing_ui`)
  - If new: call `create_ui_project` MCP tool to scaffold the project
  - Generate component code using Claude Code in the sandboxed directory
  - Call `build_ui_project` to verify compilation
  - Return project URL for iframe loading
- [ ] **AG-ARCH-043**: Implement UI template selection
  - Match user request to available templates (dashboard, form, visualization, etc.)
  - Use `get_ui_template` MCP tool to retrieve template scaffolding
  - Customize template based on user requirements
- [ ] **AG-ARCH-044**: Implement iterative UI refinement
  - Support "modify this UI" follow-up requests
  - Load existing project files into context
  - Apply incremental changes without regenerating entire project
  - Rebuild and verify after changes
- [ ] **AG-ARCH-045**: Implement data binding from knowledge graph
  - When UI needs to display spec data, read from graph
  - Generate data fetching code that uses the project's API
  - Ensure generated UI updates when source specs change

---

## 6. Plan Generation Agent

### 6.1 Agent Configuration

- [ ] **AG-ARCH-046**: Define Plan Generation Agent capabilities
  - MCP servers: Plan Generation MCP, Knowledge Graph MCP (read-only), RAG MCP, File System MCP
  - Can traverse the knowledge graph to understand project structure
  - Can generate plan files (directories of markdown plan documents)
  - Can read spec content for plan context
  - Has file system access within the plans output directory
- [ ] **AG-ARCH-047**: Define Plan Generation Agent system prompt
  - Role: "You are a plan generation specialist. You traverse the knowledge graph and produce step-by-step execution plans."
  - Include plan output format specification
  - Include guidelines for graph traversal depth and breadth
  - Include rules for parallel vs. serial plan organization
  - Include delta detection instructions
- [ ] **AG-ARCH-048**: Define Plan Generation Agent output format
  - Primary output: plan files written to the plans directory
  - Secondary output: plan summary for user review
  - Include plan metadata (source specs, generation timestamp, mode)
  - Include delta report if in delta mode

### 6.2 Plan Creation Flow

- [ ] **AG-ARCH-049**: Implement full build plan generation
  - Traverse entire relevant subgraph from a root spec
  - Retrieve RAG context for supplementary information
  - Generate master prompt plan at root directory
  - Generate per-directory execution plans
  - Write plan files via File System MCP
- [ ] **AG-ARCH-050**: Implement delta build plan generation
  - Query for specs changed since last plan execution
  - Determine affected plan sections
  - Regenerate only affected plan files
  - Mark unchanged plan sections as "no change"
- [ ] **AG-ARCH-051**: Implement plan review workflow
  - Generate plan in "draft" status
  - Present plan summary to user for approval
  - On approval, mark plan as "approved" via `approve_plan` MCP tool
  - On rejection, accept user feedback and regenerate

---

## 7. Graph Crawler Agent

### 7.1 Agent Configuration

- [ ] **AG-ARCH-052**: Define Graph Crawler Agent capabilities
  - MCP servers: Knowledge Graph MCP (read + inquiry write), RAG MCP
  - Traverses the graph to find implications of changes
  - Detects contradictions, orphans, and quality issues
  - Creates inquiries for human review (not direct spec modifications)
  - Does NOT modify specs or edges directly
- [ ] **AG-ARCH-053**: Define Graph Crawler Agent system prompt
  - Role: "You are a graph analysis specialist. You crawl the knowledge graph to discover implications, contradictions, and quality issues."
  - Include graph traversal strategies (BFS, DFS, weighted)
  - Include issue taxonomy (contradiction, orphan, stale, quality)
  - Include inquiry creation guidelines (severity, description format)
  - Include traversal depth limits per trigger type
- [ ] **AG-ARCH-054**: Define Graph Crawler Agent trigger events
  - Spec created → crawl from new spec to discover related specs needing updates
  - Spec updated → crawl from updated spec to find impacted downstream specs
  - Edge created → crawl both endpoints to verify consistency
  - Manual trigger → user requests full or partial graph analysis

### 7.2 Crawl Operations

- [ ] **AG-ARCH-055**: Implement change-triggered crawl
  - Receive trigger event (spec ID + change type)
  - Load the changed spec and its immediate neighborhood (edges + neighbors)
  - Expand traversal to 2-3 hops based on edge types and strength
  - Analyze each reached spec for potential impacts
  - Create inquiries for any issues discovered
- [ ] **AG-ARCH-056**: Implement contradiction detection
  - Compare content of connected specs for semantic contradictions
  - Use RAG embeddings for similarity scoring
  - Flag pairs where content appears contradictory but no `contradicts` edge exists
  - Flag pairs with `contradicts` edge that are no longer contradictory
- [ ] **AG-ARCH-057**: Implement orphan detection
  - Find specs with zero edges (isolated nodes)
  - Find specs not in any document
  - Find specs with outdated content (high staleness score)
  - Create inquiries with suggestions for connection
- [ ] **AG-ARCH-058**: Implement quality scoring
  - Evaluate specs for completeness (has content, has tags, has summary)
  - Evaluate edge coverage (are obvious relationships missing?)
  - Score each spec on a quality scale
  - Create inquiries for specs below quality threshold
- [ ] **AG-ARCH-059**: Implement crawl result aggregation
  - Collect all issues found during a crawl
  - Deduplicate with existing open inquiries
  - Prioritize by severity and number of affected specs
  - Return summary report to orchestrator

---

## 8. Agent Lifecycle Management

### 8.1 Session Creation

- [ ] **AG-ARCH-060**: Define `AgentSession` entity for database persistence
  ```typescript
  interface AgentSession {
    id: string;
    userId: string;
    projectId: string;
    agentType: AgentType;
    status: SessionStatus;
    parentSessionId?: string;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    tokensUsed: TokenUsage;
    cost: number;
    error?: string;
    metadata: Record<string, unknown>;
  }
  type SessionStatus = 'initializing' | 'context-loading' | 'executing' | 'streaming' | 'completed' | 'failed' | 'cancelled' | 'timed-out';
  ```
- [ ] **AG-ARCH-061**: Implement `AgentSessionService.createSession()` method
  - Generate unique session ID
  - Record user, project, agent type, parent session
  - Set status to `initializing`
  - Persist to database
  - Emit WebSocket event: `agent:session:created`
- [ ] **AG-ARCH-062**: Implement session status transitions
  - Define valid transitions: `initializing → context-loading → executing → streaming → completed`
  - Define failure transitions: any state → `failed`, `cancelled`, `timed-out`
  - Validate transitions (reject invalid state changes)
  - Emit WebSocket events on every transition
- [ ] **AG-ARCH-063**: Implement session metadata tracking
  - Track token usage (prompt tokens, completion tokens, total)
  - Track cost per session (computed from token counts and model pricing)
  - Track duration (start to completion)
  - Track tool calls made during session
  - Track delegation chain (parent → child sessions)

### 8.2 Session Execution

- [ ] **AG-ARCH-064**: Implement agent execution pipeline
  1. Create session (`initializing`)
  2. Assemble context for agent type (`context-loading`)
  3. Construct prompt (system + context + user message)
  4. Spawn Claude Code process (`executing`)
  5. Stream output back to client (`streaming`)
  6. Parse agent output
  7. Execute any post-processing (index updates, edge suggestions)
  8. Mark session complete (`completed`)
- [ ] **AG-ARCH-065**: Implement execution timeout enforcement
  - Per-agent-type timeout from `AgentTypeConfig.defaultTimeout`
  - Timer starts when Claude Code process is spawned
  - On timeout: kill process, set session status to `timed-out`
  - Notify user via WebSocket with timeout error message
- [ ] **AG-ARCH-066**: Implement graceful cancellation
  - User can cancel a running agent session via API/WebSocket
  - Send SIGTERM to Claude Code process
  - Wait up to 5 seconds for graceful shutdown
  - If still running, SIGKILL
  - Set session status to `cancelled`
  - Return partial results if available

### 8.3 Session Cleanup

- [ ] **AG-ARCH-067**: Implement session cleanup service
  - Periodic job (every 5 minutes) to check for abandoned sessions
  - Sessions stuck in `initializing`, `context-loading`, or `executing` for > max timeout
  - Kill associated Claude Code processes
  - Set status to `timed-out`
  - Clean up temporary files in sandboxed directories
- [ ] **AG-ARCH-068**: Implement session history pruning
  - Retain completed sessions for 30 days (configurable)
  - Archive session data (move from hot table to cold storage)
  - Retain aggregate statistics (token usage, cost) indefinitely
  - Purge conversation history after retention period
- [ ] **AG-ARCH-069**: Implement shutdown hook for graceful server shutdown
  - On SIGTERM/SIGINT: enumerate all active sessions
  - Attempt graceful cancellation of each
  - Wait for all Claude Code processes to exit
  - Persist final session states
  - Close database connections

---

## 9. Context Assembly

### 9.1 Context Assembler Service

- [ ] **AG-ARCH-070**: Define `AgentContext` interface
  ```typescript
  interface AgentContext {
    projectInfo: ProjectInfo;
    userInfo: UserInfo;
    graphSnapshot: GraphSnapshot;
    ragResults: RagResult[];
    conversationSummary: string;
    recentToolResults: ToolCallResult[];
    activeInquiries: Inquiry[];
    customContext: Record<string, unknown>;
  }
  ```
- [ ] **AG-ARCH-071**: Implement `ContextAssemblerService.assemble()` method
  - Accept agent type, user request, and session info
  - Call context providers specific to the agent type
  - Assemble and merge context pieces
  - Fit within token budget (prioritize, truncate as needed)
  - Return assembled `AgentContext`
- [ ] **AG-ARCH-072**: Implement per-agent-type context profiles
  - Orchestrator: light context (recent conversation, project summary)
  - Knowledge Graph: relevant subgraph + nearby specs + RAG results
  - Dialog: RAG results + conversation history + referenced specs
  - Generative UI: UI requirements + available templates + relevant spec content
  - Plan Generation: target subgraph + delta info + RAG context
  - Graph Crawler: trigger spec + neighborhood + edge index

### 9.2 Context Providers

- [ ] **AG-ARCH-073**: Implement `ProjectInfoProvider`
  - Retrieve project name, description, configuration
  - Include project-level agent settings
  - Include active branch and recent commits summary
- [ ] **AG-ARCH-074**: Implement `UserInfoProvider`
  - Retrieve user permissions for the project
  - Include user preferences (communication style, expertise level)
  - Include user's recent activity (recently viewed specs)
- [ ] **AG-ARCH-075**: Implement `GraphSnapshotProvider`
  - Build a subgraph relevant to the user's request
  - Start from referenced spec IDs or semantically similar specs
  - Expand to N hops based on agent type configuration
  - Include spec summaries (not full content) to save tokens
  - Include edge metadata for relationship understanding
- [ ] **AG-ARCH-076**: Implement `RagContextProvider`
  - Execute RAG search with user's message as query
  - Retrieve top-K results (K configurable per agent type)
  - Include spec content chunks with relevance scores
  - Deduplicate with graph snapshot (don't include same spec twice)
- [ ] **AG-ARCH-077**: Implement `ConversationSummaryProvider`
  - Summarize recent conversation history (last N turns)
  - For long conversations, use progressive summarization
  - Preserve key decisions, entities mentioned, and pending actions
  - Include tool call results from recent turns

### 9.3 Token Budget Management

- [ ] **AG-ARCH-078**: Implement `ContextWindowManager`
  - Define token budget per agent type (based on Claude model context window)
  - Allocate budget: system prompt (fixed) + context (variable) + user message (fixed) + output buffer
  - Track token count for each context section
  - Truncate lowest-priority sections when budget exceeded
- [ ] **AG-ARCH-079**: Define context priority ordering
  1. System prompt (never truncated)
  2. User message (never truncated)
  3. Conversation history (truncate oldest turns first)
  4. Directly referenced specs (high priority)
  5. RAG results (medium priority, reduce K)
  6. Graph snapshot (lower priority, reduce hop depth)
  7. Project/user info (lowest, summarize)
- [ ] **AG-ARCH-080**: Implement token counting utility
  - Use tiktoken or equivalent for accurate token estimation
  - Cache token counts for static content (system prompts, templates)
  - Estimate dynamically for user messages and retrieved content
- [ ] **AG-ARCH-081**: Implement progressive context compression
  - If context exceeds budget after truncation: summarize sections
  - Replace full spec content with summaries
  - Replace detailed edge metadata with edge type only
  - Replace conversation history with a single summary paragraph

---

## 10. Agent Memory & Conversation History

### 10.1 Conversation History

- [ ] **AG-ARCH-082**: Define `ConversationMessage` interface
  ```typescript
  interface ConversationMessage {
    id: string;
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    agentType?: AgentType;
    toolCalls?: ToolCallSummary[];
    timestamp: string;
    tokenCount: number;
  }
  ```
- [ ] **AG-ARCH-083**: Implement `ConversationHistoryService`
  - `addMessage(sessionId, message)` — append to conversation
  - `getHistory(sessionId, limit?)` — retrieve recent messages
  - `getFullHistory(sessionId)` — retrieve all messages
  - `summarize(sessionId)` — generate a progressive summary
  - `clear(sessionId)` — clear history (user-initiated)
- [ ] **AG-ARCH-084**: Implement conversation persistence
  - Store messages in PostgreSQL (per-session conversation table)
  - Index by session ID and timestamp for fast retrieval
  - Support pagination for long conversations
  - Encrypt sensitive message content at rest
- [ ] **AG-ARCH-085**: Implement conversation branching
  - When agent delegates to a sub-agent, fork the conversation
  - Sub-agent sees its own conversation branch
  - Parent agent receives the sub-agent's final output as a single message
  - Full delegation tree preserved for audit/debugging

### 10.2 Working Memory

- [ ] **AG-ARCH-086**: Define `WorkingMemory` interface
  ```typescript
  interface WorkingMemory {
    sessionId: string;
    referencedSpecIds: string[];
    referencedEdgeIds: string[];
    pendingActions: PendingAction[];
    entityCache: Map<string, CachedEntity>;
    inferredFacts: InferredFact[];
  }
  ```
- [ ] **AG-ARCH-087**: Implement `WorkingMemoryService`
  - Maintain per-session working memory in Redis or in-memory
  - Track which specs and edges the agent has referenced
  - Cache entity data to avoid redundant MCP calls
  - Track pending actions (proposed but not yet confirmed)
  - TTL: cleared when session completes
- [ ] **AG-ARCH-088**: Implement entity reference tracking
  - When agent reads a spec, add to `referencedSpecIds`
  - When agent reads an edge, add to `referencedEdgeIds`
  - Use tracked references to build richer context for subsequent turns
  - Avoid re-fetching already-seen entities
- [ ] **AG-ARCH-089**: Implement pending action queue
  - Agent proposes actions (create spec, create edge, etc.)
  - User must confirm before execution
  - Track proposed actions in working memory
  - On confirmation: execute via MCP tools
  - On rejection: remove from queue

### 10.3 Cross-Session Memory

- [ ] **AG-ARCH-090**: Implement project-level memory
  - Track frequently accessed specs per project
  - Track common query patterns per project
  - Preload high-frequency specs into context for faster responses
- [ ] **AG-ARCH-091**: Implement user-level preferences memory
  - Track user's communication style preferences
  - Track user's typical intents and routing patterns
  - Use for personalized intent classification thresholds

---

## 11. Inter-Agent Communication

### 11.1 Delegation Protocol

- [ ] **AG-ARCH-092**: Define delegation request format
  ```typescript
  interface DelegationRequest {
    fromSessionId: string;
    fromAgentType: AgentType;
    toAgentType: AgentType;
    purpose: string;
    inputData: Record<string, unknown>;
    contextSubset: AgentContext;
    timeout: number;
    priority: 'high' | 'normal' | 'low';
  }
  ```
- [ ] **AG-ARCH-093**: Define delegation response format
  ```typescript
  interface DelegationResponse {
    sessionId: string;
    status: 'success' | 'failure' | 'timeout' | 'cancelled';
    output: AgentOutput;
    tokensUsed: TokenUsage;
    durationMs: number;
  }
  ```
- [ ] **AG-ARCH-094**: Implement delegation via MCP tool calls
  - Parent agent calls a `delegate_to_agent` pseudo-tool
  - Orchestrator intercepts the tool call
  - Spawns the sub-agent with the delegation request
  - Returns sub-agent output as the tool call result
  - Parent agent continues with the delegated result
- [ ] **AG-ARCH-095**: Implement delegation chain tracking
  - Track full chain: Orchestrator → KG Agent → Graph Crawler
  - Prevent circular delegation (A → B → A)
  - Enforce maximum delegation depth (configurable, default 3)
  - Include chain in every session record for audit

### 11.2 Agent Bus

- [ ] **AG-ARCH-096**: Implement `AgentBusService` for event-based communication
  - Publish-subscribe pattern for agent events
  - Events: `spec:created`, `spec:updated`, `edge:created`, `inquiry:created`, etc.
  - Agents subscribe to events relevant to their function
  - Graph Crawler subscribes to `spec:updated` to trigger analysis
- [ ] **AG-ARCH-097**: Implement event filtering
  - Agents receive only events for their current project
  - Agents can filter by event type, entity type, and entity ID
  - Prevent event storms (rate limit events per source)
- [ ] **AG-ARCH-098**: Implement fire-and-forget delegations
  - Some delegations don't need a response (e.g., triggering Graph Crawler)
  - Post event to bus, don't wait for completion
  - Crawler runs asynchronously, creates inquiries as needed
  - User notified of new inquiries via WebSocket

---

## 12. Error Handling & Recovery

### 12.1 Error Taxonomy

- [ ] **AG-ARCH-099**: Define agent error hierarchy
  ```typescript
  class AgentError extends Error {
    code: AgentErrorCode;
    agentType: AgentType;
    sessionId: string;
    recoverable: boolean;
    userMessage: string; // safe to show to user
  }

  type AgentErrorCode =
    | 'INTENT_CLASSIFICATION_FAILED'
    | 'AGENT_SPAWN_FAILED'
    | 'AGENT_TIMEOUT'
    | 'AGENT_PROCESS_CRASHED'
    | 'CONTEXT_ASSEMBLY_FAILED'
    | 'MCP_TOOL_FAILED'
    | 'OUTPUT_PARSE_FAILED'
    | 'DELEGATION_FAILED'
    | 'RATE_LIMIT_EXCEEDED'
    | 'PERMISSION_DENIED'
    | 'INVALID_INPUT'
    | 'INTERNAL_ERROR';
  ```
- [ ] **AG-ARCH-100**: Define user-facing error messages for each error code
  - Map each `AgentErrorCode` to a friendly, actionable message
  - Never expose internal details (process IDs, stack traces) to users
  - Include suggested actions ("Try rephrasing your request", "Try again in a moment")

### 12.2 Recovery Strategies

- [ ] **AG-ARCH-101**: Implement retry logic for transient failures
  - MCP tool failures: retry up to 3 times with exponential backoff
  - Claude Code process crashes: retry once with fresh process
  - Network errors: retry up to 3 times
  - Non-transient errors (permission denied, invalid input): no retry
- [ ] **AG-ARCH-102**: Implement fallback agent strategy
  - If Knowledge Graph Agent fails: fall back to Dialog Agent (explain what went wrong)
  - If Generative UI Agent fails: fall back to Dialog Agent (describe what would have been created)
  - If Plan Generation Agent fails: fall back to Dialog Agent (describe plan structure verbally)
  - Fallback always provides user with next steps
- [ ] **AG-ARCH-103**: Implement partial result recovery
  - If agent fails mid-stream after producing partial output: save partial results
  - Present partial results to user with clear "incomplete" indicator
  - Offer to retry from where it left off or start over
- [ ] **AG-ARCH-104**: Implement circuit breaker for repeated failures
  - If an agent type fails > 5 times in 10 minutes: open circuit breaker
  - Circuit breaker rejects new requests to that agent type
  - Route to fallback agent instead
  - Half-open after 2 minutes: allow one request through to test
  - On success: close circuit breaker

### 12.3 Error Reporting

- [ ] **AG-ARCH-105**: Implement error logging for agent failures
  - Log error details: code, agent type, session ID, full context
  - Include Claude Code process output (stdout/stderr)
  - Include MCP tool call history leading to failure
  - Log to structured logging system for monitoring
- [ ] **AG-ARCH-106**: Implement user-facing error notifications
  - Send error message to client via WebSocket
  - Include error code, friendly message, and suggested actions
  - Include session ID for support reference
  - For streaming agents: send error as final stream chunk
- [ ] **AG-ARCH-107**: Implement error aggregation and alerting
  - Track error rates per agent type over time
  - Alert (log level) if error rate exceeds threshold
  - Dashboard-ready error metrics (count, rate, MTTR)

---

## 13. Concurrency Management

### 13.1 Per-User Concurrency

- [ ] **AG-ARCH-108**: Define per-user agent concurrency limits
  - Maximum simultaneous agent sessions per user: 3 (configurable)
  - Maximum simultaneous agent sessions per user per type: 1
  - Queue excess requests (don't reject immediately)
  - Inform user of queue position via WebSocket
- [ ] **AG-ARCH-109**: Implement user-level agent queue
  - FIFO queue per user for pending agent requests
  - Queue capacity: 10 (reject beyond this)
  - Dequeue when a running session completes
  - Timeout queued requests after 60 seconds

### 13.2 Per-Project Concurrency

- [ ] **AG-ARCH-110**: Define per-project agent concurrency limits
  - Maximum simultaneous agent sessions per project: 10 (configurable)
  - Prevents resource exhaustion on a single project's knowledge graph
  - Knowledge Graph writes serialized per-spec (no concurrent writes to same spec)
- [ ] **AG-ARCH-111**: Implement write serialization for knowledge graph
  - Before executing a KG write operation, acquire a lock on the target spec
  - Lock scope: per-spec for spec operations, per-edge for edge operations
  - Lock timeout: 30 seconds
  - Queue concurrent writes, execute sequentially
  - Release lock after MCP tool call completes

### 13.3 System-Wide Concurrency

- [ ] **AG-ARCH-112**: Define system-wide Claude Code process limits
  - Maximum concurrent Claude Code processes: 20 (configurable, based on server resources)
  - Priority queue: interactive agent requests > background crawls
  - Monitor process count and memory usage
  - Reject new requests when at capacity (return 503 with retry-after)
- [ ] **AG-ARCH-113**: Implement process pool management
  - Track all active Claude Code processes
  - Monitor memory and CPU per process
  - Kill processes exceeding memory limits
  - Implement warm process pool (pre-spawned processes for faster response)
- [ ] **AG-ARCH-114**: Implement priority-based scheduling
  - Interactive requests (user waiting): high priority
  - Sub-agent delegations: medium priority
  - Background crawls: low priority
  - High priority preempts low priority in the queue

---

## 14. Resource Allocation & Limits

### 14.1 Token Budget Limits

- [ ] **AG-ARCH-115**: Define per-session token limits
  | Agent Type | Max Prompt Tokens | Max Output Tokens | Max Total |
  |---|---|---|---|
  | Orchestrator | 4,000 | 1,000 | 5,000 |
  | Knowledge Graph | 50,000 | 10,000 | 60,000 |
  | Dialog | 30,000 | 5,000 | 35,000 |
  | Generative UI | 80,000 | 30,000 | 110,000 |
  | Plan Generation | 100,000 | 50,000 | 150,000 |
  | Graph Crawler | 50,000 | 10,000 | 60,000 |
- [ ] **AG-ARCH-116**: Implement per-session token tracking
  - Count tokens as they are sent to and received from Claude Code
  - Enforce limits: kill process if output exceeds max
  - Report usage to session record
  - Emit warning at 80% of limit
- [ ] **AG-ARCH-117**: Implement per-user daily token budget
  - Configurable daily limit per user (e.g., 500,000 tokens)
  - Track usage across all sessions
  - Warn at 80%, soft-block at 100% (allow current session to finish)
  - Reset daily at midnight UTC

### 14.2 Time Limits

- [ ] **AG-ARCH-118**: Define per-agent-type execution time limits
  | Agent Type | Timeout |
  |---|---|
  | Orchestrator | 30 seconds |
  | Knowledge Graph | 120 seconds |
  | Dialog | 60 seconds |
  | Generative UI | 300 seconds |
  | Plan Generation | 600 seconds |
  | Graph Crawler | 300 seconds |
- [ ] **AG-ARCH-119**: Implement timeout enforcement with warnings
  - At 80% of timeout: emit WebSocket warning to client
  - At 100%: kill process, mark session as timed-out
  - Allow per-request timeout override (with maximum cap)

### 14.3 Storage Limits

- [ ] **AG-ARCH-120**: Define per-project generative UI storage limits
  - Maximum total storage per user's gen-UI projects: 500MB (configurable)
  - Maximum single project size: 50MB
  - Track storage usage per user
  - Reject new project creation when at capacity
- [ ] **AG-ARCH-121**: Define per-project plan generation storage limits
  - Maximum total plan storage per project: 200MB (configurable)
  - Track plan count and size
  - Recommend archiving old plans when approaching limit

### 14.4 Cost Tracking

- [ ] **AG-ARCH-122**: Implement cost calculation per session
  - Map token usage to cost based on model pricing table
  - Track prompt vs. completion token costs separately
  - Include MCP overhead (if MCP servers have their own costs)
  - Store per-session cost in session record
- [ ] **AG-ARCH-123**: Implement project-level cost reporting
  - Aggregate session costs per project
  - Break down by agent type
  - Provide daily/weekly/monthly summaries
  - Expose via API for admin dashboard
- [ ] **AG-ARCH-124**: Implement cost alerts
  - Define cost thresholds per project (daily, monthly)
  - Alert project admins when approaching thresholds
  - Optional hard cap: disable agent functionality when budget exceeded

### 14.5 Monitoring & Observability

- [ ] **AG-ARCH-125**: Define agent system health metrics
  - Active sessions count (by type, by status)
  - Claude Code process count and resource usage
  - Request latency (p50, p95, p99) per agent type
  - Error rate per agent type
  - Token usage rate (tokens/minute)
  - Queue depth and wait times
- [ ] **AG-ARCH-126**: Implement health check endpoint
  - `/api/v1/agent-system/health`
  - Report: Claude Code availability, MCP server health, active session count
  - Return degraded status if any component is unhealthy
- [ ] **AG-ARCH-127**: Implement agent activity dashboard data API
  - Recent sessions with status, duration, cost
  - Agent type distribution
  - Error log with filtering
  - Token usage trends

---

## Summary

### Task Count by Section

| Section | Tasks |
|---------|-------|
| 1. Agent Type Taxonomy | 10 (AG-ARCH-001 through AG-ARCH-010) |
| 2. Orchestrator Agent | 12 (AG-ARCH-011 through AG-ARCH-022) |
| 3. Knowledge Graph Agent | 9 (AG-ARCH-023 through AG-ARCH-031) |
| 4. Dialog Agent | 7 (AG-ARCH-032 through AG-ARCH-038) |
| 5. Generative UI Agent | 7 (AG-ARCH-039 through AG-ARCH-045) |
| 6. Plan Generation Agent | 6 (AG-ARCH-046 through AG-ARCH-051) |
| 7. Graph Crawler Agent | 8 (AG-ARCH-052 through AG-ARCH-059) |
| 8. Agent Lifecycle Management | 10 (AG-ARCH-060 through AG-ARCH-069) |
| 9. Context Assembly | 12 (AG-ARCH-070 through AG-ARCH-081) |
| 10. Agent Memory & Conversation History | 10 (AG-ARCH-082 through AG-ARCH-091) |
| 11. Inter-Agent Communication | 7 (AG-ARCH-092 through AG-ARCH-098) |
| 12. Error Handling & Recovery | 9 (AG-ARCH-099 through AG-ARCH-107) |
| 13. Concurrency Management | 7 (AG-ARCH-108 through AG-ARCH-114) |
| 14. Resource Allocation & Limits | 13 (AG-ARCH-115 through AG-ARCH-127) |
| **TOTAL** | **127** |

### Dependencies (What This Plan Enables)

Completion of this plan unblocks:
- `06-AGENT-SYSTEM/02-CLAUDE-CODE-WRAPPER-PLAN.md` — needs agent lifecycle, session model, execution pipeline
- `06-AGENT-SYSTEM/03-MCP-SERVERS-PLAN.md` — needs agent type capabilities, tool requirements
- `06-AGENT-SYSTEM/04-SKILLS-CONFIG-PLAN.md` — needs agent types, system prompt structure, context model
- `06-AGENT-SYSTEM/05-PLAN-GENERATION-PLAN.md` — needs plan generation agent definition, delegation protocol
- `03-SERVER/04-AGENT-ORCHESTRATION-PLAN.md` — needs orchestrator service, routing logic
- `02-FRONTEND/05-CHAT-DIALOG-PLAN.md` — needs agent output format, streaming protocol, session model
- `08-TESTING/04-AGENT-TESTING-PLAN.md` — needs agent interfaces, error taxonomy

### Definition of Done

This plan is complete when:
- [ ] All agent type configurations are defined and registered
- [ ] Orchestrator intent classification is operational with >90% accuracy on test set
- [ ] All six agent types implement the base `Agent` interface
- [ ] Agent session lifecycle is tracked in database with WebSocket notifications
- [ ] Context assembly produces correctly sized context per agent type
- [ ] Conversation history is persisted and retrievable
- [ ] Inter-agent delegation works with depth limiting and circular prevention
- [ ] Error handling covers all failure modes with user-friendly messages
- [ ] Concurrency limits are enforced at user, project, and system levels
- [ ] Token and cost tracking is operational per session and per project
- [ ] Health check endpoint reports accurate agent system status
