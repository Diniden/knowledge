# 05 — RAG LAYER: Open Questions

> **Purpose**: Unresolved questions about the RAG pipeline including embedding
> model selection, chunking strategy, vector store choice, indexing pipeline,
> query design, scoring, filtering, knowledge graph integration, and operational
> concerns. Answers may change tasks in the plan.

---

## 1. Embedding Model

### 1.1 Model Choice
- **Q**: Should the primary embedding model be API-based (OpenAI) or local
  (nomic-embed-text, sentence-transformers)? API provides higher quality but
  adds cost, latency, and external dependency. Local enables offline operation.

**A:** API-based — OpenAI `text-embedding-3-small` as the default, per the PRD. The quality advantage of OpenAI embeddings over local models is significant for knowledge retrieval, and the cost is negligible ($0.02 per 1M tokens). Offline operation is not a requirement — the system already requires a server, PostgreSQL, and network connectivity. A local model fallback can be added in a future iteration if demand arises.

- **Q**: If using OpenAI, should we use `text-embedding-3-small` (1536 dims,
  cheaper) or `text-embedding-3-large` (3072 dims, better quality)? Is the
  quality difference meaningful for our content type?

**A:** `text-embedding-3-small` (1536 dimensions). Per the PRD, this is the chosen model. The quality difference between small and large is marginal for knowledge graph content (primarily English prose, not code or multilingual). The 2x storage and compute cost of large dims is not justified. If quality evaluation later shows gaps, switching to large is a configuration change + re-embedding.

- **Q**: Should the system support switching embedding models after initial
  deployment? Switching requires re-embedding the entire graph. What is the
  expected cost and downtime?

**A:** Yes, model switching must be supported. Re-embedding 10K specs at 500 tokens each = 5M tokens = ~$0.10 with OpenAI small. Re-embedding 50K specs = ~$0.50. Cost is negligible. Time: at ~100 specs/second via API with batching, 10K specs takes ~100 seconds, 50K takes ~8 minutes. The system supports a `bun run rag:reindex` CLI command that re-embeds all specs with a progress bar. During reindex, the old embeddings remain queryable — new embeddings replace them atomically per spec.

- **Q**: Should embeddings be generated on the server or offloaded to a
  dedicated embedding service/worker?

**A:** On the server, using an async queue within the NestJS application. Embedding generation is an HTTP API call (not CPU-intensive), so a dedicated worker is unnecessary. A `BullMQ`-style in-process queue (backed by an in-memory array, not Redis) processes embedding requests sequentially with concurrency of 5 (5 parallel OpenAI calls). This prevents rate-limit issues while maintaining throughput.

- **Q**: For a local model, should we use Python (sentence-transformers) via
  a subprocess/sidecar or a JavaScript/ONNX runtime? Python is more mature
  for ML; JS keeps the stack homogeneous.

**A:** Deferred — no local model in v1. If added later, use a Python sidecar process running sentence-transformers behind a lightweight HTTP API (FastAPI). This keeps the ML stack separate from the Node/Bun stack and avoids ONNX runtime immaturity. The sidecar is optional — only started if `EMBEDDING_PROVIDER=local` is configured.

### 1.2 Model Configuration
- **Q**: Should embedding dimensions be configurable? OpenAI's v3 models
  support Matryoshka representations (can reduce dimensions while maintaining
  quality). 512 dims vs. 1536 dims: what's the right trade-off for storage vs.
  recall?

**A:** Use the full 1536 dimensions. Dimension reduction to 512 saves ~60% storage but degrades recall quality by 5–10% based on OpenAI's benchmarks. At 50K vectors × 1536 dims × 4 bytes = ~300MB in pgvector, storage is not a concern. Prioritize recall quality over storage savings. The dimension count is stored in `.kg-config.json` and used to configure the pgvector column size.

- **Q**: Should the system support multiple embedding models simultaneously
  (e.g., one for English content, one for code blocks)?

**A:** No. Single embedding model for all content. Multiple models would require multiple vector columns or tables, complicate querying, and double embedding costs. The `text-embedding-3-small` model handles both English prose and code adequately. If a spec contains a code block, the embedding captures the surrounding prose context, which is sufficient for retrieval.

- **Q**: Should the embedding of spec content include the spec title and tags
  as prefix context? This enriches the embedding but increases token usage.

**A:** Yes. Prepend the spec title and tags as context before embedding. Format: `Title: {title}\nTags: {tag1}, {tag2}\n\n{content}`. This enriches the embedding with structural metadata, improving retrieval when users search by concept rather than exact content. The token overhead is minimal (~20–30 extra tokens per spec).

---

## 2. Chunking Strategy

### 2.1 Chunk Granularity
- **Q**: Should the primary chunking unit be the spec (one embedding per spec)
  or a fixed-size token window? Spec-level is simpler but may miss nuances
  in long specs.

**A:** Spec-level as the primary unit (one embedding per spec). Specs are designed to represent a single idea each (per PRD), so they are natural semantic units. Only split specs that exceed 2,000 tokens into multiple chunks. At the target of ~500 tokens per spec, the vast majority of specs produce a single embedding. This keeps the system simple and the vector store compact.

- **Q**: At what content length should a spec be split into multiple chunks?
  1000 tokens? 2000 tokens? Or always chunk regardless of length?

**A:** Split at 2,000 tokens. Below 2,000 tokens: single chunk. Above 2,000 tokens: split into chunks of ~1,000 tokens with 200-token overlap. The 2,000-token threshold accommodates specs up to ~1,500 words — generous for a "single idea" spec. Specs exceeding this threshold likely need decomposition, which the system flags via inquiry.

- **Q**: Should code blocks within specs be chunked separately from prose, since
  they have different semantic characteristics?

**A:** No. Code blocks are embedded inline with their surrounding prose context. Separating them would lose the explanatory context ("This function handles authentication by..."). The embedding model handles mixed prose+code adequately. If a spec is primarily code with minimal prose, the title+tags prefix (prepended during embedding) provides the semantic anchor.

- **Q**: Should the chunking strategy be different for different spec types
  (e.g., requirement specs vs. design decision specs)?

**A:** No. One chunking strategy for all specs. The spec type does not meaningfully change optimal chunk size. Requirement specs and design decision specs are both prose-first with occasional code/diagrams. Maintaining multiple chunking strategies adds complexity for negligible retrieval improvement.

### 2.2 Chunk Overlap
- **Q**: What chunk overlap percentage provides the best retrieval quality?
  10%? 20%? Higher overlap = better recall but more storage and cost.

**A:** 200 tokens of overlap (approximately 20% of a 1,000-token chunk). This ensures that no concept that spans a chunk boundary is lost. The storage overhead is modest — a 3,000-token spec produces 3 chunks (~3,600 total tokens with overlap) instead of 3 non-overlapping chunks (3,000 tokens). The cost difference is negligible at OpenAI's per-token pricing.

- **Q**: Should overlap be token-based (overlap N tokens) or semantic (overlap
  at paragraph boundaries)?

**A:** Semantic boundaries preferred. Split at paragraph breaks (double newline), heading boundaries, or list item boundaries — choosing the nearest semantic boundary within ±100 tokens of the 1,000-token target. This produces chunks that start and end at natural content boundaries, improving both embedding quality and result readability. Fall back to token-based split if no semantic boundary is found within range.

### 2.3 Chunk Context
- **Q**: Should each chunk include context from the spec's metadata (title,
  tags, summary) prepended to the content? This improves embedding quality but
  increases token usage per chunk.

**A:** Yes. Every chunk (including sub-spec chunks from long specs) is prepended with: `Title: {title}\nTags: {tag1}, {tag2}\n\n`. This ensures that even a chunk from the middle of a long spec is contextually anchored. Token overhead: ~20–30 tokens per chunk. This is the same prefix used for whole-spec embeddings.

- **Q**: Should chunks include "breadcrumb" context (document title → spec
  title → section heading) for hierarchical context?

**A:** No breadcrumbs. The spec title is sufficient context. Document titles add noise (a spec may belong to multiple documents) and section headings are not consistently structured across specs. Keep the context prefix lean: title + tags only.

- **Q**: Should the chunking strategy use the `<!-- chunk-break -->` markers
  from the architecture plan, or rely entirely on automatic boundary detection?

**A:** Automatic boundary detection only. No manual chunk-break markers. Requiring authors to insert markers is a maintenance burden that most users will ignore. Automatic paragraph/heading boundary detection handles 99% of cases well. If a specific spec consistently produces poor chunks, the solution is to restructure the spec content, not add markers.

---

## 3. Vector Store

### 3.1 Store Selection
- **Q**: Should the vector store be pgvector (co-located with PostgreSQL),
  ChromaDB (Python-native), Qdrant (high-performance), or FAISS (file-based)?
  The plan recommends pgvector — does the team agree?

**A:** pgvector, per the PRD. Co-located with the existing PostgreSQL instance. This eliminates an additional service to operate, keeps the tech stack simple (one database for everything), and provides ACID transactions for embedding updates alongside metadata. pgvector's performance is sufficient for the target scale.

- **Q**: If using pgvector, should the embedding table be in the same database
  as the application data, or a separate PostgreSQL instance?

**A:** Same database, same PostgreSQL instance. A separate instance adds operational overhead (two databases to backup, monitor, connect to) with no performance benefit at the target scale (50K vectors). The embedding table is just another table in the same schema. Connection pooling is shared.

- **Q**: Should the vector store support metadata filtering (pre-filter before
  vector search) or is post-filtering sufficient? pgvector and Qdrant support
  pre-filtering; FAISS does not.

**A:** Pre-filtering via pgvector's `WHERE` clause. The embedding table includes denormalized metadata columns: `spec_id`, `status`, `tags` (as text array), `project_id`, and `permission_level`. Vector search queries include `WHERE` conditions (e.g., `WHERE status = 'active' AND project_id = '...'`) that filter before the ANN search. This is more efficient than post-filtering and ensures the top-K results are all relevant.

- **Q**: At what scale does pgvector performance become insufficient? 100K
  vectors? 1M? Should we plan for a migration path to a dedicated vector DB?

**A:** pgvector with HNSW handles up to ~500K vectors with <100ms query latency. At the target scale (50K specs × ~1.2 chunks average = ~60K vectors), pgvector is well within its comfort zone. Migration to a dedicated vector DB (Qdrant) is the escape hatch if the system ever exceeds 500K vectors, but this is not an expected scenario. No upfront migration planning needed.

### 3.2 Index Type
- **Q**: For pgvector, should we use IVFFlat (faster build, moderate recall) or
  HNSW (slower build, better recall)? HNSW is generally recommended for
  production.

**A:** HNSW. Better recall at equivalent query latency. Build time is slower than IVFFlat but still fast at the target scale (~60K vectors builds in <30 seconds). HNSW also handles incremental inserts well (no need to rebuild the index on every insert, unlike IVFFlat which degrades without periodic rebuilds).

- **Q**: Should the vector index be rebuilt periodically, or does the chosen
  index type handle incremental updates well?

**A:** HNSW handles incremental inserts natively. No periodic rebuild needed. If recall quality is observed to degrade after many inserts (unlikely with HNSW but possible), a `REINDEX` can be triggered via admin CLI (`bun run rag:reindex-vectors`). This is a rare maintenance operation, not a scheduled task.

- **Q**: Should the system support configurable vector index parameters (probes,
  ef_search) that users can tune for their performance needs?

**A:** Sensible defaults, no user-facing configuration. HNSW parameters: `m = 16`, `ef_construction = 200`, `ef_search = 100`. These provide good recall (~98%) at the target scale. The values are set in the migration that creates the vector index. If tuning is needed, it's an admin/DBA operation, not a user-facing setting.

---

## 4. Indexing Pipeline

### 4.1 Indexing Triggers
- **Q**: Should embedding generation be synchronous (block the spec update
  until embedded) or asynchronous (queue for background processing)? Async is
  faster for users but means search results have a lag.

**A:** Asynchronous. Spec updates return immediately; embedding generation is queued. The lag is typically 1–5 seconds (one OpenAI API call per spec). During this window, the old embedding remains queryable (stale but present). A `pendingEmbedding` flag on the vector record indicates that a re-embedding is in progress, allowing the UI to show a subtle "indexing..." indicator.

- **Q**: Should every content edit trigger re-embedding, or should there be a
  minimum change threshold (e.g., >10% of content changed)?

**A:** Re-embed on every content change. The cost per embedding is ~$0.00001 (500 tokens at $0.02/1M). There is no meaningful savings from skipping small edits. Implementing a change threshold adds complexity (diffing content, computing percentage) for negligible cost reduction. Always re-embed ensures search results are always current.

- **Q**: Should metadata-only changes (tags, permissions) trigger
  re-embedding, or only update the vector store metadata?

**A:** Re-embed if tags change (tags are part of the embedding prefix). Update metadata only (no re-embedding) for permission changes, status changes, and other metadata-only updates. The vector store row's metadata columns are updated in-place without touching the embedding vector.

- **Q**: Should the system track a "dirty" flag on specs whose content changed
  since last embedding, rather than computing content hashes?

**A:** Use `contentHash` in `spec.json` (SHA-256 of the content.md file). When the embedding pipeline processes a spec, it compares the `contentHash` in the vector store metadata against the current spec's `contentHash`. If they match, skip embedding. This is more robust than a dirty flag (which can get stuck if the embedding worker crashes) and handles edge cases like reverting content to a previously embedded version.

### 4.2 Batch Indexing
- **Q**: For initial load of a large knowledge graph, what is the expected
  indexing time? At 100 specs/minute (API) or 1000 specs/minute (local), a
  10K-spec graph takes 100 minutes or 10 minutes respectively. Is this
  acceptable?

**A:** With batched API calls (OpenAI supports batch embedding of multiple texts in one request, up to 2,048 texts per call), throughput is ~500 specs/second. 10K specs: ~20 seconds. 50K specs: ~100 seconds. This is fast enough for initial indexing. The batch API call sends up to 100 specs per request with 5 concurrent requests.

- **Q**: Should the system provide a progress indicator for batch indexing
  operations?

**A:** Yes. The CLI shows: `[2,500/10,000] Embedding specs... 25% complete, ~15s remaining`. The API exposes a `/rag/indexing-status` endpoint returning `{ total, completed, inProgress, estimatedSecondsRemaining }` for the frontend to display a progress bar.

- **Q**: Should batch indexing be resumable (pick up where it left off after a
  crash)?

**A:** Yes. The `contentHash` comparison mechanism makes this automatic. On restart after a crash, the batch indexer scans all specs, compares `contentHash` with what's in pgvector, and only re-embeds specs whose hash doesn't match. Specs already embedded are skipped. No explicit checkpoint file needed.

---

## 5. Query Pipeline

### 5.1 Query Processing
- **Q**: Should the query pipeline support natural language queries only, or
  also structured queries (e.g., `tag:authentication AND content:"JWT"`)?

**A:** Both. Natural language queries are embedded and searched via vector similarity. Structured queries use pgvector's metadata filtering: `tag:authentication` maps to `WHERE 'authentication' = ANY(tags)`, `status:active` maps to `WHERE status = 'active'`. The query parser detects structured syntax (field:value patterns) and routes accordingly. Mixed queries are supported: `tag:authentication how does JWT validation work` uses the tag as a pre-filter and the natural language part as the vector query.

- **Q**: Should the system support query expansion (generating multiple query
  variants for better recall)? This adds latency and cost but improves results.

**A:** Not in v1. Query expansion requires an LLM call per query, adding 500ms–2s latency and cost. The combination of spec-title-enriched embeddings and metadata pre-filtering provides good recall without expansion. If retrieval quality proves insufficient in practice, query expansion can be added as an opt-in feature.

- **Q**: Should the Hypothetical Document Embedding (HyDE) technique be used?
  It improves recall for complex queries but requires an LLM call per query.

**A:** Not in v1. Same reasoning as query expansion — the LLM call adds significant latency and cost per query. The simpler approach (embed the query directly, search) is the starting point. HyDE is a future optimization if recall metrics show a need.

- **Q**: Should the RAG system use a reranker model (e.g., cross-encoder) after
  initial retrieval for higher-quality ranking? Rerankers significantly improve
  precision but add latency.

**A:** Not in v1. Reranking adds a second model call (100–500ms) per query. For the target scale and use case (knowledge graph navigation, not open-domain QA), the initial vector similarity ranking is sufficient. The graph-augmented context (expanding results via edges) provides additional precision. Reranking is a future optimization.

### 5.2 Search Scope
- **Q**: Should RAG search default to the entire knowledge graph, or should it
  scope to the current document/project? Users may expect context-aware results.

**A:** Default scope: the current project (all specs the user has access to within the project). Users can narrow to a specific document or widen to all projects they have access to. The `project_id` column on the embedding table enables efficient per-project filtering. Most searches are project-scoped, matching user expectations.

- **Q**: Should RAG search results be ranked within the context of a
  conversation (consider what the user has already seen)?

**A:** Not in v1. Conversation-aware ranking requires maintaining a per-conversation embedding history and re-ranking based on novelty. This is complex and the benefit is unclear. The agent already has conversation context and can filter results itself. Defer until user feedback indicates a need.

- **Q**: Should RAG support "negative examples" (find specs NOT similar to X)?

**A:** Not in v1. Negative example search is a niche use case that adds query complexity. Users can approximate this by searching for what they want and ignoring results similar to what they don't want. The agent can also handle this via prompt instructions ("find specs about authentication that are NOT about JWT").

---

## 6. Relevance Scoring

- **Q**: Should relevance scoring include a recency boost? If so, how strong?
  Knowledge may be intentionally old but still relevant.

**A:** Mild recency boost. Score formula: `finalScore = vectorSimilarity * 0.9 + recencyBoost * 0.1`, where `recencyBoost = 1.0 / (1.0 + daysSinceUpdate / 365)`. This gives recently updated specs a small advantage without burying old-but-relevant specs. A spec updated today gets +0.1; a spec updated 1 year ago gets +0.05; a spec updated 3 years ago gets +0.025. The 90/10 weighting ensures vector similarity dominates.

- **Q**: Should well-connected specs (many edges) receive a boost, or does this
  create a rich-get-richer bias that buries new or niche specs?

**A:** No connectivity boost in the default scoring. Rich-get-richer bias is a real concern — new specs would never surface. Connectivity information is available in the result metadata (`edgeCount`) so agents can factor it into their reasoning, but the RAG scoring itself is purely similarity + recency. The graph traversal system (primary discovery mechanism per PRD) naturally favors well-connected specs.

- **Q**: Should the scoring system incorporate user feedback (click-through
  data) to improve ranking over time?

**A:** Not in v1. Click-through learning requires significant infrastructure (event tracking, feedback loop, model retraining or weight adjustment). The knowledge graph is not a search engine — users typically find specs via graph traversal, not repeated searches. Defer until usage patterns are established.

- **Q**: Should scoring weights be configurable per user, per project, or
  global only?

**A:** Global only. The recency boost weight (0.1) and similarity weight (0.9) are application constants. Per-user or per-project configuration adds complexity with minimal benefit — most users have no intuition for tuning retrieval weights. If tuning is needed, it's an admin operation in `.kg-config.json`.

---

## 7. Filtering & Permissions

- **Q**: Should permission filtering happen at the vector store level
  (pre-filter) or at the application level (post-filter)? Pre-filter is more
  efficient but requires storing permission data in the vector store.

**A:** Pre-filter at the vector store level. The embedding table includes a `project_id` column and the application constructs `WHERE project_id = ?` conditions. Per-spec permission filtering (full vs. summary access) happens at the application level as a post-filter: the vector query returns top-K results, then the application checks each result's permission level and redacts content for summary-only access. This hybrid approach balances efficiency (project-level pre-filter eliminates the bulk) with flexibility (per-spec permissions checked in application code where the logic is complex).

- **Q**: For summary-level access specs, should the RAG result include the
  similarity score even though the user can't see the full content? This reveals
  that relevant restricted content exists.

**A:** Yes. Summary-level specs appear in search results with their title, summary, similarity score, and a "[Summary access only]" label. Per the PRD: "Permissions: full, summary, never no-access." Users should know that relevant content exists, even if they can only see the summary. This prevents information silos and encourages users to request full access through proper channels.

- **Q**: Should the system support "search on behalf of" functionality where an
  admin can see results as another user would see them?

**A:** Not in v1. This is a niche admin/debugging feature. Admins already have full access to all specs, so they can assess what's in the system. If permission debugging is needed, the admin can check the `spec_permissions` table directly. Defer unless compliance requirements demand it.

---

## 8. Version-Aware Indexing

- **Q**: Should the vector store contain only the latest version of each spec,
  or should it index historical versions too? Indexing history enables "find
  specs that used to discuss X" but significantly increases index size.

**A:** Each spec version is indexed in the vector store per the PRD: "Each spec version in RAG index for recentness discovery." The embedding table includes a `version` column. The latest version is marked with `is_current = true`. Search queries default to `WHERE is_current = true` (current versions only). Agents can opt into historical search with `includeHistorical=true` for recentness discovery — finding specs that previously discussed a topic that may have been removed or refactored.

- **Q**: Should the agent be able to search for specs by version/time ("find
  specs that discussed authentication as of last month")?

**A:** Yes, via temporal filtering. The embedding table includes `created_at` (when this version was committed). Agents can query: `WHERE created_at <= '2025-01-15' AND is_current = false` to find historical versions. Combined with vector similarity, this enables "what did we know about authentication in January?" queries. This is a power feature used by agents, not exposed directly in the user search UI.

- **Q**: How should the system handle specs that were recently created (no
  version history)? Should they be treated differently in ranking?

**A:** No special treatment. A newly created spec has one version (v1) with `is_current = true`. It participates in search like any other spec. The mild recency boost (section 6) naturally gives new specs a small advantage. No explicit "new spec" bonus — the content quality should speak for itself via vector similarity.

---

## 9. Knowledge Graph Integration

### 9.1 RAG + Graph Relationship
- **Q**: The PRD states that graph crawling is the primary discovery mechanism
  and RAG is for loose relevance. How should the system determine when to use
  RAG vs. graph traversal? Should the agent decide, or should there be
  heuristics?

**A:** The agent decides, guided by system-prompt heuristics. Rules of thumb baked into the agent's system prompt: (1) Start with graph traversal when the user is working within a known spec or document context — follow edges to related content. (2) Use RAG when the user asks an open-ended question with no clear starting spec ("what do we know about authentication?"). (3) Use RAG for orphan positioning — finding where a disconnected spec might fit. (4) Use graph traversal for dependency analysis, contradiction checking, and impact assessment. The system provides both tools; the agent chooses based on context.

- **Q**: Should RAG results include graph context (edge count, connected specs)
  in the result metadata for agent consumption?

**A:** Yes. Each RAG result includes: `{ specId, title, summary, score, edgeCount, connectedSpecIds: [top 5 by edge count], documentIds }`. This gives the agent immediate context about each result's position in the graph without requiring a follow-up traversal query. The graph metadata is fetched from the in-memory adjacency index (sub-millisecond).

- **Q**: Should the graph-augmented search (expand RAG results via graph edges)
  be enabled by default, or only when explicitly requested?

**A:** Enabled by default for agent queries; disabled for user UI searches. When enabled, the RAG returns top-10 vector results, then expands each by one hop of graph edges, deduplicates, and returns the merged set (up to 25 results). This provides richer context for agents. User UI searches return the raw top-10 vector results for simplicity and speed.

### 9.2 Edge Discovery
- **Q**: Should RAG-based edge discovery run automatically on new spec creation,
  or only when an agent or user requests it?

**A:** Automatically on new spec creation (as part of the agent trigger system). When a spec is created, the system embeds it, queries pgvector for the top-5 most similar existing specs, and creates an inquiry suggesting edges: "Spec 'X' may be related to: 'Y' (0.89 similarity), 'Z' (0.85 similarity). Create edges?" The suggestions appear in the inquiry queue for user review.

- **Q**: What similarity threshold should be used for edge suggestions? Too low
  creates noise; too high misses valid connections.

**A:** Similarity threshold: 0.75 (cosine similarity). Below 0.75: no suggestion. 0.75–0.85: suggest as `related-to`. Above 0.85: suggest as `related-to` with a note "High similarity — possible duplicate or derived-from relationship." These thresholds are configurable in `.kg-config.json`. The agent can also suggest specific edge types based on content analysis, overriding the similarity-based default.

- **Q**: Should RAG-based edge suggestions include a suggested edge type, or
  should the agent determine the type through analysis?

**A:** The RAG pipeline suggests `related-to` as the default type for all similarity-based edge suggestions. The agent then analyzes the content of both specs to refine the edge type (e.g., change to `derived-from` or `depends-on` if the content indicates a directional relationship). The two-step process: RAG provides candidates, agent provides semantic classification.

---

## 10. Orphan Positioning

- **Q**: Should orphan positioning be triggered automatically when a spec loses
  all its connections, or only on demand?

**A:** Automatically, triggered by the orphan detection system (runs after edge/document deletions and on a 10-minute periodic scan). When a spec becomes an orphan (zero edges AND zero document memberships), the system immediately queries RAG for the 5 most similar specs and creates an inquiry with positioning suggestions.

- **Q**: Should orphan positioning suggest only edge connections, or also
  document placement?

**A:** Both. The inquiry includes: "Suggested edges: related-to 'Y', derived-from 'Z'. Suggested document: 'Design Decisions' (contains 3 similar specs)." Document placement is determined by finding which documents the similar specs belong to and recommending the most common document.

- **Q**: What should happen when RAG-based positioning finds no good matches
  for an orphan? Should the orphan be flagged as "truly unique" or as "possibly
  mis-categorized"?

**A:** If no match exceeds the 0.75 similarity threshold, the inquiry reads: "Orphan spec 'X' has no similar specs in the graph. This may be a genuinely novel topic or may need better categorization. Review its title, tags, and content for clarity." The spec is flagged as `needs-review` in the inquiry, not as "truly unique" (which might discourage investigation).

---

## 11. Operational Concerns

### 11.1 Cost Management
- **Q**: What is the expected monthly cost for API-based embeddings? At $0.02
  per 1M tokens (OpenAI v3 small) and ~500 tokens per spec, 10K specs costs
  ~$0.10 for initial indexing. Re-indexing frequency determines ongoing costs.
  Is this budget acceptable?

**A:** Yes, the cost is negligible. Monthly estimate for a 10K-spec project with moderate activity (100 spec updates/day): ~3,000 specs/month re-embedded = 1.5M tokens = $0.03/month. Even aggressive usage (1,000 updates/day) costs ~$0.30/month. Version-aware indexing (storing all versions) increases total vectors but not ongoing embedding cost (only new versions are embedded). Budget is not a concern.

- **Q**: Should the system track and report embedding costs (tokens consumed,
  estimated cost)?

**A:** Yes. The server tracks `totalTokensConsumed` and `estimatedCostUSD` per project per month, stored in the `project_usage` table in PostgreSQL. An admin dashboard shows monthly embedding usage. This is lightweight to implement (count tokens on each API response) and provides cost visibility.

- **Q**: Should there be a daily/monthly budget cap for embedding API calls?

**A:** No hard cap in v1. The costs are too low to justify budget enforcement infrastructure. A soft monitoring alert (log warning) triggers if monthly cost exceeds $10/project — this would indicate a runaway process, not normal usage. If enterprise customers with massive graphs need budgets, add it in a future iteration.

### 11.2 Reliability
- **Q**: What should happen when the embedding provider is unavailable?
  Queue for retry? Fall back to local model? Return degraded search results
  (exclude unembedded specs)?

**A:** Queue for retry with exponential backoff: 1s, 2s, 4s, 8s, 16s, max 60s. Maximum 10 retries per spec. If all retries fail, the spec is marked as `embeddingFailed` in the embedding queue and an admin alert is logged. Search continues working with existing embeddings — specs that failed embedding are simply not findable via RAG until the provider recovers and they are re-processed. No local model fallback in v1.

- **Q**: Should the system maintain a backup embedding provider that activates
  on primary provider failure?

**A:** Not in v1. OpenAI's embedding API has excellent uptime (>99.9%). A backup provider (e.g., Cohere) would require maintaining two sets of embeddings (models produce different vector spaces). The retry queue handles transient outages. If OpenAI has an extended outage, search degrades gracefully (existing embeddings still work; new content isn't searchable until re-embedded).

- **Q**: How should the system handle partial re-indexing failures (some specs
  embedded, some failed)?

**A:** Each spec is independently embedded. Failures for individual specs do not affect others. The embedding queue tracks per-spec status: `pending`, `processing`, `completed`, `failed`. Failed specs are retried on the next queue processing cycle. The `/rag/indexing-status` endpoint reports failed specs so admins can investigate.

### 11.3 Data Consistency
- **Q**: How should the system handle the window between content update and
  embedding update? During this window, search results may not reflect the
  latest content.

**A:** Accept the 1–5 second stale window. The vector store row retains the previous embedding until the new one is computed. Search results may briefly return the old content. The UI can show a subtle "re-indexing..." indicator on recently updated specs. This is an acceptable trade-off for the performance benefit of async embedding.

- **Q**: Should the vector store be considered the source of truth for
  embeddings, or should `metadata.json.embedding` be the source of truth with
  the vector store as a cache?

**A:** pgvector is the sole source of truth for embeddings. Embeddings are NOT stored in the git repo (no `metadata.json.embedding` field). The vector store is not a cache — it is the authoritative store. If the vector store is lost, embeddings are regenerated from spec content via `bun run rag:reindex`.

- **Q**: Should the system support "search index rebuild" as an admin operation
  that clears and rebuilds the entire vector store?

**A:** Yes. `bun run rag:reindex` is an admin CLI command that: (1) truncates the embedding table, (2) scans all current specs, (3) re-embeds each one via the batch pipeline, (4) reports progress and completion. This handles model changes, vector store corruption, or schema migrations. Expected runtime: 10K specs in ~20 seconds, 50K specs in ~100 seconds.

---

## 12. Testing & Quality Assurance

- **Q**: How should RAG retrieval quality be evaluated? Manual test cases?
  Automated retrieval benchmarks? A/B testing?

**A:** Manual test cases for v1. Create a test suite of 20–30 queries with expected results (specIds that should appear in the top-5). Run the suite after embedding model changes, chunking strategy changes, or scoring weight changes. Report recall@5 and precision@5. Automated benchmarks (comparing model versions) are a future iteration. A/B testing is not applicable for a single-tenant knowledge system.

- **Q**: Should there be a test dataset of queries with known-good results for
  regression testing?

**A:** Yes. Maintain a `rag-test-queries.json` file (outside the knowledge graph, in the test fixtures directory) with `{ query, expectedSpecIds, minRecall }` entries. The CI pipeline runs these queries against a seeded test database and fails if recall drops below the threshold. Start with 20 queries; expand as the system matures.

- **Q**: Should the system log all search queries and results for offline
  quality analysis?

**A:** Yes. Log to the `search_logs` table in PostgreSQL: `{ query, resultSpecIds, resultScores, userId, timestamp }`. Retained for 90 days. This data enables offline analysis: "which queries return poor results?" and "what are users searching for that they can't find?" Query logs are not exposed in the UI — admin/developer analysis only.

- **Q**: How should the chunking strategy be validated? Compare retrieval
  quality with different chunk sizes and overlaps?

**A:** Use the test query suite (above) to compare chunking configurations. Run the suite with: (a) spec-level only (no splitting), (b) 1,000-token chunks with 200-token overlap, (c) 500-token chunks with 100-token overlap. Choose the configuration with the best recall@5. This is a one-time evaluation during development, not an ongoing process.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
|------|----------|----------|-----------|
| — | — | — | — |
