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
