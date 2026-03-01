# 04-KNOWLEDGE-GRAPH / 02 — OPERATIONS: Open Questions

> **Purpose**: Unresolved questions about knowledge graph operations including
> CRUD behavior, traversal strategies, batch processing, import/export, graph
> crawling, and inquiry queue design. Answers may change tasks in the plan.

---

## 1. Spec CRUD

### 1.1 Creation
- **Q**: When creating a spec, should the system auto-generate an initial summary
  from the content, or leave it empty until an agent fills it in?

**A:** Auto-generate via agent. When a spec is created with content, the agent produces a 1–2 sentence summary asynchronously and writes it to `spec.json.summary`. If the spec is created empty (draft), the summary field is left blank until content is added. The summary generation is a lightweight agent call, not a blocking operation — the spec is immediately available, and the summary populates within seconds.

- **Q**: Should spec creation require a document association, or should
  standalone (document-less) specs be allowed by default?

**A:** Standalone specs are allowed by default. Document association is optional at creation time. Orphan detection (no edges AND no document) will surface truly disconnected specs via the inquiry queue, but a spec with edges and no document is perfectly valid. Forcing document association at creation time would slow down rapid spec authoring and agent-generated specs.

- **Q**: Should the system prevent creation of specs with titles identical to
  existing specs? Or are duplicate titles acceptable since IDs are unique?

**A:** Allow duplicate titles. Titles are descriptive labels, not identifiers. Different specs may legitimately share a title (e.g., "Authentication" in different contexts). The nanoid is the unique identifier. If an agent detects near-duplicate specs (same title + similar content), it creates an inquiry suggesting a `contradicts` or `supersedes` edge rather than blocking creation.

- **Q**: When a spec is created via the chat dialog (agent-assisted), should the
  agent auto-suggest tags and edge connections, or wait for explicit user
  instruction?

**A:** Auto-suggest. The agent proposes tags and edge connections as part of the creation flow, displayed to the user for approval. The user can accept, modify, or dismiss suggestions. Accepted edges are created immediately. This aligns with the PRD: "Edge associations initially created by agent crawl." The creation dialog is the first crawl opportunity.

### 1.2 Updates
- **Q**: Should spec content updates be tracked as full replacements or as diffs
  (patches)? Storing diffs would save space but adds complexity.

**A:** Full replacements. Each save writes the complete `content.md` and `spec.json` files. Git handles diffing and storage efficiency natively via packfiles and delta compression. Application-level diff storage is redundant with git and adds unnecessary complexity. Git `diff` provides the diff view when needed.

- **Q**: Should updating a spec's status trigger notifications to users who have
  edges to that spec? (e.g., spec they depend on is deprecated)

**A:** Yes, for `deprecated` and `archived` status transitions only. When a spec moves to `deprecated` or `archived`, the system creates notifications for all users who own or have permissions on specs with `depends-on` edges targeting the affected spec. Other status transitions (`draft` → `review` → `active`) do not trigger notifications — they are normal workflow progression.

- **Q**: Should the `contributors` list cap at a maximum number, or grow
  unbounded?

**A:** Unbounded. The contributors list is an array of user IDs in `spec.json`. Even with 100 contributors, this is a few KB of JSON. There is no practical reason to cap it. Contributors are append-only (no removal) and deduplicated.

- **Q**: When updating spec permissions, should existing summary-level users be
  notified that their access level changed?

**A:** No. Permission changes are administrative operations. The user experiences the change organically — they either see full content or a summary on next access. Sending notifications about permission changes creates noise and may reveal information about the permission structure that should remain opaque.

### 1.3 Deletion
- **Q**: Should spec deletion be a hard delete (remove files) or always a soft
  delete (archive) with a separate purge operation?

**A:** Hard delete of files with cascade removal of edges and document references. Git history preserves the full content of every deleted spec permanently. There is no need for a soft-delete layer on top of git — `git log` and `git show` can recover any deleted spec at any time. The `archived` status serves the "soft delete" use case for specs the user wants to keep but deactivate.

- **Q**: Should deleting a spec require a confirmation step (e.g., "this will
  remove 12 edges and affect 3 documents"), or is the cascade option sufficient?

**A:** Yes, require a confirmation step. Before deletion, the API returns a preview: `{ edgesRemoved: 12, documentsAffected: ['dc_...', 'dc_...'], dependentSpecs: ['sp_...'] }`. The frontend displays this preview and requires explicit confirmation. This prevents accidental data loss and aligns with the principle that spec revision triggers awareness of implications.

- **Q**: Should deleted specs leave behind a tombstone file for historical
  reference, or rely entirely on git history?

**A:** Rely on git history. No tombstone files. The deletion commit message includes the deleted spec's ID, title, and a summary of cascade effects (structured Conventional Commit trailers). `git log` is the permanent record. Tombstone files would accumulate endlessly and clutter the working tree.

- **Q**: How long should soft-deleted (archived) specs be retained before
  permanent purge? 30 days? 90 days? Never auto-purge?

**A:** Never auto-purge archived specs. Archival is an intentional user action to deactivate a spec while preserving it. If a user wants permanent removal, they use the explicit delete operation. Auto-purge creates a foot-gun where users lose specs unexpectedly. Archived specs have minimal cost (they're just files on disk).

---

## 2. Edge Operations

### 2.1 Creation & Lifecycle
- **Q**: Should edges have a `proposed` status that requires human confirmation
  before becoming `active`? This would prevent agents from creating
  relationships without review.

**A:** No edge status field. Per the PRD: "No confidence on edges. Issues → inquiry queue for user attention." Agent-created edges are immediately active. If the agent is uncertain, it creates an inquiry alongside the edge. The inquiry queue is the review mechanism, not an edge lifecycle state machine.

- **Q**: For agent-created edges, should there be a probation period during which
  the edge is visible but marked as "unverified"?

**A:** No probation period. Agent-created edges are full-class edges from the moment of creation. They are distinguished by `createdByType: 'agent'` metadata, which the UI can use to display a subtle visual indicator (e.g., a small robot icon). If a user disagrees with an agent edge, they delete it or create an inquiry. This keeps the graph simple and avoids a two-tier edge system.

- **Q**: Should creating a `supersedes` edge automatically change the target
  spec's status to `deprecated`?

**A:** Yes. Creating a `supersedes` edge from spec A to spec B automatically sets spec B's status to `deprecated`. This is the semantic meaning of supersession — the target is replaced. The agent logs this status change in the commit message. If the user disagrees, they can revert the status change or delete the supersedes edge.

- **Q**: Should the system enforce a maximum number of edges per spec to prevent
  hub nodes from becoming navigational bottlenecks?

**A:** No hard limit. Some specs are naturally hub-like (foundational concepts, shared dependencies). Enforcing a limit would artificially fragment the graph. Instead, the UI paginates edges when displaying a spec with many connections (show first 20, "load more" for the rest). If a spec accumulates >50 edges, the system creates an inquiry suggesting the spec may need decomposition.

### 2.2 Bidirectional Edges
- **Q**: For bidirectional types (`related-to`, `contradicts`), should the system
  normalize storage (always store with lexicographically smaller ID as source)
  or store as-is?

**A:** Store as-is, with back-references. The spec that initiates the relationship is the source. A back-reference entry is added to the target spec's edge file with the same `edgeId` and `direction: 'incoming'`. This preserves authorial intent (who linked to whom) while making reverse traversal efficient. Lexicographic normalization would obscure the relationship's origin.

- **Q**: When deleting a bidirectional edge, does the direction matter for the
  delete operation, or can either spec ID be specified?

**A:** Either spec ID can be specified. Deletion by `edgeId` removes the edge from both the source and target edge files. The `edgeId` is globally unique, so direction is irrelevant for the delete operation. The API accepts `DELETE /edges/{edgeId}` — no need to specify source or target.

### 2.3 Edge Metadata
- **Q**: Should edge `agentAnalysis` metadata be versioned (keep history of
  analysis changes) or overwritten each time?

**A:** Overwritten. The edge has a `rationale` text field (free-form explanation). When an agent re-analyzes an edge, the rationale is replaced with the latest analysis. Historical analysis is preserved in git commit history. Versioning agent analysis within the edge JSON would create unbounded growth.

- **Q**: Should there be a "last verified" timestamp on edges to track how
  recently the relationship was confirmed as still valid?

**A:** No. Edge validity is managed through the inquiry queue and agent crawls, not timestamps. An agent crawl that re-encounters an existing edge implicitly confirms it. If a crawl finds a stale or invalid edge, it creates an inquiry. Adding a `lastVerified` timestamp creates a maintenance burden (who updates it? how often?) with minimal practical value.

---

## 3. Document Operations

### 3.1 Document Structure
- **Q**: Should documents support sections or chapters that group specs within
  the document, or is a flat ordered list sufficient?

**A:** Flat ordered list with optional section dividers. The document's `specOrder` array is a list of entries, each either `{ type: 'spec', specId: '...' }` or `{ type: 'divider', label: 'Section Name' }`. This gives visual grouping without introducing nested hierarchy. Dividers are purely presentational — they have no semantic meaning for the graph.

- **Q**: Should a single spec's removal from a document trigger reindexing
  of the document, or batch the reindex?

**A:** No reindexing needed. Documents are just ordered references to specs. Removing a spec reference is a JSON array splice — there is no document-level index to rebuild. The document file is updated immediately.

- **Q**: Should there be a maximum number of specs per document? Large documents
  may be unwieldy.

**A:** Soft limit of 200 specs per document, enforced as a warning (not a hard block). The UI shows a warning when a document exceeds 200 specs: "This document is large. Consider splitting it into multiple documents." No hard limit because some use cases (e.g., a comprehensive project overview) may legitimately need large documents.

- **Q**: Should documents support "pinned" specs that always appear at the top
  regardless of order?

**A:** No. The `specOrder` array is the single source of ordering. If a user wants certain specs at the top, they put them at the top of the list. Pinning creates an implicit ordering layer that conflicts with the explicit order and adds UI complexity.

### 3.2 Document Lifecycle
- **Q**: Should publishing a document (draft → published) trigger any validation
  (e.g., all referenced specs must be `active`)?

**A:** Yes. Publishing validates that all referenced specs exist and are in `active` or `review` status. Specs in `draft`, `deprecated`, or `archived` status generate a warning (not a hard block): "This document references 2 draft specs. Publish anyway?" This gives users control while surfacing potential issues.

- **Q**: Can an archived document be un-archived, or is archival permanent?

**A:** Un-archiving is allowed. Documents can move freely between `draft`, `published`, and `archived` states. Archival is reversible. The only irreversible operation is deletion (which removes the document file, with git history as the recovery path).

- **Q**: Should document deletion be restricted if the document contains specs
  that would become orphans?

**A:** No restriction, but a warning. Before deletion, the API returns a preview showing which specs would become orphans (no remaining document membership AND no edges). The user sees: "Deleting this document will leave 5 specs without a document. Delete anyway?" The orphan detection system will also surface these specs in the inquiry queue.

---

## 4. Graph Traversal

### 4.1 Traversal Performance
- **Q**: What is the maximum acceptable traversal depth? Traversals deeper than
  10 hops could be very expensive. Should there be a hard limit?

**A:** Hard limit of 10 hops. Default depth: 3 hops (immediate neighborhood). The API accepts a `depth` parameter with max value 10. For `depends-on` transitive resolution, the limit is also 10 hops — dependency chains deeper than 10 indicate a structural problem that should be flagged as an inquiry. Traversal uses BFS with visited-set deduplication.

- **Q**: Should traversal results be cached? If a user requests the same
  neighborhood twice, should the second request be instant?

**A:** Yes, cache with 30-second TTL. Traversal results are cached in-memory keyed by `(specId, depth, edgeTypes, direction)`. Cache is invalidated globally when any edge write occurs (conservative but simple). At typical usage patterns, cache hit rate will be high for repeated neighborhood views.

- **Q**: For traversals that visit many nodes (>1000), should results be
  streamed incrementally or returned all at once?

**A:** Return all at once with a result cap of 500 nodes. Traversals that would exceed 500 nodes are truncated with a `truncated: true` flag and a message: "Result limited to 500 nodes. Narrow your query." Streaming adds WebSocket complexity for a rare edge case. The 500-node cap keeps response sizes manageable (<1MB JSON).

### 4.2 Traversal Semantics
- **Q**: For `depends-on` edge traversal, should transitive dependencies be
  resolved (A depends-on B depends-on C means A transitively depends on C)?

**A:** Yes, transitive resolution is available as an explicit query option: `GET /specs/{id}/dependencies?transitive=true`. Default behavior returns only direct dependencies (depth 1). Transitive resolution uses BFS up to the 10-hop limit and returns the full dependency tree as a DAG (detecting and reporting cycles if found).

- **Q**: Should `contradicts` edges be treated as blocking during dependency
  traversal? (If A depends-on B and B contradicts C, is the dependency chain
  from A to C valid?)

**A:** `contradicts` edges do not block traversal. They are informational — the traversal includes them in results with a flag indicating contradiction. The agent or user decides whether a contradiction is relevant to their analysis. Contradictions between specs in a dependency chain should generate an inquiry for human review, not silently block traversal.

- **Q**: Should traversal results include the full spec data, or just IDs and
  summaries to keep responses lightweight?

**A:** IDs and summaries by default. The API supports a `fields` parameter to request additional data: `?fields=id,title,summary` (default), `?fields=id,title,summary,status,tags`, or `?fields=full` for complete spec data. This keeps default responses lightweight while allowing callers to request more data when needed.

- **Q**: Should the graph support "virtual edges" — edges that are inferred from
  transitive relationships but not explicitly stored?

**A:** No virtual edges. All edges are explicitly stored. Transitive relationships are computed on-demand via traversal queries. Storing inferred edges would bloat the graph combinatorially and create confusion about which edges are authoritative vs. derived. The traversal API with `transitive=true` serves this use case.

---

## 5. Search & Filtering

### 5.1 Search Capabilities
- **Q**: Should full-text search use a dedicated search index (like lunr.js or
  MiniSearch) or always delegate to RAG? Dedicated search is faster for exact
  matches; RAG is better for semantic similarity.

**A:** Delegate to RAG for all search. RAG (pgvector with metadata filtering) handles both semantic similarity and keyword-style queries. Adding a separate full-text search index creates two search paths returning potentially different results, confusing users. pgvector's metadata filtering supports exact-match queries on tags, status, and title fields. For literal string search in content, a PostgreSQL `tsvector` column on the spec registry table can supplement pgvector.

- **Q**: Should search support regular expressions for power users?

**A:** No. Regex search over file content would require scanning all spec files — expensive and rarely needed. The combination of semantic search (RAG), tag filtering, and status filtering covers the vast majority of search needs. Power users who need regex can use git grep on the repo directly.

- **Q**: Should search results include a relevance score explanation (why this
  spec matched)?

**A:** Yes, include a brief explanation. Each search result includes: `{ specId, title, summary, score, matchReason: 'semantic similarity' | 'tag match' | 'title match' }`. The `matchReason` helps users understand why a result appeared, especially when it seems tangential. Detailed score breakdowns (vector distance, boost factors) are exposed only in the API response, not the UI.

- **Q**: Should the search API support faceted search (e.g., show count of
  results per tag, per status)?

**A:** Not in v1. Faceted search requires aggregation across all results, which conflicts with the top-K nature of vector search. If needed later, faceted counts can be computed from the spec registry table in PostgreSQL (which has tag and status columns). Defer until user demand is clear.

### 5.2 Performance
- **Q**: Should search indexes be rebuilt incrementally or from scratch on each
  query? For small graphs, from-scratch may be fast enough.

**A:** Incrementally. The pgvector index is persistent and updated incrementally as specs are embedded. There is no per-query rebuild. The HNSW index in pgvector handles incremental inserts efficiently. A full rebuild is only needed when switching embedding models (re-embed all specs).

- **Q**: At what graph size does search performance become unacceptable without
  a dedicated search index?

**A:** pgvector with HNSW index handles up to 100K vectors with <50ms query latency. This exceeds the target scale (50K specs). No additional search infrastructure is needed within the design target. If the system ever exceeds 100K specs, a dedicated vector database (Qdrant, Weaviate) is the migration path.

---

## 6. Batch Operations

- **Q**: Should batch operations be atomic (all-or-nothing) or best-effort
  (apply what succeeds, report what fails)?

**A:** Best-effort with a detailed result report. Each item in the batch is processed independently. The response includes `{ succeeded: [...], failed: [{ id, error }] }`. Atomic all-or-nothing would require a transaction across multiple JSON files and git operations, which is impractical. Best-effort lets 99 specs succeed even if 1 has a validation error.

- **Q**: Should batch operations be cancellable mid-execution?

**A:** Yes, for batches >50 items. The batch operation runs asynchronously and returns a `batchId`. The client can poll `GET /batches/{batchId}` for progress and send `DELETE /batches/{batchId}` to cancel. Items already processed are committed; remaining items are skipped. For batches ≤50 items, processing is synchronous and completes in <2 seconds — no cancellation needed.

- **Q**: Should there be rate limiting on batch operations to prevent a single
  user from monopolizing server resources?

**A:** Yes. Maximum batch size: 500 items per request. Maximum concurrent batches per user: 1. Maximum items per minute per user: 1,000. These limits prevent runaway agent operations from starving other users. Limits are configurable in `.kg-config.json`.

- **Q**: Should batch create support inter-entity references within the batch
  (e.g., create a spec and an edge to it in the same batch)?

**A:** Yes. Batch items are processed in order. A batch can create a spec in item 1 and create an edge referencing that spec in item 2. Forward references (edge referencing a spec created later in the batch) are resolved in a second pass. This is essential for agent operations that create a cluster of related specs and edges in one logical action.

---

## 7. Import & Export

### 7.1 Import
- **Q**: Should the import pipeline support incremental imports (add to existing
  graph) or only full replacements?

**A:** Incremental by default. Imports add to the existing graph without affecting existing specs. A `--replace` flag enables full replacement (wipe and reimport) for disaster recovery scenarios. Incremental import is the common case — a user adding content from an external source.

- **Q**: How should ID collisions during import be handled? Skip, overwrite,
  generate new ID, or fail?

**A:** Generate new IDs for imported specs. Import always assigns fresh nanoids to prevent collision with existing specs. An `idMapping` is returned in the import result showing `{ originalId → newId }` for each imported entity. This enables round-tripping if the user needs to map back to external systems.

- **Q**: Should imports preserve the original entity IDs or always generate new
  ones? Preserving IDs enables round-tripping; new IDs prevent collisions.

**A:** Always generate new IDs (see above). Round-tripping is supported through the ID mapping, not through ID preservation. Preserving foreign IDs risks silent collisions and violates the invariant that all IDs are system-generated nanoids with type prefixes.

- **Q**: Should the system support importing from common knowledge management
  formats (Obsidian, Notion, Roam)?

**A:** v1 supports import from Markdown files (directory of `.md` files, each becoming a spec) and a JSON bulk format (array of spec objects). Obsidian/Notion/Roam importers are deferred to future iterations or community plugins. The JSON bulk format is flexible enough that external conversion scripts can target it.

### 7.2 Export
- **Q**: Should exports include version history or only the current state?

**A:** Current state only. The export produces a snapshot of all specs, edges, and documents as they exist now. Version history lives in git and is not portable via export. If a user needs history, they clone the git repo.

- **Q**: Should exports be filtered by permissions (only export what the user
  can see)?

**A:** Yes. Export respects the requesting user's permissions. Specs the user has `full` access to are exported with full content. Specs the user has `summary` access to are exported with summary only. This prevents data leakage through the export path.

- **Q**: Should there be a scheduled/automatic export for backup purposes?

**A:** No. The git repo IS the backup. Every clone is a full backup of all knowledge graph data. PostgreSQL handles its own backup strategy (see Database plan). A scheduled export to a separate format would be redundant.

---

## 8. Graph Crawling for Agents

### 8.1 Crawl Strategy
- **Q**: Should agents have a default crawl strategy, or must every crawl
  request specify a strategy?

**A:** Default strategy: breadth-first traversal from the context spec(s), following all edge types, depth 3. This is the "neighborhood discovery" default. Agents can override with specific strategies: `{ strategy: 'dependency-tree' | 'semantic-expansion' | 'contradiction-check', depth: N, edgeTypes: [...] }`. The default handles the common case without requiring configuration.

- **Q**: How should agents handle cycles during crawling? Visit each node once
  (already planned), or allow revisiting if the path context is different?

**A:** Visit each node once (visited-set deduplication). No revisiting. Cycles are common in knowledge graphs (`A related-to B related-to C related-to A`). Allowing revisits would create infinite loops or exponential blowup. The agent receives the full subgraph structure (nodes + edges) and can reason about cycles from the topology without revisiting.

- **Q**: Should the semantic crawl strategy use the spec's existing embedding or
  generate a fresh embedding of the query?

**A:** Generate a fresh embedding of the agent's query. The semantic crawl starts by embedding the agent's current question/context, querying pgvector for the top-K nearest specs, then expanding from those specs via graph edges. Using spec embeddings for the seed query would not capture the agent's specific intent.

- **Q**: Should agents be able to "bookmark" interesting nodes during a crawl
  for later focused analysis?

**A:** Yes, via the agent session context. The agent session (stored in PostgreSQL `agent_sessions.context_json`) maintains a `bookmarkedSpecIds` array. Bookmarks persist within the session and can be used as starting points for subsequent crawls. Bookmarks are session-scoped — they don't modify the knowledge graph.

### 8.2 Crawl Scope
- **Q**: Should agents crawl the entire graph or only specs the requesting user
  has access to? Anti-siloing suggests at least summary access.

**A:** Agents crawl all specs the user has access to, using the user's permission level. Per the PRD: "Permissions: full, summary, never no-access." Since there is never no-access, agents always see at least summaries of all specs. Full-access specs provide complete content to the agent; summary-access specs provide only the summary. This respects permissions while preventing information silos.

- **Q**: Should there be a global crawl budget per agent session (across
  multiple crawl operations)?

**A:** Yes. Maximum 500 unique specs visited per agent session. Maximum 5 crawl operations per session. These limits prevent runaway agent behavior and keep costs bounded. The agent receives its remaining budget in each crawl response. If more exploration is needed, the user starts a new session (which gets a fresh budget).

- **Q**: How should crawl results integrate with the agent's conversation
  context? Should the entire crawl context be included in the agent's prompt,
  or just summaries?

**A:** Summaries for breadth, full content for depth. The crawl returns summaries for all visited nodes. The agent selects the most relevant specs (based on its reasoning) and requests full content for those (up to 10 full specs per crawl). This keeps the context window manageable while allowing deep analysis of the most pertinent specs.

---

## 9. Inquiry Queue

### 9.1 Inquiry Creation
- **Q**: Should only agents create inquiries, or can users create them too
  (e.g., "flag this spec for review")?

**A:** Both agents and users can create inquiries. Users can flag any spec or edge for review, creating an inquiry with type `user-flagged`. Agent-created inquiries have types like `orphan-detected`, `contradiction-found`, `edge-suggestion`, `spec-quality-concern`. The inquiry queue is the universal "needs attention" system.

- **Q**: Should inquiries be created automatically from validation results, or
  only when explicitly triggered?

**A:** Both. Structural validation failures during write operations auto-create inquiries (e.g., "spec X references non-existent tag category"). Semantic validation (orphan detection, contradiction analysis) runs during agent crawls and periodic integrity checks, auto-creating inquiries for issues found. Users can also manually create inquiries.

- **Q**: Should there be duplicate inquiry detection (don't create a new
  inquiry if one already exists for the same issue)?

**A:** Yes. Before creating an inquiry, check for existing open inquiries with the same `(type, targetSpecId, targetEdgeId)` tuple. If a match exists, update the existing inquiry's `lastOccurrence` timestamp and increment its `occurrenceCount` instead of creating a duplicate. This prevents the queue from filling with repeated alerts for the same issue.

### 9.2 Inquiry Prioritization
- **Q**: How should inquiries be prioritized? By severity alone, or also by
  age, affected spec importance, or user preference?

**A:** Multi-factor priority score: `priority = severity × 10 + age_days + edge_count_of_affected_spec`. Severity levels: `critical` (3), `warning` (2), `info` (1). Critical: structural integrity violations, contradictions in dependency chains. Warning: orphaned specs, agent-suggested edges. Info: quality suggestions, minor cleanup. The UI sorts by computed priority descending, with manual pin-to-top available.

- **Q**: Should the UI show a badge count for open inquiries? Where — in the
  navigation, on the graph, on affected specs?

**A:** All three. Navigation sidebar shows a total open inquiry count badge (like unread email). The graph visualization marks specs with open inquiries using a small indicator dot. The spec detail view shows a banner: "2 open inquiries for this spec." These are lightweight UI indicators that draw attention without being intrusive.

- **Q**: Should resolved inquiries be cleaned up (deleted) or retained
  indefinitely for audit purposes?

**A:** Retained for 90 days after resolution, then auto-purged. Resolved inquiries provide useful audit context (what issues were found and how they were resolved). The 90-day window covers most review cycles. The audit log in PostgreSQL captures the resolution event permanently even after the inquiry record is purged.

---

## 10. Cascading & Side Effects

- **Q**: Should cascading operations be performed synchronously (within the
  same request) or asynchronously (queued for background processing)?

**A:** Synchronously for immediate cascades (edge deletion on spec delete, status change on supersedes). Asynchronously for agent-triggered analysis (crawl for implications, orphan detection, edge suggestions). The user sees the direct cascading effects immediately in the response; indirect effects (agent analysis) arrive as inquiries in the background.

- **Q**: Should the user be shown a preview of cascading effects before
  confirming the operation?

**A:** Yes, for destructive operations (delete, deprecate, archive). The API returns a dry-run preview: `{ edgesAffected: [...], documentsAffected: [...], dependentSpecs: [...] }`. The frontend displays this preview and requires confirmation. Non-destructive operations (create, update content) do not require preview.

- **Q**: Should cascading operations create an audit log entry describing all
  changes made?

**A:** Yes. Every cascading operation creates a single audit log entry in PostgreSQL with `action: 'cascade'`, listing all affected entities. The git commit message also includes structured trailers (`Edges-Removed: eg_..., eg_...`, `Documents-Updated: dc_...`). Both the database audit log and git history provide full traceability.

- **Q**: When a spec is deprecated, should its edges' confidence be
  automatically reduced?

**A:** N/A. There is no confidence field on edges (per PRD: "No confidence on edges"). When a spec is deprecated, its edges remain as-is. The `deprecated` status on the spec itself signals that the relationships may be stale. Agent crawls that traverse through deprecated specs can create inquiries suggesting edge review.

---

## 11. Orphan Management

- **Q**: What defines an "orphan" — no edges, no document membership, or both?
  A spec with edges but no document might still be well-connected in the graph.

**A:** An orphan is a spec with zero edges AND zero document memberships. A spec with edges but no document is "undocumented" (a milder concern — the inquiry is informational). A spec with a document but no edges is "isolated" (also informational). Only the zero-edges-AND-zero-documents case triggers the full orphan workflow with positioning suggestions.

- **Q**: Should orphan detection run automatically on a schedule, or only when
  triggered?

**A:** Both. Automatic scan every 10 minutes during active server operation. Also triggered immediately after operations that could create orphans: spec deletion (which removes edges/document refs), edge deletion, document deletion. The periodic scan catches edge cases missed by event-driven triggers.

- **Q**: Should the system suggest document placement for orphans (not just edge
  suggestions)?

**A:** Yes. The orphan positioning system uses RAG to find the most semantically similar specs, then checks which documents those specs belong to. The inquiry suggests both edge connections AND document placement: "Orphan spec 'X' may belong in document 'Y' (3 related specs are there). Suggested edges: related-to 'Z', derived-from 'W'."

- **Q**: Should there be an "orphan inbox" view in the UI where users can triage
  orphaned specs?

**A:** Yes. A dedicated "Orphan Inbox" view in the UI, accessible from the navigation sidebar. It lists all orphan specs with their RAG-suggested placements and edge connections. Users can bulk-accept suggestions, dismiss, or manually assign. This is a filtered view of the inquiry queue scoped to orphan-type inquiries.

---

## 12. Performance & Scalability

- **Q**: Should CRUD operations return the updated entity or just a success
  acknowledgment? Returning the entity is convenient but adds overhead.

**A:** Return the updated entity. The overhead is minimal (one extra JSON serialization of an object already in memory). Returning the entity eliminates a follow-up GET request from the frontend, reducing total round-trips. All create and update operations return the full entity; delete returns `{ deleted: true, id: '...' }`.

- **Q**: Should read operations support field selection (only return requested
  fields) to reduce payload size?

**A:** Yes, via a `fields` query parameter. Default returns: `id, title, summary, status, tags, updatedAt`. Full returns: all fields including content. Compact returns: `id, title` only. The three presets (`default`, `full`, `compact`) plus custom field lists cover all use cases without GraphQL complexity.

- **Q**: At what operation volume does the JSON file-based storage become a
  bottleneck? Should there be a threshold at which operations fall through to a
  PostgreSQL cache?

**A:** JSON file-based storage handles up to ~100 write operations per second on SSD (each write = 2 files × ~5ms). For read-heavy workloads, the in-memory LRU cache serves most requests without hitting disk. A PostgreSQL spec registry (lightweight table mirroring spec ID, title, status, tags) is maintained in parallel for fast queries that don't need full content (listing, filtering, counting). The JSON files remain the source of truth; PostgreSQL is the query accelerator.

- **Q**: Should frequently-used graph operations (neighborhood queries,
  statistics) be cached with a TTL?

**A:** Yes. Neighborhood traversals: 30-second TTL. Graph statistics (total specs, edge counts, orphan counts): 60-second TTL. Caches are invalidated on any write operation to ensure freshness. The TTL prevents thundering herd on repeated identical queries.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
|------|----------|----------|-----------|
| — | — | — | — |
