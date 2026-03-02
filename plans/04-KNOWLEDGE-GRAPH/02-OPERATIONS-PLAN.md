# 04-KNOWLEDGE-GRAPH / 02 — OPERATIONS PLAN

> **Purpose**: Define all operations on the knowledge graph including CRUD for
> specs, edges, and spec documents; graph traversal algorithms; subgraph
> extraction; search and filtering; batch operations; import/export; validation;
> graph crawling for agents; inquiry queue management; and cascading behaviors.
>
> **Phase**: 2 (Core Systems) + Phase 4 (Advanced)
> **Dependencies**: `04-KNOWLEDGE-GRAPH/01-ARCHITECTURE-PLAN.md`
> **Estimated tasks**: 165+

---

## Table of Contents

1. [Spec CRUD Operations](#1-spec-crud-operations)
2. [Edge CRUD Operations](#2-edge-crud-operations)
3. [Spec Document CRUD Operations](#3-spec-document-crud-operations)
4. [Graph Traversal](#4-graph-traversal)
5. [Subgraph Extraction](#5-subgraph-extraction)
6. [Path Finding](#6-path-finding)
7. [Graph Statistics & Analysis](#7-graph-statistics--analysis)
8. [Search & Filtering](#8-search--filtering)
9. [Batch Operations](#9-batch-operations)
10. [Import & Export](#10-import--export)
11. [Validation Operations](#11-validation-operations)
12. [Graph Crawling for Agents](#12-graph-crawling-for-agents)
13. [Inquiry Queue Management](#13-inquiry-queue-management)
14. [Cascading Operations](#14-cascading-operations)
15. [Orphan Detection & Management](#15-orphan-detection--management)

---

## 1. Spec CRUD Operations

### 1.1 Create Spec

- [ ] **KG-OPS-001**: Implement `createSpec(input)` operation
  - Accept: title, initial content (Markdown), tags, author, document ID (optional)
  - Generate spec ID using `generateSpecId()`
  - Create spec directory: `specs/{spec-id}/`
  - Write `spec.json` with core fields and `schemaVersion`
  - Write `content.md` with initial content
  - Write `metadata.json` with author, tags, permissions, empty embedding
  - Return created spec with all fields
- [ ] **KG-OPS-002**: Validate all input fields before writing
  - Title: non-empty, within max length
  - Content: within max size
  - Tags: valid format, within max count
  - Author: valid user ID
  - Reject with `ValidationError` on invalid input
- [ ] **KG-OPS-003**: Update indexes after spec creation
  - Add entry to `spec-index.json`
  - Add entry to `tag-index.json` for each tag
  - Add entry to `author-index.json`
  - Add edge index entry (empty adjacency for new node)
  - If document ID provided, update `document-index.json`
- [ ] **KG-OPS-004**: Associate new spec with document if provided
  - Append spec ID to `document.json.specIds`
  - Add document ID to `metadata.json.documentIds`
  - Maintain bidirectional consistency
- [ ] **KG-OPS-005**: Set default permissions on new spec
  - Default to `{ visibility: 'public', defaultLevel: 'full', accessList: [] }`
  - Author automatically has full access
  - Configurable default in `.kg-config.json`
- [ ] **KG-OPS-006**: Trigger embedding generation for new spec
  - Queue async embedding generation (handled by RAG layer)
  - Set `metadata.json.embedding` to null initially
  - Mark spec as "pending embedding" for the RAG pipeline

### 1.2 Read Spec

- [ ] **KG-OPS-007**: Implement `readSpec(id)` operation
  - Read `spec.json` from spec directory
  - Validate against schema
  - Return typed `Spec` object
  - Throw `EntityNotFoundError` if spec doesn't exist
- [ ] **KG-OPS-008**: Implement `readSpecContent(id)` operation
  - Read `content.md` as string
  - Return raw Markdown content
  - Throw `EntityNotFoundError` if spec doesn't exist
- [ ] **KG-OPS-009**: Implement `readSpecMetadata(id)` operation
  - Read `metadata.json` from spec directory
  - Validate against schema
  - Return typed `SpecMetadata` object
- [ ] **KG-OPS-010**: Implement `readFullSpec(id)` operation
  - Read all three files in parallel
  - Return combined `{ spec, content, metadata }` object
  - Single call for operations needing everything
- [ ] **KG-OPS-011**: Implement permission-filtered spec read
  - Accept requesting user ID
  - If user has `full` access: return all data
  - If user has `summary` access: return spec.json + metadata.json (minus embedding) + summary (not full content)
  - If `restricted` and user not in access list: return summary only (anti-siloing)
- [ ] **KG-OPS-012**: Implement spec existence check
  - `specExists(id)` → boolean
  - Check index first (fast path), fall back to filesystem check
  - Used by edge operations to validate references

### 1.3 Update Spec

- [ ] **KG-OPS-013**: Implement `updateSpec(id, changes)` operation
  - Accept partial updates: title, status, content, tags, permissions, summary
  - Read current state, merge changes, write back
  - Update `updatedAt` timestamp on `spec.json`
  - Validate changes against schema
- [ ] **KG-OPS-014**: Implement spec title update
  - Update `spec.json.title`
  - Update `spec-index.json` entry
- [ ] **KG-OPS-015**: Implement spec status update
  - Update `spec.json.status`
  - Validate status transition (e.g., `archived` → `active` may be disallowed)
  - Update `spec-index.json` entry
- [ ] **KG-OPS-016**: Implement spec content update
  - Write new content to `content.md`
  - Compute content hash and compare with `metadata.json.embedding.contentHash`
  - If content hash changed, mark embedding as stale (trigger re-embedding)
  - Add editing user to `metadata.json.contributors` if not already present
- [ ] **KG-OPS-017**: Implement spec tags update
  - Replace tags array in `metadata.json`
  - Update `tag-index.json`: remove from old tags, add to new tags
- [ ] **KG-OPS-018**: Implement spec permissions update
  - Update `metadata.json.permissions`
  - Validate permission structure
  - Ensure anti-siloing constraint (summary access always available)
- [ ] **KG-OPS-019**: Implement optimistic concurrency check on update
  - Accept `expectedUpdatedAt` parameter
  - Compare against current `updatedAt`; reject if mismatch
  - Return `ConcurrencyConflictError` with current state for retry

### 1.4 Delete Spec

- [ ] **KG-OPS-020**: Implement `deleteSpec(id, options)` operation
  - Options: `{ cascade: boolean, force: boolean }`
  - Default cascade: true (delete associated edges)
  - If force: false, reject if spec has edges (require explicit cascade)
  - Remove spec directory: `specs/{spec-id}/`
- [ ] **KG-OPS-021**: Handle edge cleanup on spec deletion
  - Find all edges where spec is source or target (from edge index)
  - If cascade: delete all associated edges
  - If not cascade: reject deletion if edges exist
  - Update edge index after cleanup
- [ ] **KG-OPS-022**: Handle document reference cleanup on spec deletion
  - Remove spec ID from all documents' `specIds` arrays
  - Update `document-index.json`
  - Leave document intact even if now empty
- [ ] **KG-OPS-023**: Update indexes after spec deletion
  - Remove from `spec-index.json`
  - Remove from `tag-index.json` (all tags)
  - Remove from `author-index.json`
  - Remove from `edge-index.json`
  - Remove from `document-index.json` (specToDocuments)
- [ ] **KG-OPS-024**: Implement soft delete option
  - Instead of removing files, move to `spec.json.status = 'archived'`
  - Set a `deletedAt` field in metadata
  - Exclude from default queries but retain for history
  - Hard delete available as a separate operation

#### Design Decisions

> **Q**: When creating a spec, should the system auto-generate an initial summary from the content, or leave it empty until an agent fills it in?
> **A**: Auto-generate via agent. When a spec is created with content, the agent produces a 1–2 sentence summary asynchronously and writes it to `spec.json.summary`. If the spec is created empty (draft), the summary field is left blank until content is added. The summary generation is a lightweight agent call, not a blocking operation — the spec is immediately available, and the summary populates within seconds.

> **Q**: Should spec creation require a document association, or should standalone (document-less) specs be allowed by default?
> **A**: Standalone specs are allowed by default. Document association is optional at creation time. Orphan detection (no edges AND no document) will surface truly disconnected specs via the inquiry queue, but a spec with edges and no document is perfectly valid. Forcing document association at creation time would slow down rapid spec authoring and agent-generated specs.

> **Q**: Should the system prevent creation of specs with titles identical to existing specs?
> **A**: Allow duplicate titles. Titles are descriptive labels, not identifiers. Different specs may legitimately share a title (e.g., "Authentication" in different contexts). The nanoid is the unique identifier. If an agent detects near-duplicate specs, it creates an inquiry suggesting a `contradicts` or `supersedes` edge rather than blocking creation.

> **Q**: When a spec is created via the chat dialog (agent-assisted), should the agent auto-suggest tags and edge connections?
> **A**: Auto-suggest. The agent proposes tags and edge connections as part of the creation flow, displayed to the user for approval. The user can accept, modify, or dismiss suggestions. Accepted edges are created immediately.

> **Q**: Should spec content updates be tracked as full replacements or as diffs (patches)?
> **A**: Full replacements. Each save writes the complete `content.md` and `spec.json` files. Git handles diffing and storage efficiency natively via packfiles and delta compression. Application-level diff storage is redundant with git and adds unnecessary complexity.

> **Q**: Should updating a spec's status trigger notifications to users who have edges to that spec?
> **A**: Yes, for `deprecated` and `archived` status transitions only. When a spec moves to `deprecated` or `archived`, the system creates notifications for all users who own or have permissions on specs with `depends-on` edges targeting the affected spec.

> **Q**: Should the `contributors` list cap at a maximum number, or grow unbounded?
> **A**: Unbounded. The contributors list is an array of user IDs in `spec.json`. Even with 100 contributors, this is a few KB of JSON. Contributors are append-only and deduplicated.

> **Q**: When updating spec permissions, should existing summary-level users be notified that their access level changed?
> **A**: No. Permission changes are administrative operations. The user experiences the change organically on next access. Sending notifications about permission changes creates noise and may reveal information about the permission structure.

> **Q**: Should spec deletion be a hard delete (remove files) or always a soft delete (archive) with a separate purge operation?
> **A**: Hard delete of files with cascade removal of edges and document references. Git history preserves the full content of every deleted spec permanently. The `archived` status serves the "soft delete" use case for specs the user wants to keep but deactivate.

> **Q**: Should deleting a spec require a confirmation step (e.g., "this will remove 12 edges and affect 3 documents")?
> **A**: Yes, require a confirmation step. Before deletion, the API returns a preview: `{ edgesRemoved: 12, documentsAffected: ['dc_...', 'dc_...'], dependentSpecs: ['sp_...'] }`. The frontend displays this preview and requires explicit confirmation.

> **Q**: Should deleted specs leave behind a tombstone file for historical reference, or rely entirely on git history?
> **A**: Rely on git history. No tombstone files. The deletion commit message includes the deleted spec's ID, title, and a summary of cascade effects.

> **Q**: How long should soft-deleted (archived) specs be retained before permanent purge?
> **A**: Never auto-purge archived specs. Archival is an intentional user action to deactivate a spec while preserving it. If a user wants permanent removal, they use the explicit delete operation.

---

## 2. Edge CRUD Operations

### 2.1 Create Edge

- [ ] **KG-OPS-025**: Implement `createEdge(input)` operation
  - Accept: type, sourceSpecId, targetSpecId, metadata (confidence, rationale, strength, context), createdBy
  - Generate edge ID using `generateEdgeId()`
  - Write `edges/{edge-id}.json`
  - Return created edge with all fields
- [ ] **KG-OPS-026**: Validate edge creation constraints
  - Both sourceSpecId and targetSpecId must exist (referential integrity)
  - sourceSpecId !== targetSpecId (no self-loops)
  - No duplicate (type, source, target) triple
  - For bidirectional types: also check (type, target, source)
  - Edge type must be in the fixed taxonomy
- [ ] **KG-OPS-027**: Update edge index after creation
  - Add to source spec's outgoing list
  - Add to target spec's incoming list
  - For bidirectional types: add to both directions for both specs
- [ ] **KG-OPS-028**: Set edge metadata defaults
  - `confidence` default: 0.5 for agent-created, 1.0 for human-created
  - `strength` default: `moderate`
  - `rationale` default: empty string (should be filled in)
  - `context` default: null

### 2.2 Read Edge

- [ ] **KG-OPS-029**: Implement `readEdge(id)` operation
  - Read edge JSON file
  - Validate against schema
  - Return typed `Edge` object
- [ ] **KG-OPS-030**: Implement `readEdgesForSpec(specId, options)` operation
  - Options: `{ direction: 'outgoing' | 'incoming' | 'both', types?: EdgeType[], minConfidence?: number, minStrength?: EdgeStrength }`
  - Use edge index for fast lookup
  - Load full edge details only for matching edges
  - Return filtered list of `Edge` objects
- [ ] **KG-OPS-031**: Implement `readEdgesBetweenSpecs(specId1, specId2)` operation
  - Find all edges connecting two specific specs
  - Check both directions
  - Return list of edges between them
- [ ] **KG-OPS-032**: Implement edge existence check
  - `edgeExists(type, sourceSpecId, targetSpecId)` → boolean
  - Uses edge index for fast lookup

### 2.3 Update Edge

- [ ] **KG-OPS-033**: Implement `updateEdge(id, changes)` operation
  - Accept partial updates: metadata fields (confidence, rationale, strength, context, agentAnalysis)
  - Edge type, source, and target are immutable after creation
  - Update `updatedAt` timestamp
  - Validate changes against schema
- [ ] **KG-OPS-034**: Implement edge confidence update
  - Agent can revise confidence based on new analysis
  - Human confirmation sets confidence to 1.0
  - Track who last modified confidence
- [ ] **KG-OPS-035**: Implement edge metadata merge
  - When updating agentAnalysis, merge with existing (don't replace entirely)
  - Allow adding new keys and updating existing keys
  - Provide option for full replacement if needed
- [ ] **KG-OPS-036**: Update edge index on edge metadata changes
  - If strength or confidence changed, update the denormalized values in the index

### 2.4 Delete Edge

- [ ] **KG-OPS-037**: Implement `deleteEdge(id)` operation
  - Remove edge file: `edges/{edge-id}.json`
  - Update edge index: remove from source and target adjacency lists
- [ ] **KG-OPS-038**: Implement `deleteEdgesBetweenSpecs(specId1, specId2, type?)` operation
  - Delete all edges between two specs
  - Optionally filter by type
  - Return count of deleted edges
- [ ] **KG-OPS-039**: Implement `deleteEdgesByType(specId, type, direction)` operation
  - Delete all edges of a specific type for a spec
  - Useful for bulk cleanup

#### Design Decisions

> **Q**: Should edges have a `proposed` status that requires human confirmation before becoming `active`?
> **A**: No edge status field. Per the PRD: "No confidence on edges. Issues → inquiry queue for user attention." Agent-created edges are immediately active. If the agent is uncertain, it creates an inquiry alongside the edge.

> **Q**: For agent-created edges, should there be a probation period during which the edge is visible but marked as "unverified"?
> **A**: No probation period. Agent-created edges are full-class edges from the moment of creation. They are distinguished by `createdByType: 'agent'` metadata, which the UI can use to display a subtle visual indicator.

> **Q**: Should creating a `supersedes` edge automatically change the target spec's status to `deprecated`?
> **A**: Yes. Creating a `supersedes` edge from spec A to spec B automatically sets spec B's status to `deprecated`. This is the semantic meaning of supersession. If the user disagrees, they can revert the status change or delete the supersedes edge.

> **Q**: Should the system enforce a maximum number of edges per spec to prevent hub nodes?
> **A**: No hard limit. Some specs are naturally hub-like. The UI paginates edges when displaying a spec with many connections. If a spec accumulates >50 edges, the system creates an inquiry suggesting the spec may need decomposition.

> **Q**: For bidirectional types (`related-to`, `contradicts`), should the system normalize storage or store as-is?
> **A**: Store as-is, with back-references. The spec that initiates the relationship is the source. A back-reference entry is added to the target spec's edge file with the same `edgeId` and `direction: 'incoming'`.

> **Q**: When deleting a bidirectional edge, does the direction matter for the delete operation?
> **A**: Either spec ID can be specified. Deletion by `edgeId` removes the edge from both the source and target edge files. The API accepts `DELETE /edges/{edgeId}` — no need to specify source or target.

> **Q**: Should edge `agentAnalysis` metadata be versioned or overwritten each time?
> **A**: Overwritten. When an agent re-analyzes an edge, the rationale is replaced with the latest analysis. Historical analysis is preserved in git commit history.

> **Q**: Should there be a "last verified" timestamp on edges to track how recently the relationship was confirmed?
> **A**: No. Edge validity is managed through the inquiry queue and agent crawls, not timestamps. An agent crawl that re-encounters an existing edge implicitly confirms it.

---

## 3. Spec Document CRUD Operations

### 3.1 Create Document

- [ ] **KG-OPS-040**: Implement `createDocument(input)` operation
  - Accept: title, description, initial specIds (optional), author, tags
  - Generate document ID using `generateDocumentId()`
  - Create document directory: `documents/{doc-id}/`
  - Write `document.json`
  - Return created document
- [ ] **KG-OPS-041**: Validate document creation input
  - Title: non-empty, within max length
  - specIds: all must reference existing specs
  - No duplicate spec IDs in the list
- [ ] **KG-OPS-042**: Update bidirectional references on document creation
  - For each spec in specIds, add document ID to `metadata.json.documentIds`
  - Update `document-index.json`

### 3.2 Read Document

- [ ] **KG-OPS-043**: Implement `readDocument(id)` operation
  - Read `document.json`
  - Validate against schema
  - Return typed `SpecDocument` object
- [ ] **KG-OPS-044**: Implement `readDocumentWithSpecs(id)` operation
  - Read document, then load all referenced specs (full read)
  - Return document with expanded spec objects
  - Parallel loading of specs for performance
- [ ] **KG-OPS-045**: Implement `listDocuments(options)` operation
  - Options: `{ status?: DocumentStatus, author?: string, tags?: string[], limit?: number, offset?: number }`
  - Use document index for fast listing
  - Support pagination

### 3.3 Update Document

- [ ] **KG-OPS-046**: Implement `updateDocument(id, changes)` operation
  - Accept partial updates: title, description, status, tags
  - Update `updatedAt` timestamp
  - Validate changes
- [ ] **KG-OPS-047**: Implement `addSpecToDocument(documentId, specId, position?)` operation
  - Add spec ID to document's specIds array
  - Position: index to insert at (default: append to end)
  - Add document ID to spec's `metadata.json.documentIds`
  - Validate spec exists and isn't already in the document
- [ ] **KG-OPS-048**: Implement `removeSpecFromDocument(documentId, specId)` operation
  - Remove spec ID from document's specIds array
  - Remove document ID from spec's `metadata.json.documentIds`
  - Does NOT delete the spec itself
- [ ] **KG-OPS-049**: Implement `reorderSpecsInDocument(documentId, newSpecIdOrder)` operation
  - Replace specIds array with reordered version
  - Validate all IDs are the same (no additions or removals, just reorder)
- [ ] **KG-OPS-050**: Implement `moveSpecBetweenDocuments(specId, fromDocId, toDocId, position?)` operation
  - Atomic operation: remove from source, add to target
  - Update spec's documentIds metadata
  - Rollback if either operation fails

### 3.4 Delete Document

- [ ] **KG-OPS-051**: Implement `deleteDocument(id)` operation
  - Remove document directory: `documents/{doc-id}/`
  - Remove document ID from all member specs' `metadata.json.documentIds`
  - Update `document-index.json`
  - Does NOT delete constituent specs (they become orphans if no other documents reference them)
- [ ] **KG-OPS-052**: Flag orphaned specs after document deletion
  - After deletion, check each formerly-contained spec
  - If a spec has no remaining documentIds, it's an orphan
  - Create inquiry items for orphaned specs

#### Design Decisions

> **Q**: Should documents support sections or chapters that group specs within the document, or is a flat ordered list sufficient?
> **A**: Flat ordered list with optional section dividers. The document's `specOrder` array is a list of entries, each either `{ type: 'spec', specId: '...' }` or `{ type: 'divider', label: 'Section Name' }`. Dividers are purely presentational — they have no semantic meaning for the graph.

> **Q**: Should a single spec's removal from a document trigger reindexing of the document, or batch the reindex?
> **A**: No reindexing needed. Documents are just ordered references to specs. Removing a spec reference is a JSON array splice — there is no document-level index to rebuild.

> **Q**: Should there be a maximum number of specs per document?
> **A**: Soft limit of 200 specs per document, enforced as a warning (not a hard block). The UI shows a warning when a document exceeds 200 specs.

> **Q**: Should documents support "pinned" specs that always appear at the top regardless of order?
> **A**: No. The `specOrder` array is the single source of ordering. Pinning creates an implicit ordering layer that conflicts with the explicit order.

> **Q**: Should publishing a document (draft → published) trigger any validation?
> **A**: Yes. Publishing validates that all referenced specs exist and are in `active` or `review` status. Specs in `draft`, `deprecated`, or `archived` status generate a warning (not a hard block).

> **Q**: Can an archived document be un-archived, or is archival permanent?
> **A**: Un-archiving is allowed. Documents can move freely between `draft`, `published`, and `archived` states. The only irreversible operation is deletion.

> **Q**: Should document deletion be restricted if the document contains specs that would become orphans?
> **A**: No restriction, but a warning. Before deletion, the API returns a preview showing which specs would become orphans. The orphan detection system will also surface these specs in the inquiry queue.

---

## 4. Graph Traversal

### 4.1 Breadth-First Traversal

- [ ] **KG-OPS-053**: Implement `traverseBFS(startSpecId, options)` operation
  - Options: `{ maxDepth: number, edgeTypes?: EdgeType[], direction?: 'outgoing' | 'incoming' | 'both', minConfidence?: number, minStrength?: EdgeStrength, maxNodes?: number }`
  - Standard BFS using a queue
  - Use edge index for neighbor lookups (avoid loading edge files)
  - Return ordered list of visited specs with depth annotations
  - Track visited nodes to prevent cycles
- [ ] **KG-OPS-054**: Implement BFS result type
  ```typescript
  interface TraversalResult {
    nodes: TraversalNode[];
    edges: TraversalEdge[];
    maxDepthReached: boolean;
    maxNodesReached: boolean;
  }
  interface TraversalNode {
    specId: string;
    depth: number;
    pathFromStart: string[];
  }
  ```
- [ ] **KG-OPS-055**: Implement BFS with edge type filtering
  - Follow only specified edge types during traversal
  - Example: traverse only `depends-on` edges to build dependency tree
- [ ] **KG-OPS-056**: Implement BFS with confidence threshold
  - Skip edges below the minimum confidence during traversal
  - Prevents agent from following uncertain connections

### 4.2 Depth-First Traversal

- [ ] **KG-OPS-057**: Implement `traverseDFS(startSpecId, options)` operation
  - Same options as BFS
  - Standard DFS using a stack
  - Return ordered list with discovery and finish order
  - Detect back edges (cycles)
- [ ] **KG-OPS-058**: Implement DFS cycle detection
  - Track node states: unvisited, in-progress, completed
  - Report cycles found during traversal
  - Return cycle paths for debugging/display

### 4.3 Filtered Traversal

- [ ] **KG-OPS-059**: Implement `traverseFiltered(startSpecId, filter)` operation
  - Custom filter function: `(node: Spec, edge: Edge, depth: number) => boolean`
  - Traversal continues only through edges/nodes where filter returns true
  - Enables complex traversal logic (e.g., follow only high-confidence depends-on edges from active specs)
- [ ] **KG-OPS-060**: Implement tag-filtered traversal
  - Traverse only through specs matching specified tags
  - Useful for scoped exploration (e.g., all "authentication" specs reachable from a node)
- [ ] **KG-OPS-061**: Implement status-filtered traversal
  - Skip specs with certain statuses (e.g., exclude `archived` specs)
  - Default: include `draft` and `active`, exclude `deprecated` and `archived`

#### Design Decisions

> **Q**: What is the maximum acceptable traversal depth? Should there be a hard limit?
> **A**: Hard limit of 10 hops. Default depth: 3 hops (immediate neighborhood). The API accepts a `depth` parameter with max value 10. Traversal uses BFS with visited-set deduplication.

> **Q**: Should traversal results be cached?
> **A**: Yes, cache with 30-second TTL. Traversal results are cached in-memory keyed by `(specId, depth, edgeTypes, direction)`. Cache is invalidated globally when any edge write occurs.

> **Q**: For traversals that visit many nodes (>1000), should results be streamed incrementally or returned all at once?
> **A**: Return all at once with a result cap of 500 nodes. Traversals that would exceed 500 nodes are truncated with a `truncated: true` flag. Streaming adds WebSocket complexity for a rare edge case.

> **Q**: For `depends-on` edge traversal, should transitive dependencies be resolved?
> **A**: Yes, transitive resolution is available as an explicit query option: `GET /specs/{id}/dependencies?transitive=true`. Default behavior returns only direct dependencies (depth 1). Transitive resolution uses BFS up to the 10-hop limit.

> **Q**: Should `contradicts` edges be treated as blocking during dependency traversal?
> **A**: `contradicts` edges do not block traversal. They are informational — the traversal includes them in results with a flag indicating contradiction. Contradictions in a dependency chain should generate an inquiry for human review.

> **Q**: Should traversal results include the full spec data, or just IDs and summaries?
> **A**: IDs and summaries by default. The API supports a `fields` parameter: `?fields=id,title,summary` (default), or `?fields=full` for complete spec data.

> **Q**: Should the graph support "virtual edges" inferred from transitive relationships?
> **A**: No virtual edges. All edges are explicitly stored. Transitive relationships are computed on-demand via traversal queries. The traversal API with `transitive=true` serves this use case.

---

## 5. Subgraph Extraction

### 5.1 Neighborhood Extraction

- [ ] **KG-OPS-062**: Implement `getNeighborhood(specId, depth)` operation
  - Extract all specs within N hops of a given spec
  - Include all edges between extracted specs
  - Return as a subgraph: `{ nodes: Spec[], edges: Edge[] }`
- [ ] **KG-OPS-063**: Implement directed neighborhood extraction
  - `getUpstreamNeighborhood(specId, depth)` — follow incoming edges only (what depends on this)
  - `getDownstreamNeighborhood(specId, depth)` — follow outgoing edges only (what this depends on)
- [ ] **KG-OPS-064**: Implement weighted neighborhood extraction
  - Prioritize stronger edges and higher-confidence connections
  - At each hop, sort neighbors by edge strength/confidence
  - Limit branching factor (max neighbors per node) to control subgraph size

### 5.2 Topic-Based Subgraph

- [ ] **KG-OPS-065**: Implement `getSubgraphByTags(tags, options)` operation
  - Find all specs with matching tags (using tag index)
  - Include all edges between those specs
  - Optionally expand to include 1-hop neighbors
  - Return as subgraph
- [ ] **KG-OPS-066**: Implement `getSubgraphByDocument(documentId)` operation
  - Extract all specs in a document
  - Include all edges between those specs
  - Useful for document-scoped graph visualization

### 5.3 Connected Component Extraction

- [ ] **KG-OPS-067**: Implement `getConnectedComponent(specId)` operation
  - Find the entire connected component containing a spec
  - Traverse all edges (ignoring direction) to find all reachable specs
  - Return full connected component as subgraph
- [ ] **KG-OPS-068**: Implement `getAllConnectedComponents()` operation
  - Partition the entire graph into connected components
  - Return array of subgraphs
  - Useful for identifying disconnected knowledge clusters

---

## 6. Path Finding

### 6.1 Shortest Path

- [ ] **KG-OPS-069**: Implement `findShortestPath(sourceSpecId, targetSpecId, options)` operation
  - Options: `{ edgeTypes?: EdgeType[], directed?: boolean, maxDepth?: number }`
  - BFS-based shortest path (unweighted)
  - Return path as ordered array of spec IDs and edges
  - Return null if no path exists
- [ ] **KG-OPS-070**: Implement `findShortestPathWeighted(sourceSpecId, targetSpecId, options)` operation
  - Dijkstra's algorithm using edge strength as weight
  - `strong` = 1, `moderate` = 2, `weak` = 3 (lower weight = preferred)
  - Return weighted shortest path

### 6.2 All Paths

- [ ] **KG-OPS-071**: Implement `findAllPaths(sourceSpecId, targetSpecId, options)` operation
  - Options: `{ maxDepth: number, maxPaths: number, edgeTypes?: EdgeType[] }`
  - DFS-based enumeration of all paths up to maxDepth
  - Limit results to maxPaths to prevent explosion
  - Return array of paths
- [ ] **KG-OPS-072**: Implement `findPathsThrough(specIds)` operation
  - Find all paths that pass through a specific set of specs (in any order)
  - Useful for understanding how concepts connect

### 6.3 Dependency Chain

- [ ] **KG-OPS-073**: Implement `findDependencyChain(specId)` operation
  - Follow `depends-on` edges recursively to find full dependency tree
  - Detect circular dependencies (report as cycles)
  - Return as a tree structure (with cycle indicators)
- [ ] **KG-OPS-074**: Implement `findReverseDependencyChain(specId)` operation
  - Follow incoming `depends-on` edges to find all dependents
  - "What depends on this spec?" — impact analysis

---

## 7. Graph Statistics & Analysis

### 7.1 Basic Statistics

- [ ] **KG-OPS-075**: Implement `getGraphStatistics()` operation
  - Total spec count (by status: draft, active, deprecated, archived)
  - Total edge count (by type)
  - Total document count (by status)
  - Average edges per spec
  - Orphan spec count (no edges)
  - Maximum depth (longest shortest path between any two specs)
- [ ] **KG-OPS-076**: Implement `getSpecStatistics(specId)` operation
  - Incoming edge count (by type)
  - Outgoing edge count (by type)
  - Degree centrality (total connections)
  - Connected component size
  - Document membership count
  - Content size (bytes)

### 7.2 Centrality Analysis

- [ ] **KG-OPS-077**: Implement degree centrality calculation
  - Count of edges for each spec (in + out)
  - Normalized by total possible edges
  - Identifies highly connected "hub" specs
- [ ] **KG-OPS-078**: Implement betweenness centrality calculation
  - Fraction of shortest paths passing through each spec
  - Identifies "bridge" specs connecting different knowledge clusters
  - Computationally expensive — cache results, recompute periodically
- [ ] **KG-OPS-079**: Implement PageRank-style importance scoring
  - Adapted for knowledge graph: specs linked by more important specs are more important
  - Weight edges by type: `depends-on` weighs more than `related-to`
  - Iterate until convergence
  - Results used by agents for traversal prioritization

### 7.3 Cluster Analysis

- [ ] **KG-OPS-080**: Implement connected components identification
  - Find all connected components (treating graph as undirected)
  - Report component count, sizes, and member spec IDs
  - Large single component suggests well-connected graph; many small components suggest fragmentation
- [ ] **KG-OPS-081**: Implement `identifyBridgeEdges()` operation
  - Find edges whose removal would disconnect the graph
  - These are critical relationships that should be verified
  - Flag as high-importance in edge metadata

---

## 8. Search & Filtering

### 8.1 Metadata-Based Search

- [ ] **KG-OPS-082**: Implement `searchByTags(tags, matchMode)` operation
  - `matchMode: 'all' | 'any'`
  - `all`: specs must have all specified tags
  - `any`: specs must have at least one specified tag
  - Use tag index for fast lookup
  - Return matching spec IDs with relevance (number of matching tags)
- [ ] **KG-OPS-083**: Implement `searchByAuthor(userId)` operation
  - Find all specs authored by or contributed to by a user
  - Use author index for fast lookup
- [ ] **KG-OPS-084**: Implement `searchByStatus(status)` operation
  - Find all specs with a specific status
  - Use spec index for fast filtering
- [ ] **KG-OPS-085**: Implement `searchByDateRange(field, from, to)` operation
  - Search by `createdAt` or `updatedAt` range
  - Scan spec index (dates are in index entries)
  - Return matching specs sorted by date

### 8.2 Content-Based Search

- [ ] **KG-OPS-086**: Implement `searchByTitle(query)` operation
  - Substring or fuzzy match on spec titles
  - Use spec index (titles are in index entries)
  - Return ranked results
- [ ] **KG-OPS-087**: Implement `searchByContent(query)` operation
  - Full-text search across spec content files
  - For small graphs: scan `content.md` files directly
  - For large graphs: delegate to RAG layer for semantic search
  - Return matching spec IDs with relevance score

### 8.3 Combined Filtering

- [ ] **KG-OPS-088**: Implement `searchSpecs(filter)` composite search operation

  ```typescript
  interface SpecFilter {
    tags?: { values: string[]; mode: 'all' | 'any' };
    author?: string;
    status?: SpecStatus[];
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    titleQuery?: string;
    contentQuery?: string;
    hasEdgesOfType?: EdgeType[];
    isOrphan?: boolean;
    documentId?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'relevance';
    sortOrder?: 'asc' | 'desc';
  }
  ```

  - Apply filters in order of selectivity (most restrictive first)
  - Use indexes where possible, fall back to scanning
  - Support pagination with limit/offset

- [ ] **KG-OPS-089**: Implement edge-based spec filtering
  - Find specs that have at least one edge of a specified type
  - Find specs with more than N edges (highly connected)
  - Find specs with no edges (orphans)
- [ ] **KG-OPS-090**: Implement permission-aware search
  - Filter results based on requesting user's permissions
  - Exclude specs the user cannot access (or replace with summary-only results)
  - Apply anti-siloing: restricted specs appear as summary entries

#### Design Decisions

> **Q**: Should full-text search use a dedicated search index or always delegate to RAG?
> **A**: Delegate to RAG for all search. RAG (pgvector with metadata filtering) handles both semantic similarity and keyword-style queries. Adding a separate full-text search index creates two search paths returning potentially different results. For literal string search, a PostgreSQL `tsvector` column on the spec registry table can supplement pgvector.

> **Q**: Should search support regular expressions for power users?
> **A**: No. Regex search over file content would require scanning all spec files. The combination of semantic search (RAG), tag filtering, and status filtering covers the vast majority of needs. Power users can use git grep directly.

> **Q**: Should search results include a relevance score explanation?
> **A**: Yes, include a brief explanation. Each search result includes: `{ specId, title, summary, score, matchReason: 'semantic similarity' | 'tag match' | 'title match' }`.

> **Q**: Should the search API support faceted search?
> **A**: Not in v1. Faceted search requires aggregation across all results, which conflicts with top-K vector search. If needed later, faceted counts can be computed from the spec registry table in PostgreSQL.

> **Q**: At what graph size does search performance become unacceptable without a dedicated search index?
> **A**: pgvector with HNSW index handles up to 100K vectors with <50ms query latency. This exceeds the target scale (50K specs). No additional search infrastructure is needed.

---

## 9. Batch Operations

### 9.1 Bulk Create

- [ ] **KG-OPS-091**: Implement `bulkCreateSpecs(inputs[])` operation
  - Create multiple specs in a single operation
  - Validate all inputs before writing any (all-or-nothing)
  - Generate IDs for all specs upfront
  - Write all files, then update indexes once
  - Return array of created specs
- [ ] **KG-OPS-092**: Implement `bulkCreateEdges(inputs[])` operation
  - Create multiple edges in a single operation
  - Validate all edges (referential integrity, uniqueness) before writing
  - Single index update after all writes
- [ ] **KG-OPS-093**: Implement bulk creation transaction semantics
  - If any single entity fails validation, reject the entire batch
  - If a write fails partway through, clean up successfully-written entities
  - Report which items failed and why

### 9.2 Bulk Update

- [ ] **KG-OPS-094**: Implement `bulkUpdateSpecs(updates[])` operation
  - Each update: `{ id: string, changes: Partial<SpecUpdate> }`
  - Apply all updates, then update indexes once
  - Return array of updated specs and any errors
- [ ] **KG-OPS-095**: Implement `bulkUpdateEdges(updates[])` operation
  - Each update: `{ id: string, changes: Partial<EdgeUpdate> }`
  - Apply all updates with single index refresh

### 9.3 Bulk Delete

- [ ] **KG-OPS-096**: Implement `bulkDeleteSpecs(ids[], options)` operation
  - Delete multiple specs with cascading options
  - Collect all affected edges and documents
  - Perform cleanup in batch
  - Single index rebuild after all deletions
- [ ] **KG-OPS-097**: Implement `bulkDeleteEdges(ids[])` operation
  - Delete multiple edges in a single operation
  - Single index update

### 9.4 Batch Operation Utilities

- [ ] **KG-OPS-098**: Implement batch operation progress tracking
  - Report progress: `{ total: number, completed: number, failed: number, current: string }`
  - Emit progress events for UI consumption (via WebSocket)
- [ ] **KG-OPS-099**: Implement batch operation size limits
  - Maximum batch size: 100 entities per operation (configurable)
  - Prevent memory issues and excessively long operations
  - Larger imports should use the streaming import pipeline

#### Design Decisions

> **Q**: Should batch operations be atomic (all-or-nothing) or best-effort?
> **A**: Best-effort with a detailed result report. Each item in the batch is processed independently. The response includes `{ succeeded: [...], failed: [{ id, error }] }`. Atomic all-or-nothing would require a transaction across multiple JSON files and git operations, which is impractical.

> **Q**: Should batch operations be cancellable mid-execution?
> **A**: Yes, for batches >50 items. The batch operation runs asynchronously and returns a `batchId`. The client can poll for progress and send a cancel request. Items already processed are committed; remaining items are skipped.

> **Q**: Should there be rate limiting on batch operations?
> **A**: Yes. Maximum batch size: 500 items per request. Maximum concurrent batches per user: 1. Maximum items per minute per user: 1,000. Limits are configurable in `.kg-config.json`.

> **Q**: Should batch create support inter-entity references within the batch?
> **A**: Yes. Batch items are processed in order. A batch can create a spec in item 1 and create an edge referencing that spec in item 2. Forward references are resolved in a second pass.

---

## 10. Import & Export

### 10.1 Export

- [ ] **KG-OPS-100**: Implement `exportGraph(options)` operation
  - Options: `{ format: 'json' | 'csv' | 'graphml', includeContent: boolean, specIds?: string[] }`
  - Export full graph or a subset
  - Include specs, edges, documents, and metadata
- [ ] **KG-OPS-101**: Implement JSON export format
  - Single JSON file with specs, edges, and documents arrays
  - Include metadata and content inline
  - Suitable for backup and transfer
- [ ] **KG-OPS-102**: Implement CSV export format
  - Separate CSV files: `specs.csv`, `edges.csv`, `documents.csv`
  - Flatten nested structures for tabular representation
  - Suitable for spreadsheet analysis
- [ ] **KG-OPS-103**: Implement GraphML export format
  - Standard graph exchange format
  - Compatible with graph visualization tools (Gephi, Cytoscape)
  - Include node/edge attributes
- [ ] **KG-OPS-104**: Implement streaming export for large graphs
  - Write output incrementally (not buffer entire graph in memory)
  - Support pagination for very large exports

### 10.2 Import

- [ ] **KG-OPS-105**: Implement `importGraph(data, options)` operation
  - Options: `{ format: 'json', mode: 'merge' | 'replace', dryRun: boolean }`
  - Parse input data
  - Validate all entities
  - Write to knowledge graph
- [ ] **KG-OPS-106**: Implement merge import mode
  - Merge imported entities with existing graph
  - Skip existing entities (by ID) or update them
  - Detect and report conflicts
- [ ] **KG-OPS-107**: Implement replace import mode
  - Clear existing graph and replace with imported data
  - Backup current state before replacing
  - Used for restoring from a backup
- [ ] **KG-OPS-108**: Implement import validation
  - Validate all entities against schemas
  - Check referential integrity within the import data
  - Check for ID collisions with existing data (in merge mode)
  - Report all validation errors before applying changes
- [ ] **KG-OPS-109**: Implement import from external graph formats
  - Accept common graph formats and convert to knowledge graph schema
  - Map external properties to spec/edge fields
  - Handle unmappable properties via the `custom` metadata field
- [ ] **KG-OPS-110**: Implement import progress reporting
  - Report: entities parsed, validated, written
  - Stream progress via WebSocket for UI display

#### Design Decisions

> **Q**: Should the import pipeline support incremental imports or only full replacements?
> **A**: Incremental by default. Imports add to the existing graph without affecting existing specs. A `--replace` flag enables full replacement for disaster recovery scenarios.

> **Q**: How should ID collisions during import be handled?
> **A**: Generate new IDs for imported specs. Import always assigns fresh nanoids to prevent collision. An `idMapping` is returned showing `{ originalId → newId }` for each imported entity.

> **Q**: Should imports preserve the original entity IDs or always generate new ones?
> **A**: Always generate new IDs. Round-tripping is supported through the ID mapping, not through ID preservation. Preserving foreign IDs risks silent collisions.

> **Q**: Should the system support importing from common knowledge management formats (Obsidian, Notion, Roam)?
> **A**: v1 supports import from Markdown files (directory of `.md` files) and a JSON bulk format. Obsidian/Notion/Roam importers are deferred to future iterations or community plugins.

> **Q**: Should exports include version history or only the current state?
> **A**: Current state only. Version history lives in git and is not portable via export.

> **Q**: Should exports be filtered by permissions?
> **A**: Yes. Export respects the requesting user's permissions. Full-access specs are exported with full content. Summary-access specs are exported with summary only.

> **Q**: Should there be a scheduled/automatic export for backup purposes?
> **A**: No. The git repo IS the backup. Every clone is a full backup of all knowledge graph data. PostgreSQL handles its own backup strategy.

---

## 11. Validation Operations

### 11.1 Structural Validation

- [ ] **KG-OPS-111**: Implement `validateGraph()` full graph validation
  - Run all validation checks
  - Return comprehensive report: errors, warnings, suggestions
  - Used for periodic health checks and post-import validation
- [ ] **KG-OPS-112**: Implement broken edge detection
  - Find edges referencing non-existent source or target specs
  - Report edge IDs and missing spec IDs
  - Suggest auto-fix: delete broken edges
- [ ] **KG-OPS-113**: Implement circular dependency detection
  - Find cycles in `depends-on` edge subgraph
  - Report cycle paths
  - Circular dependencies are valid but should be reviewed
  - Suggest creating inquiry items for detected cycles
- [ ] **KG-OPS-114**: Implement document-spec consistency validation
  - Verify bidirectional references between documents and specs
  - Detect specs claiming document membership that documents don't include
  - Detect documents listing specs that don't claim membership
  - Auto-fix by reconciling both directions

### 11.2 Data Quality Validation

- [ ] **KG-OPS-115**: Implement missing metadata detection
  - Find specs with empty tags
  - Find specs with empty or default summaries
  - Find specs with stale or missing embeddings
  - Report as warnings for improvement
- [ ] **KG-OPS-116**: Implement content quality checks
  - Find specs with very short content (<50 characters)
  - Find specs with very long content (>100KB)
  - Find specs with broken internal links (`[[sp_xxxxx]]` referencing non-existent specs)
  - Report as suggestions
- [ ] **KG-OPS-117**: Implement edge quality checks
  - Find edges with very low confidence (<0.2)
  - Find edges with empty rationale
  - Find specs with suspiciously high edge counts (>50)
  - Report as suggestions for review

### 11.3 Index Validation

- [ ] **KG-OPS-118**: Implement index consistency check
  - Compare each index against filesystem reality
  - Detect missing entries (entity exists, index doesn't know)
  - Detect orphaned entries (index references non-existent entity)
  - Report discrepancies with auto-fix suggestions
- [ ] **KG-OPS-119**: Implement index rebuild on validation failure
  - If index validation finds errors, offer automatic rebuild
  - Rebuild affected indexes only (not all indexes)
  - Verify rebuilt indexes pass validation

---

## 12. Graph Crawling for Agents

### 12.1 Agent Crawl Strategy

- [ ] **KG-OPS-120**: Implement `agentCrawl(startSpecId, strategy, options)` operation
  - Strategies: `'breadth-first' | 'depth-first' | 'priority' | 'semantic'`
  - Agents use this to explore the graph intelligently
  - Return traversal results with context for agent consumption
- [ ] **KG-OPS-121**: Implement priority-based crawl strategy
  - Crawl order determined by edge metadata (strength, confidence, agentAnalysis scores)
  - Higher-priority edges explored first
  - Use a priority queue instead of FIFO/LIFO
  - Agent-specific priority functions (passed as parameters)
- [ ] **KG-OPS-122**: Implement semantic crawl strategy
  - Given a query or topic, use RAG similarity to guide traversal
  - At each node, score neighboring specs by semantic similarity to the query
  - Follow most relevant neighbors first
  - Combines graph structure with semantic understanding
- [ ] **KG-OPS-123**: Implement crawl context accumulation
  - As the agent crawls, accumulate a context object
  - Track: visited specs, edge paths, collected content, relevance scores
  - Context size limit to prevent unbounded accumulation
  - Agent decides when to stop crawling based on context quality

### 12.2 Agent Traversal Hooks

- [ ] **KG-OPS-124**: Implement `onNodeVisited` callback for agent crawl
  - Agent receives spec data at each visited node
  - Agent can decide to: continue, skip children, stop crawling
  - Agent can annotate the node (add to context, flag for inquiry)
- [ ] **KG-OPS-125**: Implement `onEdgeTraversed` callback for agent crawl
  - Agent receives edge data when following an edge
  - Agent can decide whether to follow the edge
  - Agent can update edge metadata based on analysis
- [ ] **KG-OPS-126**: Implement crawl budget constraints
  - Maximum nodes to visit
  - Maximum time spent crawling
  - Maximum context size accumulated
  - When budget is exhausted, return current results with "budget exceeded" flag

### 12.3 Agent Graph Analysis

- [ ] **KG-OPS-127**: Implement `analyzeSpecContext(specId)` operation for agents
  - Gather full context around a spec: neighbors, edges, document membership, tags
  - Format context for agent consumption (structured summary)
  - Include edge metadata (rationale, strength) for relationship understanding
- [ ] **KG-OPS-128**: Implement `findRelatedClusters(specId)` operation for agents
  - Identify clusters of specs related to a given spec
  - Group by edge type: dependency cluster, topic cluster, contradiction cluster
  - Help agent understand the broader context
- [ ] **KG-OPS-129**: Implement `suggestEdges(specId)` operation for agents
  - Analyze a spec and suggest potential edges based on:
    - Content similarity (via RAG)
    - Shared tags
    - Shared document membership
    - Shared neighbors
  - Return suggested edges with confidence and rationale

#### Design Decisions

> **Q**: Should agents have a default crawl strategy, or must every crawl request specify a strategy?
> **A**: Default strategy: breadth-first traversal from the context spec(s), following all edge types, depth 3. Agents can override with specific strategies: `{ strategy: 'dependency-tree' | 'semantic-expansion' | 'contradiction-check', depth: N, edgeTypes: [...] }`.

> **Q**: How should agents handle cycles during crawling?
> **A**: Visit each node once (visited-set deduplication). No revisiting. The agent receives the full subgraph structure and can reason about cycles from the topology without revisiting.

> **Q**: Should the semantic crawl strategy use the spec's existing embedding or generate a fresh embedding of the query?
> **A**: Generate a fresh embedding of the agent's query. The semantic crawl starts by embedding the agent's current question/context, querying pgvector for the top-K nearest specs, then expanding from those specs via graph edges.

> **Q**: Should agents be able to "bookmark" interesting nodes during a crawl?
> **A**: Yes, via the agent session context. The `bookmarkedSpecIds` array persists within the session and can be used as starting points for subsequent crawls. Bookmarks are session-scoped.

> **Q**: Should agents crawl the entire graph or only specs the requesting user has access to?
> **A**: Agents crawl all specs the user has access to, using the user's permission level. Per the PRD: "never no-access." Agents always see at least summaries of all specs. Full-access specs provide complete content; summary-access specs provide only the summary.

> **Q**: Should there be a global crawl budget per agent session?
> **A**: Yes. Maximum 500 unique specs visited per agent session. Maximum 5 crawl operations per session. If more exploration is needed, the user starts a new session.

> **Q**: How should crawl results integrate with the agent's conversation context?
> **A**: Summaries for breadth, full content for depth. The crawl returns summaries for all visited nodes. The agent selects the most relevant specs and requests full content for those (up to 10 full specs per crawl).

---

## 13. Inquiry Queue Management

### 13.1 Create Inquiry

- [ ] **KG-OPS-130**: Implement `createInquiry(input)` operation
  - Accept: type, targetId, targetType, title, description, severity, createdBy
  - Generate inquiry ID
  - Write `inquiries/{inquiry-id}.json`
  - Return created inquiry
- [ ] **KG-OPS-131**: Define inquiry types
  - `orphan-spec` — spec has no edges or document membership
  - `broken-edge` — edge references non-existent spec
  - `contradiction` — agent detected contradictory specs
  - `missing-metadata` — spec lacks important metadata (tags, summary)
  - `stale-content` — spec hasn't been updated in a long time
  - `suggested-edge` — agent suggests a new edge
  - `quality-issue` — content quality concern (too short, unclear, etc.)
- [ ] **KG-OPS-132**: Define inquiry severity levels
  - `critical` — blocks graph integrity or correctness
  - `warning` — may indicate a problem, needs review
  - `info` — suggestion for improvement

### 13.2 Inquiry Lifecycle

- [ ] **KG-OPS-133**: Implement `listInquiries(options)` operation
  - Options: `{ status?: InquiryStatus[], type?: InquiryType[], severity?: string[], targetId?: string, limit?: number, offset?: number, sortBy?: string }`
  - Filter and paginate inquiry list
  - Sort by severity (critical first), then creation date
- [ ] **KG-OPS-134**: Implement `acknowledgeInquiry(id, userId)` operation
  - Transition status from `open` to `acknowledged`
  - Record acknowledging user and timestamp
- [ ] **KG-OPS-135**: Implement `resolveInquiry(id, userId, resolution)` operation
  - Transition status from `open` or `acknowledged` to `resolved`
  - Record resolution description, resolving user, timestamp
  - If resolution involves an action (e.g., "deleted broken edge"), perform the action
- [ ] **KG-OPS-136**: Implement `dismissInquiry(id, userId, reason)` operation
  - Transition to `dismissed` status
  - Record dismissal reason (e.g., "not an issue", "by design", "deferred")
- [ ] **KG-OPS-137**: Implement `reopenInquiry(id, userId)` operation
  - Transition from `resolved` or `dismissed` back to `open`
  - Used when a resolution didn't actually fix the issue
- [ ] **KG-OPS-138**: Implement inquiry auto-creation from validation
  - After running `validateGraph()`, auto-create inquiries for detected issues
  - Skip creating duplicates (check if an open inquiry already exists for the same target)

### 13.3 Inquiry Statistics

- [ ] **KG-OPS-139**: Implement `getInquiryStatistics()` operation
  - Count by status: open, acknowledged, resolved, dismissed
  - Count by type
  - Count by severity
  - Average resolution time
  - Oldest unresolved inquiry

#### Design Decisions

> **Q**: Should only agents create inquiries, or can users create them too?
> **A**: Both agents and users can create inquiries. Users can flag any spec or edge for review, creating an inquiry with type `user-flagged`. Agent-created inquiries have types like `orphan-detected`, `contradiction-found`, `edge-suggestion`.

> **Q**: Should inquiries be created automatically from validation results, or only when explicitly triggered?
> **A**: Both. Structural validation failures during write operations auto-create inquiries. Semantic validation runs during agent crawls and periodic integrity checks. Users can also manually create inquiries.

> **Q**: Should there be duplicate inquiry detection?
> **A**: Yes. Before creating an inquiry, check for existing open inquiries with the same `(type, targetSpecId, targetEdgeId)` tuple. If a match exists, update the existing inquiry's `lastOccurrence` timestamp and increment its `occurrenceCount`.

> **Q**: How should inquiries be prioritized?
> **A**: Multi-factor priority score: `priority = severity × 10 + age_days + edge_count_of_affected_spec`. Severity levels: `critical` (3), `warning` (2), `info` (1). The UI sorts by computed priority descending, with manual pin-to-top available.

> **Q**: Should the UI show a badge count for open inquiries?
> **A**: All three locations. Navigation sidebar shows a total open inquiry count badge. The graph visualization marks specs with open inquiries using a small indicator dot. The spec detail view shows a banner: "2 open inquiries for this spec."

> **Q**: Should resolved inquiries be cleaned up or retained indefinitely?
> **A**: Retained for 90 days after resolution, then auto-purged. The audit log in PostgreSQL captures the resolution event permanently even after the inquiry record is purged.

---

## 14. Cascading Operations

### 14.1 Spec Deletion Cascading

- [ ] **KG-OPS-140**: Define cascading behavior for spec deletion
  - Edges: all edges to/from the spec are deleted
  - Documents: spec is removed from all document specIds arrays
  - Inquiries: all inquiries targeting the spec are dismissed with "target deleted"
  - Index: all index entries for the spec are removed
  - Embeddings: RAG layer notified to remove spec from vector index
- [ ] **KG-OPS-141**: Implement cascading deletion with a dependency report
  - Before deleting, enumerate everything that will be affected
  - Return report: `{ edges: number, documents: number, inquiries: number }`
  - Require confirmation (force flag) if cascading would affect many entities

### 14.2 Spec Status Change Cascading

- [ ] **KG-OPS-142**: Define cascading behavior for spec deprecation
  - When a spec is deprecated: edges remain but marked for review
  - Create inquiries for all specs that `depend-on` the deprecated spec
  - Agents should re-evaluate relationships to deprecated specs
- [ ] **KG-OPS-143**: Define cascading behavior for spec archival
  - When a spec is archived: edges can be soft-deleted or left as-is
  - Spec is excluded from default traversals and searches
  - RAG layer removes archived spec from active index

### 14.3 Edge Deletion Cascading

- [ ] **KG-OPS-144**: Define cascading behavior for edge deletion
  - Edges are relatively self-contained; minimal cascading
  - Update edge index (remove from adjacency lists)
  - If the deleted edge was the only edge for a spec, check for orphan status
  - If the deleted edge was a `supersedes` edge, review if the source spec needs status update

### 14.4 Document Deletion Cascading

- [ ] **KG-OPS-145**: Define cascading behavior for document deletion
  - Specs: remove document from each spec's documentIds
  - Check for orphaned specs (no remaining document membership)
  - Create inquiries for newly orphaned specs
  - Indexes: update document index and spec-to-document reverse mapping

#### Design Decisions

> **Q**: Should cascading operations be performed synchronously or asynchronously?
> **A**: Synchronously for immediate cascades (edge deletion on spec delete, status change on supersedes). Asynchronously for agent-triggered analysis (crawl for implications, orphan detection, edge suggestions).

> **Q**: Should the user be shown a preview of cascading effects before confirming the operation?
> **A**: Yes, for destructive operations (delete, deprecate, archive). The API returns a dry-run preview. Non-destructive operations (create, update content) do not require preview.

> **Q**: Should cascading operations create an audit log entry describing all changes made?
> **A**: Yes. Every cascading operation creates a single audit log entry in PostgreSQL with `action: 'cascade'`, listing all affected entities. The git commit message also includes structured trailers.

> **Q**: When a spec is deprecated, should its edges' confidence be automatically reduced?
> **A**: N/A. There is no confidence field on edges (per PRD). When a spec is deprecated, its edges remain as-is. Agent crawls that traverse through deprecated specs can create inquiries suggesting edge review.

---

## 15. Orphan Detection & Management

### 15.1 Orphan Detection

- [ ] **KG-OPS-146**: Implement `detectOrphans()` operation
  - Find all specs with zero edges (no relationships)
  - Find all specs with zero documentIds (no document membership)
  - Find specs that are both (completely isolated)
  - Return categorized orphan lists
- [ ] **KG-OPS-147**: Implement `detectWeaklyConnected()` operation
  - Find specs with only one edge (tenuously connected)
  - Find specs whose only connection is a `weak`-strength edge
  - These may need additional edges for proper integration
- [ ] **KG-OPS-148**: Implement scheduled orphan detection
  - Run orphan detection periodically (configurable interval)
  - Auto-create inquiries for newly detected orphans
  - Skip already-inquired orphans

### 15.2 Orphan Positioning

- [ ] **KG-OPS-149**: Implement `suggestPositionForOrphan(specId)` operation
  - Use RAG similarity to find specs most similar to the orphan
  - Suggest edges to create (with type and target)
  - Suggest documents to add the orphan to
  - Return ranked suggestions with confidence scores
- [ ] **KG-OPS-150**: Implement bulk orphan positioning
  - Run positioning suggestions for all orphans
  - Prioritize by orphan age (older orphans first)
  - Create inquiry items with suggested actions

### 15.3 Orphan Cleanup

- [ ] **KG-OPS-151**: Implement `cleanupOrphans(options)` operation
  - Options: `{ action: 'archive' | 'delete' | 'inquire', minAge: number }`
  - Archive orphans older than minAge (e.g., 30 days)
  - Or delete if explicitly requested
  - Or create inquiries for human review (default)

#### Design Decisions

> **Q**: What defines an "orphan" — no edges, no document membership, or both?
> **A**: An orphan is a spec with zero edges AND zero document memberships. A spec with edges but no document is "undocumented" (a milder concern). A spec with a document but no edges is "isolated" (also informational). Only the zero-edges-AND-zero-documents case triggers the full orphan workflow.

> **Q**: Should orphan detection run automatically on a schedule, or only when triggered?
> **A**: Both. Automatic scan every 10 minutes during active server operation. Also triggered immediately after operations that could create orphans: spec deletion, edge deletion, document deletion.

> **Q**: Should the system suggest document placement for orphans?
> **A**: Yes. The orphan positioning system uses RAG to find the most semantically similar specs, then checks which documents those specs belong to. The inquiry suggests both edge connections AND document placement.

> **Q**: Should there be an "orphan inbox" view in the UI?
> **A**: Yes. A dedicated "Orphan Inbox" view in the UI, accessible from the navigation sidebar. It lists all orphan specs with their RAG-suggested placements and edge connections. This is a filtered view of the inquiry queue scoped to orphan-type inquiries.

---

## Additional Design Decisions

> **Q**: Should CRUD operations return the updated entity or just a success acknowledgment?
> **A**: Return the updated entity. The overhead is minimal (one extra JSON serialization of an object already in memory). Returning the entity eliminates a follow-up GET request from the frontend, reducing total round-trips.

> **Q**: Should read operations support field selection to reduce payload size?
> **A**: Yes, via a `fields` query parameter. Default returns: `id, title, summary, status, tags, updatedAt`. Full returns: all fields including content. Compact returns: `id, title` only.

> **Q**: At what operation volume does the JSON file-based storage become a bottleneck?
> **A**: JSON file-based storage handles up to ~100 write operations per second on SSD. The in-memory LRU cache serves most read requests without hitting disk. A PostgreSQL spec registry (lightweight table mirroring spec ID, title, status, tags) is maintained in parallel for fast queries. The JSON files remain the source of truth; PostgreSQL is the query accelerator.

> **Q**: Should frequently-used graph operations (neighborhood queries, statistics) be cached with a TTL?
> **A**: Yes. Neighborhood traversals: 30-second TTL. Graph statistics (total specs, edge counts, orphan counts): 60-second TTL. Caches are invalidated on any write operation.

---

## Summary

### Task Count by Section

| Section                           | Tasks                              |
| --------------------------------- | ---------------------------------- |
| 1. Spec CRUD Operations           | 24 (KG-OPS-001 through KG-OPS-024) |
| 2. Edge CRUD Operations           | 15 (KG-OPS-025 through KG-OPS-039) |
| 3. Spec Document CRUD Operations  | 13 (KG-OPS-040 through KG-OPS-052) |
| 4. Graph Traversal                | 9 (KG-OPS-053 through KG-OPS-061)  |
| 5. Subgraph Extraction            | 7 (KG-OPS-062 through KG-OPS-068)  |
| 6. Path Finding                   | 6 (KG-OPS-069 through KG-OPS-074)  |
| 7. Graph Statistics & Analysis    | 7 (KG-OPS-075 through KG-OPS-081)  |
| 8. Search & Filtering             | 9 (KG-OPS-082 through KG-OPS-090)  |
| 9. Batch Operations               | 9 (KG-OPS-091 through KG-OPS-099)  |
| 10. Import & Export               | 11 (KG-OPS-100 through KG-OPS-110) |
| 11. Validation Operations         | 9 (KG-OPS-111 through KG-OPS-119)  |
| 12. Graph Crawling for Agents     | 10 (KG-OPS-120 through KG-OPS-129) |
| 13. Inquiry Queue Management      | 10 (KG-OPS-130 through KG-OPS-139) |
| 14. Cascading Operations          | 6 (KG-OPS-140 through KG-OPS-145)  |
| 15. Orphan Detection & Management | 6 (KG-OPS-146 through KG-OPS-151)  |
| **TOTAL**                         | **151**                            |

### Dependencies (What This Plan Enables)

Completion of this plan unblocks:

- `06-AGENT-SYSTEM/03-MCP-SERVERS-PLAN.md` — needs CRUD operations, graph traversal, crawling API
- `06-AGENT-SYSTEM/05-PLAN-GENERATION-PLAN.md` — needs graph crawling, subgraph extraction, dependency chains
- `03-SERVER/02-API-PLAN.md` — needs operation signatures for REST endpoint design
- `02-FRONTEND/07-KNOWLEDGE-GRAPH-UI-PLAN.md` — needs traversal, neighborhood, statistics for visualization
- `02-FRONTEND/06-SPEC-EDITOR-PLAN.md` — needs spec CRUD, document operations

### Definition of Done

This plan is complete when:

- [ ] Full CRUD operations work for specs, edges, and documents
- [ ] All index files update correctly after every operation
- [ ] Graph traversal (BFS, DFS, filtered) works with configurable options
- [ ] Subgraph extraction returns correct subsets
- [ ] Path finding returns shortest and all paths
- [ ] Batch operations handle >50 entities without failure
- [ ] Import/export round-trips without data loss (export → import → export produces identical output)
- [ ] Validation detects all defined integrity issues
- [ ] Agent crawl strategies work with priority and semantic modes
- [ ] Inquiry queue supports full lifecycle (create → acknowledge → resolve/dismiss)
- [ ] Cascading operations handle spec/edge/document deletion correctly
- [ ] Orphan detection identifies all disconnected specs
- [ ] All operations enforce permissions and anti-siloing
