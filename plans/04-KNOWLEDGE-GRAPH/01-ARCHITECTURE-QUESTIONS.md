# 04-KNOWLEDGE-GRAPH / 01 — ARCHITECTURE: Open Questions

> **Purpose**: Unresolved questions about the knowledge graph data model,
> storage layout, schema design, indexing strategy, and integrity mechanisms.
> Answers may change tasks in the plan.

---

## 1. Storage Format & Layout

### 1.1 File Granularity
- **Q**: The plan splits each spec into three files (`spec.json`, `content.md`,
  `metadata.json`). Is this the right granularity, or should `spec.json` and
  `metadata.json` be merged into a single file to reduce filesystem operations?

**A:** Merge `spec.json` and `metadata.json` into a single `spec.json` file. Keep `content.md` separate. Two files per spec instead of three reduces filesystem operations by 33%, simplifies atomic writes, and keeps a clean separation between structured data (JSON) and authored prose (Markdown). The merged `spec.json` carries all fields: identity, status, tags, contributors, timestamps, custom metadata, and the content hash. Embedding vectors are stored exclusively in pgvector — never in the JSON file — so there is no bloat concern.

- **Q**: Should the `content.md` file support frontmatter (YAML header) for any
  per-content metadata, or should all metadata remain strictly in
  `metadata.json`?

**A:** No frontmatter. All metadata lives in `spec.json`. Frontmatter would create two sources of truth for the same spec, complicate parsing, and risk desync. `content.md` is pure Markdown prose — nothing else.

- **Q**: Is there a performance concern with thousands of small directories in
  `specs/`? Should we benchmark directory listing performance at 10K, 50K, and
  100K spec directories?

**A:** This is solved by the hash-bucketed file structure (`specs/{bucket}/{id}.json`). Specs are not stored as directories — each spec is two files (`{id}.json` + `{id}.md`) inside a 2-character hex bucket derived from the nanoid. With 256 buckets, 10K specs averages ~39 entries per bucket, and 100K specs averages ~390 entries per bucket — well within filesystem comfort. No benchmarking needed; this is a proven sharding pattern.

### 1.2 Sharding
- **Q**: At what spec count should sharding activate? Is 10,000 the right
  threshold, or should it be lower (1,000) or higher (100,000)?

**A:** Sharding is always active from day one. The hash-bucketed structure (`specs/{bucket}/`) is the default and only layout. There is no "flat mode" that later migrates to sharding. This eliminates a migration step entirely. The overhead of 256 buckets for a small project (10 specs) is negligible — a few empty directories.

- **Q**: Should sharding be based on the first N characters of the ID, or use a
  hash-based distribution? Hash-based is more uniform; prefix-based is human-
  readable.

**A:** Hash-based. Take the first 2 hex characters of a SHA-256 hash of the nanoid. This gives uniform distribution across 256 buckets regardless of nanoid character patterns. Human-readability of bucket names is irrelevant — users never navigate the raw file tree; they use the UI or API.

- **Q**: If sharding is enabled, should the shard depth be configurable (1
  level vs. 2 levels of prefix directories)?

**A:** Fixed at 1 level of 256 buckets (2 hex chars). A single level is sufficient for up to ~100K specs (~390 files per bucket). Two levels (65,536 buckets) would create excessive empty directories for typical projects. If a project ever exceeds 100K specs, a one-time migration to 2-level sharding can be scripted, but this is not an expected scenario.

### 1.3 Edge Storage
- **Q**: Should edges be stored as individual files (one per edge) or grouped
  by source spec (all edges from spec X in one file)? Individual files give
  finer-grained git history but create more filesystem entries.

**A:** Grouped by source spec. Store all outgoing edges from a spec in a single `edges/{bucket}/{sourceSpecId}.json` file containing an array of edge objects. This keeps filesystem entry count manageable (one edge file per spec that has edges, not one per edge), and groups related changes for cleaner git diffs. A spec with 5 edges produces one file, not five.

- **Q**: For bidirectional edge types (`related-to`, `contradicts`), should
  there be one file stored under the lexicographically smaller spec ID, or
  always under the source?

**A:** Store under the source spec that initiated the relationship. For bidirectional edges, also add a back-reference entry in the target spec's edge file. This means bidirectional edges appear in two files, but each spec's edge file is self-contained for traversal. The `edgeId` is the same in both entries, with a `direction` field (`outgoing` | `incoming`) distinguishing them. This avoids the need for a global scan to find all edges touching a spec.

- **Q**: Should edge files be co-located with specs (`specs/{id}/edges/`)
  rather than in a separate `edges/` directory? Co-location groups related data
  but complicates cross-spec edge queries.

**A:** Separate `edges/` directory with the same hash-bucketed structure as `specs/`. Co-location would require specs to be directories instead of files, increasing complexity. A parallel `edges/{bucket}/{specId}.json` structure keeps edges organized and independently queryable while maintaining the same bucketing scheme. The adjacency index provides fast cross-spec edge lookups.

---

## 2. ID Generation

### 2.1 ID Format
- **Q**: Should the project use nanoid (21 chars, URL-safe) or UUID v7
  (sortable by time, widely recognized)? UUID v7 provides time-ordering which
  aids debugging.

**A:** nanoid (21 chars, URL-safe alphabet `A-Za-z0-9_-`). Per the PRD, nanoid is the chosen ID generator. Time-ordering is not needed — specs have explicit `createdAt` timestamps in `spec.json`, and git commit history provides chronological ordering. nanoid is shorter, more compact in URLs, and avoids the overhead of UUID formatting.

- **Q**: Is the `sp_`, `eg_`, `dc_`, `iq_` prefix convention sufficient for
  type identification, or should prefixes be longer/more descriptive?

**A:** The short prefixes are sufficient. `sp_` (spec), `eg_` (edge), `dc_` (document), `iq_` (inquiry). These are internal identifiers, not user-facing labels. Short prefixes keep IDs compact while providing instant type discrimination in logs, debugging, and code. Full format example: `sp_V1StGXR8_Z5jdHi6B-myT`.

- **Q**: Should IDs be case-sensitive? The plan uses `A-Za-z0-9_-` which is
  case-sensitive, but some systems (Windows filesystem) are case-insensitive.

**A:** IDs are case-sensitive in the application layer but stored in hash-bucketed files keyed by the full ID string. Since file names are the full ID (`sp_V1StGXR8_Z5jdHi6B-myT.json`), and nanoid's 64-character alphabet with 21 characters provides 128 bits of entropy, collision probability is negligible even on case-insensitive filesystems. However, to be safe, use nanoid's default URL-safe alphabet which includes both cases — the hash bucket (derived from SHA-256 of the ID) uses only lowercase hex, so bucket directory names are case-insensitive safe. File name collisions on case-insensitive systems are astronomically unlikely given the entropy.

- **Q**: Should deleted entity IDs be tombstoned (stored in a deletion log) to
  prevent accidental reuse, or is nanoid's entropy sufficient?

**A:** nanoid's entropy is sufficient. With 21 characters from a 64-character alphabet, the probability of generating a duplicate is vanishingly small (128 bits of entropy). No tombstone file is needed. Git history serves as the permanent record of any deleted entity. A deletion log would add complexity with no practical benefit.

### 2.2 ID Persistence
- **Q**: Should spec IDs be exposed directly in URLs and user-facing UI, or
  should there be a human-readable slug alongside the technical ID?

**A:** Expose spec IDs directly in URLs. No slugs. IDs are short enough to be URL-friendly (e.g., `/specs/sp_V1StGXR8_Z5jdHi6B-myT`). Slugs create a synchronization burden (title changes, uniqueness enforcement, slug collisions). The spec title is displayed in the UI alongside the ID — users never need to memorize or type IDs.

- **Q**: If a spec's title changes, should any URL slug change? Or should slugs
  be immutable once assigned (like GitHub issue numbers)?

**A:** N/A — no slugs are used. URLs use the immutable nanoid. Title changes have zero impact on URLs or references.

---

## 3. Schema Design

### 3.1 Spec Schema
- **Q**: Should the spec `status` field include a `review` state between
  `draft` and `active`? Some workflows require explicit review before
  activation.

**A:** Yes, include `review`. The full status enum is: `draft` → `review` → `active` → `deprecated` → `archived`. The `review` state is valuable because agent-created or agent-modified specs should pass through human review before becoming active. This aligns with the inquiry queue model — a spec in `review` status naturally pairs with an inquiry for user attention.

- **Q**: Should specs have a `priority` or `importance` field that agents can
  use for traversal weighting?

**A:** No dedicated `priority` field. Importance is emergent from graph topology (edge count, centrality) and explicit through edge types (`depends-on` chains indicate structural importance). Adding a numeric priority would create a maintenance burden and conflicting signals. Agents can derive importance from graph structure during crawl.

- **Q**: Should the `createdAt` and `updatedAt` fields be stored in the JSON or
  derived entirely from git commit timestamps? Storing in JSON is redundant with
  git but faster to read.

**A:** Store in JSON. Reading `createdAt`/`updatedAt` from git requires a `git log` call per spec, which is expensive at scale. The JSON fields are the fast-access source of truth. They are set by the application at write time and committed to git. Git commit timestamps serve as an independent audit trail but are not the primary read path.

- **Q**: Should specs support a `parentSpecId` field for hierarchical
  decomposition (parent-child specs), or should hierarchy be expressed purely
  through edges?

**A:** Hierarchy through edges only, using the `derived-from` edge type. A dedicated `parentSpecId` would create a parallel hierarchy system that competes with the edge graph. The `derived-from` edge naturally models parent-child decomposition. Documents provide the grouping/ordering structure; edges provide the relationship semantics.

### 3.2 Edge Schema
- **Q**: Should edges have a `status` field (active, proposed, rejected)?
  Agent-proposed edges could be `proposed` until human-confirmed.

**A:** No status field on edges. Per the PRD, there is no confidence on edges. Issues with edges go to the inquiry queue for user attention. Agent-created edges are immediately active. If a user or agent questions an edge, an inquiry is created. The inquiry queue is the review mechanism, not an edge status field. This keeps edges simple and avoids "invisible" proposed edges cluttering the graph.

- **Q**: Should the `confidence` field be required or optional? If optional,
  what default should be assumed?

**A:** No confidence field. The PRD explicitly states: "No confidence on edges." Remove it from the schema entirely. Issues and uncertainties route through the inquiry queue.

- **Q**: Is the `strength` enum (`strong`, `moderate`, `weak`) sufficiently
  granular, or should it be a numeric scale (1–10)?

**A:** Remove the `strength` field as well. With no confidence and a fixed edge taxonomy (`derived-from`, `depends-on`, `related-to`, `contradicts`, `supersedes`), the edge type itself carries the semantic weight. Adding strength creates a subjective scale that agents and users will interpret inconsistently. Keep edges as pure typed connections. If nuance is needed, it belongs in the edge's `rationale` text field (free-form explanation of why the edge exists).

- **Q**: Should edges support a `validFrom` / `validUntil` temporal range for
  relationships that are only valid during certain periods?

**A:** No temporal range. Edges are either present or not. If a relationship becomes invalid, the edge is deleted (or the target spec is deprecated/superseded). Git history preserves the full temporal record of when edges existed. Adding temporal fields creates query complexity with minimal practical value.

- **Q**: Should the edge `createdBy` field distinguish between human-created
  and agent-created edges? (e.g., `createdByType: 'human' | 'agent'`)

**A:** Yes. Store `createdBy` as the user ID and add a `createdByType: 'human' | 'agent'` field. This is lightweight metadata that helps the inquiry queue — the system can prioritize review of agent-created edges. It also supports the PRD model where "edge associations initially created by agent crawl, users can add edges too."

### 3.3 Document Schema
- **Q**: Should documents support nested sections or sub-documents, or is a
  flat ordered list of specs sufficient?

**A:** Flat ordered list of spec references. Documents are grouping containers with an explicit ordering, not hierarchical outlines. If a user needs sub-grouping, they create multiple documents. This keeps the document schema simple and avoids recursive nesting complexity.

- **Q**: Should documents have their own permissions separate from their
  constituent specs, or are document permissions derived from spec permissions?

**A:** Derived from spec permissions. A user sees a document if they have access (full or summary) to at least one spec in it. Each spec within the document renders according to the user's permission level for that spec. No separate document-level permission table.

- **Q**: Should documents support a `template` concept where new documents can
  inherit structure from a template?

**A:** Not in v1. Templates add schema complexity for a feature that can be approximated by cloning an existing document. Defer to a future iteration if user demand emerges.

### 3.4 Metadata Schema
- **Q**: Should the embedding vector be stored in `metadata.json` or in a
  separate file (e.g., `embedding.bin` or `embedding.json`) to keep metadata
  small? Embedding vectors can be large (1536 floats = ~12KB as JSON).

**A:** Embedding vectors are stored exclusively in pgvector (PostgreSQL), never in the git-tracked JSON files. The vector store is the source of truth for embeddings. This keeps the git repo lean, avoids large binary diffs on every re-embedding, and leverages pgvector's native indexing for similarity search. The `spec.json` file stores only a `contentHash` field that lets the system detect when re-embedding is needed.

- **Q**: Should the `custom` field in metadata have any structure at all (e.g.,
  reserved keys for known agent types), or be fully free-form?

**A:** Free-form JSON object with no reserved keys. The `custom` field in `spec.json` is an escape hatch for project-specific metadata. Imposing structure defeats the purpose. Agent-specific metadata (like analysis results) is stored in the edge's `rationale` or in the agent session context in PostgreSQL, not in the spec's custom field.

- **Q**: Should metadata include a `quality` score that agents compute to
  indicate spec completeness, clarity, and usefulness?

**A:** No quality score stored on the spec. Quality assessment is an agent operation that produces inquiries ("this spec is vague, needs clarification") rather than a persistent numeric field. A stored quality score goes stale immediately after content changes and creates a misleading signal if not continuously recomputed.

---

## 4. Index Design

### 4.1 Index Strategy
- **Q**: Should indexes be stored as JSON files in the repository (git-tracked)
  or generated at runtime and stored outside git (ephemeral)? Git-tracked
  indexes are portable but create merge conflicts; ephemeral indexes need
  rebuild on clone.

**A:** Ephemeral — git-ignored and rebuilt at server startup. Indexes are caches derived from the authoritative JSON spec/edge files. Git-tracking indexes creates noisy diffs and merge conflicts on every operation. Rebuilding from 10K specs takes seconds (JSON parsing, no network calls). Add `indexes/` to `.gitignore`.

- **Q**: Should indexes be considered a cache (rebuildable from source data) or
  authoritative (consulted as the source of truth)? If cache, how do we handle
  the rebuild cost?

**A:** Cache, always rebuildable. Rebuild cost is bounded: parsing 10K JSON files from local disk takes <2 seconds on SSD. The server builds indexes into memory on startup and maintains them incrementally during operation. If indexes become corrupt, a restart fully recovers them. No durability concern.

- **Q**: At what scale do JSON index files become too large to load into memory?
  Should there be a threshold beyond which indexes move to a database (e.g.,
  SQLite or PostgreSQL)?

**A:** In-memory indexes are viable up to ~100K specs. A full adjacency index for 100K specs with 5 edges each is ~50K entries × ~200 bytes ≈ 10MB in memory. A tag index, status index, and ID-to-path lookup add another ~20MB. Total ~30MB — trivial for a server process. No database fallback needed within the target scale. If the system ever exceeds 100K specs, the PostgreSQL-backed spec registry (lightweight rows mirroring spec IDs + key fields) can serve as the index.

### 4.2 Index Updates
- **Q**: Should index updates be synchronous (update index in the same
  operation as entity write) or asynchronous (queue index updates for a
  background process)?

**A:** Synchronous. Index updates are in-memory hash map insertions — sub-millisecond operations. There is no benefit to async queuing for something this fast. Keeping indexes synchronous guarantees read-after-write consistency.

- **Q**: Should indexes include a sequence number or change counter so clients
  can detect if their cached version is current?

**A:** Yes. Maintain a global monotonically increasing `indexVersion` counter (in-memory, starting at the server startup timestamp). Every write operation increments it. Clients can include `If-None-Match: {indexVersion}` in requests to detect staleness. This is cheap (one integer) and enables efficient cache invalidation on the frontend.

- **Q**: Should the edge index include full adjacency lists, or just edge IDs
  that require a second lookup? Full lists are faster but larger.

**A:** Full adjacency lists. Each entry in the in-memory adjacency index maps a spec ID to an array of `{ edgeId, targetSpecId, type, direction }` objects. This enables single-lookup traversal without hitting disk. The memory overhead is modest (~200 bytes per edge × 50K edges = 10MB).

### 4.3 Additional Indexes
- **Q**: Should there be a `status-index.json` mapping spec statuses to spec
  IDs for fast filtering?

**A:** Yes, as an in-memory index (not a JSON file — indexes are ephemeral). Maintain a `Map<SpecStatus, Set<specId>>` for instant filtering by status. Rebuilt from spec files on startup.

- **Q**: Should there be a `search-index.json` for full-text search, or should
  full-text search always go through RAG?

**A:** Full-text search goes through RAG (pgvector + metadata filtering). No separate full-text search index. The RAG layer handles both semantic similarity and keyword-style queries. Adding a parallel search index (lunr, MiniSearch) creates two search paths that can return inconsistent results. RAG is the single search interface.

- **Q**: Should there be a `dependency-graph-index.json` that pre-computes
  transitive closures for `depends-on` edges?

**A:** No. Transitive closures are expensive to maintain (O(n²) in the worst case) and invalidated by any edge change. Compute transitive dependencies on-demand via BFS/DFS traversal of the adjacency index, which is fast for typical depths (≤10 hops). Cache results with short TTL (30 seconds) if a specific traversal is requested repeatedly.

---

## 5. Integrity & Validation

### 5.1 Constraint Enforcement
- **Q**: Should integrity constraints be enforced strictly (reject invalid
  operations) or permissively (allow and flag for later cleanup)? Strict is
  safer but may block agent operations.

**A:** Strict for structural invariants (valid JSON schema, valid edge type taxonomy, referential integrity of edge endpoints). Permissive for semantic concerns (duplicate-looking specs, orphaned specs, potentially contradictory edges) — these generate inquiries for user review. This split ensures the graph is always structurally valid while allowing agents to work freely within the type system.

- **Q**: Should integrity checks run on every write operation, or only
  periodically? Per-write adds latency; periodic allows transient
  inconsistencies.

**A:** Structural validation on every write (JSON schema validation is <1ms). Semantic integrity checks (orphan detection, contradiction analysis) run asynchronously after agent crawls or on a periodic schedule (every 5 minutes during active usage). This keeps write latency low while ensuring semantic issues are surfaced promptly.

- **Q**: How should the system handle integrity violations discovered during
  git merge? Should the merge be rejected, or should violations be auto-queued
  as inquiries?

**A:** Auto-queue as inquiries. Rejecting a merge blocks collaboration. Instead, complete the merge, run a post-merge integrity scan, and create inquiries for any violations (dangling edge references, schema mismatches). The inquiry queue is designed for exactly this — surfacing issues that need human attention.

### 5.2 Cascading Behavior
- **Q**: When a spec is deleted, should its edges be automatically deleted
  (cascade) or orphaned (flagged)? The operations plan covers this, but the
  architecture should define the default.

**A:** Cascade delete. When a spec is deleted, all edges where it is a source or target are removed. This is the only safe default — orphaned edges with dangling references would fail structural integrity checks. The deletion operation shows a preview of affected edges before confirmation.

- **Q**: When a spec is archived, should its edges be retained, archived, or
  weakened (reduce strength)?

**A:** Retained as-is. Archived specs remain in the graph with all their edges intact. Archival means the spec is inactive for active development but its relationships are still valid for historical context and traversal. An archived spec can be un-archived, at which point its edges are already correct.

- **Q**: Should document-spec references be updated automatically when a spec
  is deleted, or should the document retain a "missing spec" placeholder?

**A:** Automatically remove the spec reference from the document's ordered list. The document should not contain references to non-existent specs. A log entry in the deletion's commit message records which documents were affected.

---

## 6. Schema Versioning & Migration

### 6.1 Migration Timing
- **Q**: Should migrations run automatically on server startup (if pending), or
  require explicit manual/CLI invocation?

**A:** Automatic on server startup for development environments. Explicit `bun run kg:migrate` CLI invocation for production. The server checks the `schema-version.json` in the repo against the expected version on startup and logs a warning if migration is needed but not auto-applied. Environment variable `KG_AUTO_MIGRATE=true` enables auto-migration (default true in dev, false in prod).

- **Q**: Should migrations be forward-only (no rollback support), or must every
  migration have a `down()` function?

**A:** Forward-only. Rollback of file-schema migrations in a git-tracked repo is handled by `git revert` of the migration commit. Writing `down()` functions for file-format migrations is error-prone and rarely tested. If a migration goes wrong, revert the commit and fix the migration script.

- **Q**: How should migrations handle multi-user scenarios where one user's
  client is ahead of another's schema version?

**A:** The server enforces the schema version. When a user pulls changes that include a migration, their local server runs the migration on startup (or prompts them to run it). If a user's local repo has an older schema version than the server expects, the server refuses to start and logs an error with the required migration command. Schema version is tracked in `schema-version.json` in the repo root.

### 6.2 Migration Scope
- **Q**: Should migrations also handle index schema changes, or are indexes
  always rebuilt from scratch when their schema changes?

**A:** Indexes are always rebuilt from scratch. Since indexes are ephemeral in-memory caches, there is no index migration. If the index structure changes, the new server code simply builds the new index format on startup.

- **Q**: Should migrations be testable in isolation (unit tests for each
  migration script)?

**A:** Yes. Each migration script should be a pure function that takes an input file path and transforms it. Unit tests provide a before/after JSON fixture and assert the transformation is correct. This is cheap to write and prevents data corruption during upgrades.

- **Q**: How long should a migration be expected to take for 10K specs? 100K
  specs? Should there be a progress indicator?

**A:** 10K specs: <10 seconds (JSON read-transform-write at ~1ms per file). 100K specs: <2 minutes. Yes, display a progress bar with `[{completed}/{total}] Migrating specs...` output. Migrations are I/O-bound, not CPU-bound, so parallelizing file reads (batch of 100 concurrent) keeps times low.

---

## 7. Performance & Scale

### 7.1 Expected Scale
- **Q**: What is the target maximum number of specs the system should handle?
  1,000? 10,000? 100,000? This drives sharding, indexing, and caching
  decisions.

**A:** Design target: 50,000 specs. Comfortable operating range: 1–10,000 specs (typical project). Hard upper bound before architecture reassessment: 100,000 specs. Most projects will have 500–5,000 specs. The hash-bucketed storage, in-memory indexes, and pgvector are all validated at 50K scale.

- **Q**: What is the target maximum number of edges? With average 5 edges per
  spec, 10K specs = 50K edges. Is this realistic?

**A:** Target: 250,000 edges (5 edges per spec at 50K specs). This is realistic — each spec connects to a handful of related specs. The in-memory adjacency index at 250K edges ≈ 50MB, well within server memory. Hot specs (heavily connected) may have 20–50 edges; most specs will have 2–5.

- **Q**: What is the target maximum knowledge graph size on disk? At 50KB
  per spec (JSON + content + metadata), 10K specs = ~500MB. Is this acceptable
  for a git repo?

**A:** Target: ~500MB for 10K specs, ~2.5GB for 50K specs. This is acceptable for git. Git handles repos of this size well (Linux kernel repo is ~4GB). Embedding vectors are NOT in the repo (they're in pgvector), so the per-spec footprint is closer to 5–20KB (small JSON + modest Markdown). At 10KB average per spec, 50K specs = ~500MB. Perfectly manageable.

### 7.2 Read Performance
- **Q**: What is the target latency for reading a single spec (all three files)?
  <10ms? <50ms? <100ms?

**A:** <5ms for reading a single spec (2 files: `spec.json` + `content.md`) from SSD. JSON parse of a 5KB file is <1ms. Two file reads from warm OS cache are <2ms. Target: <5ms p95, <10ms p99.

- **Q**: Should frequently accessed specs be cached in memory, or is filesystem
  access fast enough with SSD?

**A:** Implement an LRU in-memory cache for the 1,000 most recently accessed specs. SSD reads are fast but still involve syscalls. A memory cache eliminates filesystem overhead for hot specs (the ones currently being viewed/traversed). Cache invalidation: evict on write to that spec.

- **Q**: Should the storage layer implement read-through caching (check cache
  before disk)?

**A:** Yes. Read-through with write-invalidation. Every spec read checks the LRU cache first; on miss, reads from disk and populates the cache. Every spec write evicts that spec from the cache. This is the simplest correct caching strategy.

### 7.3 Write Performance
- **Q**: What is the target latency for writing a single spec update? <50ms?
  <200ms? (Excluding git commit time)

**A:** <20ms for the file write itself (JSON serialize + write 2 files). Git commit adds 50–200ms depending on repo size. Total user-perceived latency target: <300ms including git commit. Batch commits for agent operations that touch multiple specs.

- **Q**: Should writes be buffered and batched (e.g., collect writes over 100ms
  then flush), or written immediately?

**A:** Immediate write for single-spec user edits (low latency feedback). Batched write for agent operations that modify multiple specs in one logical operation (single commit for the batch). No time-based buffering — the batching boundary is the logical operation, not a timer.

- **Q**: Should index updates be deferred to a background process to keep write
  latency low?

**A:** No deferral. In-memory index updates are sub-millisecond (hash map insert/delete). They execute synchronously within the write operation. The latency is negligible compared to the file I/O.

---

## 8. Git Integration

### 8.1 Git Tracking
- **Q**: Should `indexes/` be git-tracked or git-ignored? Tracking avoids
  rebuild on clone but creates merge conflicts. Ignoring means every clone
  triggers a full index rebuild.

**A:** Git-ignored. Indexes are ephemeral in-memory caches rebuilt on server startup. There are no `indexes/` files on disk at all — the indexes exist only in the server process's memory. Add a comment in `.gitignore` explaining this.

- **Q**: Should `.kg-config.json` and `schema-version.json` be git-tracked?
  (Likely yes, for version coordination.)

**A:** Yes, both are git-tracked. `.kg-config.json` contains project-level knowledge graph configuration (bucket depth, edge types, etc.). `schema-version.json` contains the current file schema version number. Both must travel with the repo so any clone/pull gets the correct configuration and schema expectations.

- **Q**: Should the `inquiries/` directory be git-tracked, or stored only in
  the database?

**A:** Stored in PostgreSQL only. Inquiries are transient operational items (like a task queue), not permanent knowledge artifacts. They are created, resolved, and cleaned up as part of the workflow. Putting them in git would create noisy commits for every inquiry state change. The `inquiries` table in PostgreSQL handles creation, assignment, resolution, and archival.

### 8.2 Git Performance
- **Q**: How does git performance degrade with many small files? At 100K spec
  directories (300K files), are git operations (status, diff, commit) still
  fast?

**A:** With the hash-bucketed layout (not per-spec directories), 100K specs = ~200K files (100K JSON + 100K MD) across 256 buckets plus ~100K edge files across 256 edge buckets. Git handles this via `core.fsmonitor` (FSMonitor) and sparse index features. `git status` at 300K files takes 1–3 seconds without FSMonitor, <500ms with it. Enable FSMonitor by default. `simple-git` (the PRD's chosen git library) supports all standard git operations efficiently.

- **Q**: Should the knowledge graph use git's sparse checkout feature to avoid
  loading the entire graph for operations that only touch a few specs?

**A:** No. Sparse checkout adds configuration complexity and breaks index rebuilds (which need all files). The full repo should always be checked out. Git's packfile format compresses similar files efficiently, so disk usage is moderate. If clone time becomes an issue at very large scale, shallow clones (`--depth 1`) are a better optimization than sparse checkout.

- **Q**: Should large embedding vectors be stored via Git LFS instead of in
  regular JSON files?

**A:** N/A. Embedding vectors are stored in pgvector, not in the git repo. No LFS needed. This is a key architectural decision — keeping vectors out of git avoids repo bloat and LFS complexity entirely.

---

## 9. Concurrency & Multi-User

- **Q**: In a multi-user scenario with a shared git remote, how often should
  the server pull and push? On every write? On a timer?

**A:** Push after every commit (or batch commit). Pull on a 30-second polling interval, plus pull-before-push to detect conflicts early. Each server instance manages its own sync cycle. The `sync_state` table in PostgreSQL tracks the last-synced commit per user per branch. For real-time collaboration, WebSocket notifications trigger an immediate pull when another user pushes.

- **Q**: Should file-level locking use OS-level file locks, advisory locks in a
  database, or a dedicated lock service?

**A:** Advisory locks in PostgreSQL. The server acquires a row-level advisory lock (keyed on spec ID hash) before writing a spec's files. This works across multiple server processes and is automatically released on transaction commit/rollback. OS-level file locks are unreliable across NFS and don't survive process crashes cleanly. PostgreSQL advisory locks are lightweight and battle-tested.

- **Q**: How should the system handle two users editing the same spec
  simultaneously before either commits? Optimistic locking, last-write-wins,
  or merge?

**A:** Optimistic locking with conflict detection. Each spec has a `version` integer in `spec.json`, incremented on every write. When a user saves, the server checks that the spec's current `version` matches what the user loaded. If it doesn't, the save is rejected with a conflict error and the user is shown the current version alongside their changes for manual merge. This is the standard approach for collaborative editing without real-time CRDT.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
|------|----------|----------|-----------|
| — | — | — | — |
