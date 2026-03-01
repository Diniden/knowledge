# 00 — MASTER PLAN: Open Questions

> **Purpose**: Unresolved questions about project phasing, priorities, team
> allocation, timeline expectations, MVP scope, and cross-cutting decisions that
> affect the entire system. Each question should be answered before or during the
> relevant phase.

---

## 1. Phasing & Timeline

### 1.1 Phase Duration

- **Q**: The master plan proposes 5 phases across ~28 weeks. Is this timeline
  realistic given team size, or should phases be stretched/compressed?
- **A:** The timeline is aspirational but reasonable for a small focused team (2–3 full-stack developers). Phases 1 and 2 are the tightest — plan for 5 weeks on Phase 1 (instead of 4) to account for Bun/NestJS integration friction. The 28-week envelope is a target, not a hard commitment; let velocity from Phase 1 calibrate the rest.

- **Q**: Are there hard deadlines (demos, funding milestones, partner
  commitments) that would force phase boundaries to shift?
- **A:** No external hard deadlines exist. The primary pressure is internal: demonstrating the end-to-end vision (spec → graph → agent → plan) as early as possible to validate the concept. Phase 2 exit is the first meaningful demo checkpoint; treat it as a soft milestone.

- **Q**: Should phases overlap (e.g., start Phase 3 agent work while Phase 2
  graph UI is still being polished), or must each phase fully complete before
  the next begins?
- **A:** Phases should overlap. Once Phase 2 core data model and CRUD are stable, begin Phase 3 agent architecture in parallel while graph UI polish continues. The dependency graph in the master plan already identifies which tracks can run concurrently. Use the 8 parallelization tracks — don't gate entire phases.

### 1.2 Phase Gates

- **Q**: What are the explicit go/no-go criteria between phases? The exit
  criteria listed in the master plan are functional — should there also be
  quality gates (test coverage thresholds, performance benchmarks, security
  checks)?
- **A:** Yes, add quality gates. Phase 1 exit: 70% test coverage on shared + server packages, all lint rules passing, zero known security issues in auth. Phase 2 exit: 60% coverage on knowledge graph operations, no data loss on spec CRUD, graph traversal under 200ms for 500 nodes. Phase 3+: coverage thresholds maintained, agent responses under 30s for basic queries. Performance benchmarks are advisory, not blocking.

- **Q**: Who has authority to approve phase transitions? A single product owner,
  a committee, or consensus among all contributors?
- **A:** Single product owner (project lead) makes the call after reviewing exit criteria. For a small team, a formal committee is overhead. The product owner reviews the exit criteria checklist and any open blockers, then makes a go/no-go decision documented in the decision log below.

### 1.3 Phase Ordering

- **Q**: The plan puts Agent Integration (Phase 3) after Core Systems (Phase 2).
  Could a minimal agent be integrated earlier to validate the architecture, even
  without full graph/RAG support?
- **A:** Yes — introduce a "hello world" agent probe in late Phase 1 or early Phase 2. This means spinning up a single Claude Code session that reads a hardcoded spec and responds. It validates the process spawning, sandboxing, and MCP plumbing without requiring the full graph. Keep it as a spike/proof-of-concept, not production code.

- **Q**: Should Generative UI be in Phase 4, or should a proof-of-concept move
  to Phase 3 since it validates the iframe sandbox model early?
- **A:** Move a minimal PoC to late Phase 3. The iframe + ESM sandbox is a novel pattern with security implications (CSP, same-origin restrictions), and validating it early reduces Phase 4 risk. The PoC should load a static React mini-project in an iframe — no agent generation yet, just the loading pipeline.

---

## 2. MVP Scope

### 2.1 Feature Boundaries

- **Q**: The MVP includes RAG retrieval but not agent integration. Is RAG useful
  without an agent consuming it? Should MVP instead include a basic agent that
  uses RAG, deferring only advanced agent features?
- **A:** RAG without an agent has limited standalone value. Include a basic conversational agent in MVP that uses RAG to answer questions about existing specs. Defer agent-initiated spec creation, graph crawling, and plan generation. This gives the MVP a compelling demo: "ask a question, get an answer grounded in your knowledge graph."

- **Q**: Does the MVP need multi-user support at all, or is single-user
  sufficient for initial validation?
- **A:** Single-user is sufficient for MVP. Auth scaffolding should support multiple users (registration, JWT), but collaboration features (sync, permissions, dialog forking) are deferred. One user creating specs, building a graph, and querying via agent is the core validation loop.

- **Q**: Is the graph visualization required for MVP, or can a simpler list/tree
  view of specs suffice initially?
- **A:** A basic graph visualization is required — it's the product's signature differentiator. However, it can be minimal: a vertical tree layout with virtual scrolling, click-to-expand spec document cards, and two-finger trackpad scrolling. Advanced features (filtering, edge-type coloring) are deferred. The tree view IS the primary (and only) graph navigation mode — a BFS from a primary node organizes specs into depth-level rows displayed as compressed rectangular cards with agent-generated summaries.

### 2.2 MVP Validation

- **Q**: Who are the target MVP users? Internal team only, or external early
  adopters?
- **A:** Internal team only. The MVP validates the core loop: human authors specs → graph forms → agent reads graph → agent answers questions. External early adopters come after Phase 3 when the agent experience is polished. Internal use also surfaces workflow pain points before they reach outsiders.

- **Q**: What is the primary success signal for the MVP? User engagement with
  spec creation? Quality of graph connections? Speed of knowledge capture
  compared to manual methods?
- **A:** Primary success signal is **quality of graph connections** — specifically, whether the graph structure meaningfully captures relationships between specs such that an agent (or human) can traverse the graph and discover relevant context. Secondary signal is speed of knowledge capture vs. writing unstructured documents.

- **Q**: Should the MVP include any plan generation capability (even if limited)
  to demonstrate the end-to-end vision?
- **A:** No. Plan generation requires a mature graph and agent system. Including a half-baked version would undermine confidence in the vision. Instead, demonstrate the end-to-end potential with a scripted walkthrough or mockup showing what plan generation will look like once the graph is populated.

### 2.3 MVP Constraints

- **Q**: Is there a maximum acceptable time for MVP delivery? If the full Phase
  1+2 timeline (~10 weeks) is too long, which features can be stripped to hit a
  shorter target?
- **A:** Target 8 weeks for a functional MVP. If needed, strip: version control UI (keep git commits happening server-side, defer the diff/revert UI), permissions system (single-user makes this moot), and advanced graph visualization features. The irreducible core is: spec editor, knowledge graph storage + basic visualization, and RAG retrieval.

- **Q**: Should the MVP be deployable (even if just to a staging environment),
  or is local-only acceptable?
- **A:** Local-only is acceptable for MVP. Docker Compose should make `bun dev` a one-command startup. A staging deployment is a nice-to-have for demo purposes but not required. Production deployment is explicitly Phase 5.

---

## 3. Priorities & Trade-offs

### 3.1 Quality vs. Speed

- **Q**: For Phase 1 scaffolding, should we optimize for speed (get something
  running fast, refactor later) or correctness (get the architecture right even
  if it takes longer)?
- **A:** Optimize for correctness in Phase 1. The project structure, workspace config, shared types, and build system are load-bearing foundations — every other plan depends on them. Getting these wrong creates compounding tech debt. Spend the extra time to get ESM, workspace resolution, and type sharing right. The refactoring cost of a bad foundation is much higher than the initial investment.

- **Q**: What is the minimum acceptable test coverage for each phase? Should
  coverage gates block merges?
- **A:** Phase 1: 70% on shared and server packages. Phase 2: 60% overall, 80% on knowledge graph CRUD operations. Phase 3+: maintain 60% floor. Coverage gates should warn on PRs (CI annotation) but not hard-block merges — a developer can override with justification. Hard-block only if coverage drops more than 5% in a single PR.

### 3.2 Feature Priority Stack Rank

- **Q**: If resource constraints force cutting, what is the priority order among
  these features?
  1. Spec editor + knowledge graph
  2. Agent chat integration
  3. Version control (git-backed)
  4. RAG retrieval
  5. Generative UI
  6. Plan generation + code output
  7. Multi-user collaboration
  8. Permissions / anti-siloing
- **A:** The listed order is correct. Spec editor + knowledge graph is the irreducible core. Agent chat integration is second because it validates the human-input/agent-output vision. Version control (git-backed) is third because it's architecturally foundational (specs must be versioned). RAG is fourth as a key enabler for agent quality. Items 5–8 are Phase 4+ and can be deferred or cut.

- **Q**: Are any features "must-have for launch" that are currently in Phase 4
  or 5?
- **A:** No. Everything in Phases 4 and 5 is deferrable for an initial launch. The system is valuable at the end of Phase 3: users can author specs, build a graph, converse with an agent, and get RAG-grounded answers. Plan generation and generative UI are compelling extensions but not launch blockers.

### 3.3 Build vs. Buy

- **Q**: For the RAG layer, should we build a custom embedding pipeline or use
  an existing service (e.g., OpenAI embeddings, Cohere, local model)?
- **A:** Use OpenAI `text-embedding-3-small` as the primary embedding model. It's cheap, fast, and high quality. Store embeddings in PostgreSQL via `pgvector` to avoid a separate vector database. The pipeline is straightforward: chunk spec content → embed via API → store in pgvector → query with cosine similarity. A local model fallback (e.g., `nomic-embed-text`) can be added later for air-gapped scenarios.

- **Q**: For graph visualization, should we use an existing library or
  build a custom layout?
- **A:** Use a **custom vertical tree layout algorithm** with a React DOM rendering layer and `@tanstack/virtual` for virtual scrolling. The layout performs a BFS from a primary node (leaf-based primary selection) and arranges specs into depth-level rows. Each spec is rendered as a compressed rectangular card with an agent-generated summary. No third-party graph library (D3, Cytoscape, Sigma) is needed — the custom algorithm is simpler, DOM-based, and gives full control over styling, interaction, and BEM compliance.

- **Q**: For the rich text / markdown editor, should we use an existing editor
  (e.g., ProseMirror, TipTap, CodeMirror) or build from scratch?
- **A:** Use **TipTap** (built on ProseMirror). It provides a mature extensible markdown/rich-text editor with a React integration, custom node types (for spec boundaries), and collaborative editing primitives. Building from scratch would take months and add no unique value. TipTap's extension API allows custom spec-boundary blocks and inline agent suggestions.

---

## 4. Team & Resource Allocation

### 4.1 Team Structure

- **Q**: How many developers are allocated to this project? What is the split
  between frontend, backend, and full-stack?
- **A:** Plan for 2–3 full-stack developers. In a small team, rigid frontend/backend splits create bottlenecks. Each developer should be comfortable across the stack, with natural leanings (one more frontend-oriented, one more backend-oriented). Agent integration work can be a specialization area for one person.

- **Q**: Is there dedicated design/UX support, or will developers handle UI
  design?
- **A:** Developers handle UI design. Establish a design system early (Phase 1 component library, BEM SCSS tokens) and use it consistently. Reference existing productivity tools (Notion, Obsidian, Linear) for UX patterns. A dedicated designer is a Phase 4/5 luxury for polish, not a Phase 1–3 necessity.

- **Q**: Is there a dedicated DevOps/infrastructure person, or is that shared
  with development?
- **A:** Shared with development. Docker Compose handles local dev, GitHub Actions handles CI. There's no complex infrastructure until Phase 5 production deployment. One developer takes ownership of the CI pipeline and Docker configs as a secondary responsibility.

### 4.2 Skill Requirements

- **Q**: Does the team have existing experience with NestJS, or will there be a
  ramp-up period?
- **A:** Assume a 1-week ramp-up for NestJS if the team has Express/Fastify experience. NestJS's decorator-based DI pattern has a learning curve, but it's well-documented. Allocate the first week of Phase 1 for the server developer to build the skeleton while learning. The module/provider/guard structure pays dividends in maintainability.

- **Q**: Does the team have experience with MCP server development?
- **A:** Unlikely — MCP is relatively new. Plan for a 1–2 day spike in early Phase 3 to build a trivial MCP server (echo tool), validate the protocol, and establish patterns. The MCP SDK documentation and examples are sufficient for ramp-up. This is Phase 3 work, so there's time to learn.

- **Q**: Does the team have experience with Claude Code integration?
- **A:** Assume no. Plan for a dedicated spike in Phase 3 (2–3 days) to validate process spawning, sandboxing, and prompt/response parsing. The Claude Code wrapper package exists precisely to encapsulate this complexity. Start with the simplest use case (send prompt, get text response) and build up.

- **Q**: Is there graph database / graph algorithm expertise on the team?
- **A:** Not required. The knowledge graph uses JSON + folders, not a graph database. Graph traversal is BFS/DFS over an adjacency list loaded from JSON files — standard CS fundamentals. If advanced graph algorithms are needed later (community detection, PageRank for importance), they can be added as utilities in Phase 4.

### 4.3 Parallel Work Capacity

- **Q**: The master plan identifies 8 parallelization tracks. How many can
  realistically be staffed simultaneously?
- **A:** With 2–3 developers, 2–3 tracks can run simultaneously. The most effective parallelization: Track A (Frontend Foundation) + Track B (Server + DB) in Phase 1; Track C (Knowledge Graph) + Track D (Frontend Features) in Phase 2. Tracks E–H require Phase 2 completion and are more sequential in practice.

- **Q**: Should certain plans be assigned to specific people to maintain
  ownership, or should work be distributed task-by-task?
- **A:** Assign plan ownership. Each developer owns 2–3 plan areas and is responsible for their completion. This creates accountability and deep context. Cross-review PRs for knowledge sharing. Ownership doesn't mean exclusive work — others can contribute, but the owner drives completion and architectural decisions for their plans.

---

## 5. Technical Decisions

### 5.1 Bun

- **Q**: How committed are we to Bun? If a critical compatibility issue arises
  (e.g., a NestJS plugin doesn't work with Bun), is fallback to Node.js
  acceptable?
- **A:** Bun is the primary runtime, but Node.js fallback is acceptable for the server if a critical NestJS incompatibility surfaces. The codebase should use standard Node.js APIs where possible (avoid Bun-specific APIs in shared code). Vite handles client bundling regardless, so client-side is unaffected. Test NestJS on Bun in the first week of Phase 1 — if it fails, switch server to Node.js immediately.

- **Q**: Should we use Bun's built-in bundler for the server, or only use it as
  the runtime with Vite handling client bundling?
- **A:** Use Bun only as the runtime and test runner. Vite handles client bundling. The server runs TypeScript directly via Bun (no build step needed in development) and uses `tsc` for production builds. Bun's bundler is immature compared to Vite/Rollup and doesn't add enough value to justify the risk.

- **Q**: Are there any Bun-specific APIs (e.g., `Bun.serve()`, `Bun.file()`)
  we should adopt, or keep the code Node.js-compatible?
- **A:** Keep server code Node.js-compatible. NestJS provides its own HTTP abstraction, so `Bun.serve()` is irrelevant. Use `Bun.file()` only in scripts (not production code) where it's convenient. `bun test` is Bun-specific but that's acceptable since it's a dev dependency. This keeps the Node.js fallback viable.

### 5.2 Knowledge Graph Storage

- **Q**: The PRD specifies JSON + folders for the knowledge graph. Has a graph
  database (Neo4j, Dgraph) been explicitly ruled out, or should we prototype
  both and compare?
- **A:** Graph databases are explicitly ruled out for the primary store. JSON + folders is the canonical source because it's git-versionable, human-readable, and requires no additional infrastructure. PostgreSQL can maintain a denormalized index for query performance, but JSON files are the source of truth. No prototyping needed — the PRD decision is final.

- **Q**: What is the expected scale? How many specs, edges, and versions should
  the system handle without performance degradation?
- **A:** Target: 10,000 specs, 50,000 edges, and 100,000 version entries without degradation. For a single-project knowledge graph, this is generous. The JSON/folder approach is fine at this scale — load the adjacency index into memory on server start (< 50MB). If scale exceeds this, introduce PostgreSQL-backed indexing as an optimization layer, not a replacement.

- **Q**: Should the JSON files be one-per-spec, one-per-document, or a
  different granularity?
- **A:** One JSON file per spec. This minimizes git merge conflicts (two users editing different specs won't collide), enables spec-level version history via `git log -- path/to/spec.json`, and keeps file sizes small. Spec documents are a separate index file mapping document IDs to ordered lists of spec IDs. Edges get their own directory with one file per edge.

### 5.3 Git Strategy

- **Q**: Should spec version control use a separate git repo from the project
  code, or the same repo with different directories?
- **A:** Same repo, different directory (`knowledge-graph/`). The PRD says "each user project is a git repo" — that's the monorepo containing both code and knowledge. Submodules add unnecessary complexity. The `knowledge-graph/` directory is just a folder in the project repo, versioned alongside everything else.

- **Q**: For multi-user sync, should we use a central bare repo, or peer-to-peer
  git remotes?
- **A:** Central bare repo (e.g., hosted on GitHub/GitLab or a self-hosted bare repo). This is the standard git collaboration model — push/pull to a shared remote. Peer-to-peer git is complex and fragile. The server mediates sync operations, pushing spec changes as commits to the central remote.

- **Q**: How should git merge conflicts in JSON knowledge graph files be
  handled? Custom merge drivers, or restructure to minimize conflicts?
- **A:** Both. Primary strategy: minimize conflicts via one-file-per-spec granularity (two users rarely edit the same spec simultaneously). Secondary strategy: a custom merge driver for the adjacency index file (which aggregates edges). The server should detect conflicts, present them in the UI, and let the user resolve. Auto-merge is acceptable for non-overlapping additions.

### 5.4 Agent Runtime

- **Q**: Should Claude Code be spawned as a child process per agent session, or
  should there be a pool of long-running processes?
- **A:** Spawn a child process per agent session. Claude Code sessions are stateful and tied to a specific user context/project directory. A pool would require complex state management and session affinity. Process-per-session is simpler, provides natural isolation, and the overhead is acceptable since agent sessions are user-initiated (not high-throughput).

- **Q**: What is the expected latency budget for an agent response? Is the user
  willing to wait 30+ seconds for complex operations?
- **A:** Yes, users will wait 30+ seconds for complex operations (graph crawling, plan generation). For simple queries (RAG-assisted Q&A), target under 10 seconds. Use WebSocket streaming to show progress — partial responses, "thinking" indicators, and step-by-step updates. The key is perceived responsiveness, not raw latency. The chat dialog should show real-time status.

- **Q**: Should agent operations be cancellable by the user mid-execution?
- **A:** Yes. The user must be able to cancel any in-flight agent operation. Implementation: send a cancel signal via WebSocket, which triggers `SIGTERM` on the Claude Code child process. The agent orchestration service handles cleanup (rollback any partial spec changes). A "Stop" button in the chat dialog is essential UX.

### 5.5 Embedding Model

- **Q**: Which embedding model should be used for RAG? OpenAI
  `text-embedding-3-small`? A local model (e.g., `nomic-embed-text`)? Both?
- **A:** OpenAI `text-embedding-3-small` as the default. It's 1536 dimensions, cheap ($0.02/1M tokens), and high quality. Support a configuration option to swap models (env var `EMBEDDING_MODEL`), allowing future switch to a local model or `text-embedding-3-large` for higher accuracy. Don't implement both simultaneously — pick one and make it swappable.

- **Q**: Should embeddings be computed on the server or delegated to an external
  service?
- **A:** Computed on the server via API call to OpenAI. The server's RAG module calls the embedding API, receives vectors, and stores them in pgvector. No separate embedding microservice — the NestJS server handles it directly. This keeps the architecture simple and avoids an extra service to deploy.

- **Q**: What is the chunking strategy — spec-level, paragraph-level, or
  sentence-level?
- **A:** Spec-level chunking as the primary unit. Each spec is a discrete knowledge unit by design (single idea), so it's a natural chunk boundary. For specs exceeding ~500 tokens, split at paragraph boundaries within the spec. Embed the spec title + content together. Store the spec ID with each embedding for traceability back to the graph.

### 5.6 Database Schema

- **Q**: Should the PostgreSQL database store the knowledge graph data
  redundantly (for query performance), or rely entirely on the JSON/folder
  source of truth?
- **A:** Store a denormalized index in PostgreSQL for query performance (spec metadata, edge adjacency lists, full-text search). JSON files remain the source of truth. On server start, sync the PostgreSQL index from the JSON files. On spec mutation, write to JSON first (commit to git), then update PostgreSQL. This gives fast queries without sacrificing the git-versioned source of truth.

- **Q**: Should we use PostgreSQL's `pgvector` extension for RAG embeddings, or
  a separate vector database (Pinecone, Weaviate, Qdrant)?
- **A:** Use `pgvector`. It avoids a separate database service, integrates natively with PostgreSQL queries (join embeddings with spec metadata), and handles the expected scale (10K–50K vectors) easily. A dedicated vector DB is overkill for this use case and adds operational complexity. Install pgvector in the Docker Compose PostgreSQL image.

- **Q**: What data goes in PostgreSQL vs. what stays in the git-tracked
  JSON/folder structure?
- **A:** **PostgreSQL**: users, sessions, auth tokens, permissions, agent session logs, dialog history, RAG embeddings (pgvector), denormalized spec/edge index for queries, inquiry queue state. **JSON/folders (git-tracked)**: spec content, edge definitions, document groupings, graph metadata. Rule of thumb: if it needs git versioning, it's in JSON. If it's operational state or user data, it's in PostgreSQL.

---

## 6. User Experience Decisions

### 6.1 Chat Dialog

- **Q**: Should the chat dialog be resizable/collapsible, or always a fixed
  size?
- **A:** Resizable and collapsible. Default state is a docked panel on the right side (~350px wide). Users can drag to resize, collapse to a thin strip (icon + unread badge), or expand to full-width. The collapsed state should still show a hotkey hint. Persist the user's size preference in localStorage.

- **Q**: Should the chat support multiple concurrent conversations (tabs), or
  one active conversation at a time?
- **A:** One active conversation at a time, with a conversation history list. Starting a "new conversation" archives the current one. Users can browse and resume past conversations from a dropdown. Multiple tabs add UI complexity without clear value — the agent has full graph context regardless of conversation history.

- **Q**: Should the chat preserve full history across sessions, or only the
  current session?
- **A:** Preserve full history across sessions. Dialog history is persisted in PostgreSQL (per the PRD: "persisted but NOT part of knowledge graph"). Users can scroll back through previous conversations. History is a reference log — the agent doesn't automatically load old context, but the user can reference past messages.

- **Q**: What is the hotkey to open the dialog? Should it be configurable?
- **A:** Default hotkey: `Cmd+K` (macOS) / `Ctrl+K` (Windows/Linux) — a familiar pattern from Spotlight, VS Code command palette, and Slack. Yes, it should be configurable via a settings panel. The hotkey toggles the dialog open/closed. When opened via hotkey, the input field is auto-focused.

### 6.2 Spec Editor

- **Q**: Should the spec editor be a full WYSIWYG markdown editor, or a
  split-pane (source + preview)?
- **A:** Full WYSIWYG with an optional "source view" toggle. Most users prefer WYSIWYG for knowledge authoring (it's not code). TipTap provides this naturally. The source toggle is for power users who want to see/edit raw markdown. Default to WYSIWYG.

- **Q**: How should spec boundaries be visually indicated within a spec
  document? Horizontal rules, colored sections, collapsible blocks?
- **A:** Collapsible blocks with a subtle colored left border (2px accent color). Each spec within a document gets a collapsible header (spec title + metadata badge) and an indented content area. Collapsed specs show title + first-line summary. This is cleaner than horizontal rules and more informative than plain sections. The border color can indicate spec status (draft, reviewed, resolved).

- **Q**: Should inline agent assistance appear as suggestions (like Copilot),
  slash commands, or something else?
- **A:** Slash commands as the primary trigger (`/suggest-edges`, `/clarify`, `/expand`). The slash command opens a small command palette inline. Additionally, the agent can proactively surface suggestions as non-intrusive inline annotations (small icon in the gutter) that the user can click to expand. Not Copilot-style ghost text — specs are authored deliberately, not auto-completed.

### 6.3 Graph Visualization

- **Q**: What should the graph layout approach be?
- **A:** Vertical tree layout as the sole layout. A BFS from a primary node (selected via leaf-based primary selection) arranges specs into depth-level rows, displayed as compressed rectangular cards with agent-generated summaries. Rows are virtualized via `@tanstack/virtual` for performance. Mac trackpad UX: two-finger scroll vertical + horizontal. Clicking a card expands it to fill the screen with full document content — the tree fades out, connected nodes appear as horizontal scroll cards at the bottom, and a breadcrumb trail appears at the top.

- **Q**: Should the graph show all specs at once, or should it be
  context-focused (show neighbors of the selected spec)?
- **A:** Context-focused by default: the tree layout performs a BFS from a primary node and shows specs organized by depth level. The tree naturally focuses on the neighborhood of the primary node. Clicking a spec card expands it to fill the screen, showing its full content with connected nodes as horizontal scroll cards at the bottom. Clicking a connected node makes it the new primary and re-renders the tree around it. A breadcrumb trail at the top tracks navigation history.

- **Q**: How should different edge types be visually distinguished? Color,
  line style, labels, icons?
- **A:** Color + line style. Each edge type gets a distinct color (e.g., `derived-from` = blue, `depends-on` = orange, `related-to` = gray, `contradicts` = red, `supersedes` = purple) and line style (solid for strong relationships, dashed for `related-to`). Labels appear on hover. An edge-type legend is always visible in the corner. Icons are unnecessary overhead on edges.

### 6.4 Version Control UI

- **Q**: The PRD specifies light-colored indications for diffs (not heavy
  github-style). Can we get mockups or more specific guidance on this?
- **A:** No formal mockups needed — follow this specification: additions get a light green background tint (`rgba(0,200,0,0.08)`), deletions get a light red tint (`rgba(200,0,0,0.08)`), and modifications get a light yellow tint (`rgba(200,200,0,0.08)`). Inline character-level diffs use slightly stronger tints. No `+`/`-` gutters, no line-number-heavy styling. The goal is to see changes in context, not as a code review tool.

- **Q**: Should the version history be per-spec (timeline of that spec's
  changes) or per-document (all changes in the document)?
- **A:** Per-spec as the primary view (since each spec is a discrete unit with its own git history). Provide a per-document timeline as a secondary view that shows all spec changes within the document interleaved chronologically. Per-spec is more useful for understanding how a single idea evolved.

- **Q**: How should branch management look? A dropdown, a dedicated panel, a
  modal?
- **A:** A dropdown in the top toolbar showing the current branch name, with a flyout panel for branch operations (create, switch, merge, delete). Not a modal — branching should feel lightweight and non-blocking. The dropdown shows recent branches and a search filter. Merge conflicts open an inline resolution UI in the spec editor, not a separate page.

---

## 7. Collaboration & Permissions

### 7.1 Multi-User Sync

- **Q**: What is the expected latency tolerance for sync? Is near-real-time
  (seconds) required, or is periodic sync (minutes) acceptable?
- **A:** Periodic sync (30–60 seconds) is acceptable. The PRD specifies "git-based async collaboration," which inherently isn't real-time. The server polls or receives webhooks from the git remote and pushes change notifications via WebSocket. Near-real-time is a Phase 5 optimization if needed. Git push/pull is the sync primitive.

- **Q**: Should users be notified when someone else changes a spec they're
  viewing? How (banner, toast, badge)?
- **A:** Toast notification + badge. When a spec the user is viewing is modified by another user, show a non-blocking toast ("Spec updated by {username}") with a "Refresh" action button. Also show a small badge on the spec's tab/header indicating it's stale. Don't auto-refresh — the user might be mid-edit.

- **Q**: Should there be any locking mechanism to prevent concurrent edits to
  the same spec, or is merge-on-conflict sufficient?
- **A:** No locking. Merge-on-conflict is sufficient. Locking creates coordination overhead and feels hostile in async workflows. If two users edit the same spec, the second push triggers a merge conflict that's presented in the version control UI. Per-spec file granularity makes conflicts rare since specs are small, discrete units.

### 7.2 Permission Model

- **Q**: Who creates the initial permission settings for a spec? The author by
  default?
- **A:** The author sets initial permissions at creation time. Default is full access for all users in the project (anti-siloing principle). The author can then restrict individual specs to summary access for specific users. Permissions are opt-in restrictions, not opt-in grants — everything is open by default.

- **Q**: Are permissions inherited from the spec document, or always set
  per-spec?
- **A:** Inherited from the spec document by default, with per-spec overrides. A spec document has a permission level; all specs within inherit it. Authors can override individual specs to be more restrictive (never more open than the document level). This reduces permission management burden while allowing fine-grained control.

- **Q**: How are permission tokens generated and distributed? Through the UI, or
  also via API/CLI?
- **A:** Both. The UI provides a "Share" button that generates a token and shows a copyable link. The API exposes token generation for programmatic use. Tokens are opaque strings (UUIDs), stored server-side in PostgreSQL (never in git). The server validates tokens on every request. CLI access uses the same API with a personal auth token.

- **Q**: Should the system support permission groups/roles (e.g., "engineering
  team" gets full access to all engineering specs)?
- **A:** Not initially. Start with per-user, per-spec permissions. Groups/roles are a Phase 5 feature if user feedback demands it. The anti-siloing principle means most specs are full-access anyway, so complex group management is premature. If needed later, implement as simple named groups with user membership.

### 7.3 Dialog Forking

- **Q**: When a user interacts with another user's dialog and it forks, should
  the original user be notified?
- **A:** No. Dialog forking is a private action — the forking user gets their own copy, and the original conversation is unaffected. Notification would create noise and imply oversight. The original user's dialog remains unchanged; the fork is an independent conversation thread.

- **Q**: Can the forked conversation be merged back, or is it permanently
  separate?
- **A:** Permanently separate. Merging conversations is semantically complex (conflicting agent states, interleaved messages) and adds no clear value. If insights from a forked conversation are valuable, the user should create specs from them, which enter the knowledge graph — the proper mechanism for sharing knowledge.

- **Q**: Should there be a UI to browse other users' dialog histories?
- **A:** Yes, with read-only access. Users can view other users' dialog histories (consistent with anti-siloing: never "no access"). Display in a separate "Team Dialogs" panel with user avatars and conversation summaries. This enables knowledge discovery — seeing what questions others have asked and what answers the agent provided.

---

## 8. Agent Behavior

### 8.1 Agent Types

- **Q**: The PRD mentions routing requests to different agent types. What is the
  initial set of agent types?
  - Knowledge graph reader/writer?
  - Dialog conversationalist?
  - Generative UI builder?
  - Plan generator?
  - Graph crawler/analyzer?
- **A:** Initial agent types for Phase 3: (1) **Dialog conversationalist** — handles chat, answers questions using RAG, proposes spec edits. (2) **Knowledge graph reader/writer** — creates/updates specs, creates edges, performs graph operations. (3) **Graph crawler/analyzer** — crawls graph on spec changes, detects implications, flags issues for inquiry queue. Phase 4 adds: (4) **Plan generator** and (5) **Generative UI builder**. The dialog conversationalist is the primary user-facing agent; others are invoked as sub-agents.

- **Q**: Can a single request require multiple agent types in sequence?
- **A:** Yes. A user message like "create a spec about X and link it to related specs" would invoke the dialog agent (parse intent) → knowledge graph agent (create spec) → graph crawler (find related specs and create edges). The agent orchestration service handles this routing. The user sees a single conversation; sub-agent delegation is invisible.

### 8.2 Agent Autonomy

- **Q**: How much should the agent do autonomously vs. request confirmation?
  For example, should it auto-create edges, or always propose and wait?
- **A:** **Propose and confirm** for destructive or structural changes (creating/deleting specs, creating edges, modifying permissions). **Auto-execute** for read-only and low-risk operations (graph traversal, RAG queries, generating summaries). The agent presents proposals as interactive messages in the chat with "Accept" / "Reject" / "Edit" buttons. This keeps humans in the loop for knowledge graph mutations.

- **Q**: Should the agent proactively crawl the graph on spec changes, or only
  when explicitly asked?
- **A:** Proactively crawl on spec changes. Per the PRD: "spec revision triggers agent graph crawl for implications and cascading revisions." This is a background operation — the graph crawler agent runs after every spec commit, checks for contradictions, stale edges, and cascading implications, and surfaces findings in the inquiry queue. The user isn't interrupted unless the crawler flags something critical.

- **Q**: The PRD mentions an inquiry queue. How should inquiries be prioritized
  and presented to the user?
- **A:** Priority levels: **Critical** (contradictions, broken dependencies), **Important** (stale edges, suggested revisions), **Info** (related spec suggestions, minor improvements). Present as a notification badge on a dedicated "Inquiries" panel. Critical items also trigger a toast notification. Within each priority, sort by recency. Users can dismiss, resolve, or snooze inquiries.

### 8.3 Agent Failure Handling

- **Q**: What happens when an agent session crashes or times out? Retry, notify
  user, or silently restart?
- **A:** Notify the user with a toast message ("Agent encountered an error — retrying...") and auto-retry once. If the retry also fails, show an error message in the chat with details and a "Try Again" button. Never silently restart — the user should always know when the agent failed. Log the failure for debugging. Rollback any partial spec changes from the failed session.

- **Q**: Should agent actions be transactional (all-or-nothing) or can partial
  results be committed?
- **A:** All-or-nothing for multi-step mutations. If an agent is creating 3 specs and linking them, and it fails on the 3rd, roll back all three. For read-only operations, partial results are fine (e.g., a graph crawl can return what it found before timing out). Use git's staging mechanism: accumulate changes, commit atomically at the end of a successful operation.

- **Q**: How should agent rate limiting work? Per-user, per-session, global?
- **A:** Per-user rate limiting. Each user gets a budget of N concurrent agent sessions (default: 2) and M API calls per hour (default: 100, configurable). Global limits protect the Claude API key budget. Rate limit errors are surfaced in the chat: "You've reached the limit — please wait or cancel an active session." Admins can adjust per-user limits.

---

## 9. Infrastructure & Operations

### 9.1 Hosting

- **Q**: Where will the system be hosted? Cloud (AWS/GCP/Azure), self-hosted,
  or local-only?
- **A:** Local-only through Phase 3. Phase 5 targets cloud deployment on a single VPS or small cloud instance (DigitalOcean, Railway, or a single AWS EC2). The system isn't designed for massive scale — a single server with PostgreSQL handles the expected load. Cloud provider choice is deferred to Phase 5 deployment planning.

- **Q**: Should the system support air-gapped deployment (no internet access)?
- **A:** Not initially. The system requires internet for Claude API calls and OpenAI embeddings. Air-gapped support would require local LLM and embedding models, which is a significant scope addition. File it as a future enhancement. The architecture should be model-agnostic (env-configurable API endpoints) to make this feasible later.

- **Q**: What is the expected number of concurrent users?
- **A:** 5–20 concurrent users for the initial deployment. The system is designed for small-to-medium teams. This is well within the capacity of a single server instance. If demand grows beyond 50 users, horizontal scaling (multiple server instances, load balancer) becomes relevant — but that's a Phase 5+ concern.

### 9.2 Data Backup

- **Q**: Since the knowledge graph is git-backed, is the git remote the backup
  strategy? Should there be additional backups?
- **A:** The git remote (GitHub/GitLab) is the primary backup for the knowledge graph. Every push is a distributed backup. For additional safety, enable the git hosting provider's built-in backup features. No custom backup pipeline is needed for the knowledge graph. The git remote plus each developer's local clone provides multi-site redundancy.

- **Q**: Should PostgreSQL backups be automated? What is the RPO (recovery point
  objective)?
- **A:** Yes, automate PostgreSQL backups. RPO: 24 hours for development, 1 hour for production. Use `pg_dump` on a cron schedule. For local dev, daily backups to a local directory. For production (Phase 5), use the cloud provider's managed backup or WAL archiving. The most critical data (knowledge graph) is in git, so PostgreSQL loss is recoverable.

### 9.3 Monitoring

- **Q**: What monitoring stack should be used? Prometheus + Grafana, Datadog,
  or something simpler?
- **A:** Start simple: structured JSON logging (NestJS built-in) + a lightweight log aggregator. For Phase 5 production, add Prometheus + Grafana (open source, no vendor lock-in). Datadog is overkill for a small team. During development, `console`-based structured logging with log levels is sufficient. Add proper monitoring infrastructure only when deploying to production.

- **Q**: What are the critical alerts? Server down, agent failure, git sync
  failure, database connection loss?
- **A:** Critical alerts (Phase 5): server process crash, database connection loss, git remote unreachable, agent API key invalid/expired. Important alerts: agent session failure rate > 10%, disk usage > 80%, response time p95 > 5s. During development, errors in structured logs serve as alerts. Formal alerting is a Phase 5 deployment concern.

- **Q**: Should there be user-facing status indicators (system health, agent
  availability)?
- **A:** Yes, minimal. A small status indicator in the chat dialog footer: green dot = agent available, yellow = degraded (high latency), red = unavailable. Also show "Connecting..." / "Connected" for WebSocket status. No full status page — just enough for the user to know if the agent is operational.

---

## 10. Legal & Compliance

### 10.1 Data Privacy

- **Q**: Does the system handle any PII (personally identifiable information)?
  If so, what compliance frameworks apply (GDPR, CCPA, SOC 2)?
- **A:** Yes — usernames, emails, and potentially knowledge content that references people. For initial internal use, no formal compliance framework is required. When opening to external users, implement GDPR basics: data access request handling, deletion capability, and a privacy policy. SOC 2 is a Phase 5+ concern if enterprise customers are targeted.

- **Q**: Should the system support data export (right to portability)?
- **A:** Yes. The knowledge graph is already portable (JSON + git). Add an API endpoint that exports a user's specs, edges, and dialog history as a ZIP archive. This is both a good feature (users own their data) and a compliance requirement for GDPR portability. Implement in Phase 4 or 5.

- **Q**: Should the system support data deletion (right to be forgotten)?
- **A:** Yes. Implement user account deletion that removes: PostgreSQL records (user, sessions, dialogs, permissions), and optionally their authored specs (or transfer ownership). Git history is harder to scrub — document that git history may retain metadata. Use `git filter-branch` or BFG Repo Cleaner for full removal if legally required.

### 10.2 AI Usage

- **Q**: Are there constraints on what data can be sent to Claude? Should
  sensitive specs be excluded from agent context?
- **A:** By default, all specs are sendable to Claude — the user explicitly authored them in an AI-assisted system. However, respect permission levels: specs with restricted access for a given user should not be included in that user's agent context. Add a per-spec "exclude from AI" flag for users who want to keep specific content out of API calls. Document that spec content is sent to Anthropic's API.

- **Q**: Should the system log all AI interactions for audit purposes?
- **A:** Yes. Log every agent session: user ID, timestamp, input messages (or hashes), output messages, tools invoked, specs read/written, and duration. Store in PostgreSQL with a 90-day retention policy (configurable). This is essential for debugging agent behavior, understanding usage patterns, and audit compliance. Dialog history already captures the user-facing portion.

- **Q**: Are there organizational policies on AI-generated code that affect the
  code generation feature?
- **A:** No specific policies assumed. The code generation feature (Phase 4) produces code in `client/gen/` that is git-tracked, reviewed by the user, and attributed to the agent. Add a header comment to generated files: `// Generated by Knowledge Graph Agent — review before use`. Users accept responsibility for generated code. This is standard practice for AI-assisted development.

---

## 11. Open Architecture Questions

### 11.1 Monorepo Boundaries

- **Q**: Should the MCP servers be separate packages in the monorepo, or part of
  the server package?
- **A:** Separate package in the monorepo (`packages/mcp-servers/`). MCP servers need to run as independent processes (the MCP protocol requires a separate stdio-based process). Keeping them in a separate package enables independent testing, clear dependency boundaries, and the ability to spawn them as child processes from the server.

- **Q**: Should the shared types package be published to a registry, or only
  used via workspace references?
- **A:** Workspace references only. There's no external consumer of these types — they're internal to the monorepo. Publishing to npm adds release process overhead with zero benefit. Bun workspaces resolve `@kg/shared` directly to the local package. If the shared package ever needs to be consumed by external projects, publishing can be added later.

- **Q**: Should the knowledge graph data directory be inside the monorepo or in
  a separate repo per project?
- **A:** Inside the monorepo as `knowledge-graph/`. Per the PRD: "each user project is a git repo" — the monorepo IS the project. The knowledge graph directory is version-controlled alongside the application code. When a project is created for a user, the entire monorepo is cloned/initialized. Separate repos add submodule complexity with no benefit.

### 11.2 API Design

- **Q**: Should the API be REST-only, or should some operations use GraphQL
  (especially for the knowledge graph queries)?
- **A:** REST-only. GraphQL adds a schema definition layer, resolver complexity, and a new paradigm for the team to learn. The knowledge graph queries can be served by well-designed REST endpoints with query parameters for filtering and depth. REST is simpler to implement, cache, and debug. If complex nested queries become a pain point in Phase 4+, reconsider.

- **Q**: Should file uploads (for mixed media specs) use the same API or a
  separate upload service?
- **A:** Same API, dedicated endpoint. `POST /api/v1/media/upload` accepts multipart form data and returns a `MediaRef`. The NestJS server stores files in a local directory (git-tracked for small files, `.gitignore`-d for large media with a path reference). No separate upload service — it's a single endpoint on the existing server.

- **Q**: Should the API support batch operations (create multiple specs at once)?
- **A:** Yes, for spec creation and edge creation. `POST /api/v1/specs/batch` accepts an array of specs and creates them atomically (single git commit). This is essential for agent operations that create multiple related specs in one action. Individual CRUD endpoints remain the primary interface; batch is an optimization for agents and imports.

### 11.3 State Management

- **Q**: What frontend state management approach? React context, MobX,
  Jotai, Redux Toolkit, or something else?
- **A:** **MobX** with class-based stores using `makeObservable` and explicit decorator annotations (`@observable`, `@action`, `@computed`, `@action.bound`). Strict mode is enabled via `configure({ enforceActions: 'always' })` to enforce a Flux-like unidirectional data flow. Stores are organized into three categories: **Domain stores** (backend data, API actions — e.g., SpecStore, GraphStore), **Session stores** (auth, user profile, browser state — e.g., AuthStore), and **UI stores** (`@computed` domain transformations for deriving UI-ready data, plus application-level state like theme/layout — e.g., UILayoutStore, AppNavigationStore). Primitive and compositional UI components are strictly props-driven — stores are consumed by top-level `observer()` containers that pass data down as props. Simple UI state (hover, open/closed, form values) stays as local component state. All stores are provided via a RootStore pattern + React Context. Redux Toolkit is overkill for this app's state complexity. React context alone causes unnecessary re-renders at scale.

- **Q**: Should the client maintain a local cache of the knowledge graph, or
  always fetch from the server?
- **A:** Maintain a local cache with stale-while-revalidate semantics. On initial load, fetch the graph from the server and cache it in the GraphStore (MobX domain store). On mutations, optimistically update the store via `@action` methods and sync with the server. Periodically revalidate (or on WebSocket push). The cache enables instant graph navigation without round-trips. Invalidate on git sync events.

- **Q**: How should optimistic updates work for spec edits?
- **A:** On save: immediately update the MobX domain store via an `@action` method and UI reflects changes automatically via `observer()`, then fire the API request in the background. On success: no-op (already showing the right state). On failure: revert the store to the previous state via another `@action`, show an error toast with "Retry" option, and highlight the spec as having unsaved changes. Use a pending-changes queue to handle offline/flaky scenarios.

---

## Decision Log

> Record decisions as questions are resolved.

| Date | Question | Decision | Rationale |
| ---- | -------- | -------- | --------- |
| —    | —        | —        | —         |
