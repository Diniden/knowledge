# 05 — RAG LAYER PLAN

> **Purpose**: Define the Retrieval-Augmented Generation pipeline including
> embedding model selection, chunking strategy for spec content, vector store
> selection and configuration, index build and update pipelines, query pipeline,
> version-aware indexing, re-indexing strategies, relevance scoring, result
> filtering, integration with the knowledge graph, orphan positioning, performance
> optimization, and monitoring.
>
> **Phase**: 2 (Core Systems) + Phase 3 (Agent Integration)
> **Dependencies**: `04-KNOWLEDGE-GRAPH/01-ARCHITECTURE-PLAN.md`, `07-DATABASE/PLAN.md`
> **Estimated tasks**: 115+

---

## Table of Contents

1. [Embedding Model](#1-embedding-model)
2. [Chunking Strategy](#2-chunking-strategy)
3. [Vector Store](#3-vector-store)
4. [Index Build Pipeline](#4-index-build-pipeline)
5. [Incremental Indexing](#5-incremental-indexing)
6. [Query Pipeline](#6-query-pipeline)
7. [Relevance Scoring & Ranking](#7-relevance-scoring--ranking)
8. [Result Filtering](#8-result-filtering)
9. [Version-Aware Indexing](#9-version-aware-indexing)
10. [Knowledge Graph Integration](#10-knowledge-graph-integration)
11. [Orphan Positioning](#11-orphan-positioning)
12. [Performance Optimization](#12-performance-optimization)
13. [Monitoring & Quality Metrics](#13-monitoring--quality-metrics)
14. [RAG Service API](#14-rag-service-api)

---

## 1. Embedding Model

### 1.1 Model Selection

- [ ] **RAG-001**: Evaluate embedding model options
  - **OpenAI `text-embedding-3-small`**: 1536 dimensions, excellent quality, API cost per token
  - **OpenAI `text-embedding-3-large`**: 3072 dimensions, highest quality, higher cost
  - **`nomic-embed-text`**: open-source, runs locally, 768 dimensions, good quality
  - **`sentence-transformers/all-MiniLM-L6-v2`**: open-source, local, 384 dimensions, fast
  - **`voyage-3`**: optimized for code and technical content, API-based
  - Document trade-offs: cost, quality, latency, dimensions, offline capability
- [ ] **RAG-002**: Select primary embedding model
  - Decision criteria: quality for technical/knowledge content, cost at scale, local vs. API
  - Recommend: OpenAI `text-embedding-3-small` as primary (best quality-to-cost ratio)
  - Recommend: `nomic-embed-text` as local fallback (offline/air-gapped scenarios)
- [ ] **RAG-003**: Define embedding model abstraction interface
  ```typescript
  interface EmbeddingProvider {
    name: string;
    dimensions: number;
    maxTokens: number;
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
    estimateTokens(text: string): number;
  }
  ```
- [ ] **RAG-004**: Implement OpenAI embedding provider
  - Use `text-embedding-3-small` by default
  - Configure API key from environment variables
  - Handle rate limiting with exponential backoff
  - Handle API errors gracefully (timeout, quota exceeded)
  - Support dimension reduction via API parameter (e.g., 512 instead of 1536)
- [ ] **RAG-005**: Implement local embedding provider (nomic-embed-text)
  - Use ONNX runtime or sentence-transformers Python bridge
  - Load model on service startup
  - Handle model download and caching
  - Document memory and compute requirements
- [ ] **RAG-006**: Implement embedding provider configuration
  - Select provider via environment variable or `.kg-config.json`
  - Support switching providers (requires full re-indexing)
  - Store provider name in each embedding for provenance tracking

### 1.2 Embedding Configuration

- [ ] **RAG-007**: Define embedding dimensions and storage
  - Store dimension count in provider config
  - Validate embedding dimensions on read (detect provider mismatch)
  - Support dimension reduction for storage optimization
- [ ] **RAG-008**: Define token limit handling
  - `text-embedding-3-small` max: 8191 tokens
  - If content exceeds token limit: chunk first, embed each chunk
  - Store multiple chunk embeddings per spec
- [ ] **RAG-009**: Define embedding normalization
  - Normalize embedding vectors to unit length for cosine similarity
  - Verify provider outputs normalized vectors; normalize if not
  - Store normalized vectors to avoid repeated normalization on query

#### Design Decisions

> **Q**: Should the primary embedding model be API-based (OpenAI) or local (nomic-embed-text, sentence-transformers)?
> **A**: API-based — OpenAI `text-embedding-3-small` as the default, per the PRD. The quality advantage of OpenAI embeddings over local models is significant for knowledge retrieval, and the cost is negligible ($0.02 per 1M tokens). Offline operation is not a requirement — the system already requires a server, PostgreSQL, and network connectivity. A local model fallback can be added in a future iteration if demand arises.

> **Q**: If using OpenAI, should we use `text-embedding-3-small` (1536 dims, cheaper) or `text-embedding-3-large` (3072 dims, better quality)?
> **A**: `text-embedding-3-small` (1536 dimensions). Per the PRD, this is the chosen model. The quality difference between small and large is marginal for knowledge graph content (primarily English prose, not code or multilingual). The 2x storage and compute cost of large dims is not justified. If quality evaluation later shows gaps, switching to large is a configuration change + re-embedding.

> **Q**: Should the system support switching embedding models after initial deployment?
> **A**: Yes, model switching must be supported. Re-embedding 10K specs at 500 tokens each = 5M tokens = ~$0.10 with OpenAI small. Re-embedding 50K specs = ~$0.50. Cost is negligible. Time: at ~100 specs/second via API with batching, 10K specs takes ~100 seconds, 50K takes ~8 minutes. The system supports a `bun run rag:reindex` CLI command that re-embeds all specs with a progress bar. During reindex, the old embeddings remain queryable — new embeddings replace them atomically per spec.

> **Q**: Should embeddings be generated on the server or offloaded to a dedicated embedding service/worker?
> **A**: On the server, using an async queue within the NestJS application. Embedding generation is an HTTP API call (not CPU-intensive), so a dedicated worker is unnecessary. A `BullMQ`-style in-process queue (backed by an in-memory array, not Redis) processes embedding requests sequentially with concurrency of 5 (5 parallel OpenAI calls). This prevents rate-limit issues while maintaining throughput.

> **Q**: For a local model, should we use Python (sentence-transformers) via a subprocess/sidecar or a JavaScript/ONNX runtime?
> **A**: Deferred — no local model in v1. If added later, use a Python sidecar process running sentence-transformers behind a lightweight HTTP API (FastAPI). This keeps the ML stack separate from the Node/Bun stack and avoids ONNX runtime immaturity. The sidecar is optional — only started if `EMBEDDING_PROVIDER=local` is configured.

> **Q**: Should embedding dimensions be configurable? OpenAI's v3 models support Matryoshka representations (can reduce dimensions while maintaining quality).
> **A**: Use the full 1536 dimensions. Dimension reduction to 512 saves ~60% storage but degrades recall quality by 5–10% based on OpenAI's benchmarks. At 50K vectors × 1536 dims × 4 bytes = ~300MB in pgvector, storage is not a concern. Prioritize recall quality over storage savings. The dimension count is stored in `.kg-config.json` and used to configure the pgvector column size.

> **Q**: Should the system support multiple embedding models simultaneously (e.g., one for English content, one for code blocks)?
> **A**: No. Single embedding model for all content. Multiple models would require multiple vector columns or tables, complicate querying, and double embedding costs. The `text-embedding-3-small` model handles both English prose and code adequately. If a spec contains a code block, the embedding captures the surrounding prose context, which is sufficient for retrieval.

> **Q**: Should the embedding of spec content include the spec title and tags as prefix context?
> **A**: Yes. Prepend the spec title and tags as context before embedding. Format: `Title: {title}\nTags: {tag1}, {tag2}\n\n{content}`. This enriches the embedding with structural metadata, improving retrieval when users search by concept rather than exact content. The token overhead is minimal (~20–30 extra tokens per spec).

> **Q**: Should the system maintain a backup embedding provider that activates on primary provider failure?
> **A**: Not in v1. OpenAI's embedding API has excellent uptime (>99.9%). A backup provider (e.g., Cohere) would require maintaining two sets of embeddings (models produce different vector spaces). The retry queue handles transient outages. If OpenAI has an extended outage, search degrades gracefully (existing embeddings still work; new content isn't searchable until re-embedded).

---

## 2. Chunking Strategy

### 2.1 Chunk Design

- [ ] **RAG-010**: Define chunking strategy for spec content
  - **Primary strategy**: spec-level chunking (one embedding per spec)
  - **Fallback**: paragraph-level chunking for long specs (>2000 tokens)
  - Rationale: specs are already semantic units; further chunking is needed only for long content
- [ ] **RAG-011**: Implement spec-level chunking
  - If spec content fits within token limit: single chunk = full content
  - Prepend spec title and tags to the content for richer context
  - Format: `Title: {title}\nTags: {tags}\n\n{content}`
  - This enriches the embedding with metadata signals
- [ ] **RAG-012**: Implement paragraph-level chunking for long specs
  - Split on double newlines (paragraph boundaries)
  - Respect Markdown heading boundaries (don't split within a section)
  - Target chunk size: 500–1000 tokens
  - Overlap: 100 tokens between chunks (sliding window)
  - Each chunk includes the spec title and section heading as prefix
- [ ] **RAG-013**: Implement chunk boundary detection
  - Priority order for split points:
    1. `<!-- chunk-break -->` markers (author/agent-defined)
    2. Markdown `##` headings
    3. Markdown `###` headings
    4. Double newlines (paragraph breaks)
    5. Single newlines (last resort)
  - Never split within a code block, table, or list item

### 2.2 Chunk Metadata

- [ ] **RAG-014**: Define chunk metadata schema
  ```typescript
  interface Chunk {
    id: string;
    specId: string;
    chunkIndex: number;
    totalChunks: number;
    content: string;
    tokenCount: number;
    startOffset: number;
    endOffset: number;
    sectionHeading?: string;
    embedding?: number[];
  }
  ```
- [ ] **RAG-015**: Implement chunk ID generation
  - Format: `{specId}_chunk_{chunkIndex}` (e.g., `sp_xxxx_chunk_0`)
  - Enables mapping from search results back to specific parts of a spec
- [ ] **RAG-016**: Track chunk-to-spec mapping
  - Maintain mapping: chunk ID → spec ID + offset range
  - On search result, can highlight the specific chunk within the spec content

### 2.3 Chunk Quality

- [ ] **RAG-017**: Implement minimum chunk size enforcement
  - Minimum chunk size: 50 tokens
  - Merge very small chunks with adjacent chunks
  - Prevents low-quality embeddings from tiny content fragments
- [ ] **RAG-018**: Implement chunk content cleaning
  - Remove excessive whitespace
  - Preserve Markdown formatting (code blocks, lists, headings)
  - Remove internal link syntax `[[sp_xxxx]]` and replace with plain text
  - Remove HTML tags if any

#### Design Decisions

> **Q**: Should the primary chunking unit be the spec (one embedding per spec) or a fixed-size token window?
> **A**: Spec-level as the primary unit (one embedding per spec). Specs are designed to represent a single idea each (per PRD), so they are natural semantic units. Only split specs that exceed 2,000 tokens into multiple chunks. At the target of ~500 tokens per spec, the vast majority of specs produce a single embedding. This keeps the system simple and the vector store compact.

> **Q**: At what content length should a spec be split into multiple chunks?
> **A**: Split at 2,000 tokens. Below 2,000 tokens: single chunk. Above 2,000 tokens: split into chunks of ~1,000 tokens with 200-token overlap. The 2,000-token threshold accommodates specs up to ~1,500 words — generous for a "single idea" spec. Specs exceeding this threshold likely need decomposition, which the system flags via inquiry.

> **Q**: Should code blocks within specs be chunked separately from prose?
> **A**: No. Code blocks are embedded inline with their surrounding prose context. Separating them would lose the explanatory context ("This function handles authentication by..."). The embedding model handles mixed prose+code adequately. If a spec is primarily code with minimal prose, the title+tags prefix (prepended during embedding) provides the semantic anchor.

> **Q**: Should the chunking strategy be different for different spec types?
> **A**: No. One chunking strategy for all specs. The spec type does not meaningfully change optimal chunk size. Requirement specs and design decision specs are both prose-first with occasional code/diagrams. Maintaining multiple chunking strategies adds complexity for negligible retrieval improvement.

> **Q**: What chunk overlap percentage provides the best retrieval quality?
> **A**: 200 tokens of overlap (approximately 20% of a 1,000-token chunk). This ensures that no concept that spans a chunk boundary is lost. The storage overhead is modest — a 3,000-token spec produces 3 chunks (~3,600 total tokens with overlap) instead of 3 non-overlapping chunks (3,000 tokens). The cost difference is negligible at OpenAI's per-token pricing.

> **Q**: Should overlap be token-based or semantic (overlap at paragraph boundaries)?
> **A**: Semantic boundaries preferred. Split at paragraph breaks (double newline), heading boundaries, or list item boundaries — choosing the nearest semantic boundary within ±100 tokens of the 1,000-token target. This produces chunks that start and end at natural content boundaries, improving both embedding quality and result readability. Fall back to token-based split if no semantic boundary is found within range.

> **Q**: Should each chunk include context from the spec's metadata (title, tags, summary) prepended to the content?
> **A**: Yes. Every chunk (including sub-spec chunks from long specs) is prepended with: `Title: {title}\nTags: {tag1}, {tag2}\n\n`. This ensures that even a chunk from the middle of a long spec is contextually anchored. Token overhead: ~20–30 tokens per chunk. This is the same prefix used for whole-spec embeddings.

> **Q**: Should chunks include "breadcrumb" context (document title → spec title → section heading)?
> **A**: No breadcrumbs. The spec title is sufficient context. Document titles add noise (a spec may belong to multiple documents) and section headings are not consistently structured across specs. Keep the context prefix lean: title + tags only.

> **Q**: Should the chunking strategy use the `<!-- chunk-break -->` markers from the architecture plan, or rely entirely on automatic boundary detection?
> **A**: Automatic boundary detection only. No manual chunk-break markers. Requiring authors to insert markers is a maintenance burden that most users will ignore. Automatic paragraph/heading boundary detection handles 99% of cases well. If a specific spec consistently produces poor chunks, the solution is to restructure the spec content, not add markers.

> **Q**: How should the chunking strategy be validated?
> **A**: Use the test query suite to compare chunking configurations. Run the suite with: (a) spec-level only (no splitting), (b) 1,000-token chunks with 200-token overlap, (c) 500-token chunks with 100-token overlap. Choose the configuration with the best recall@5. This is a one-time evaluation during development, not an ongoing process.

---

## 3. Vector Store

### 3.1 Store Selection

- [ ] **RAG-019**: Evaluate vector store options
  - **pgvector in PostgreSQL**: co-located with existing DB, good integration, moderate scale
  - **ChromaDB**: lightweight, Python-native, good for prototyping
  - **Qdrant**: high-performance, Rust-based, excellent for production
  - **FAISS (file-based)**: fast, no server needed, but no built-in persistence
  - **SQLite with vector extension**: lightweight, file-based, portable
  - Document trade-offs: performance, operational complexity, scale limits, feature set
- [ ] **RAG-020**: Select primary vector store
  - Recommend: **pgvector** as primary (leverages existing PostgreSQL, simplifies ops)
  - Recommend: FAISS as embedded fallback for development/testing
  - Decision depends on expected scale and operational preferences
- [ ] **RAG-021**: Define vector store abstraction interface
  ```typescript
  interface VectorStore {
    upsert(id: string, vector: number[], metadata: Record<string, unknown>): Promise<void>;
    upsertBatch(items: VectorItem[]): Promise<void>;
    search(queryVector: number[], options: SearchOptions): Promise<SearchResult[]>;
    delete(id: string): Promise<void>;
    deleteBatch(ids: string[]): Promise<void>;
    count(): Promise<number>;
    clear(): Promise<void>;
  }
  interface VectorItem {
    id: string;
    vector: number[];
    metadata: Record<string, unknown>;
  }
  interface SearchOptions {
    topK: number;
    threshold?: number;
    filter?: Record<string, unknown>;
  }
  interface SearchResult {
    id: string;
    score: number;
    metadata: Record<string, unknown>;
  }
  ```

### 3.2 pgvector Implementation

- [ ] **RAG-022**: Create pgvector database migration
  - Enable `vector` extension: `CREATE EXTENSION IF NOT EXISTS vector`
  - Create embeddings table:
    ```sql
    CREATE TABLE kg_embeddings (
      id TEXT PRIMARY KEY,
      spec_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL DEFAULT 0,
      embedding vector(1536),
      metadata JSONB,
      model TEXT NOT NULL,
      content_hash TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(spec_id, chunk_index)
    );
    ```
  - Create vector index: `CREATE INDEX ON kg_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`
- [ ] **RAG-023**: Implement pgvector store adapter
  - Implement `VectorStore` interface using PostgreSQL queries
  - Use `<=>` operator for cosine distance
  - Support metadata filtering via JSONB operators
  - Handle connection pooling through existing PostgreSQL connection
- [ ] **RAG-024**: Configure pgvector index parameters
  - IVFFlat lists: `sqrt(N)` where N is the number of vectors (start with 100)
  - Consider HNSW index for better recall: `CREATE INDEX USING hnsw (embedding vector_cosine_ops)`
  - HNSW parameters: `m = 16, ef_construction = 64` (tune based on benchmarks)
  - Document when to switch from IVFFlat to HNSW (>10K vectors)

### 3.3 FAISS Implementation (Development/Fallback)

- [ ] **RAG-025**: Implement FAISS-based vector store
  - Use `faiss-node` bindings for Bun/Node.js
  - Store index file on disk: `knowledge-graph/.rag-index/faiss.index`
  - Store metadata separately: `knowledge-graph/.rag-index/metadata.json`
  - Load index into memory on startup
- [ ] **RAG-026**: Implement FAISS index persistence
  - Save index to disk after batch operations
  - Auto-save on interval (every 5 minutes if dirty)
  - Load from disk on startup; rebuild if missing
- [ ] **RAG-027**: Implement FAISS metadata filtering
  - Post-filter: search FAISS for topK * 3, then apply metadata filters, take topK
  - Less efficient than pgvector's native filtering but simpler

#### Design Decisions

> **Q**: Should the vector store be pgvector (co-located with PostgreSQL), ChromaDB, Qdrant, or FAISS?
> **A**: pgvector, per the PRD. Co-located with the existing PostgreSQL instance. This eliminates an additional service to operate, keeps the tech stack simple (one database for everything), and provides ACID transactions for embedding updates alongside metadata. pgvector's performance is sufficient for the target scale.

> **Q**: If using pgvector, should the embedding table be in the same database as the application data, or a separate PostgreSQL instance?
> **A**: Same database, same PostgreSQL instance. A separate instance adds operational overhead (two databases to backup, monitor, connect to) with no performance benefit at the target scale (50K vectors). The embedding table is just another table in the same schema. Connection pooling is shared.

> **Q**: Should the vector store support metadata filtering (pre-filter before vector search) or is post-filtering sufficient?
> **A**: Pre-filtering via pgvector's `WHERE` clause. The embedding table includes denormalized metadata columns: `spec_id`, `status`, `tags` (as text array), `project_id`, and `permission_level`. Vector search queries include `WHERE` conditions (e.g., `WHERE status = 'active' AND project_id = '...'`) that filter before the ANN search. This is more efficient than post-filtering and ensures the top-K results are all relevant.

> **Q**: At what scale does pgvector performance become insufficient?
> **A**: pgvector with HNSW handles up to ~500K vectors with <100ms query latency. At the target scale (50K specs × ~1.2 chunks average = ~60K vectors), pgvector is well within its comfort zone. Migration to a dedicated vector DB (Qdrant) is the escape hatch if the system ever exceeds 500K vectors, but this is not an expected scenario. No upfront migration planning needed.

> **Q**: For pgvector, should we use IVFFlat or HNSW?
> **A**: HNSW. Better recall at equivalent query latency. Build time is slower than IVFFlat but still fast at the target scale (~60K vectors builds in <30 seconds). HNSW also handles incremental inserts well (no need to rebuild the index on every insert, unlike IVFFlat which degrades without periodic rebuilds).

> **Q**: Should the vector index be rebuilt periodically, or does the chosen index type handle incremental updates well?
> **A**: HNSW handles incremental inserts natively. No periodic rebuild needed. If recall quality is observed to degrade after many inserts (unlikely with HNSW but possible), a `REINDEX` can be triggered via admin CLI (`bun run rag:reindex-vectors`). This is a rare maintenance operation, not a scheduled task.

> **Q**: Should the system support configurable vector index parameters (probes, ef_search)?
> **A**: Sensible defaults, no user-facing configuration. HNSW parameters: `m = 16`, `ef_construction = 200`, `ef_search = 100`. These provide good recall (~98%) at the target scale. The values are set in the migration that creates the vector index. If tuning is needed, it's an admin/DBA operation, not a user-facing setting.

> **Q**: Should the vector store be considered the source of truth for embeddings, or should `metadata.json.embedding` be the source of truth?
> **A**: pgvector is the sole source of truth for embeddings. Embeddings are NOT stored in the git repo (no `metadata.json.embedding` field). The vector store is not a cache — it is the authoritative store. If the vector store is lost, embeddings are regenerated from spec content via `bun run rag:reindex`.

---

## 4. Index Build Pipeline

### 4.1 Full Reindex

- [ ] **RAG-028**: Implement `buildFullIndex()` operation
  - Scan all specs in the knowledge graph
  - For each spec: read content, chunk, embed, store
  - Used for initial setup, provider changes, or recovery
  - Report progress: `{ total, embedded, failed, elapsed }`
- [ ] **RAG-029**: Implement full reindex with batching
  - Process specs in batches of 50 (configurable)
  - Batch embedding API calls for efficiency (OpenAI supports batch embedding)
  - Pause between batches to respect rate limits
  - Resume capability: track last-processed spec for crash recovery
- [ ] **RAG-030**: Implement full reindex content hashing
  - Compute content hash before embedding
  - Skip re-embedding if content hash matches existing embedding
  - Significantly speeds up reindex when most specs haven't changed
- [ ] **RAG-031**: Implement reindex scheduling
  - Run full reindex on deployment (if schema version changed)
  - Run full reindex on embedding provider change
  - Support manual trigger via admin API

### 4.2 Initial Load

- [ ] **RAG-032**: Implement initial load pipeline for new deployments
  - Detect empty vector store (count = 0)
  - Trigger full reindex automatically
  - Show progress in admin dashboard
  - Block RAG queries until initial load completes (or return degraded results)
- [ ] **RAG-033**: Implement initial load estimation
  - Estimate time based on spec count and embedding rate
  - Display estimate in admin UI
  - Typical: 100 specs/minute with API embeddings, 1000 specs/minute with local model

#### Design Decisions

> **Q**: For initial load of a large knowledge graph, what is the expected indexing time?
> **A**: With batched API calls (OpenAI supports batch embedding of multiple texts in one request, up to 2,048 texts per call), throughput is ~500 specs/second. 10K specs: ~20 seconds. 50K specs: ~100 seconds. This is fast enough for initial indexing. The batch API call sends up to 100 specs per request with 5 concurrent requests.

> **Q**: Should the system provide a progress indicator for batch indexing operations?
> **A**: Yes. The CLI shows: `[2,500/10,000] Embedding specs... 25% complete, ~15s remaining`. The API exposes a `/rag/indexing-status` endpoint returning `{ total, completed, inProgress, estimatedSecondsRemaining }` for the frontend to display a progress bar.

> **Q**: Should batch indexing be resumable (pick up where it left off after a crash)?
> **A**: Yes. The `contentHash` comparison mechanism makes this automatic. On restart after a crash, the batch indexer scans all specs, compares `contentHash` with what's in pgvector, and only re-embeds specs whose hash doesn't match. Specs already embedded are skipped. No explicit checkpoint file needed.

> **Q**: Should the system support "search index rebuild" as an admin operation that clears and rebuilds the entire vector store?
> **A**: Yes. `bun run rag:reindex` is an admin CLI command that: (1) truncates the embedding table, (2) scans all current specs, (3) re-embeds each one via the batch pipeline, (4) reports progress and completion. This handles model changes, vector store corruption, or schema migrations. Expected runtime: 10K specs in ~20 seconds, 50K specs in ~100 seconds.

---

## 5. Incremental Indexing

### 5.1 Change-Driven Indexing

- [ ] **RAG-034**: Implement `indexSpec(specId)` operation
  - Read spec content and metadata
  - Chunk content
  - Generate embeddings for all chunks
  - Upsert embeddings in vector store
  - Update `metadata.json.embedding` with embedding metadata (model, hash, timestamp)
- [ ] **RAG-035**: Implement `removeSpecFromIndex(specId)` operation
  - Delete all chunk embeddings for the spec from vector store
  - Clear `metadata.json.embedding` field
  - Used on spec deletion or archival
- [ ] **RAG-036**: Implement `reindexSpec(specId)` operation
  - Remove existing embeddings, then reindex
  - Used when spec content changes significantly
  - Compare content hash to detect if re-embedding is needed

### 5.2 Automatic Re-indexing Triggers

- [ ] **RAG-037**: Implement content change trigger
  - After spec content update: compare content hash with `metadata.json.embedding.contentHash`
  - If hash differs: queue re-embedding
  - Queue is processed asynchronously (don't block the content update)
- [ ] **RAG-038**: Implement status change trigger
  - Spec archived: remove from active index
  - Spec unarchived: add back to index
  - Spec deprecated: keep in index but add deprecation metadata
- [ ] **RAG-039**: Implement metadata change trigger
  - Tag changes: update vector metadata (tags are filterable)
  - Permission changes: update vector metadata (permissions affect query filtering)
  - Author changes: update vector metadata
  - No re-embedding needed (only metadata update in vector store)

### 5.3 Indexing Queue

- [ ] **RAG-040**: Implement indexing job queue
  - Queue indexing jobs instead of processing synchronously
  - Jobs: `embed-spec`, `remove-spec`, `update-metadata`, `full-reindex`
  - Process queue with configurable concurrency (default: 5 concurrent embeddings)
- [ ] **RAG-041**: Implement queue persistence
  - Store pending jobs in PostgreSQL or in-memory with disk backup
  - Survive server restarts without losing pending work
  - Deduplicate: if a spec is queued multiple times, only embed once
- [ ] **RAG-042**: Implement queue prioritization
  - User-triggered re-embeddings: high priority (user is waiting)
  - Automatic change triggers: medium priority
  - Full reindex: low priority (background)
  - Priority queue ensures interactive operations aren't blocked by bulk operations
- [ ] **RAG-043**: Implement queue monitoring
  - Queue depth, processing rate, error rate
  - Alert if queue depth exceeds threshold (embedding backlog)
  - Report estimated time to drain queue

#### Design Decisions

> **Q**: Should embedding generation be synchronous (block the spec update until embedded) or asynchronous (queue for background processing)?
> **A**: Asynchronous. Spec updates return immediately; embedding generation is queued. The lag is typically 1–5 seconds (one OpenAI API call per spec). During this window, the old embedding remains queryable (stale but present). A `pendingEmbedding` flag on the vector record indicates that a re-embedding is in progress, allowing the UI to show a subtle "indexing..." indicator.

> **Q**: Should every content edit trigger re-embedding, or should there be a minimum change threshold (e.g., >10% of content changed)?
> **A**: Re-embed on every content change. The cost per embedding is ~$0.00001 (500 tokens at $0.02/1M). There is no meaningful savings from skipping small edits. Implementing a change threshold adds complexity (diffing content, computing percentage) for negligible cost reduction. Always re-embed ensures search results are always current.

> **Q**: Should metadata-only changes (tags, permissions) trigger re-embedding, or only update the vector store metadata?
> **A**: Re-embed if tags change (tags are part of the embedding prefix). Update metadata only (no re-embedding) for permission changes, status changes, and other metadata-only updates. The vector store row's metadata columns are updated in-place without touching the embedding vector.

> **Q**: Should the system track a "dirty" flag on specs whose content changed since last embedding, rather than computing content hashes?
> **A**: Use `contentHash` in `spec.json` (SHA-256 of the content.md file). When the embedding pipeline processes a spec, it compares the `contentHash` in the vector store metadata against the current spec's `contentHash`. If they match, skip embedding. This is more robust than a dirty flag (which can get stuck if the embedding worker crashes) and handles edge cases like reverting content to a previously embedded version.

> **Q**: What should happen when the embedding provider is unavailable? Queue for retry? Fall back to local model? Return degraded search results?
> **A**: Queue for retry with exponential backoff: 1s, 2s, 4s, 8s, 16s, max 60s. Maximum 10 retries per spec. If all retries fail, the spec is marked as `embeddingFailed` in the embedding queue and an admin alert is logged. Search continues working with existing embeddings — specs that failed embedding are simply not findable via RAG until the provider recovers and they are re-processed. No local model fallback in v1.

> **Q**: How should the system handle partial re-indexing failures (some specs embedded, some failed)?
> **A**: Each spec is independently embedded. Failures for individual specs do not affect others. The embedding queue tracks per-spec status: `pending`, `processing`, `completed`, `failed`. Failed specs are retried on the next queue processing cycle. The `/rag/indexing-status` endpoint reports failed specs so admins can investigate.

> **Q**: How should the system handle the window between content update and embedding update?
> **A**: Accept the 1–5 second stale window. The vector store row retains the previous embedding until the new one is computed. Search results may briefly return the old content. The UI can show a subtle "re-indexing..." indicator on recently updated specs. This is an acceptable trade-off for the performance benefit of async embedding.

---

## 6. Query Pipeline

### 6.1 Query Processing

- [ ] **RAG-044**: Implement `searchSimilar(query, options)` operation
  - Accept: text query, search options
  - Pipeline: clean query → embed query → search vector store → rank → filter → return
  - Return top-K results with scores and metadata
- [ ] **RAG-045**: Implement query text preprocessing
  - Trim whitespace
  - Expand abbreviations (if a project glossary exists)
  - Prepend context hint (e.g., "Knowledge spec about: {query}") for better embedding alignment
  - Token limit check: truncate if query exceeds model max
- [ ] **RAG-046**: Implement query embedding
  - Use the same embedding provider as the index
  - Cache query embeddings for repeated queries (LRU cache, 1000 entries)
  - Return embedding for reuse in multi-step queries
- [ ] **RAG-047**: Implement vector search
  - Query the vector store with the query embedding
  - Request `topK * overFetchFactor` results (overFetchFactor = 2–3)
  - Over-fetching compensates for results removed by post-filtering

### 6.2 Multi-Query Strategies

- [ ] **RAG-048**: Implement query expansion
  - Generate multiple query variants from the original query
  - Variants: paraphrase, keyword extraction, broader/narrower scope
  - Embed each variant, search, merge results
  - Improves recall for ambiguous or short queries
- [ ] **RAG-049**: Implement hypothetical document embedding (HyDE)
  - Generate a hypothetical answer/document for the query using LLM
  - Embed the hypothetical document (closer to actual documents in embedding space)
  - Search with the hypothetical embedding
  - Optional: use only when standard search returns low-confidence results
- [ ] **RAG-050**: Implement recursive retrieval
  - Search → get initial results → extract key terms from results → search again
  - Two-pass search improves quality for complex queries
  - Configurable: enable/disable, max passes

### 6.3 Query Result Assembly

- [ ] **RAG-051**: Implement result deduplication
  - Multiple chunks from the same spec may match
  - Deduplicate: keep the highest-scoring chunk per spec
  - Return spec-level results (not chunk-level) to the user
- [ ] **RAG-052**: Implement result enrichment
  - For each matching spec: load title, tags, status, summary from knowledge graph
  - Include the matching chunk content (for highlighting)
  - Include the chunk's position within the spec (section heading, offset)
- [ ] **RAG-053**: Define search result type
  ```typescript
  interface RAGSearchResult {
    specId: string;
    title: string;
    score: number;
    matchingChunk: {
      content: string;
      chunkIndex: number;
      sectionHeading?: string;
    };
    metadata: {
      tags: string[];
      status: string;
      author: string;
      updatedAt: string;
    };
  }
  ```

#### Design Decisions

> **Q**: Should the query pipeline support natural language queries only, or also structured queries (e.g., `tag:authentication AND content:"JWT"`)?
> **A**: Both. Natural language queries are embedded and searched via vector similarity. Structured queries use pgvector's metadata filtering: `tag:authentication` maps to `WHERE 'authentication' = ANY(tags)`, `status:active` maps to `WHERE status = 'active'`. The query parser detects structured syntax (field:value patterns) and routes accordingly. Mixed queries are supported: `tag:authentication how does JWT validation work` uses the tag as a pre-filter and the natural language part as the vector query.

> **Q**: Should the system support query expansion (generating multiple query variants for better recall)?
> **A**: Not in v1. Query expansion requires an LLM call per query, adding 500ms–2s latency and cost. The combination of spec-title-enriched embeddings and metadata pre-filtering provides good recall without expansion. If retrieval quality proves insufficient in practice, query expansion can be added as an opt-in feature.

> **Q**: Should the Hypothetical Document Embedding (HyDE) technique be used?
> **A**: Not in v1. Same reasoning as query expansion — the LLM call adds significant latency and cost per query. The simpler approach (embed the query directly, search) is the starting point. HyDE is a future optimization if recall metrics show a need.

> **Q**: Should the RAG system use a reranker model (e.g., cross-encoder) after initial retrieval for higher-quality ranking?
> **A**: Not in v1. Reranking adds a second model call (100–500ms) per query. For the target scale and use case (knowledge graph navigation, not open-domain QA), the initial vector similarity ranking is sufficient. The graph-augmented context (expanding results via edges) provides additional precision. Reranking is a future optimization.

> **Q**: Should RAG search default to the entire knowledge graph, or should it scope to the current document/project?
> **A**: Default scope: the current project (all specs the user has access to within the project). Users can narrow to a specific document or widen to all projects they have access to. The `project_id` column on the embedding table enables efficient per-project filtering. Most searches are project-scoped, matching user expectations.

> **Q**: Should RAG search results be ranked within the context of a conversation (consider what the user has already seen)?
> **A**: Not in v1. Conversation-aware ranking requires maintaining a per-conversation embedding history and re-ranking based on novelty. This is complex and the benefit is unclear. The agent already has conversation context and can filter results itself. Defer until user feedback indicates a need.

> **Q**: Should RAG support "negative examples" (find specs NOT similar to X)?
> **A**: Not in v1. Negative example search is a niche use case that adds query complexity. Users can approximate this by searching for what they want and ignoring results similar to what they don't want. The agent can also handle this via prompt instructions ("find specs about authentication that are NOT about JWT").

---

## 7. Relevance Scoring & Ranking

### 7.1 Scoring Strategy

- [ ] **RAG-054**: Implement cosine similarity as base relevance score
  - Score range: 0.0 to 1.0 (higher is more similar)
  - Raw cosine distance from the vector store
- [ ] **RAG-055**: Implement boosted relevance scoring
  - Boost factors applied after vector similarity:
    - Recency boost: newer specs score slightly higher (decay function on `updatedAt`)
    - Status boost: `active` specs score higher than `deprecated`
    - Tag overlap boost: if query matches spec tags, boost score
    - Edge count boost: well-connected specs score slightly higher
  - Configurable boost weights
- [ ] **RAG-056**: Define scoring configuration
  ```typescript
  interface ScoringConfig {
    recencyBoostWeight: number;       // default 0.1
    recencyHalfLifeDays: number;      // default 90
    statusBoost: Record<string, number>; // active: 1.0, draft: 0.9, deprecated: 0.7
    tagOverlapBoostWeight: number;    // default 0.15
    edgeCountBoostWeight: number;     // default 0.05
    edgeCountCap: number;             // default 20
  }
  ```
- [ ] **RAG-057**: Implement score normalization
  - After applying boosts, normalize final scores to 0.0–1.0 range
  - Ensure relative ordering is preserved
  - Return both raw similarity score and boosted final score

### 7.2 Threshold Configuration

- [ ] **RAG-058**: Define minimum relevance threshold
  - Default minimum: 0.3 (cosine similarity)
  - Results below threshold are discarded
  - Configurable per use case (agent queries may use lower threshold)
- [ ] **RAG-059**: Implement adaptive threshold
  - If top result has very high score (>0.9): use higher threshold for remaining results
  - If top result has moderate score (<0.6): use lower threshold to return more results
  - Prevents returning irrelevant results when good matches exist

#### Design Decisions

> **Q**: Should relevance scoring include a recency boost? If so, how strong?
> **A**: Mild recency boost. Score formula: `finalScore = vectorSimilarity * 0.9 + recencyBoost * 0.1`, where `recencyBoost = 1.0 / (1.0 + daysSinceUpdate / 365)`. This gives recently updated specs a small advantage without burying old-but-relevant specs. A spec updated today gets +0.1; a spec updated 1 year ago gets +0.05; a spec updated 3 years ago gets +0.025. The 90/10 weighting ensures vector similarity dominates.

> **Q**: Should well-connected specs (many edges) receive a boost, or does this create a rich-get-richer bias?
> **A**: No connectivity boost in the default scoring. Rich-get-richer bias is a real concern — new specs would never surface. Connectivity information is available in the result metadata (`edgeCount`) so agents can factor it into their reasoning, but the RAG scoring itself is purely similarity + recency. The graph traversal system (primary discovery mechanism per PRD) naturally favors well-connected specs.

> **Q**: Should the scoring system incorporate user feedback (click-through data) to improve ranking over time?
> **A**: Not in v1. Click-through learning requires significant infrastructure (event tracking, feedback loop, model retraining or weight adjustment). The knowledge graph is not a search engine — users typically find specs via graph traversal, not repeated searches. Defer until usage patterns are established.

> **Q**: Should scoring weights be configurable per user, per project, or global only?
> **A**: Global only. The recency boost weight (0.1) and similarity weight (0.9) are application constants. Per-user or per-project configuration adds complexity with minimal benefit — most users have no intuition for tuning retrieval weights. If tuning is needed, it's an admin operation in `.kg-config.json`.

---

## 8. Result Filtering

### 8.1 Permission Filtering

- [ ] **RAG-060**: Implement permission-based result filtering
  - Accept requesting user ID with every search
  - Filter results based on user's access to each spec
  - `full` access: include in results with full content
  - `summary` access: include in results with summary only (no matching chunk content)
  - No access: exclude from results (should not happen with anti-siloing, but guard)
- [ ] **RAG-061**: Implement permission metadata in vector store
  - Store `visibility` and `defaultLevel` in vector metadata
  - Use vector store metadata filtering for pre-filtering (if supported by store)
  - Post-filter for complex permission checks (access lists)

### 8.2 Metadata Filtering

- [ ] **RAG-062**: Implement tag-based filtering
  - Filter search results to specs with specific tags
  - Applied as pre-filter (in vector store query) or post-filter
  - Support `all` (must have all tags) and `any` (must have at least one tag) modes
- [ ] **RAG-063**: Implement status-based filtering
  - Default: exclude `archived` specs from results
  - Option to include/exclude `deprecated` specs
  - Option to restrict to specific statuses
- [ ] **RAG-064**: Implement author-based filtering
  - Filter results to specs by a specific author
  - Useful for "find my similar specs" scenarios
- [ ] **RAG-065**: Implement document-scoped search
  - Filter results to specs within a specific document
  - Useful for within-document search
- [ ] **RAG-066**: Implement date range filtering
  - Filter by `createdAt` or `updatedAt` range
  - Useful for "find recently relevant specs" queries
- [ ] **RAG-067**: Define combined filter type
  ```typescript
  interface RAGFilter {
    tags?: { values: string[], mode: 'all' | 'any' };
    status?: string[];
    author?: string;
    documentId?: string;
    createdAfter?: string;
    updatedAfter?: string;
    excludeSpecIds?: string[];
    userId: string; // for permission filtering
  }
  ```

#### Design Decisions

> **Q**: Should permission filtering happen at the vector store level (pre-filter) or at the application level (post-filter)?
> **A**: Pre-filter at the vector store level. The embedding table includes a `project_id` column and the application constructs `WHERE project_id = ?` conditions. Per-spec permission filtering (full vs. summary access) happens at the application level as a post-filter: the vector query returns top-K results, then the application checks each result's permission level and redacts content for summary-only access. This hybrid approach balances efficiency (project-level pre-filter eliminates the bulk) with flexibility (per-spec permissions checked in application code where the logic is complex).

> **Q**: For summary-level access specs, should the RAG result include the similarity score even though the user can't see the full content?
> **A**: Yes. Summary-level specs appear in search results with their title, summary, similarity score, and a "[Summary access only]" label. Per the PRD: "Permissions: full, summary, never no-access." Users should know that relevant content exists, even if they can only see the summary. This prevents information silos and encourages users to request full access through proper channels.

> **Q**: Should the system support "search on behalf of" functionality where an admin can see results as another user would see them?
> **A**: Not in v1. This is a niche admin/debugging feature. Admins already have full access to all specs, so they can assess what's in the system. If permission debugging is needed, the admin can check the `spec_permissions` table directly. Defer unless compliance requirements demand it.

---

## 9. Version-Aware Indexing

### 9.1 Version Metadata in Embeddings

- [ ] **RAG-068**: Store version metadata alongside embeddings
  - Include in vector metadata: `updatedAt`, `versionNumber`, `commitHash`
  - Agent can use this to discover recency without querying git
  - Enables "how recent is this knowledge?" assessment during retrieval
- [ ] **RAG-069**: Store change frequency metadata
  - Track how often a spec changes (changes per month)
  - Frequently changed specs may be less stable/authoritative
  - Infrequently changed specs may be stale or well-established
  - Store as metadata for agent consumption
- [ ] **RAG-070**: Store spec age metadata
  - Time since creation
  - Enables "established knowledge" vs. "new knowledge" distinction

### 9.2 Temporal Search

- [ ] **RAG-071**: Implement "find specs changed since" query
  - Combine vector search with temporal filtering
  - Agent use case: "what changed since last plan generation that's relevant to X?"
  - Uses `updatedAt` metadata filter combined with semantic search
- [ ] **RAG-072**: Implement recency-weighted search
  - Apply recency boost during ranking (see section 7)
  - Configurable: weight recent changes more or less depending on use case
  - Default: slight recency bias (all else equal, newer is better)

#### Design Decisions

> **Q**: Should the vector store contain only the latest version of each spec, or should it index historical versions too?
> **A**: Each spec version is indexed in the vector store per the PRD: "Each spec version in RAG index for recentness discovery." The embedding table includes a `version` column. The latest version is marked with `is_current = true`. Search queries default to `WHERE is_current = true` (current versions only). Agents can opt into historical search with `includeHistorical=true` for recentness discovery — finding specs that previously discussed a topic that may have been removed or refactored.

> **Q**: Should the agent be able to search for specs by version/time ("find specs that discussed authentication as of last month")?
> **A**: Yes, via temporal filtering. The embedding table includes `created_at` (when this version was committed). Agents can query: `WHERE created_at <= '2025-01-15' AND is_current = false` to find historical versions. Combined with vector similarity, this enables "what did we know about authentication in January?" queries. This is a power feature used by agents, not exposed directly in the user search UI.

> **Q**: How should the system handle specs that were recently created (no version history)? Should they be treated differently in ranking?
> **A**: No special treatment. A newly created spec has one version (v1) with `is_current = true`. It participates in search like any other spec. The mild recency boost (section 6) naturally gives new specs a small advantage. No explicit "new spec" bonus — the content quality should speak for itself via vector similarity.

---

## 10. Knowledge Graph Integration

### 10.1 RAG + Graph Combined Retrieval

- [ ] **RAG-073**: Implement `findRelatedViaRAG(specId, options)` operation
  - Embed the spec's content, search for similar specs
  - Exclude the spec itself from results
  - Exclude specs already connected via edges (RAG finds NEW relationships)
  - Return potential new connections ranked by similarity
- [ ] **RAG-074**: Implement `confirmRelationshipViaRAG(specId1, specId2)` operation
  - Compute similarity between two specific specs
  - Return similarity score and potential relationship type
  - Used by agents to validate proposed edges with semantic evidence
- [ ] **RAG-075**: Implement graph-augmented search
  - After RAG retrieval, expand results by following graph edges
  - If spec A matches the query, also consider specs connected to A
  - Weighted: direct RAG matches score higher than graph-expanded results
  - Configurable expansion depth (default: 1 hop)

### 10.2 Edge Discovery

- [ ] **RAG-076**: Implement `discoverEdgesViaRAG(specId)` operation
  - Find semantically similar specs that don't have edges to the target
  - Suggest edge type based on content analysis:
    - High similarity + shared topic → `related-to`
    - One references concepts from the other → `derived-from`
    - Opposing conclusions → `contradicts`
  - Return suggestions with confidence and rationale
- [ ] **RAG-077**: Implement batch edge discovery
  - Run edge discovery for all specs without edges (orphans first)
  - Or for all specs (find missing edges in well-connected graph)
  - Queue as background operation with progress tracking
- [ ] **RAG-078**: Implement edge discovery quality threshold
  - Only suggest edges above a confidence threshold
  - Default threshold: 0.7 similarity for `related-to`, 0.8 for `derived-from`
  - Prevents low-quality suggestions that create noise

### 10.3 Graph Context for RAG

- [ ] **RAG-079**: Implement graph-context-enhanced embedding
  - When embedding a spec, include edge context: related spec titles, edge types
  - Format: `Title: {title}\nTags: {tags}\nRelated: {related spec titles}\n\n{content}`
  - Enriches embeddings with relational context
  - Trade-off: longer input = higher cost; richer context = better retrieval
- [ ] **RAG-080**: Implement cluster-aware indexing
  - Group specs by graph clusters (connected components)
  - Store cluster ID in vector metadata
  - Enable cluster-scoped search: "find specs in this cluster similar to query"

#### Design Decisions

> **Q**: The PRD states that graph crawling is the primary discovery mechanism and RAG is for loose relevance. How should the system determine when to use RAG vs. graph traversal?
> **A**: The agent decides, guided by system-prompt heuristics. Rules of thumb baked into the agent's system prompt: (1) Start with graph traversal when the user is working within a known spec or document context — follow edges to related content. (2) Use RAG when the user asks an open-ended question with no clear starting spec ("what do we know about authentication?"). (3) Use RAG for orphan positioning — finding where a disconnected spec might fit. (4) Use graph traversal for dependency analysis, contradiction checking, and impact assessment. The system provides both tools; the agent chooses based on context.

> **Q**: Should RAG results include graph context (edge count, connected specs) in the result metadata for agent consumption?
> **A**: Yes. Each RAG result includes: `{ specId, title, summary, score, edgeCount, connectedSpecIds: [top 5 by edge count], documentIds }`. This gives the agent immediate context about each result's position in the graph without requiring a follow-up traversal query. The graph metadata is fetched from the in-memory adjacency index (sub-millisecond).

> **Q**: Should the graph-augmented search (expand RAG results via graph edges) be enabled by default, or only when explicitly requested?
> **A**: Enabled by default for agent queries; disabled for user UI searches. When enabled, the RAG returns top-10 vector results, then expands each by one hop of graph edges, deduplicates, and returns the merged set (up to 25 results). This provides richer context for agents. User UI searches return the raw top-10 vector results for simplicity and speed.

> **Q**: Should RAG-based edge discovery run automatically on new spec creation, or only when an agent or user requests it?
> **A**: Automatically on new spec creation (as part of the agent trigger system). When a spec is created, the system embeds it, queries pgvector for the top-5 most similar existing specs, and creates an inquiry suggesting edges: "Spec 'X' may be related to: 'Y' (0.89 similarity), 'Z' (0.85 similarity). Create edges?" The suggestions appear in the inquiry queue for user review.

> **Q**: What similarity threshold should be used for edge suggestions?
> **A**: Similarity threshold: 0.75 (cosine similarity). Below 0.75: no suggestion. 0.75–0.85: suggest as `related-to`. Above 0.85: suggest as `related-to` with a note "High similarity — possible duplicate or derived-from relationship." These thresholds are configurable in `.kg-config.json`. The agent can also suggest specific edge types based on content analysis, overriding the similarity-based default.

> **Q**: Should RAG-based edge suggestions include a suggested edge type, or should the agent determine the type through analysis?
> **A**: The RAG pipeline suggests `related-to` as the default type for all similarity-based edge suggestions. The agent then analyzes the content of both specs to refine the edge type (e.g., change to `derived-from` or `depends-on` if the content indicates a directional relationship). The two-step process: RAG provides candidates, agent provides semantic classification.

---

## 11. Orphan Positioning

### 11.1 Orphan Analysis

- [ ] **RAG-081**: Implement `positionOrphan(specId)` operation
  - Embed the orphan spec
  - Search for most similar existing specs
  - Analyze similarity patterns:
    - If strongly similar to one spec → suggest `derived-from` or `related-to` edge
    - If moderately similar to a cluster → suggest adding to that cluster's document
    - If weakly similar to everything → flag as truly unique (or possibly mis-categorized)
  - Return ranked positioning suggestions
- [ ] **RAG-082**: Define orphan positioning result type
  ```typescript
  interface OrphanPositioningSuggestion {
    specId: string;
    suggestions: {
      targetSpecId: string;
      suggestedEdgeType: EdgeType;
      similarity: number;
      rationale: string;
    }[];
    documentSuggestions: {
      documentId: string;
      similarity: number;
      rationale: string;
    }[];
    clusterAssignment?: string;
  }
  ```
- [ ] **RAG-083**: Implement positioning confidence thresholds
  - High confidence (>0.8): strong recommendation, suitable for auto-creation
  - Medium confidence (0.5–0.8): suggestion for human review
  - Low confidence (<0.5): weak signal, manual classification needed

### 11.2 Batch Orphan Positioning

- [ ] **RAG-084**: Implement `positionAllOrphans()` operation
  - Find all orphan specs (no edges, no document membership)
  - Run positioning for each orphan
  - Create inquiry items with suggestions
  - Report: orphans found, suggestions generated, high-confidence matches
- [ ] **RAG-085**: Implement incremental orphan positioning
  - When a new orphan is detected, queue positioning analysis
  - Don't wait for batch — position immediately for responsive UX

#### Design Decisions

> **Q**: Should orphan positioning be triggered automatically when a spec loses all its connections, or only on demand?
> **A**: Automatically, triggered by the orphan detection system (runs after edge/document deletions and on a 10-minute periodic scan). When a spec becomes an orphan (zero edges AND zero document memberships), the system immediately queries RAG for the 5 most similar specs and creates an inquiry with positioning suggestions.

> **Q**: Should orphan positioning suggest only edge connections, or also document placement?
> **A**: Both. The inquiry includes: "Suggested edges: related-to 'Y', derived-from 'Z'. Suggested document: 'Design Decisions' (contains 3 similar specs)." Document placement is determined by finding which documents the similar specs belong to and recommending the most common document.

> **Q**: What should happen when RAG-based positioning finds no good matches for an orphan?
> **A**: If no match exceeds the 0.75 similarity threshold, the inquiry reads: "Orphan spec 'X' has no similar specs in the graph. This may be a genuinely novel topic or may need better categorization. Review its title, tags, and content for clarity." The spec is flagged as `needs-review` in the inquiry, not as "truly unique" (which might discourage investigation).

---

## 12. Performance Optimization

### 12.1 Embedding Caching

- [ ] **RAG-086**: Implement query embedding cache
  - Cache embeddings of recent queries (LRU, 1000 entries)
  - Identical queries skip the embedding step
  - Cache keyed by (query text, provider name)
- [ ] **RAG-087**: Implement spec embedding deduplication
  - Before re-embedding a spec, check content hash
  - If content hasn't changed since last embedding, skip
  - Saves API costs and processing time

### 12.2 Batch Embedding Optimization

- [ ] **RAG-088**: Implement batch embedding API calls
  - OpenAI supports embedding multiple texts in one API call (up to 2048)
  - Batch specs for embedding: group 50–100 at a time
  - Significant latency and cost reduction for bulk operations
- [ ] **RAG-089**: Implement embedding request rate limiting
  - Respect provider rate limits (e.g., OpenAI: 3000 RPM, 1M TPM)
  - Implement token bucket rate limiter
  - Queue excess requests with backpressure

### 12.3 Vector Search Optimization

- [ ] **RAG-090**: Implement search result caching
  - Cache search results for frequently repeated queries
  - Short TTL (60 seconds) — knowledge graph changes frequently
  - Invalidate cache on any index update
- [ ] **RAG-091**: Implement approximate nearest neighbor tuning
  - For pgvector IVFFlat: tune `probes` parameter (trade recall for speed)
  - Default probes: 10 (increase for higher recall, decrease for lower latency)
  - For HNSW: tune `ef_search` parameter
  - Document tuning guidelines and benchmarks
- [ ] **RAG-092**: Implement pre-filtering in vector store
  - When metadata filters are applied, pre-filter in the database
  - pgvector: use WHERE clause before vector search
  - Reduces search space and improves latency

### 12.4 Memory Management

- [ ] **RAG-093**: Implement vector store connection pooling
  - For pgvector: use existing PostgreSQL connection pool
  - For FAISS: manage index memory (unload if not used for >30 minutes)
- [ ] **RAG-094**: Implement embedding streaming for large batches
  - Don't load all specs into memory for full reindex
  - Process in streaming fashion: read → embed → store → free memory
  - Maximum concurrent embeddings in memory: configurable

---

## 13. Monitoring & Quality Metrics

### 13.1 Operational Metrics

- [ ] **RAG-095**: Implement embedding pipeline metrics
  - Embedding generation latency (p50, p95, p99)
  - Embedding API error rate
  - Queue depth and processing rate
  - Total embeddings stored, total specs indexed
- [ ] **RAG-096**: Implement search pipeline metrics
  - Search query latency (p50, p95, p99)
  - Queries per second
  - Average results per query
  - Cache hit rate (query embedding cache, result cache)
- [ ] **RAG-097**: Implement index health metrics
  - Percentage of specs with up-to-date embeddings
  - Stale embeddings count (content changed since embedding)
  - Missing embeddings count (specs not yet indexed)
  - Index size (total vectors, storage bytes)

### 13.2 Quality Metrics

- [ ] **RAG-098**: Implement retrieval quality evaluation
  - Track: user clicked on result (implicit positive feedback)
  - Track: user selected a different result (implicit negative feedback for top results)
  - Compute precision at K for tracked queries
- [ ] **RAG-099**: Implement embedding freshness monitoring
  - Average age of embeddings
  - Percentage of embeddings older than threshold (e.g., 7 days)
  - Alert when freshness degrades (embedding pipeline may be stuck)
- [ ] **RAG-100**: Implement coverage monitoring
  - What percentage of active specs have embeddings?
  - Target: 100% of active specs indexed
  - Alert when coverage drops below threshold (e.g., 95%)

### 13.3 Alerting

- [ ] **RAG-101**: Define alerting thresholds
  - Embedding queue depth > 500: warning
  - Embedding queue depth > 2000: critical
  - Search latency p95 > 2s: warning
  - Search latency p95 > 5s: critical
  - Embedding coverage < 95%: warning
  - Embedding API error rate > 5%: critical
- [ ] **RAG-102**: Implement health check endpoint
  - `GET /api/v1/rag/health` → returns health status
  - Checks: vector store connectivity, embedding provider connectivity, queue health
  - Returns: `healthy`, `degraded`, or `unhealthy` with details

#### Design Decisions

> **Q**: What is the expected monthly cost for API-based embeddings? At $0.02 per 1M tokens (OpenAI v3 small) and ~500 tokens per spec, 10K specs costs ~$0.10 for initial indexing. Is this budget acceptable?
> **A**: Yes, the cost is negligible. Monthly estimate for a 10K-spec project with moderate activity (100 spec updates/day): ~3,000 specs/month re-embedded = 1.5M tokens = $0.03/month. Even aggressive usage (1,000 updates/day) costs ~$0.30/month. Version-aware indexing (storing all versions) increases total vectors but not ongoing embedding cost (only new versions are embedded). Budget is not a concern.

> **Q**: Should the system track and report embedding costs (tokens consumed, estimated cost)?
> **A**: Yes. The server tracks `totalTokensConsumed` and `estimatedCostUSD` per project per month, stored in the `project_usage` table in PostgreSQL. An admin dashboard shows monthly embedding usage. This is lightweight to implement (count tokens on each API response) and provides cost visibility.

> **Q**: Should there be a daily/monthly budget cap for embedding API calls?
> **A**: No hard cap in v1. The costs are too low to justify budget enforcement infrastructure. A soft monitoring alert (log warning) triggers if monthly cost exceeds $10/project — this would indicate a runaway process, not normal usage. If enterprise customers with massive graphs need budgets, add it in a future iteration.

> **Q**: How should RAG retrieval quality be evaluated? Manual test cases? Automated retrieval benchmarks? A/B testing?
> **A**: Manual test cases for v1. Create a test suite of 20–30 queries with expected results (specIds that should appear in the top-5). Run the suite after embedding model changes, chunking strategy changes, or scoring weight changes. Report recall@5 and precision@5. Automated benchmarks (comparing model versions) are a future iteration. A/B testing is not applicable for a single-tenant knowledge system.

> **Q**: Should there be a test dataset of queries with known-good results for regression testing?
> **A**: Yes. Maintain a `rag-test-queries.json` file (outside the knowledge graph, in the test fixtures directory) with `{ query, expectedSpecIds, minRecall }` entries. The CI pipeline runs these queries against a seeded test database and fails if recall drops below the threshold. Start with 20 queries; expand as the system matures.

> **Q**: Should the system log all search queries and results for offline quality analysis?
> **A**: Yes. Log to the `search_logs` table in PostgreSQL: `{ query, resultSpecIds, resultScores, userId, timestamp }`. Retained for 90 days. This data enables offline analysis: "which queries return poor results?" and "what are users searching for that they can't find?" Query logs are not exposed in the UI — admin/developer analysis only.

---

## 14. RAG Service API

### 14.1 Service Interface

- [ ] **RAG-103**: Define RAG service module structure
  ```
  server/src/rag/
  ├── rag.module.ts
  ├── rag.service.ts          # Main RAG service
  ├── rag.controller.ts       # REST endpoints
  ├── providers/
  │   ├── embedding-provider.interface.ts
  │   ├── openai-embedding.provider.ts
  │   └── local-embedding.provider.ts
  ├── chunking/
  │   ├── chunker.service.ts
  │   └── markdown-chunker.ts
  ├── stores/
  │   ├── vector-store.interface.ts
  │   ├── pgvector.store.ts
  │   └── faiss.store.ts
  ├── indexing/
  │   ├── index-builder.service.ts
  │   └── indexing-queue.service.ts
  ├── scoring/
  │   ├── scorer.service.ts
  │   └── scoring.config.ts
  └── monitoring/
      └── rag-metrics.service.ts
  ```
- [ ] **RAG-104**: Implement `RagService` main service class
  - Inject: embedding provider, vector store, chunking service, scoring service
  - Methods: `search()`, `indexSpec()`, `removeSpec()`, `reindexAll()`, `getHealth()`
  - Orchestrate the full pipeline for each operation
- [ ] **RAG-105**: Implement `RagController` REST endpoints
  - `POST /api/v1/rag/search` — semantic search
  - `POST /api/v1/rag/index/:specId` — trigger indexing for a spec
  - `POST /api/v1/rag/reindex` — trigger full reindex
  - `GET /api/v1/rag/health` — health check
  - `GET /api/v1/rag/stats` — index statistics
  - `POST /api/v1/rag/similar/:specId` — find similar specs

### 14.2 NestJS Module Integration

- [ ] **RAG-106**: Create `RagModule` as a NestJS module
  - Register providers for embedding, vector store, chunking
  - Configure via NestJS ConfigService
  - Export `RagService` for injection into other modules (agent system, knowledge graph ops)
- [ ] **RAG-107**: Integrate RAG with knowledge graph operations
  - Knowledge graph service injects RAG service
  - After spec create/update: call `ragService.indexSpec(specId)`
  - After spec delete: call `ragService.removeSpec(specId)`
  - Wire up as event-driven: knowledge graph emits events, RAG listens
- [ ] **RAG-108**: Integrate RAG with agent system
  - Agent MCP tools call `ragService.search()` for semantic retrieval
  - Agent MCP tools call `ragService.findRelated()` for edge discovery
  - RAG results included in agent context assembly

### 14.3 Configuration

- [ ] **RAG-109**: Define RAG configuration schema
  ```typescript
  interface RagConfig {
    embeddingProvider: 'openai' | 'local';
    embeddingModel: string;
    embeddingDimensions: number;
    vectorStore: 'pgvector' | 'faiss';
    chunkMaxTokens: number;
    chunkOverlapTokens: number;
    searchDefaultTopK: number;
    searchDefaultThreshold: number;
    indexingBatchSize: number;
    indexingConcurrency: number;
    scoringConfig: ScoringConfig;
  }
  ```
- [ ] **RAG-110**: Load RAG configuration from environment and config file
  - Environment variables for secrets (API keys)
  - `.kg-config.json` for non-secret settings
  - NestJS ConfigModule integration

---

## Summary

### Task Count by Section

| Section | Tasks |
|---------|-------|
| 1. Embedding Model | 9 (RAG-001 through RAG-009) |
| 2. Chunking Strategy | 9 (RAG-010 through RAG-018) |
| 3. Vector Store | 9 (RAG-019 through RAG-027) |
| 4. Index Build Pipeline | 6 (RAG-028 through RAG-033) |
| 5. Incremental Indexing | 10 (RAG-034 through RAG-043) |
| 6. Query Pipeline | 10 (RAG-044 through RAG-053) |
| 7. Relevance Scoring & Ranking | 6 (RAG-054 through RAG-059) |
| 8. Result Filtering | 8 (RAG-060 through RAG-067) |
| 9. Version-Aware Indexing | 5 (RAG-068 through RAG-072) |
| 10. Knowledge Graph Integration | 8 (RAG-073 through RAG-080) |
| 11. Orphan Positioning | 5 (RAG-081 through RAG-085) |
| 12. Performance Optimization | 9 (RAG-086 through RAG-094) |
| 13. Monitoring & Quality Metrics | 8 (RAG-095 through RAG-102) |
| 14. RAG Service API | 8 (RAG-103 through RAG-110) |
| **TOTAL** | **110** |

### Dependencies (What This Plan Enables)

Completion of this plan unblocks:
- `06-AGENT-SYSTEM/03-MCP-SERVERS-PLAN.md` — needs RAG search API for agent tools
- `06-AGENT-SYSTEM/05-PLAN-GENERATION-PLAN.md` — needs RAG for context retrieval during plan generation
- `04-KNOWLEDGE-GRAPH/02-OPERATIONS-PLAN.md` — needs RAG for orphan positioning and edge discovery

### Definition of Done

This plan is complete when:
- [ ] Embedding provider is configured and generating embeddings
- [ ] Chunking strategy produces well-formed chunks for all spec sizes
- [ ] Vector store is operational and receiving embeddings
- [ ] Full reindex completes successfully for the entire knowledge graph
- [ ] Incremental indexing triggers on spec create/update/delete
- [ ] Semantic search returns relevant results for test queries
- [ ] Relevance scoring applies boosts and normalizes correctly
- [ ] Permission filtering excludes unauthorized results
- [ ] Version metadata is available in search results
- [ ] RAG + graph combined retrieval works (expand results via edges)
- [ ] Orphan positioning generates meaningful suggestions
- [ ] Search latency p95 < 500ms for 10K-spec graphs
- [ ] Monitoring dashboards show embedding coverage, query latency, and queue health
- [ ] Health check endpoint reports accurate system status
