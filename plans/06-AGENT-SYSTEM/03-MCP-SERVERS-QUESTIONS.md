# 06-AGENT-SYSTEM / 03 — MCP SERVERS: Open Questions

> **Purpose**: Unresolved questions about the MCP server implementations
> including tool design, transport, authentication, error handling, server
> boundaries, and testing strategy. Answers may change tasks in the plan.

---

## 1. Server Architecture

### 1.1 Server Boundaries

- **Q**: Should each MCP server be a separate process, or should multiple
  MCP servers run within a single process? Separate processes provide
  isolation but add overhead; a combined process is more efficient but
  a crash in one server could affect others.

**A:** Each MCP server is a separate process, communicating with Claude Code via stdio transport. This matches the MCP protocol model: each server is spawned by Claude Code as a child process, and they communicate over stdin/stdout JSON-RPC. Running 7 separate processes provides isolation — a crash in the Git MCP server doesn't affect the Knowledge Graph MCP server. The overhead is minimal (each MCP server is a lightweight Node.js/Bun process with ~50MB memory). Claude Code manages the lifecycle of these child processes natively.

- **Q**: Should MCP servers be stateless (fresh state per agent session)
  or stateful (maintain state across sessions)? Stateless is simpler and
  more reliable; stateful could cache frequently accessed data.

**A:** Stateless per invocation. Each MCP server process is spawned by Claude Code at session start and terminated when the Claude Code process ends. State (knowledge graph data, user context, etc.) is persisted in the server's database/filesystem and read on demand per tool call. This is the simplest model and aligns with the MCP protocol — MCP servers are tool providers, not stateful services. Caching is handled at the server application layer (PostgreSQL query caching, filesystem caching), not in the MCP server process.

- **Q**: Should the Knowledge Graph MCP server directly access the
  filesystem, or go through the server's storage layer API? Direct access
  is faster; API access provides better abstraction and validation.

**A:** Through the server's storage layer API (internal function calls, not HTTP). The KG MCP server imports the storage module and calls its functions directly (e.g., `storage.getSpec(id)`, `storage.createSpec(data)`). This provides validation, permission checking, and audit logging at the storage layer while avoiding HTTP overhead. The storage layer abstracts whether specs are stored as files, in PostgreSQL, or both. Direct filesystem access would bypass validation and permission checks.

- **Q**: Should MCP servers share a single database connection pool, or
  should each server maintain its own connections? Shared is more
  efficient; separate provides isolation.

**A:** Each MCP server maintains its own database connection. Since MCP servers are separate processes (not threads), they cannot share a connection pool in-memory. Each server opens a connection to the database at startup. With 7 MCP servers per Claude Code session and up to 10 concurrent sessions, that's up to 70 database connections at peak — within normal PostgreSQL limits (default max 100, configurable to 200+). Connection pooling (e.g., PgBouncer) at the database level handles the connection management.

### 1.2 Server Packaging

- **Q**: Should MCP servers be published as standalone npm packages
  (installable independently) or only exist as part of the monorepo?
  Standalone packages enable external tool development; monorepo-only
  is simpler.

**A:** Monorepo only at launch. All 7 MCP servers live in the project monorepo under `packages/mcp-servers/` (or similar). They share common utilities (auth, database access, error handling) via internal packages. Publishing as standalone npm packages is a future consideration if third-party tool development becomes a goal. For now, monorepo co-location simplifies dependency management, testing, and deployment.

- **Q**: Should there be a "composite" MCP server that combines all tools
  from all servers into one? This simplifies Claude Code configuration
  (one server instead of seven) but creates a monolithic server.

**A:** No composite server. The 7 separate servers are a deliberate design choice: each agent type gets a `.mcp.json` that includes only the MCP servers relevant to its role. The Dialog Agent gets KG (read-only tools) + RAG + User Context. The KG Agent gets KG (full CRUD) + RAG. The Gen UI Agent gets Gen UI + File System. This separation enforces the principle of least privilege — agents only see the tools they need. A composite server would expose all tools to all agents, undermining this.

- **Q**: What runtime should MCP servers use: Bun (matching the rest of
  the project) or Node.js (broader compatibility)? If Claude Code spawns
  MCP servers, it needs the correct runtime available.

**A:** Bun, matching the rest of the project. The `.mcp.json` specifies the spawn command for each server (e.g., `{"command": "bun", "args": ["run", "packages/mcp-servers/kg/index.ts"]}`). Claude Code spawns MCP servers as child processes using the specified command, so the runtime is explicit. Bun is already required for the server, so it's guaranteed to be available. The performance benefits (faster startup, native TypeScript) and consistency with the rest of the codebase justify this choice.

---

## 2. Tool Design

### 2.1 Tool Granularity

- **Q**: Should tools be fine-grained (one tool per operation: `create_spec`,
  `update_spec`, `delete_spec`) or coarse-grained (one tool per domain:
  `manage_spec` with an `action` parameter)? Fine-grained is clearer for
  the agent; coarse-grained reduces the number of tools to discover.

**A:** Fine-grained. One tool per operation. LLMs perform better with explicit, well-named tools than with multi-purpose tools that require an `action` parameter. `create_spec` is unambiguous; `manage_spec({action: "create"})` requires the agent to know the valid action values. Fine-grained tools also have better tool descriptions (each describes exactly one operation) and simpler parameter schemas. With the 50 MCP tool calls per message cap, the number of available tools isn't a bottleneck — it's the number of calls that matters.

- **Q**: Should "compound" tools exist that perform multiple operations
  atomically? For example, `create_spec_with_edges` that creates a spec
  and its edges in one call. This reduces round-trips but increases tool
  complexity.

**A:** Yes, for a small number of high-frequency compound operations. Specifically: `create_spec_with_edges` (creates a spec and its initial edges atomically) and `move_spec` (updates spec location and adjusts all connected edges). These save 2–3 tool calls in common workflows and prevent partial state (spec created but edges missing). Other operations should be composed from fine-grained tools. Keep compound tools to a maximum of 3–4 to avoid API bloat.

- **Q**: How many total tools can Claude Code effectively handle? If
  there are 60+ tools across all servers, will the agent's tool selection
  accuracy degrade? Should tools be grouped or limited per invocation?

**A:** Target 15–25 tools per agent type invocation. Since each agent type has a tailored `.mcp.json` with only its relevant MCP servers, no agent sees all tools from all servers. The KG Agent might see ~20 tools (KG CRUD + traversal + RAG search). The Dialog Agent might see ~15 tools (KG read + RAG + user context). Claude handles 20–25 tools well with good descriptions. If tool count creeps above 30 for any agent type, tools should be reviewed for consolidation or removal.

- **Q**: Should tools support batch operations? For example, `create_specs`
  (plural) to create multiple specs in one call. This reduces latency for
  bulk operations but complicates error handling (partial success).

**A:** No batch tools at launch. Batch operations add complexity (partial success semantics, rollback on failure, large parameter payloads). The agent can call `create_spec` multiple times — with the 50-call cap, creating 10 specs in sequence is fine. If profiling shows that batch creation is a common bottleneck (e.g., document decomposition creating 20+ specs), a `bulk_create_specs` tool can be added later with clear partial-success semantics (returns success/failure per item).

### 2.2 Tool Naming

- **Q**: What naming convention should tools follow? Snake_case
  (`create_spec`), camelCase (`createSpec`), or kebab-case (`create-spec`)?
  The MCP standard uses snake_case, but consistency with the TypeScript
  codebase might prefer camelCase.

**A:** Snake_case. Follow the MCP standard convention. Tool names are identifiers in the MCP protocol, not TypeScript symbols — they appear in JSON schemas and tool call payloads. The MCP SDK examples and Anthropic's documentation use snake_case for tool names. Internal TypeScript code that implements the tools uses camelCase as normal, but the exposed tool names are snake_case. Example: tool name `create_spec`, implemented by function `createSpec()`.

- **Q**: Should tool names include the server prefix? For example,
  `kg_create_spec` vs. `create_spec`. Prefixing avoids name conflicts
  across servers but makes tool names longer.

**A:** No prefix. Tool names are scoped by MCP server — Claude Code knows which server provides which tool. Name conflicts across servers are avoided by design: each server has a distinct domain (KG handles specs/edges, RAG handles search, Git handles commits, etc.). Shorter tool names (`create_spec` vs. `kg_create_spec`) are easier for the agent to work with and less token-heavy. If a genuine name conflict arises, resolve it by renaming the less common tool.

- **Q**: Should tool descriptions be written for the AI agent (technical,
  precise) or for humans (natural language, examples)? The agent consumes
  these descriptions for tool selection.

**A:** Written for the AI agent: technical, precise, with structured parameter descriptions. Each tool description includes: one-sentence purpose, parameter descriptions with types and constraints, return value description, and one example usage. Example: "Creates a new specification node in the knowledge graph. Returns the created spec with generated ID. Requires `title` (string, 3-200 chars) and `content` (string, markdown). Optional: `tags` (string array), `parent_id` (spec ID)." This gives the agent everything it needs to decide when and how to call the tool.

### 2.3 Tool Parameters

- **Q**: Should optional tool parameters have sensible defaults (defined
  in the schema) or should the agent always specify them explicitly?
  Defaults reduce verbosity; explicit parameters improve predictability.

**A:** Sensible defaults defined in the schema. Optional parameters with defaults reduce the agent's cognitive load and token usage. For example, `traverse_graph` defaults: `depth: 3`, `max_results: 50`, `edge_types: ["depends-on", "derived-from"]`. The agent can override when needed but doesn't have to specify every parameter for common cases. Defaults are documented in the tool description so the agent knows what it gets if it omits a parameter.

- **Q**: Should tools accept "natural language" parameters (e.g.,
  `search_specs` with a free-text query) or only structured parameters
  (e.g., exact tag filters)? Natural language is more flexible but less
  predictable.

**A:** Both, via separate parameters. `search_specs` accepts both `query` (free-text natural language, used for RAG similarity search) and structured filters (`tags`, `created_after`, `author`). The agent can use either or both. This is the most flexible approach: the agent can do `search_specs({query: "authentication requirements"})` for semantic search, or `search_specs({tags: ["auth", "security"]})` for structured filtering, or combine them. The MCP server handles the combination logic (structured filters narrow the search, then RAG ranks within the filtered set).

- **Q**: How should tool parameters handle spec references? By ID
  (`sp_xxx`), by title, or by both? If both, what happens when title is
  ambiguous (multiple specs with similar titles)?

**A:** By ID (`sp_xxx`) for all mutation and retrieval tools. IDs are unambiguous. For search tools (`search_specs`, `search_similar`), the query can include titles or natural language — the tool returns matching specs with their IDs. The workflow is: agent searches by title/description → gets spec IDs → uses IDs for all subsequent operations. If the agent needs to reference a spec by title in a mutation, it first calls `search_specs({query: "Authentication Requirements"})` to resolve the ID. This is an extra tool call but eliminates ambiguity.

---

## 3. Knowledge Graph MCP Server

### 3.1 CRUD Operations

- **Q**: Should `create_spec` automatically generate a summary, or should
  the agent explicitly provide one? Auto-generation is convenient but adds
  latency (LLM call for summarization). Could be done async.

**A:** The agent provides the summary. The agent has just reasoned about the spec content and is best positioned to write a concise summary. Auto-generation would require a separate LLM call (adding latency and cost) and might produce a different summary than the agent intended. The `create_spec` tool schema makes `summary` a required field (string, max 200 chars). If the agent omits it, the tool returns a validation error. This keeps the MCP server simple (no LLM dependency) and the summary intentional.

- **Q**: Should `delete_spec` require explicit cascade confirmation, or
  should it always cascade edges? Requiring confirmation adds a round-trip
  (agent must call twice); always cascading is simpler but riskier.

**A:** Always cascade edges, with the deletion details returned in the response. When `delete_spec` is called, it removes the spec and all connected edges, returning: `{deleted_spec: "sp_xxx", deleted_edges: ["edge_1", "edge_2"]}`. The confirm-before-mutation layer at the wrapper level already requires user confirmation for delete operations before the tool call executes. Adding a separate cascade confirmation would be a redundant second confirmation. The response details let the agent (and user) see exactly what was removed.

- **Q**: Should `update_spec` support content diffing (send only the
  changed parts) or require the full content on every update? Diffing
  saves tokens; full content is simpler and avoids merge complexity.

**A:** Full content replacement. The agent sends the entire updated spec content. This is simpler, avoids diff/merge complexity, and prevents conflicts from partial updates. Token cost is acceptable — specs are typically 500–2000 tokens, and the agent already has the full content in context. The tool includes a `version` parameter for optimistic locking (the update only succeeds if the spec's current version matches). Full replacement also means the spec is always in a consistent state — no risk of a malformed diff corrupting content.

- **Q**: Should there be a `bulk_create_specs` tool for creating multiple
  specs at once (e.g., when an agent is decomposing a large document into
  specs)?

**A:** Not at launch. The agent calls `create_spec` (or `create_spec_with_edges`) in sequence. With the 50 MCP tool calls per message cap, creating up to ~15 specs with edges in a single turn is feasible. If document decomposition into 20+ specs becomes a common workflow, a bulk tool can be added later with per-item success/failure reporting. Premature optimization for batch operations adds complexity without proven need.

### 3.2 Graph Traversal

- **Q**: What should the maximum traversal depth be? The plan says 10,
  but on a large graph, depth-10 traversal could return thousands of
  nodes. Should there be a hard cap on result size?

**A:** Maximum traversal depth of 5 (reduced from 10) with a hard cap of 100 result nodes. Depth 5 covers most practical dependency chains (spec → depends-on → depends-on → depends-on → depends-on → depends-on). The 100-node cap prevents exploding traversals on densely connected graphs. If the traversal reaches the cap, the result includes `truncated: true` and the agent can refine the query with filters. The defaults (depth 3, max 50) handle 90% of cases; the agent can increase to depth 5 / max 100 when needed.

- **Q**: Should traversal support weighted edges (e.g., prefer strong
  edges over weak ones for path finding)? This adds complexity but
  produces more relevant results.

**A:** Not at launch. All edges are unweighted. Traversal returns all nodes within the requested depth, and the agent (or RAG) determines relevance. Edge weights would require: defining a weight schema, assigning weights to existing edges, modifying traversal algorithms, and maintaining weights as the graph evolves. This is significant complexity for marginal benefit. If traversal results are consistently noisy, edge weighting can be added as an optimization — but start without it.

- **Q**: Should the `traverse_graph` tool return a flat list of nodes
  and edges, or a tree structure rooted at the start spec? Flat is
  simpler; tree better represents the traversal path.

**A:** Flat list with depth annotations. Each node in the result includes its `depth` from the start spec and the `path` (list of edge IDs from root to this node). This gives the agent both the simplicity of a flat list (easy to iterate, filter, count) and the structural information of a tree (depth tells importance, path shows how specs are connected). A tree structure would be harder to serialize in JSON and harder for the agent to process.

- **Q**: Should traversal results be cached per session (same traversal
  from same starting point returns cached results within a session)?

**A:** Yes, for the duration of a single Claude Code invocation (one user message). If the agent calls `traverse_graph` from the same start spec with the same parameters twice in the same message turn, the second call returns cached results. The cache is invalidated between messages (since mutations may have changed the graph). This prevents redundant traversals within a single agent reasoning loop without risking stale data across turns.

### 3.3 Inquiry System

- **Q**: Should agents be able to resolve their own inquiries, or should
  inquiries only be resolved by humans? Agent self-resolution could
  handle simple issues automatically; human-only ensures oversight.

**A:** Agents can resolve inquiries they created, with a `resolution_note` field explaining what was done. For example, if the Graph Crawler creates an inquiry "Spec X is an orphan (no edges)" and the KG Agent later creates an edge to Spec X, the KG Agent can resolve the inquiry: `resolve_inquiry({id: "inq_xxx", resolution_note: "Added depends-on edge from spec Y"})`. Human-created inquiries can only be resolved by humans. This enables automated housekeeping while preserving human oversight for user-raised issues.

- **Q**: Should the inquiry system support "auto-resolve" — if the
  underlying issue is fixed (e.g., orphan spec gets edges), should the
  inquiry auto-close?

**A:** Yes. The inquiry system runs a periodic validation check (piggyback on Graph Crawler runs). When the Graph Crawler processes an inquiry's target spec and finds the issue no longer exists (orphan spec now has edges, missing dependency now exists), it auto-resolves the inquiry with a system note: `"Auto-resolved: condition no longer present as of [timestamp]"`. Auto-resolved inquiries are marked distinctly in the UI so users can see they were system-resolved, not human-resolved.

- **Q**: How should duplicate inquiries be handled? If Graph Crawler
  flags the same issue twice, should it deduplicate automatically?

**A:** Yes, deduplicate on creation. Before creating an inquiry, the `create_inquiry` tool checks for existing open inquiries with the same `spec_id` and `inquiry_type`. If a duplicate exists, the tool updates the existing inquiry's `last_seen` timestamp and returns the existing inquiry ID instead of creating a new one. This prevents inquiry queue bloat from repeated crawls detecting the same issue.

---

## 4. RAG MCP Server

- **Q**: Should the RAG server generate embeddings on-demand (per query)
  or only use pre-computed embeddings? On-demand handles new/unindexed
  content but is slower.

**A:** Pre-computed embeddings as the primary path, with on-demand as a fallback. Embeddings are generated and indexed when specs are created or updated (async, non-blocking). The RAG search tool queries the pre-computed index. For brand-new specs that haven't been indexed yet (race condition during creation), the RAG server falls back to on-demand embedding of the query + keyword matching against spec content. The indexing delay is typically under 5 seconds, so the fallback is rarely needed.

- **Q**: Should the RAG server support hybrid search (semantic + keyword)?
  Hybrid search is more robust but more complex. The `search_specs` KG
  tool already supports keyword search — is there overlap?

**A:** Yes, the RAG server supports hybrid search (semantic similarity + keyword matching), and this is the primary search tool. The KG server's `search_specs` tool is for structured filtering (by tags, dates, author) — not text search. There is intentional separation: RAG handles "find specs about authentication" (semantic), KG handles "find specs tagged 'auth' created after 2025-01-01" (structured). The agent chooses the appropriate tool based on the query type. The RAG search_similar tool uses a weighted combination: 70% semantic score + 30% keyword BM25 score.

- **Q**: What embedding model should be used? OpenAI's text-embedding-3,
  Anthropic's embedding API (if available), or a local model? This
  affects quality, cost, and latency.

**A:** OpenAI's `text-embedding-3-small` (1536 dimensions). It provides excellent quality-to-cost ratio, low latency (~100ms per embedding), and is well-supported. Using Anthropic's embedding API would be preferable for vendor consistency, but as of the PRD writing, it's not yet generally available. A local model (e.g., sentence-transformers) would eliminate external dependency but adds infrastructure (GPU or high-latency CPU inference). Start with OpenAI's API; migrate to Anthropic's embeddings if/when available.

- **Q**: Should RAG search results include the chunk text, or only the
  spec ID and relevance score (agent then fetches full content via KG
  tools)? Including chunks saves a round-trip; IDs only are more token
  efficient if the agent already has the spec in context.

**A:** Include chunk text (truncated to 500 tokens per chunk) plus spec ID and relevance score. The agent needs to see enough text to decide if the result is relevant without making a separate `get_spec` call for each result. Returning 5 results × 500 tokens = 2,500 tokens of RAG context — acceptable within the token budget. If the agent needs the full spec content, it calls `get_spec` with the ID. This balances information richness with token efficiency.

- **Q**: Should the RAG server support cross-project search (search across
  multiple knowledge graphs)? This could enable "find similar specs in
  other projects" but complicates permissions.

**A:** No. RAG search is scoped to the current project. Cross-project search introduces permission complexity (the user may not have access to other projects) and index management complexity (separate embedding indices per project vs. a single shared index with access filtering). Single-project scope is sufficient for the knowledge management use case. Cross-project search can be explored later as a premium/enterprise feature with explicit project-level sharing controls.

---

## 5. Generative UI MCP Server

- **Q**: Should generated UI projects have a maximum complexity limit
  (e.g., max number of files, max lines of code)? Unbounded complexity
  risks long build times and large sandbox sizes.

**A:** Yes. Limits: max 20 files per generated UI project, max 500 lines per file, max 5,000 total lines of code. These limits are enforced at the MCP tool level — the `create_ui_file` tool rejects files that exceed line limits, and the `finalize_ui` tool rejects projects that exceed file/total line limits. These limits are generous for the intended use case (data visualizations, spec relationship diagrams, interactive dashboards) while preventing unbounded generation.

- **Q**: Should the gen-UI MCP server support "hot reload" — building
  and serving the UI in development mode so the agent can iterate?
  This improves the development loop but requires a running dev server.

**A:** No hot reload. Generated UIs are built once (ESM bundle) and served statically. The agent's workflow is: generate files → build → preview URL returned to user. If the user wants changes, they describe them in the chat, and the agent regenerates. Running a dev server per generated UI would consume ports and resources. The build step is fast (ESM bundling with Bun takes <5 seconds) and produces a self-contained artifact. Iteration happens at the agent conversation level, not at the dev-server level.

- **Q**: Should the gen-UI server validate that generated code doesn't
  contain security issues (XSS, data exfiltration)? Static analysis on
  generated code is an added safety layer.

**A:** Yes, lightweight static analysis. The `finalize_ui` tool runs a validation pass before marking the UI as ready: (1) No `fetch()` or `XMLHttpRequest` calls to non-whitelisted domains. (2) No `eval()`, `Function()`, or dynamic code execution. (3) No `document.cookie`, `localStorage`, or `sessionStorage` access. (4) No inline event handlers with external URLs. The iframe sandbox attribute (`sandbox="allow-scripts"` without `allow-same-origin`) provides the runtime safety net. Static analysis catches obvious issues before the user sees the generated UI.

- **Q**: Should there be a gallery of pre-built UI components that the
  agent can compose, rather than generating everything from scratch?
  This would improve quality and speed.

**A:** Yes. A component library of 15–20 pre-built components (chart types, data tables, tree visualizations, relationship diagrams, form layouts) stored in the Gen UI MCP server's assets. The agent can import these components via `import { BarChart } from '@botnet/ui-components'` in generated code. The agent can customize props and compose components, but starts from tested, styled building blocks rather than raw HTML. This dramatically improves quality and reduces generation time. Components are part of the pre-approved package whitelist.

- **Q**: Should generated UIs have access to a real-time data API (to
  display live spec data), or only use static data snapshots? Real-time
  data is more useful but requires API endpoint generation.

**A:** Static data snapshots at launch. When the UI is generated, the relevant spec data is embedded as a JSON data file within the generated project (`data.json`). The UI reads from this local file, not from a live API. This keeps generated UIs self-contained and avoids generating API endpoints (which would require auth, CORS, and lifecycle management). The UI can be "refreshed" by regenerating it (which re-snapshots the data). Real-time data APIs for generated UIs are a future enhancement.

---

## 6. Plan Generation MCP Server

- **Q**: Should plan generation be a single tool call that produces the
  entire plan, or a series of tool calls (one per plan file)? Single
  call is simpler but may hit token limits for large plans; multiple
  calls give finer control.

**A:** A series of tool calls. The workflow is: (1) `analyze_plan_scope` — analyzes the graph traversal result and returns a proposed plan structure (directory layout, file list). (2) `generate_plan_file` — called once per plan file, generating the content. (3) `finalize_plan` — validates the complete plan for consistency and creates the plan metadata. This multi-step approach stays within token limits (each file generation is a bounded output), enables streaming progress to the user (each file completion is reported), and allows the agent to adjust later files based on earlier ones.

- **Q**: How should plan versioning work? Should each `generate_plan`
  call create a new version, or overwrite the previous draft? Versioning
  preserves history but uses more storage.

**A:** Each generation creates a new version. Plans are stored in directories named `plans/{plan-id}/v{N}/` where N is the version number. Previous versions are retained for comparison and rollback. The `finalize_plan` tool increments the version number. Disk usage is minimal (plan files are small text files). Version history is bounded: retain the last 10 versions per plan, auto-purge older ones. This supports the review workflow (user rejects v1, agent generates v2 with feedback applied).

- **Q**: Should the plan generation server support "plan templates" —
  predefined plan structures for common project types? Templates would
  speed up generation for standard scenarios.

**A:** Yes, a small set of templates. 3–5 templates at launch: "API service" (routes → controllers → services → database), "Frontend feature" (components → state → styles → tests), "Full-stack feature" (parallel frontend + backend tracks), "Database migration" (schema → migration scripts → seed data), "Refactor" (analysis → incremental changes → verification). Templates provide the directory structure and file skeleton; the agent fills in the content. Templates are stored as JSON schemas in the MCP server's config directory.

- **Q**: How should the plan reference source specs? By ID, by embedding
  spec content in the plan, or by linking to the spec's path? IDs are
  stable; embedded content is self-contained; paths can change.

**A:** By ID with inline summary. Each plan file's frontmatter includes `source_specs: [{id: "sp_xxx", title: "Auth Requirements", summary: "..."}]`. The ID provides a stable reference for programmatic use (linking commits to specs, tracking coverage). The inline summary provides human-readable context without requiring a graph lookup to understand the plan. Full spec content is NOT embedded — it would bloat plan files and become stale. The execution agent fetches full spec content via MCP tools when it needs implementation details.

---

## 7. File System MCP Server

- **Q**: Should the file system MCP server support binary files (images,
  PDFs), or only text files? Binary support is needed for UI projects
  that include assets.

**A:** Text files only at launch. Generated UI projects use CDN-hosted images and SVG (which is text). The file system MCP server handles: TypeScript, JavaScript, JSON, CSS, HTML, Markdown, and SVG files. Binary file support (for user-uploaded assets) can be added later. The `create_file` and `read_file` tools work with UTF-8 text content. This keeps the MCP server simple and avoids base64 encoding overhead for binary content in MCP tool call payloads.

- **Q**: Should file operations be atomic (write to temp → rename), or
  is direct write acceptable within the sandbox? Atomic writes prevent
  corruption but add overhead.

**A:** Atomic writes. The `write_file` tool writes to a temp file in the same directory, then renames it to the target path. This prevents corruption if the process is killed mid-write (the file is either the old version or the new version, never a partial write). The overhead is negligible (one extra filesystem call). This is a standard best practice for file writes and is especially important for generated code files that may be served to users.

- **Q**: Should the file system server support file watching (notify
  when files change)? This could enable reactive behaviors but adds
  complexity.

**A:** No. File watching is not needed. The MCP protocol is request-response — the agent calls tools and gets results. There's no mechanism for an MCP server to push notifications to Claude Code. If reactive file watching is needed (e.g., rebuild generated UI when source files change), it would be implemented at the server application layer, not in the MCP server.

- **Q**: Should there be a `search_in_files` tool (grep-like functionality
  within the sandbox)? Agents frequently need to find content across
  multiple files.

**A:** Yes. A `search_in_files` tool that accepts a regex pattern and optional file glob, returning matching lines with file paths and line numbers. This is essential for the Plan Execution agent (finding where to insert code) and the Gen UI agent (verifying generated code references). Implementation: simple recursive file read + regex match within the sandbox directory. Results are capped at 50 matches to prevent token explosion.

---

## 8. Git MCP Server

- **Q**: Should the Git MCP server operate on the knowledge graph
  repository only, or should it also support the code repository
  (for code generation)? Multiple repositories adds complexity.

**A:** Both, scoped per invocation. The Git MCP server accepts a `repo_path` parameter on each tool call, specifying which repository to operate on. The knowledge graph repo and the code repo are separate Git repositories. The Plan Execution agent uses the Git MCP server to commit generated code to the code repo, while the Graph Crawler uses it to commit KG changes to the KG repo. The `repo_path` must be within the sandbox's allowed paths — it cannot access arbitrary repositories on the filesystem.

- **Q**: Should the agent be able to push to remote repositories, or
  only make local commits? Pushing has permanent consequences; local-only
  is safer.

**A:** Local commits only by default. The `git_push` tool exists but requires explicit user confirmation (confirm-before-mutation) AND is disabled by default in the tool configuration. Users can enable push in project settings for trusted workflows. This matches the safety-first approach: the user reviews local commits, and pushes manually (or approves agent push). For the KG repo specifically, push may be more commonly enabled since it's an internal repository.

- **Q**: How should merge conflicts be handled? Should the tool return
  raw conflict markers, or should it attempt auto-resolution? Returning
  markers lets the agent (or user) decide; auto-resolution risks
  incorrect merges.

**A:** Return raw conflict markers. The `git_merge` and `git_pull` tools return the conflicted file content with standard Git conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`). The agent can then reason about the conflict and resolve it via `write_file`, or surface it to the user as an inquiry. Auto-resolution by the MCP server is too risky — the server doesn't have the context to make correct merge decisions. The agent (with full conversation context) is better positioned to resolve or escalate.

- **Q**: Should the Git MCP server support signing commits (GPG/SSH)?
  Signed commits provide authenticity guarantees for agent-made changes.

**A:** Not at launch. Commit signing requires managing GPG/SSH keys for agent identities, which adds significant key management complexity. Agent-made commits are identified by the commit author field (see below). Signing can be added as a hardening step for production deployments where commit authenticity is a compliance requirement.

- **Q**: Should there be commit message conventions for agent-made commits
  to distinguish them from human commits? For example,
  `[agent:knowledge-graph] Created spec: Authentication Requirements`.

**A:** Yes. All agent commits follow the convention: `[bot:{agent-type}] {action}: {description}`. Examples: `[bot:kg-agent] create: spec "Authentication Requirements"`, `[bot:plan-exec] implement: step 3 of plan v2 "API Routes"`, `[bot:graph-crawler] fix: orphan edge cleanup`. The commit author is set to `Botnet Agent <agent@botnet.local>` with the user's identity in the commit message body: `Requested by: {user-name} ({user-id})`. This makes agent commits easily identifiable in git log while attributing them to the requesting user.

---

## 9. Transport & Performance

- **Q**: Is stdio the only transport option for MCP with Claude Code, or
  does Claude Code also support HTTP/SSE transport? HTTP would enable
  remote MCP servers.

**A:** Claude Code supports stdio transport for MCP servers. This is the primary and recommended transport. HTTP/SSE transport may be supported in newer Claude Code versions, but stdio is the most reliable and lowest-latency option for co-located servers. Since our MCP servers run on the same machine as Claude Code (spawned as child processes), stdio is ideal — no network overhead, no port management, no auth needed. Remote MCP servers are not a requirement for our architecture.

- **Q**: What is the expected latency for an MCP tool call (from Claude
  Code's perspective)? If a tool call takes > 5 seconds, does Claude Code
  handle the wait gracefully?

**A:** Target latency per MCP tool call: <500ms for read operations (get_spec, search), <1s for write operations (create_spec, update_spec), <3s for complex operations (traverse_graph, search_similar). Claude Code handles long tool calls gracefully — it waits for the MCP server's response. The 5-minute operation timeout is at the wrapper level (entire Claude Code process), not per tool call. If a single tool call takes >30 seconds, something is wrong (database timeout, deadlock) and the MCP server should return an error.

- **Q**: Should MCP servers support request cancellation? If Claude Code
  decides to abandon a tool call, can the MCP server cancel in-progress
  work?

**A:** The MCP protocol supports cancellation via the `notifications/cancelled` notification. Our MCP servers should handle cancellation for long-running operations (graph traversal, RAG search) by checking a cancellation flag during iteration. For short operations (<500ms), cancellation is unnecessary — the operation completes before cancellation propagates. Implementation: the MCP server sets a cancellation listener and checks it at loop boundaries in traversal/search operations.

- **Q**: Should MCP tool results be streamed (for large results) or
  returned as a single response? Streaming avoids buffering large results
  but adds protocol complexity.

**A:** Single response. MCP tool results are JSON objects returned as a single message. Large results are bounded by the tool's design: traversal results are capped at 100 nodes, search results at 10 items, file reads at 100KB. These caps ensure that no single tool result is too large to return as a single response. Streaming tool results would require MCP protocol extensions that aren't standard. Keep it simple — cap result sizes, return complete responses.

---

## 10. Security

- **Q**: How should MCP servers prevent "confused deputy" attacks — where
  a prompt injection in spec content causes the agent to call tools with
  malicious arguments? Input validation helps, but can it catch all cases?

**A:** Defense in layers: (1) **Input validation**: Every MCP tool validates all parameters against strict schemas (spec IDs must match `sp_[a-z0-9]+`, titles must be 3–200 chars, content must be valid markdown, etc.). Reject anything that doesn't match. (2) **Permission enforcement**: Tool calls are authorized against the user's permissions — even a confused agent can't delete a spec the user can't delete. (3) **Confirm-before-mutation**: Destructive operations require user approval, giving the human a chance to catch malicious tool calls. (4) **Rate limiting**: The 50 tool calls per message cap prevents mass-operation attacks. No single layer catches all cases, but the combination makes exploitation extremely difficult.

- **Q**: Should MCP tool calls be subject to a "review queue" for
  destructive operations in production environments? This adds a human
  approval step but slows down automation.

**A:** No separate review queue. The confirm-before-mutation pattern already provides human approval for destructive operations in real-time (the user confirms each delete/update in the chat UI). A separate review queue would decouple the approval from the conversation context, making it harder for the reviewer to understand why the operation was requested. The real-time confirmation is faster and more contextual. For enterprise environments with stricter controls, an additional "admin approval required for bulk operations" flag can be added to project settings.

- **Q**: Should MCP servers implement "dry run" modes for mutation tools?
  The agent could preview the effect of a tool call before executing it.

**A:** Yes, for complex mutations. Tools that modify multiple entities support a `dry_run: true` parameter. When set, the tool validates inputs, checks permissions, and returns a preview of what would change (e.g., `{would_delete: {spec: "sp_xxx", edges: ["e_1", "e_2"]}}`) without executing. Simple mutations (create a single spec) don't need dry run — the confirm-before-mutation prompt shows the user what's about to happen. Dry run is most useful for `delete_spec` (cascade preview) and `move_spec` (edge adjustment preview).

- **Q**: How should the system handle agent attempts to access other
  users' data via MCP tools? Per-tool permission checks are the primary
  defense, but should there be additional monitoring?

**A:** Per-tool permission checks are the primary defense: every MCP tool call includes the user's auth context, and the storage layer enforces project-level isolation. Additionally, the audit log captures every tool call with user ID and target resource ID. An anomaly detection rule flags: (1) tool calls targeting resources outside the user's project (should never happen), (2) unusually high volume of read operations (possible data scraping), (3) repeated permission-denied errors (possible probing). Flagged events generate alerts for system operators.

---

## 11. Testing

- **Q**: Should there be a "mock MCP server" that returns canned responses
  for testing agent behavior without real MCP servers? This would speed
  up agent testing dramatically.

**A:** Yes. A mock MCP server framework that: (1) implements the MCP protocol (stdio JSON-RPC), (2) returns configurable canned responses per tool name, (3) supports scenario files (JSON files defining tool call → response mappings for test cases). The mock server is used in: wrapper unit tests, agent behavior tests, CI/CD pipelines. It starts in <100ms (vs. 1–2s for real MCP servers with database connections). The mock framework is a shared test utility in the monorepo.

- **Q**: How should MCP tool tests handle external dependencies (vector
  store, git repo, file system)? Use in-memory mocks, temporary
  directories, or Docker containers for isolation?

**A:** Temporary directories for file system and git operations. In-memory SQLite for database tests (matching PostgreSQL's SQL subset). A lightweight in-process vector store (e.g., hnswlib-node) for RAG tests. Docker containers are not required for unit/integration tests — they add CI complexity and latency. The test setup creates fresh temporary resources per test suite, and teardown cleans them up. This provides isolation without infrastructure dependencies.

- **Q**: Should there be performance benchmarks for MCP tools? For example,
  "create_spec must complete in < 500ms" or "search_similar must return
  in < 2 seconds."

**A:** Yes. Performance benchmarks for critical tools: `create_spec` < 500ms, `get_spec` < 200ms, `update_spec` < 500ms, `search_similar` < 2s, `traverse_graph` (depth 3) < 1s, `search_in_files` < 1s. Benchmarks run nightly against a test dataset (1000 specs, 5000 edges) in the staging environment. Results are tracked over time to detect performance regressions. Benchmarks are not blocking in CI (they run too slowly for per-commit checks) but regressions trigger alerts.

- **Q**: Should there be chaos testing for MCP servers — randomly
  injecting failures to verify error handling and recovery? This is
  thorough but complex to set up.

**A:** Not at launch. Chaos testing is valuable but is a maturity optimization. Start with thorough error handling unit tests: test each MCP tool with invalid inputs, database timeouts, file permission errors, and concurrent access. These cover the most common failure modes. Once the system is stable in production, chaos testing (random MCP server crashes, delayed responses, partial results) can be added as part of a reliability engineering effort.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
| ---- | -------- | -------- | --------- |
| —    | —        | —        | —         |
