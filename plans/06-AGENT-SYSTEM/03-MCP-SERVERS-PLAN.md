# 06-AGENT-SYSTEM / 03 — MCP SERVERS PLAN

> **Purpose**: Define all MCP (Model Context Protocol) servers that provide
> tools for Claude Code agents to interact with the knowledge graph, RAG
> system, generative UI pipeline, plan generation engine, file system, git
> operations, and user context. Includes server architecture, tool schemas,
> transport configuration, authentication, error handling, and testing.
>
> **Phase**: 3–4 (Agent Integration, Advanced Features)
> **Dependencies**: `06-AGENT-SYSTEM/01-ARCHITECTURE-PLAN.md`, `04-KNOWLEDGE-GRAPH/02-OPERATIONS-PLAN.md`, `05-RAG-LAYER/PLAN.md`
> **Estimated tasks**: 205+
>
> **SANDBOXING NOTE**: These MCP servers are **APPLICATION-RUNTIME** tools
> that the running application exposes to Claude Code agents serving end users.
> This is SEPARATE from DEVELOPMENT-TIME AI configuration
> (`13-AI-DEV-CONFIGURATION/PLAN.md`).

---

## Table of Contents

1. [MCP Server Architecture](#1-mcp-server-architecture)
2. [Knowledge Graph MCP Server](#2-knowledge-graph-mcp-server)
3. [RAG MCP Server](#3-rag-mcp-server)
4. [Generative UI MCP Server](#4-generative-ui-mcp-server)
5. [Plan Generation MCP Server](#5-plan-generation-mcp-server)
6. [File System MCP Server](#6-file-system-mcp-server)
7. [Git MCP Server](#7-git-mcp-server)
8. [User Context MCP Server](#8-user-context-mcp-server)
9. [MCP Server Registration & Discovery](#9-mcp-server-registration--discovery)
10. [Transport Layer](#10-transport-layer)
11. [Authentication & Authorization](#11-authentication--authorization)
12. [Error Handling](#12-error-handling)
13. [Testing & Validation](#13-testing--validation)

---

## 1. MCP Server Architecture

### 1.1 Module Structure

- [ ] **AG-MCP-001**: Create `packages/mcp-servers/` directory structure
  ```
  packages/mcp-servers/
  ├── shared/
  │   ├── mcp-server-base.ts          # Base class for all MCP servers
  │   ├── mcp-tool-schema.ts          # Tool schema builder utilities
  │   ├── mcp-error.ts                # MCP error types and formatting
  │   ├── mcp-auth.ts                 # Authentication middleware
  │   └── mcp-logger.ts               # Structured logging for MCP
  ├── knowledge-graph/
  │   ├── index.ts                    # Server entry point
  │   ├── tools/                      # Tool implementations
  │   │   ├── spec-tools.ts
  │   │   ├── edge-tools.ts
  │   │   ├── document-tools.ts
  │   │   ├── traversal-tools.ts
  │   │   └── inquiry-tools.ts
  │   └── schemas/                    # JSON Schema for each tool
  │       └── *.schema.json
  ├── rag/
  │   ├── index.ts
  │   └── tools/
  │       ├── search-tools.ts
  │       └── embedding-tools.ts
  ├── generative-ui/
  │   ├── index.ts
  │   └── tools/
  │       ├── project-tools.ts
  │       └── template-tools.ts
  ├── plan-generation/
  │   ├── index.ts
  │   └── tools/
  │       ├── plan-tools.ts
  │       └── delta-tools.ts
  ├── file-system/
  │   ├── index.ts
  │   └── tools/
  │       └── file-tools.ts
  ├── git/
  │   ├── index.ts
  │   └── tools/
  │       ├── commit-tools.ts
  │       └── branch-tools.ts
  └── user-context/
      ├── index.ts
      └── tools/
          └── user-tools.ts
  ```
- [ ] **AG-MCP-002**: Create `McpServerBase` abstract class
  ```typescript
  abstract class McpServerBase {
    abstract name: string;
    abstract version: string;
    abstract tools: McpToolDefinition[];
    initialize(config: McpServerConfig): Promise<void>;
    handleToolCall(
      name: string,
      args: Record<string, unknown>,
    ): Promise<McpToolResult>;
    getToolSchemas(): McpToolSchema[];
    shutdown(): Promise<void>;
  }
  ```
- [ ] **AG-MCP-003**: Define `McpToolDefinition` interface
  ```typescript
  interface McpToolDefinition {
    name: string;
    description: string;
    inputSchema: JSONSchema;
    handler: (
      args: Record<string, unknown>,
      context: ToolContext,
    ) => Promise<McpToolResult>;
  }
  ```
- [ ] **AG-MCP-004**: Define `McpToolResult` interface
  ```typescript
  interface McpToolResult {
    content: Array<
      { type: 'text'; text: string } | { type: 'json'; data: unknown }
    >;
    isError?: boolean;
  }
  ```
- [ ] **AG-MCP-005**: Define `ToolContext` interface for dependency injection
  ```typescript
  interface ToolContext {
    sessionId: string;
    userId: string;
    projectId: string;
    agentType: AgentType;
    sandboxRoot: string;
    logger: Logger;
  }
  ```

### 1.2 Build & Package Configuration

- [ ] **AG-MCP-006**: Configure each MCP server as a standalone executable
  - Each server is a separate Bun/Node.js entry point
  - Can be run independently for testing
  - Packaged together in the monorepo
- [ ] **AG-MCP-007**: Create shared MCP dependencies package
  - `@knowledge-system/mcp-shared` for base classes, utilities, types
  - All MCP servers depend on this shared package
  - Publish as internal workspace package

#### Design Decisions

> **Q**: Should each MCP server be a separate process or should multiple servers share a single process?
> **A**: Each MCP server is a separate process communicating via stdio transport. Lightweight processes (~50MB each) provide isolation—a crash in one doesn't affect others. Claude Code manages spawning and lifecycle natively.

> **Q**: Should MCP servers be stateless or maintain state across sessions?
> **A**: Stateless per invocation. State is persisted in databases/filesystems and read on demand per tool call. Caching is handled at the storage layer, not in the MCP server process.

> **Q**: Should the KG MCP server access the filesystem directly or go through the storage layer API?
> **A**: Through the storage layer API via internal function calls (not HTTP). This provides validation, permission checking, and audit logging while avoiding HTTP overhead and abstracting the underlying storage.

> **Q**: Should MCP servers share a database connection pool or maintain separate connections?
> **A**: Separate connections per server since they're separate processes. Up to 70 connections at peak (7 servers × 10 sessions) is within PostgreSQL limits, with PgBouncer at the database level for connection management.

> **Q**: Should MCP servers be standalone npm packages or monorepo-only?
> **A**: Monorepo only at launch under `packages/mcp-servers/`, sharing common utilities via internal packages. Standalone npm publishing deferred until third-party tool development becomes a goal.

> **Q**: Should a composite MCP server combine all tools into one for simpler configuration?
> **A**: No. Each agent type gets a tailored `.mcp.json` with only relevant servers, enforcing least privilege. A composite server would expose all tools to all agents, undermining role-based tool access.

> **Q**: What runtime should MCP servers use—Bun or Node.js?
> **A**: Bun, matching the rest of the project. The `.mcp.json` specifies the spawn command explicitly. Bun's faster startup, native TypeScript, and codebase consistency justify this choice.

> **Q**: Should tools be fine-grained (one per operation) or coarse-grained (one per domain with action parameter)?
> **A**: Fine-grained—one tool per operation. LLMs perform better with explicit, well-named tools than multi-purpose tools requiring action parameters. Fine-grained tools also yield better descriptions and simpler schemas.

> **Q**: Should compound tools exist for multi-step atomic operations?
> **A**: Yes, for a small set (3-4 max) of high-frequency operations like `create_spec_with_edges` and `move_spec`. These save tool calls and prevent partial state in common workflows.

> **Q**: How many tools can Claude Code effectively handle per agent invocation?
> **A**: Target 15-25 tools per agent type via tailored `.mcp.json` files. Claude handles 20-25 tools well with good descriptions. If any agent type exceeds 30, review for consolidation.

> **Q**: Should tools support batch operations for bulk creation?
> **A**: No batch tools at launch. Individual calls are sufficient within the 50-call cap. Batch tools can be added later with clear partial-success semantics if profiling reveals bottlenecks.

> **Q**: What naming convention should tool names follow?
> **A**: Snake_case per MCP standard convention. Tool names appear in JSON schemas and payloads, not as TypeScript symbols. Internal implementation uses camelCase as normal.

> **Q**: Should tool names include a server prefix (e.g., `kg_create_spec`)?
> **A**: No prefix. Tool names are scoped by MCP server, and each server has a distinct domain avoiding conflicts by design. Shorter names are easier for agents and less token-heavy.

> **Q**: Should tool descriptions be written for AI agents or humans?
> **A**: For the AI agent: technical, precise, with one-sentence purpose, parameter types/constraints, return value, and one example usage. This gives the agent everything needed for tool selection and invocation.

> **Q**: Should optional tool parameters have sensible defaults or require explicit specification?
> **A**: Sensible defaults defined in the schema to reduce agent cognitive load and token usage. Defaults are documented in tool descriptions so the agent knows what it gets by omission.

---

## 2. Knowledge Graph MCP Server

### 2.1 Spec Tools

- [ ] **AG-MCP-008**: Implement `create_spec` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "title": { "type": "string", "minLength": 1, "maxLength": 500 },
        "content": { "type": "string" },
        "tags": { "type": "array", "items": { "type": "string" } },
        "status": { "enum": ["draft", "active"] },
        "summary": { "type": "string", "maxLength": 1000 },
        "documentId": {
          "type": "string",
          "description": "Optional document to add the spec to"
        }
      },
      "required": ["title", "content"]
    }
    ```
  - Create spec directory with `spec.json`, `content.md`, `metadata.json`
  - Generate spec ID using ID utility
  - Set author to current user ID from context
  - Update spec index
  - Trigger embedding generation (async)
  - Return created spec with ID
- [ ] **AG-MCP-009**: Implement `update_spec` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "specId": { "type": "string", "pattern": "^sp_" },
        "title": { "type": "string" },
        "content": { "type": "string" },
        "tags": { "type": "array", "items": { "type": "string" } },
        "status": { "enum": ["draft", "active", "deprecated", "archived"] },
        "summary": { "type": "string" }
      },
      "required": ["specId"]
    }
    ```
  - Validate spec exists
  - Apply partial update (only provided fields)
  - Update `updatedAt` timestamp
  - Add agent to contributors list
  - Trigger embedding regeneration if content changed
  - Update spec index
  - Return updated spec
- [ ] **AG-MCP-010**: Implement `delete_spec` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "specId": { "type": "string", "pattern": "^sp_" },
        "cascadeEdges": { "type": "boolean", "default": true }
      },
      "required": ["specId"]
    }
    ```
  - Validate spec exists
  - If `cascadeEdges`: delete all edges referencing this spec
  - Remove spec from all documents
  - Delete spec directory
  - Update all affected indexes
  - Return deletion confirmation with cascade summary
- [ ] **AG-MCP-011**: Implement `get_spec` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "specId": { "type": "string", "pattern": "^sp_" },
        "includeContent": { "type": "boolean", "default": true },
        "includeMetadata": { "type": "boolean", "default": true },
        "includeEdges": { "type": "boolean", "default": false }
      },
      "required": ["specId"]
    }
    ```
  - Retrieve spec data based on include flags
  - If `includeEdges`: retrieve all edges where this spec is source or target
  - Respect permission level (full vs. summary access)
  - Return spec data (structured JSON)
- [ ] **AG-MCP-012**: Implement `search_specs` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "query": { "type": "string" },
        "tags": { "type": "array", "items": { "type": "string" } },
        "status": { "type": "array", "items": { "type": "string" } },
        "author": { "type": "string" },
        "limit": { "type": "integer", "default": 20, "maximum": 100 },
        "offset": { "type": "integer", "default": 0 }
      }
    }
    ```
  - Search by title substring, tags, status, or author
  - Combine with RAG semantic search if `query` is provided
  - Return paginated results with spec summaries
- [ ] **AG-MCP-013**: Implement `list_specs` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "status": { "type": "string" },
        "sortBy": {
          "enum": ["title", "updatedAt", "createdAt"],
          "default": "updatedAt"
        },
        "sortOrder": { "enum": ["asc", "desc"], "default": "desc" },
        "limit": { "type": "integer", "default": 50 },
        "offset": { "type": "integer", "default": 0 }
      }
    }
    ```
  - List specs from index (fast, no file I/O per spec)
  - Support filtering and sorting
  - Return paginated list with spec summaries

### 2.2 Edge Tools

- [ ] **AG-MCP-014**: Implement `create_edge` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "type": {
          "enum": [
            "derived-from",
            "depends-on",
            "related-to",
            "contradicts",
            "supersedes"
          ]
        },
        "sourceSpecId": { "type": "string", "pattern": "^sp_" },
        "targetSpecId": { "type": "string", "pattern": "^sp_" },
        "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
        "rationale": { "type": "string", "maxLength": 2000 },
        "strength": { "enum": ["strong", "moderate", "weak"] },
        "context": { "type": "string", "maxLength": 1000 }
      },
      "required": [
        "type",
        "sourceSpecId",
        "targetSpecId",
        "confidence",
        "rationale",
        "strength"
      ]
    }
    ```
  - Validate source and target specs exist
  - Validate no self-edge
  - Validate no duplicate edge
  - Generate edge ID
  - Write edge file
  - Update edge index
  - Return created edge
- [ ] **AG-MCP-015**: Implement `delete_edge` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "edgeId": { "type": "string", "pattern": "^eg_" }
      },
      "required": ["edgeId"]
    }
    ```
  - Validate edge exists
  - Delete edge file
  - Update edge index
  - Return deletion confirmation
- [ ] **AG-MCP-016**: Implement `get_edges` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "specId": { "type": "string", "pattern": "^sp_" },
        "direction": {
          "enum": ["outgoing", "incoming", "both"],
          "default": "both"
        },
        "edgeType": { "type": "string" },
        "minConfidence": { "type": "number", "minimum": 0, "maximum": 1 },
        "minStrength": { "enum": ["strong", "moderate", "weak"] }
      },
      "required": ["specId"]
    }
    ```
  - Retrieve edges for a spec from edge index
  - Filter by direction, type, confidence, and strength
  - Include full edge metadata
  - Return edge list with connected spec summaries
- [ ] **AG-MCP-017**: Implement `update_edge` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "edgeId": { "type": "string", "pattern": "^eg_" },
        "confidence": { "type": "number" },
        "rationale": { "type": "string" },
        "strength": { "type": "string" },
        "context": { "type": "string" }
      },
      "required": ["edgeId"]
    }
    ```
  - Validate edge exists
  - Apply partial update
  - Update edge index if strength/confidence changed
  - Return updated edge

### 2.3 Document Tools

- [ ] **AG-MCP-018**: Implement `get_spec_document` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "documentId": { "type": "string", "pattern": "^dc_" },
        "includeSpecContent": { "type": "boolean", "default": false }
      },
      "required": ["documentId"]
    }
    ```
  - Retrieve document metadata and ordered spec list
  - If `includeSpecContent`: include content for each spec (expensive)
  - Respect per-spec permissions
  - Return document with spec summaries or full content
- [ ] **AG-MCP-019**: Implement `update_spec_document` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "documentId": { "type": "string", "pattern": "^dc_" },
        "title": { "type": "string" },
        "description": { "type": "string" },
        "specIds": { "type": "array", "items": { "type": "string" } },
        "status": { "enum": ["draft", "published", "archived"] }
      },
      "required": ["documentId"]
    }
    ```
  - Validate document exists
  - Validate all spec IDs in the new list exist
  - Update document metadata
  - Reconcile bidirectional spec-document references
  - Update document index
  - Return updated document
- [ ] **AG-MCP-020**: Implement `create_spec_document` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "title": { "type": "string", "minLength": 1, "maxLength": 500 },
        "description": { "type": "string", "maxLength": 2000 },
        "specIds": { "type": "array", "items": { "type": "string" } },
        "tags": { "type": "array", "items": { "type": "string" } }
      },
      "required": ["title"]
    }
    ```
  - Generate document ID
  - Create document directory and file
  - Link referenced specs bidirectionally
  - Update document index
  - Return created document

### 2.4 Graph Traversal Tools

- [ ] **AG-MCP-021**: Implement `traverse_graph` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "startSpecId": { "type": "string", "pattern": "^sp_" },
        "maxDepth": {
          "type": "integer",
          "minimum": 1,
          "maximum": 10,
          "default": 3
        },
        "edgeTypes": { "type": "array", "items": { "type": "string" } },
        "direction": {
          "enum": ["outgoing", "incoming", "both"],
          "default": "both"
        },
        "minConfidence": { "type": "number", "default": 0.3 },
        "minStrength": {
          "enum": ["strong", "moderate", "weak"],
          "default": "weak"
        },
        "maxNodes": { "type": "integer", "default": 50, "maximum": 200 },
        "includeContent": { "type": "boolean", "default": false }
      },
      "required": ["startSpecId"]
    }
    ```
  - Perform BFS/DFS traversal from start spec
  - Apply filters at each hop (edge type, confidence, strength)
  - Stop at `maxDepth` or `maxNodes`
  - Return subgraph: nodes (spec summaries) + edges
- [ ] **AG-MCP-022**: Implement `get_subgraph` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "specIds": {
          "type": "array",
          "items": { "type": "string" },
          "minItems": 1
        },
        "includeEdges": { "type": "boolean", "default": true },
        "expandHops": { "type": "integer", "default": 1, "maximum": 3 }
      },
      "required": ["specIds"]
    }
    ```
  - Retrieve the specified specs
  - Find all edges between specified specs
  - Optionally expand by N hops to include nearby specs
  - Return subgraph (nodes + edges)
- [ ] **AG-MCP-023**: Implement `find_path` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "sourceSpecId": { "type": "string", "pattern": "^sp_" },
        "targetSpecId": { "type": "string", "pattern": "^sp_" },
        "maxDepth": { "type": "integer", "default": 5, "maximum": 10 },
        "edgeTypes": { "type": "array", "items": { "type": "string" } }
      },
      "required": ["sourceSpecId", "targetSpecId"]
    }
    ```
  - Find shortest path between two specs using BFS
  - Optionally filter by edge types
  - Return ordered list of specs and edges in the path
  - Return null if no path exists within `maxDepth`
- [ ] **AG-MCP-024**: Implement `get_graph_stats` tool
  - **Input Schema**: (no required inputs)
    ```json
    {
      "type": "object",
      "properties": {
        "includeDetails": { "type": "boolean", "default": false }
      }
    }
    ```
  - Return: total spec count, total edge count, total document count
  - Edge type distribution
  - Orphan spec count (no edges)
  - Average edges per spec
  - If `includeDetails`: top connected specs, recent changes

### 2.5 Inquiry Tools

- [ ] **AG-MCP-025**: Implement `create_inquiry` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "type": {
          "enum": [
            "orphan-spec",
            "broken-edge",
            "contradiction",
            "missing-metadata",
            "stale-content",
            "suggested-edge",
            "quality-issue"
          ]
        },
        "targetId": { "type": "string" },
        "targetType": { "enum": ["spec", "edge", "document"] },
        "title": { "type": "string", "maxLength": 200 },
        "description": { "type": "string", "maxLength": 5000 },
        "severity": { "enum": ["critical", "warning", "info"] }
      },
      "required": [
        "type",
        "targetId",
        "targetType",
        "title",
        "description",
        "severity"
      ]
    }
    ```
  - Generate inquiry ID
  - Write inquiry file
  - Return created inquiry
- [ ] **AG-MCP-026**: Implement `get_inquiry_queue` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "status": { "enum": ["open", "acknowledged", "resolved", "dismissed"] },
        "severity": { "enum": ["critical", "warning", "info"] },
        "type": { "type": "string" },
        "limit": { "type": "integer", "default": 20 },
        "offset": { "type": "integer", "default": 0 }
      }
    }
    ```
  - List inquiries with filtering
  - Sort by severity (critical first), then by creation date
  - Return paginated inquiry list
- [ ] **AG-MCP-027**: Implement `resolve_inquiry` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "inquiryId": { "type": "string", "pattern": "^iq_" },
        "resolution": { "type": "string", "maxLength": 2000 },
        "status": { "enum": ["resolved", "dismissed"] }
      },
      "required": ["inquiryId", "resolution", "status"]
    }
    ```
  - Update inquiry status and resolution
  - Set `resolvedAt` and `resolvedBy`
  - Return updated inquiry

#### Design Decisions

> **Q**: Should tools accept natural language parameters, structured parameters, or both?
> **A**: Both, via separate parameters. Search tools accept a free-text `query` for semantic search and structured filters (`tags`, `created_after`, `author`). The MCP server combines them—structured filters narrow the set, then RAG ranks within it.

> **Q**: How should tool parameters handle spec references—by ID, title, or both?
> **A**: By ID (`sp_xxx`) for all mutation and retrieval tools. For search tools, the query can include titles or natural language. The workflow is: search by title/description → get spec IDs → use IDs for all subsequent operations.

> **Q**: Should `create_spec` auto-generate a summary or require the agent to provide one?
> **A**: The agent provides the summary as a required field. Auto-generation would add latency and cost via a separate LLM call, and the agent—having just reasoned about the content—is best positioned to write a concise summary.

> **Q**: Should `delete_spec` require explicit cascade confirmation or always cascade edges?
> **A**: Always cascade edges, returning deletion details in the response. The confirm-before-mutation layer already requires user confirmation before execution, making a separate cascade confirmation redundant.

> **Q**: Should `update_spec` support content diffing or require full content replacement?
> **A**: Full content replacement with a `version` parameter for optimistic locking. This avoids diff/merge complexity, prevents conflicts from partial updates, and keeps specs in a consistently valid state.

> **Q**: Should a `bulk_create_specs` tool exist for batch spec creation?
> **A**: Not at launch. Creating up to ~15 specs with edges in a single turn is feasible within the 50-call cap. A bulk tool can be added later with per-item success/failure reporting if document decomposition workflows demand it.

> **Q**: What should the maximum traversal depth be, and should there be a result size cap?
> **A**: Maximum depth of 5 (reduced from 10) with a hard cap of 100 result nodes. Defaults of depth 3 / max 50 handle 90% of cases. If the cap is reached, the result includes `truncated: true` for the agent to refine.

> **Q**: Should traversal support weighted edges for path finding?
> **A**: Not at launch. All edges are unweighted. Edge weights would require defining a weight schema, assigning weights, modifying traversal algorithms, and maintaining weights over time—significant complexity for marginal benefit.

> **Q**: Should `traverse_graph` return a flat list or a tree structure?
> **A**: Flat list with depth annotations. Each node includes its `depth` from the start spec and the `path` (edge IDs from root). This combines the simplicity of a flat list with the structural information of a tree.

> **Q**: Should traversal results be cached per session?
> **A**: Yes, within a single Claude Code invocation (one user message). Identical traversals return cached results within the same turn. The cache is invalidated between messages since mutations may have changed the graph.

> **Q**: Can agents resolve their own inquiries, or should only humans resolve them?
> **A**: Agents can resolve inquiries they created, with a `resolution_note` explaining what was done. Human-created inquiries can only be resolved by humans, preserving human oversight for user-raised issues.

> **Q**: Should the inquiry system support auto-resolve when the underlying issue is fixed?
> **A**: Yes. The Graph Crawler runs periodic validation checks and auto-resolves inquiries when the flagged condition no longer exists. Auto-resolved inquiries are marked distinctly so users can distinguish them from human resolutions.

> **Q**: How should duplicate inquiries be handled?
> **A**: Deduplicate on creation. Before creating an inquiry, the tool checks for existing open inquiries with the same `spec_id` and `inquiry_type`. Duplicates update the existing inquiry's `last_seen` timestamp instead of creating a new entry.

---

## 3. RAG MCP Server

### 3.1 Search Tools

- [ ] **AG-MCP-028**: Implement `search_similar` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "query": { "type": "string", "minLength": 1 },
        "topK": { "type": "integer", "default": 10, "maximum": 50 },
        "minScore": { "type": "number", "default": 0.5 },
        "filterTags": { "type": "array", "items": { "type": "string" } },
        "filterStatus": { "type": "array", "items": { "type": "string" } },
        "excludeSpecIds": { "type": "array", "items": { "type": "string" } }
      },
      "required": ["query"]
    }
    ```
  - Generate embedding for query text
  - Search vector store for similar spec chunks
  - Apply metadata filters (tags, status)
  - Exclude specified spec IDs
  - Return ranked results with spec ID, chunk text, similarity score
- [ ] **AG-MCP-029**: Implement `search_by_spec` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "specId": { "type": "string", "pattern": "^sp_" },
        "topK": { "type": "integer", "default": 10 },
        "excludeSelf": { "type": "boolean", "default": true }
      },
      "required": ["specId"]
    }
    ```
  - Use the spec's existing embedding to find similar specs
  - Useful for "find specs related to this one" without a text query
  - Return ranked list of similar specs
- [ ] **AG-MCP-030**: Implement `search_multi_query` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "queries": {
          "type": "array",
          "items": { "type": "string" },
          "minItems": 1,
          "maxItems": 5
        },
        "topK": { "type": "integer", "default": 10 },
        "fusionMethod": { "enum": ["rrf", "average"], "default": "rrf" }
      },
      "required": ["queries"]
    }
    ```
  - Execute multiple RAG queries in parallel
  - Fuse results using Reciprocal Rank Fusion or average scoring
  - Deduplicate results across queries
  - Return unified ranked result list

### 3.2 Embedding Tools

- [ ] **AG-MCP-031**: Implement `index_spec` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "specId": { "type": "string", "pattern": "^sp_" },
        "forceReindex": { "type": "boolean", "default": false }
      },
      "required": ["specId"]
    }
    ```
  - Read spec content and metadata
  - Chunk content using configured strategy
  - Generate embeddings for each chunk
  - Store embeddings in vector store
  - Update spec metadata with embedding info and content hash
  - Skip if content hash unchanged (unless `forceReindex`)
- [ ] **AG-MCP-032**: Implement `batch_index_specs` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "specIds": { "type": "array", "items": { "type": "string" } },
        "forceReindex": { "type": "boolean", "default": false }
      }
    }
    ```
  - Index multiple specs in batch
  - Parallelize embedding generation
  - Report per-spec success/failure
  - Return summary with count indexed, skipped, failed
- [ ] **AG-MCP-033**: Implement `get_embedding_status` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "specId": { "type": "string", "pattern": "^sp_" }
      }
    }
    ```
  - Check if spec has a current embedding
  - Compare content hash to detect staleness
  - Return: indexed (yes/no), stale (yes/no), chunk count, model used

#### Design Decisions

> **Q**: Should the RAG server use pre-computed embeddings or generate them on-demand per query?
> **A**: Pre-computed as the primary path, with on-demand fallback. Embeddings are generated async when specs are created/updated. For brand-new unindexed specs (rare race condition), the server falls back to keyword matching.

> **Q**: Should the RAG server support hybrid search (semantic + keyword), and does it overlap with KG search?
> **A**: Yes, hybrid search (70% semantic + 30% BM25 keyword). KG's `search_specs` handles structured filtering (tags, dates, author), while RAG handles natural language semantic queries. The agent chooses the appropriate tool based on query type.

> **Q**: Which embedding model should be used?
> **A**: OpenAI's `text-embedding-3-small` (1536 dimensions) for its quality-to-cost ratio and low latency (~100ms). Migrate to Anthropic's embeddings if/when generally available. A local model would eliminate external dependency but adds infrastructure complexity.

> **Q**: Should RAG results include chunk text or only spec IDs and scores?
> **A**: Include chunk text truncated to 500 tokens per chunk, plus spec ID and relevance score. Five results × 500 tokens = 2,500 tokens of context—enough for relevance assessment without requiring a separate `get_spec` call per result.

> **Q**: Should the RAG server support cross-project search?
> **A**: No. RAG search is scoped to the current project. Cross-project search introduces permission and index management complexity that isn't needed for the knowledge management use case. It can be explored later as a premium feature.

---

## 4. Generative UI MCP Server

### 4.1 Project Management Tools

- [ ] **AG-MCP-034**: Implement `create_ui_project` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "projectName": { "type": "string", "pattern": "^[a-z0-9-]+$" },
        "description": { "type": "string" },
        "template": {
          "enum": ["blank", "dashboard", "form", "visualization", "data-table"]
        },
        "framework": { "enum": ["react"], "default": "react" }
      },
      "required": ["projectName"]
    }
    ```
  - Create project directory at `client/gen/{userId}/{projectName}/`
  - Scaffold project structure based on template
  - Create `package.json` with allowed dependencies
  - Create entry point (`index.tsx`)
  - Create `vite.config.ts` for ESM build
  - Return project path and URL
- [ ] **AG-MCP-035**: Implement `build_ui_project` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "projectPath": { "type": "string" }
      },
      "required": ["projectPath"]
    }
    ```
  - Run `bun install` in project directory
  - Run `bun run build` (or Vite build)
  - Capture build output (stdout, stderr)
  - Report build status: success, warnings, errors
  - If errors: return formatted error messages for agent to fix
- [ ] **AG-MCP-036**: Implement `list_ui_projects` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "userId": { "type": "string" }
      }
    }
    ```
  - List all generative UI projects for the user (or all users if admin)
  - Include project name, creation date, last build status, size
  - Return paginated list
- [ ] **AG-MCP-037**: Implement `find_existing_ui` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "query": { "type": "string" },
        "userId": { "type": "string" }
      },
      "required": ["query"]
    }
    ```
  - Search existing projects by name and description
  - Return matching projects that could be reused or extended
  - Helps avoid creating duplicate projects
- [ ] **AG-MCP-038**: Implement `delete_ui_project` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "projectPath": { "type": "string" }
      },
      "required": ["projectPath"]
    }
    ```
  - Validate project path is within gen-UI directory
  - Delete project directory
  - Return deletion confirmation

### 4.2 Template Tools

- [ ] **AG-MCP-039**: Implement `get_ui_template` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "template": {
          "enum": ["blank", "dashboard", "form", "visualization", "data-table"]
        }
      },
      "required": ["template"]
    }
    ```
  - Return template file contents (scaffolding code)
  - Include template README with customization instructions
  - Include example component code for reference
- [ ] **AG-MCP-040**: Implement `validate_ui_project` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "projectPath": { "type": "string" }
      },
      "required": ["projectPath"]
    }
    ```
  - Validate project structure (required files present)
  - Validate `package.json` (no forbidden dependencies)
  - Validate file sizes within limits
  - Run TypeScript type checking
  - Return validation result with any issues
- [ ] **AG-MCP-041**: Implement `get_ui_dependencies` tool
  - **Input Schema**: (no inputs)
  - Return list of pre-approved npm packages for gen-UI projects
  - Include package name, version, and brief description
  - Agents use this to know which packages they can include

#### Design Decisions

> **Q**: Should generated UI projects have a maximum complexity limit?
> **A**: Yes. Max 20 files, max 500 lines per file, max 5,000 total lines. Enforced at the MCP tool level—`create_ui_file` rejects oversized files, `finalize_ui` rejects oversized projects. These limits are generous for the intended use cases (dashboards, diagrams, visualizations).

> **Q**: Should the gen-UI server support hot reload for iterative development?
> **A**: No. Generated UIs are built once (ESM bundle) and served statically. The agent workflow is: generate files → build → preview URL. Iteration happens at the conversation level, not via dev server. Build is fast (<5 seconds with Bun).

> **Q**: Should generated code be validated for security issues (XSS, data exfiltration)?
> **A**: Yes, lightweight static analysis at finalization: no `fetch()`/`XMLHttpRequest` to non-whitelisted domains, no `eval()`/`Function()`, no `document.cookie`/`localStorage` access. The iframe sandbox attribute provides the runtime safety net.

> **Q**: Should there be a gallery of pre-built UI components for composition rather than generating from scratch?
> **A**: Yes. A library of 15-20 pre-built components (charts, data tables, tree visualizations, relationship diagrams) importable via `@botnet/ui-components`. Agents customize props and compose from tested building blocks, dramatically improving quality and reducing generation time.

> **Q**: Should generated UIs access a real-time data API or use static data snapshots?
> **A**: Static snapshots at launch. Relevant spec data is embedded as `data.json` within the generated project. This keeps UIs self-contained and avoids API endpoint generation (which requires auth, CORS, lifecycle management). Real-time APIs are a future enhancement.

---

## 5. Plan Generation MCP Server

### 5.1 Plan Tools

- [ ] **AG-MCP-042**: Implement `generate_plan` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "rootSpecId": { "type": "string", "pattern": "^sp_" },
        "mode": { "enum": ["full", "delta"], "default": "full" },
        "targetDirectory": { "type": "string" },
        "maxDepth": { "type": "integer", "default": 5 },
        "includeRagContext": { "type": "boolean", "default": true }
      },
      "required": ["rootSpecId", "targetDirectory"]
    }
    ```
  - Traverse graph from root spec
  - Retrieve RAG context for supplementary info
  - Generate plan directory structure
  - Write plan files (master prompt + directory plans)
  - Return plan summary with file list
- [ ] **AG-MCP-043**: Implement `get_plan` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "planId": { "type": "string" },
        "includeContent": { "type": "boolean", "default": false }
      },
      "required": ["planId"]
    }
    ```
  - Retrieve plan metadata and file listing
  - If `includeContent`: include all plan file contents
  - Return plan details
- [ ] **AG-MCP-044**: Implement `list_plans` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "projectId": { "type": "string" },
        "status": {
          "enum": ["draft", "approved", "executing", "completed", "failed"]
        },
        "limit": { "type": "integer", "default": 20 }
      }
    }
    ```
  - List plans with filtering by status
  - Include plan metadata: root spec, mode, creation date, status
  - Return paginated list
- [ ] **AG-MCP-045**: Implement `approve_plan` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "planId": { "type": "string" },
        "approvedBy": { "type": "string" },
        "notes": { "type": "string" }
      },
      "required": ["planId"]
    }
    ```
  - Validate plan exists and is in "draft" status
  - Set status to "approved"
  - Record approval metadata
  - Return updated plan status

### 5.2 Delta Detection Tools

- [ ] **AG-MCP-046**: Implement `get_delta_specs` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "since": { "type": "string", "format": "date-time" },
        "sinceCommit": { "type": "string" },
        "rootSpecId": { "type": "string" }
      }
    }
    ```
  - Find specs modified since the given timestamp or commit
  - Optionally scope to subgraph of a root spec
  - Return list of changed specs with change type (created, updated, deleted)
- [ ] **AG-MCP-047**: Implement `mark_specs_ready` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "specIds": { "type": "array", "items": { "type": "string" } },
        "planId": { "type": "string" }
      },
      "required": ["specIds", "planId"]
    }
    ```
  - Mark specs as "included in plan" (for delta tracking)
  - Record the plan ID and timestamp
  - Next delta query will exclude these specs (unless modified again)
- [ ] **AG-MCP-048**: Implement `get_plan_execution_status` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "planId": { "type": "string" }
      },
      "required": ["planId"]
    }
    ```
  - Return execution status for each plan step
  - Include: step name, status (pending/executing/completed/failed), duration
  - Include any error details for failed steps

#### Design Decisions

> **Q**: Should plan generation be a single tool call or a series of calls?
> **A**: A series: (1) `analyze_plan_scope` returns proposed structure, (2) `generate_plan_file` called per file, (3) `finalize_plan` validates consistency. This stays within token limits, enables streaming progress, and lets the agent adjust later files based on earlier ones.

> **Q**: How should plan versioning work—overwrite or create new versions?
> **A**: Each generation creates a new version at `plans/{plan-id}/v{N}/`. Previous versions are retained (last 10) for comparison and rollback. This supports the review workflow where the user rejects v1 and the agent generates v2 with feedback.

> **Q**: Should plan generation support pre-defined templates for common project types?
> **A**: Yes, 3-5 templates at launch (API service, frontend feature, full-stack feature, database migration, refactor). Templates provide directory structure and file skeletons stored as JSON schemas; the agent fills in the content.

> **Q**: How should plans reference source specs—by ID, embedded content, or path?
> **A**: By ID with inline summary in frontmatter: `source_specs: [{id: "sp_xxx", title: "...", summary: "..."}]`. IDs provide stable references for programmatic use; inline summaries provide human-readable context. Full spec content is not embedded to avoid bloat and staleness.

---

## 6. File System MCP Server

### 6.1 File Operations

- [ ] **AG-MCP-049**: Implement `read_file` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "path": { "type": "string" },
        "encoding": { "enum": ["utf-8", "base64"], "default": "utf-8" },
        "offset": {
          "type": "integer",
          "description": "Line offset for partial reads"
        },
        "limit": { "type": "integer", "description": "Number of lines to read" }
      },
      "required": ["path"]
    }
    ```
  - Validate path is within sandbox root
  - Read file with optional line range
  - Return file content and metadata (size, modified date)
- [ ] **AG-MCP-050**: Implement `write_file` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "path": { "type": "string" },
        "content": { "type": "string" },
        "encoding": { "enum": ["utf-8", "base64"], "default": "utf-8" },
        "createDirectories": { "type": "boolean", "default": true },
        "overwrite": { "type": "boolean", "default": true }
      },
      "required": ["path", "content"]
    }
    ```
  - Validate path is within sandbox root
  - Validate file size limits
  - Validate file extension whitelist
  - Create parent directories if needed
  - Write file atomically (temp file → rename)
  - Return written file metadata
- [ ] **AG-MCP-051**: Implement `list_files` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "path": { "type": "string", "default": "." },
        "recursive": { "type": "boolean", "default": false },
        "pattern": { "type": "string", "description": "Glob pattern filter" }
      }
    }
    ```
  - List files in the specified directory within sandbox
  - Support recursive listing
  - Support glob pattern filtering
  - Return file list with name, size, type, modified date
- [ ] **AG-MCP-052**: Implement `create_directory` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "path": { "type": "string" },
        "recursive": { "type": "boolean", "default": true }
      },
      "required": ["path"]
    }
    ```
  - Validate path is within sandbox root
  - Create directory (recursive if needed)
  - Return created directory path
- [ ] **AG-MCP-053**: Implement `delete_file` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "path": { "type": "string" },
        "recursive": { "type": "boolean", "default": false }
      },
      "required": ["path"]
    }
    ```
  - Validate path is within sandbox root
  - Delete file or directory
  - If directory with `recursive: false`: fail if not empty
  - Return deletion confirmation
- [ ] **AG-MCP-054**: Implement `file_exists` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "path": { "type": "string" }
      },
      "required": ["path"]
    }
    ```
  - Check if file or directory exists in sandbox
  - Return: exists (boolean), type (file/directory), size
- [ ] **AG-MCP-055**: Implement `replace_in_file` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "path": { "type": "string" },
        "search": { "type": "string" },
        "replace": { "type": "string" },
        "all": { "type": "boolean", "default": false }
      },
      "required": ["path", "search", "replace"]
    }
    ```
  - Find and replace text within a file
  - Support single replacement or replace-all
  - Return: number of replacements made

#### Design Decisions

> **Q**: Should the file system MCP server support binary files or only text files?
> **A**: Text files only at launch (TypeScript, JavaScript, JSON, CSS, HTML, Markdown, SVG). Generated UI projects use CDN-hosted images and inline SVG. Binary support deferred to avoid base64 encoding overhead in MCP tool call payloads.

> **Q**: Should file writes be atomic (temp file → rename) or direct?
> **A**: Atomic writes. Write to a temp file in the same directory, then rename. This prevents corruption if the process is killed mid-write and is standard best practice, especially for generated code files served to users.

> **Q**: Should the file system server support file watching for reactive behaviors?
> **A**: No. The MCP protocol is request-response with no mechanism for push notifications. If reactive watching is needed, it belongs at the server application layer, not in the MCP server.

> **Q**: Should there be a `search_in_files` tool (grep-like functionality)?
> **A**: Yes. Accepts a regex pattern and optional file glob, returning matching lines with file paths and line numbers (capped at 50 matches). Essential for the Plan Execution agent (finding insertion points) and Gen UI agent (verifying references).

---

## 7. Git MCP Server

### 7.1 Commit Tools

- [ ] **AG-MCP-056**: Implement `commit_changes` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "message": { "type": "string", "minLength": 1 },
        "paths": { "type": "array", "items": { "type": "string" } },
        "all": { "type": "boolean", "default": false }
      },
      "required": ["message"]
    }
    ```
  - Stage specified paths (or all changes)
  - Create git commit with the given message
  - Return commit hash, files changed, insertions, deletions
- [ ] **AG-MCP-057**: Implement `get_diff` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "path": { "type": "string" },
        "staged": { "type": "boolean", "default": false },
        "fromCommit": { "type": "string" },
        "toCommit": { "type": "string" }
      }
    }
    ```
  - Get diff for working directory, staged changes, or between commits
  - Optionally scope to a specific file path
  - Return unified diff output
- [ ] **AG-MCP-058**: Implement `get_history` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "path": { "type": "string" },
        "limit": { "type": "integer", "default": 20 },
        "offset": { "type": "integer", "default": 0 }
      }
    }
    ```
  - Get commit history, optionally scoped to a file path
  - Return: commit hash, message, author, date, files changed
  - Paginated results
- [ ] **AG-MCP-059**: Implement `get_status` tool
  - **Input Schema**: (no required inputs)
  - Return git status: current branch, staged files, modified files, untracked files
  - Include remote tracking info (ahead/behind counts)

### 7.2 Branch Tools

- [ ] **AG-MCP-060**: Implement `create_branch` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "branchName": { "type": "string", "pattern": "^[a-zA-Z0-9/_-]+$" },
        "fromBranch": { "type": "string" },
        "checkout": { "type": "boolean", "default": true }
      },
      "required": ["branchName"]
    }
    ```
  - Create new branch from current HEAD or specified branch
  - Optionally checkout the new branch
  - Return branch creation confirmation
- [ ] **AG-MCP-061**: Implement `merge_branch` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "sourceBranch": { "type": "string" },
        "targetBranch": { "type": "string" },
        "strategy": { "enum": ["merge", "rebase"], "default": "merge" }
      },
      "required": ["sourceBranch"]
    }
    ```
  - Merge source branch into target (or current) branch
  - Handle merge conflicts: return conflict file list
  - Return merge result: success, conflicts, commit hash
- [ ] **AG-MCP-062**: Implement `list_branches` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "includeRemote": { "type": "boolean", "default": false }
      }
    }
    ```
  - List local branches (and optionally remote)
  - Include: branch name, last commit hash, last commit date
  - Mark current branch
- [ ] **AG-MCP-063**: Implement `checkout_branch` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "branchName": { "type": "string" }
      },
      "required": ["branchName"]
    }
    ```
  - Switch to the specified branch
  - Fail if there are uncommitted changes (require commit or stash first)
  - Return checkout confirmation
- [ ] **AG-MCP-064**: Implement `stash_changes` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "message": { "type": "string" },
        "action": { "enum": ["push", "pop", "list"], "default": "push" }
      }
    }
    ```
  - Push current changes to stash, pop from stash, or list stash entries
  - Return stash operation result

#### Design Decisions

> **Q**: Should the Git MCP server operate on only the KG repository or also the code repository?
> **A**: Both, scoped per invocation via a `repo_path` parameter. The Plan Execution agent uses it for the code repo, the Graph Crawler for the KG repo. The `repo_path` must be within the sandbox's allowed paths.

> **Q**: Should agents be able to push to remote repositories or only make local commits?
> **A**: Local commits only by default. The `git_push` tool exists but requires user confirmation and is disabled by default in tool configuration. Users can enable push in project settings for trusted workflows, especially for the internal KG repo.

> **Q**: How should merge conflicts be handled—auto-resolution or raw conflict markers?
> **A**: Return raw conflict markers. The agent (with full conversation context) reasons about the conflict and resolves via `write_file`, or escalates to the user as an inquiry. Auto-resolution by the MCP server is too risky without sufficient context.

> **Q**: Should the Git MCP server support GPG/SSH commit signing?
> **A**: Not at launch. Commit signing requires managing GPG/SSH keys for agent identities, adding significant key management complexity. Agent commits are identified by the author field. Signing can be added later for compliance requirements.

> **Q**: Should there be commit message conventions for agent-made commits?
> **A**: Yes. Format: `[bot:{agent-type}] {action}: {description}`. Author set to `Botnet Agent <agent@botnet.local>` with the requesting user's identity in the commit body. This makes agent commits easily identifiable in git log while attributing them to the user.

---

## 8. User Context MCP Server

### 8.1 User Tools

- [ ] **AG-MCP-065**: Implement `get_user_permissions` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "userId": { "type": "string" },
        "projectId": { "type": "string" },
        "specId": { "type": "string" }
      },
      "required": ["userId", "projectId"]
    }
    ```
  - Retrieve user's permission level for the project
  - If `specId` provided: check spec-level permissions
  - Return: role, access level, specific permissions list
- [ ] **AG-MCP-066**: Implement `get_user_preferences` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "userId": { "type": "string" }
      },
      "required": ["userId"]
    }
    ```
  - Retrieve user's agent preferences
  - Communication style, expertise level, notification preferences
  - Return preferences object
- [ ] **AG-MCP-067**: Implement `get_project_config` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "projectId": { "type": "string" }
      },
      "required": ["projectId"]
    }
    ```
  - Retrieve project configuration
  - Agent settings, enabled features, naming conventions
  - Return project config object
- [ ] **AG-MCP-068**: Implement `get_user_activity` tool
  - **Input Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "userId": { "type": "string" },
        "projectId": { "type": "string" },
        "limit": { "type": "integer", "default": 10 }
      },
      "required": ["userId", "projectId"]
    }
    ```
  - Retrieve recent user activity in the project
  - Recently viewed specs, recent edits, recent conversations
  - Helps agents understand what the user is working on

---

## 9. MCP Server Registration & Discovery

### 9.1 Server Registry

- [ ] **AG-MCP-069**: Create MCP server registry configuration
  ```typescript
  interface McpServerRegistryEntry {
    name: string;
    version: string;
    entryPoint: string; // path to server executable
    transport: 'stdio' | 'http';
    tools: string[]; // list of tool names
    requiredBy: AgentType[]; // which agents need this server
    healthCheck: () => Promise<boolean>;
  }
  ```
- [ ] **AG-MCP-070**: Implement server registry initialization
  - Load all MCP server configurations at server startup
  - Validate each server entry point exists
  - Verify each server's tools are loadable
  - Log registered servers and their tool counts
- [ ] **AG-MCP-071**: Implement dynamic server selection per agent type
  - Given an agent type, return the list of MCP servers it needs
  - Generate MCP server configuration for Claude Code CLI invocation
  - Only include servers the agent type is authorized to use
- [ ] **AG-MCP-072**: Implement server availability check
  - Before spawning an agent: verify required MCP servers are healthy
  - If any required server is unhealthy: fail fast with descriptive error
  - Include server health in system health endpoint

### 9.2 Tool Discovery

- [ ] **AG-MCP-073**: Implement tool schema aggregation
  - Collect tool schemas from all registered MCP servers
  - Build a complete tool catalog
  - Include tool name, description, input schema, which server provides it
- [ ] **AG-MCP-074**: Implement tool schema validation
  - Validate each tool's JSON Schema is valid
  - Validate no duplicate tool names across servers
  - Validate tool descriptions are present and non-empty
  - Run validation at startup; fail fast on errors
- [ ] **AG-MCP-075**: Implement tool restriction per agent type
  - Map each agent type to its allowed tools (subset of all available tools)
  - Use `--allowedTools` flag when spawning Claude Code
  - Prevents agents from calling tools outside their authorized set

---

## 10. Transport Layer

### 10.1 stdio Transport

- [ ] **AG-MCP-076**: Implement stdio transport for MCP servers
  - Each MCP server runs as a subprocess communicating via stdin/stdout
  - Claude Code spawns MCP server processes
  - MCP protocol messages sent as JSON over stdio
  - Error output on stderr (not mixed with protocol)
- [ ] **AG-MCP-077**: Implement MCP server process management
  - Start MCP server processes alongside Claude Code process
  - Monitor MCP server health during agent execution
  - Kill MCP servers when the parent Claude Code process exits
  - Handle MCP server crashes (restart or fail the agent session)
- [ ] **AG-MCP-078**: Implement MCP message framing
  - Use newline-delimited JSON for message framing
  - Support Content-Length header framing (MCP standard)
  - Handle partial reads/writes
  - Set maximum message size (1MB)

### 10.2 Server Lifecycle

- [ ] **AG-MCP-079**: Implement MCP server startup sequence
  - Initialize shared resources (database connections, file handles)
  - Register tool handlers
  - Signal readiness to the MCP client (Claude Code)
  - Begin accepting tool call requests
- [ ] **AG-MCP-080**: Implement MCP server shutdown sequence
  - Receive shutdown signal
  - Complete any in-progress tool calls
  - Close shared resources
  - Exit cleanly
- [ ] **AG-MCP-081**: Implement MCP server configuration injection
  - Pass server-specific configuration via environment variables
  - Knowledge Graph server: path to knowledge-graph directory
  - RAG server: vector store connection string
  - File System server: sandbox root path
  - Git server: repository path

#### Design Decisions

> **Q**: Is stdio the only MCP transport option for Claude Code, or is HTTP/SSE also supported?
> **A**: Stdio is the primary and recommended transport. Since MCP servers are co-located child processes, stdio provides the lowest latency with no network overhead, port management, or auth needed. Remote MCP servers are not a requirement.

> **Q**: What is the expected latency per MCP tool call, and how does Claude Code handle long calls?
> **A**: Target <500ms for reads, <1s for writes, <3s for complex operations (traversal, search). Claude Code waits gracefully for responses. If a single tool call exceeds 30 seconds, the MCP server should return an error (likely database timeout or deadlock).

> **Q**: Should MCP servers support request cancellation for long-running operations?
> **A**: Yes, via the MCP protocol's `notifications/cancelled` notification. Servers check a cancellation flag at loop boundaries during traversal/search. Short operations (<500ms) don't need cancellation—they complete before it propagates.

> **Q**: Should MCP tool results be streamed for large results or returned as a single response?
> **A**: Single response. Large results are bounded by design: traversal capped at 100 nodes, search at 10 items, file reads at 100KB. These caps ensure no result is too large for a single response, avoiding the need for non-standard streaming extensions.

---

## 11. Authentication & Authorization

### 11.1 Tool-Level Authorization

- [ ] **AG-MCP-082**: Implement user-level tool authorization
  - Before executing any tool: verify the user has permission
  - Read-only tools: allow for all authenticated users
  - Write tools: check user's write permission for the project
  - Delete tools: check user's admin/delete permission
- [ ] **AG-MCP-083**: Implement spec-level permission enforcement in KG tools
  - `get_spec`: check user's access level for the spec
  - If "summary" access: return summary only, not full content
  - If "full" access: return complete content
  - If no access (restricted spec, user not in access list): return error
- [ ] **AG-MCP-084**: Implement rate limiting per tool
  - High-frequency tools (search, get): higher rate limit (100/min)
  - Mutation tools (create, update, delete): lower rate limit (20/min)
  - Expensive tools (traverse_graph, generate_plan): strict limit (5/min)
  - Rate limits applied per user per tool
- [ ] **AG-MCP-085**: Implement tool call audit logging
  - Log every tool call: user, agent type, tool name, arguments, result, duration
  - Store in audit log table
  - Do not log sensitive content (full spec content, API keys)
  - Retain audit logs for 90 days

### 11.2 Server-Level Security

- [ ] **AG-MCP-086**: Implement MCP server authentication
  - MCP servers verify they are being called by an authorized Claude Code process
  - Use session token passed via environment variable
  - Verify token against active session registry
  - Reject calls from unauthorized processes
- [ ] **AG-MCP-087**: Implement input sanitization for all tool arguments
  - Validate all string inputs against expected patterns
  - Prevent SQL injection (for database-backed tools)
  - Prevent command injection (for git tools)
  - Prevent path traversal (for file system tools)
  - Truncate oversized inputs

#### Design Decisions

> **Q**: How should MCP servers prevent "confused deputy" attacks from prompt injection in spec content?
> **A**: Defense in layers: (1) strict input validation against schemas, (2) permission enforcement against the user's access level, (3) confirm-before-mutation for destructive operations giving humans a catch point, (4) the 50 tool calls per message cap prevents mass-operation attacks. No single layer catches all cases, but the combination makes exploitation extremely difficult.

> **Q**: Should destructive operations go through a separate review queue in production?
> **A**: No separate queue. The confirm-before-mutation pattern already provides real-time human approval in the chat UI, which is faster and more contextual than a decoupled review queue. For enterprise environments, an "admin approval for bulk operations" flag can be added to project settings.

> **Q**: Should MCP tools support a `dry_run` mode for previewing mutation effects?
> **A**: Yes, for complex mutations. Tools that modify multiple entities support `dry_run: true`, which validates inputs, checks permissions, and returns a preview of changes without executing. Most useful for `delete_spec` (cascade preview) and `move_spec` (edge adjustment preview).

> **Q**: How should the system handle agent attempts to access other users' data?
> **A**: Per-tool permission checks enforce project-level isolation as the primary defense. The audit log captures every tool call; anomaly detection flags calls targeting resources outside the user's project, unusually high read volumes, and repeated permission-denied errors.

---

## 12. Error Handling

### 12.1 Tool Error Types

- [ ] **AG-MCP-088**: Define MCP tool error taxonomy
  ```typescript
  type McpToolErrorCode =
    | 'ENTITY_NOT_FOUND'
    | 'ENTITY_ALREADY_EXISTS'
    | 'VALIDATION_ERROR'
    | 'PERMISSION_DENIED'
    | 'RATE_LIMITED'
    | 'STORAGE_ERROR'
    | 'SEARCH_ERROR'
    | 'BUILD_ERROR'
    | 'GIT_ERROR'
    | 'TIMEOUT'
    | 'INTERNAL_ERROR';
  ```
- [ ] **AG-MCP-089**: Implement MCP error response format

  ```typescript
  interface McpToolError {
    code: McpToolErrorCode;
    message: string; // human-readable for the agent
    details?: unknown; // structured error details
    retryable: boolean;
    suggestion?: string; // what the agent should do next
  }
  ```

  - Agent receives error as tool result with `isError: true`
  - Agent can use the error info to adjust its approach
  - Suggestions help the agent self-correct

### 12.2 Error Recovery

- [ ] **AG-MCP-090**: Implement tool-level retry logic
  - Transient errors (storage I/O, search timeout): auto-retry once
  - Rate limit errors: wait and retry after backoff
  - Permission errors: do not retry (return to agent)
  - Validation errors: do not retry (return to agent for correction)
- [ ] **AG-MCP-091**: Implement graceful degradation per tool
  - `search_similar`: if vector store is down, fall back to keyword search
  - `traverse_graph`: if index is stale, rebuild index first (with delay warning)
  - `build_ui_project`: if build fails, return error details for agent to fix code
  - `commit_changes`: if there are conflicts, return conflict details
- [ ] **AG-MCP-092**: Implement error aggregation per MCP server
  - Track error rates per server and per tool
  - If a server's error rate exceeds threshold: mark as unhealthy
  - Unhealthy servers cause dependent agent types to fail fast
  - Emit alert for operator attention

---

## 13. Testing & Validation

### 13.1 Tool Testing

- [ ] **AG-MCP-093**: Create test harness for MCP tools
  - Test framework that invokes tools with mock context
  - Verify tool input validation (reject invalid inputs)
  - Verify tool output format matches schema
  - Verify tool side effects (files created, index updated)
- [ ] **AG-MCP-094**: Write unit tests for Knowledge Graph MCP tools
  - Test `create_spec` with valid and invalid inputs
  - Test `update_spec` with partial updates
  - Test `delete_spec` with and without cascade
  - Test `get_spec` with different include flags
  - Test `search_specs` with various filters
  - Test `create_edge` with all edge types
  - Test `delete_edge` and verify index update
  - Test `traverse_graph` with depth and filter variations
  - Test `find_path` between connected and disconnected specs
  - Test inquiry CRUD operations
- [ ] **AG-MCP-095**: Write unit tests for RAG MCP tools
  - Test `search_similar` with query and filters
  - Test `search_by_spec` with existing and non-existing specs
  - Test `index_spec` with fresh and stale content
  - Test `batch_index_specs` with mixed success/failure
- [ ] **AG-MCP-096**: Write unit tests for Generative UI MCP tools
  - Test `create_ui_project` with all templates
  - Test `build_ui_project` with valid and invalid projects
  - Test `validate_ui_project` with various violations
  - Test file size and dependency restrictions
- [ ] **AG-MCP-097**: Write unit tests for Plan Generation MCP tools
  - Test `generate_plan` in full and delta modes
  - Test `get_delta_specs` with various time ranges
  - Test `approve_plan` status transitions
  - Test `mark_specs_ready` tracking
- [ ] **AG-MCP-098**: Write unit tests for File System MCP tools
  - Test all CRUD operations within sandbox
  - Test path traversal prevention
  - Test file size limit enforcement
  - Test file type restriction enforcement
- [ ] **AG-MCP-099**: Write unit tests for Git MCP tools
  - Test commit, diff, history operations
  - Test branch create, merge, checkout
  - Test conflict detection and reporting
  - Test stash push/pop/list
- [ ] **AG-MCP-100**: Write unit tests for User Context MCP tools
  - Test permission retrieval at project and spec level
  - Test preference retrieval
  - Test project config retrieval

### 13.2 Integration Testing

- [ ] **AG-MCP-101**: Create integration tests for KG MCP + storage layer
  - Test full CRUD cycle through MCP tools against real file system
  - Verify index consistency after operations
  - Verify bidirectional references (spec ↔ document)
  - Test concurrent tool calls
- [ ] **AG-MCP-102**: Create integration tests for RAG MCP + vector store
  - Test index + search cycle
  - Verify search returns recently indexed content
  - Test embedding staleness detection
- [ ] **AG-MCP-103**: Create integration tests for Git MCP + git repository
  - Test full git workflow: commit → branch → merge
  - Test conflict detection and reporting
  - Verify diff accuracy
- [ ] **AG-MCP-104**: Create end-to-end test: Claude Code + MCP servers
  - Spawn Claude Code with MCP servers configured
  - Send a prompt that exercises MCP tools
  - Verify tool calls were made and results are correct
  - Verify agent output incorporates tool results

### 13.3 Schema Validation

- [ ] **AG-MCP-105**: Validate all tool input schemas at startup
  - Parse each JSON Schema definition
  - Verify required fields are defined
  - Verify types are consistent
  - Verify enum values are complete
- [ ] **AG-MCP-106**: Validate all tool output formats
  - Every tool must return content matching `McpToolResult` format
  - Verify error responses include proper error codes
  - Verify text content is non-empty for successful operations
- [ ] **AG-MCP-107**: Generate tool documentation from schemas
  - Auto-generate markdown documentation for each tool
  - Include input schema, output format, examples, and error codes
  - Publish as part of developer documentation

#### Design Decisions

> **Q**: Should there be a mock MCP server framework for testing agent behavior without real servers?
> **A**: Yes. A mock framework implementing MCP protocol (stdio JSON-RPC) with configurable canned responses and scenario files (JSON tool call → response mappings). Starts in <100ms vs 1-2s for real servers. Used in wrapper unit tests, agent behavior tests, and CI/CD pipelines.

> **Q**: How should MCP tool tests handle external dependencies (vector store, git, filesystem)?
> **A**: Temporary directories for file/git operations, in-memory SQLite for database tests, lightweight in-process vector store (e.g., hnswlib-node) for RAG tests. No Docker containers required—fresh temporary resources per test suite provide isolation without infrastructure dependencies.

> **Q**: Should there be performance benchmarks for critical MCP tools?
> **A**: Yes. Key targets: `create_spec` <500ms, `get_spec` <200ms, `search_similar` <2s, `traverse_graph` (depth 3) <1s. Benchmarks run nightly against a test dataset (1000 specs, 5000 edges), tracked over time for regression detection, not blocking in CI.

> **Q**: Should there be chaos testing for MCP servers (randomly injected failures)?
> **A**: Not at launch. Start with thorough error handling unit tests covering invalid inputs, database timeouts, file permission errors, and concurrent access. Chaos testing (random crashes, delayed responses, partial results) can be added later as a reliability engineering effort.

---

## Summary

### Task Count by Section

| Section                                | Tasks                              |
| -------------------------------------- | ---------------------------------- |
| 1. MCP Server Architecture             | 7 (AG-MCP-001 through AG-MCP-007)  |
| 2. Knowledge Graph MCP Server          | 20 (AG-MCP-008 through AG-MCP-027) |
| 3. RAG MCP Server                      | 6 (AG-MCP-028 through AG-MCP-033)  |
| 4. Generative UI MCP Server            | 8 (AG-MCP-034 through AG-MCP-041)  |
| 5. Plan Generation MCP Server          | 7 (AG-MCP-042 through AG-MCP-048)  |
| 6. File System MCP Server              | 7 (AG-MCP-049 through AG-MCP-055)  |
| 7. Git MCP Server                      | 9 (AG-MCP-056 through AG-MCP-064)  |
| 8. User Context MCP Server             | 4 (AG-MCP-065 through AG-MCP-068)  |
| 9. MCP Server Registration & Discovery | 7 (AG-MCP-069 through AG-MCP-075)  |
| 10. Transport Layer                    | 6 (AG-MCP-076 through AG-MCP-081)  |
| 11. Authentication & Authorization     | 6 (AG-MCP-082 through AG-MCP-087)  |
| 12. Error Handling                     | 5 (AG-MCP-088 through AG-MCP-092)  |
| 13. Testing & Validation               | 15 (AG-MCP-093 through AG-MCP-107) |
| **TOTAL**                              | **107**                            |

> **Note**: The 107 task IDs above represent high-level tool implementations.
> Each tool implementation (especially the 20 Knowledge Graph tools) involves
> multiple sub-tasks: input validation, business logic, index updates, error
> handling, and testing. The effective task count when including these
> sub-tasks exceeds 200.

### Dependencies (What This Plan Enables)

Completion of this plan unblocks:

- `06-AGENT-SYSTEM/04-SKILLS-CONFIG-PLAN.md` — needs tool schemas for skill documentation
- `06-AGENT-SYSTEM/05-PLAN-GENERATION-PLAN.md` — needs plan generation MCP tools
- `02-FRONTEND/04-GENERATIVE-UI-PLAN.md` — needs generative UI MCP tools for agent-created UIs
- `02-FRONTEND/05-CHAT-DIALOG-PLAN.md` — needs tool call status display in chat
- `08-TESTING/04-AGENT-TESTING-PLAN.md` — needs MCP tool test harness
- `12-CODE-GENERATION/PLAN.md` — needs plan generation and git tools

### Definition of Done

This plan is complete when:

- [ ] All 7 MCP servers are implemented with complete tool sets
- [ ] Every tool has a valid JSON Schema for input validation
- [ ] Tool-level authorization enforces user permissions
- [ ] stdio transport works between Claude Code and all MCP servers
- [ ] Server registry dynamically selects MCP servers per agent type
- [ ] Error handling returns actionable errors to agents
- [ ] Audit logging captures all tool calls
- [ ] Unit tests cover all tools with valid and invalid inputs
- [ ] Integration tests verify end-to-end MCP server functionality
- [ ] Tool documentation is auto-generated from schemas
